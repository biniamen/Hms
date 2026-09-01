using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace HMS.SharedKernel;

public static class HmsSecurity
{
    private const string JwtSection = "Security:Jwt";

    public static string RequireConnectionString(this IConfiguration configuration, params string[] names)
    {
        foreach (var name in names)
        {
            var value = configuration.GetConnectionString(name);
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value;
            }
        }

        throw new InvalidOperationException($"Missing required connection string. Configure one of: {string.Join(", ", names)}.");
    }

    public static IServiceCollection AddHmsCors(this IServiceCollection services, IConfiguration configuration)
    {
        var origins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? ["http://localhost:4200"];
        var methods = configuration.GetSection("Cors:AllowedMethods").Get<string[]>() ?? ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
        var headers = configuration.GetSection("Cors:AllowedHeaders").Get<string[]>() ?? ["Authorization", "Content-Type"];
        var exposedHeaders = configuration.GetSection("Cors:ExposedHeaders").Get<string[]>()
            ?? ["X-Total-Count", "X-Page", "X-Page-Size", "X-Total-Pages"];

        services.AddCors(options =>
        {
            options.AddDefaultPolicy(policy =>
            {
                policy
                    .WithOrigins(origins)
                    .WithMethods(methods)
                    .WithHeaders(headers)
                    .WithExposedHeaders(exposedHeaders);
            });
        });

        return services;
    }

    public static IApplicationBuilder UseHmsJwtAuthentication(this IApplicationBuilder app, params string[] anonymousPathPrefixes)
    {
        app.Use(async (context, next) =>
        {
            if (HttpMethods.IsOptions(context.Request.Method) || IsAnonymousPath(context.Request.Path, anonymousPathPrefixes))
            {
                await next();
                return;
            }

            var header = context.Request.Headers.Authorization.ToString();
            if (!header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                await WriteUnauthorizedAsync(context, "Missing bearer token.");
                return;
            }

            var token = header["Bearer ".Length..].Trim();
            var configuration = context.RequestServices.GetRequiredService<IConfiguration>();
            if (!TryValidateAccessToken(configuration, token, out var principal, out var error))
            {
                await WriteUnauthorizedAsync(context, error);
                return;
            }

            context.User = principal;
            await next();
        });

        return app;
    }

    public static RouteHandlerBuilder RequireHmsRoles(this RouteHandlerBuilder builder, params string[] roles)
    {
        return builder.AddEndpointFilter(async (context, next) =>
        {
            var user = context.HttpContext.User;
            if (user.Identity?.IsAuthenticated != true)
            {
                return Results.Unauthorized();
            }

            if (roles.Length > 0)
            {
                var role = user.FindFirstValue(ClaimTypes.Role) ?? user.FindFirstValue("role") ?? "";
                if (!roles.Any(item => string.Equals(item, role, StringComparison.OrdinalIgnoreCase)))
                {
                    return Results.StatusCode(StatusCodes.Status403Forbidden);
                }
            }

            return await next(context);
        });
    }

    public static string CreateAccessToken(
        IConfiguration configuration,
        string subject,
        string emailAddress,
        string role,
        IEnumerable<string> permissions)
    {
        var settings = JwtSettings.FromConfiguration(configuration);
        var now = DateTimeOffset.UtcNow;
        var header = new Dictionary<string, object>
        {
            ["alg"] = "HS256",
            ["typ"] = "JWT"
        };
        var payload = new Dictionary<string, object>
        {
            ["iss"] = settings.Issuer,
            ["aud"] = settings.Audience,
            ["sub"] = subject,
            ["email"] = emailAddress,
            ["role"] = role,
            ["permissions"] = permissions.ToArray(),
            ["iat"] = now.ToUnixTimeSeconds(),
            ["nbf"] = now.ToUnixTimeSeconds(),
            ["exp"] = now.AddMinutes(settings.TokenLifetimeMinutes).ToUnixTimeSeconds(),
            ["jti"] = Guid.NewGuid().ToString("N")
        };

        var encodedHeader = Base64UrlEncode(JsonSerializer.SerializeToUtf8Bytes(header));
        var encodedPayload = Base64UrlEncode(JsonSerializer.SerializeToUtf8Bytes(payload));
        var signingInput = $"{encodedHeader}.{encodedPayload}";
        var signature = Sign(signingInput, settings.SigningKey);
        return $"{signingInput}.{signature}";
    }

    public static bool TryValidateAccessToken(
        IConfiguration configuration,
        string token,
        out ClaimsPrincipal principal,
        out string error)
    {
        principal = new ClaimsPrincipal(new ClaimsIdentity());
        error = "Invalid token.";

        var parts = token.Split('.');
        if (parts.Length != 3)
        {
            return false;
        }

        var settings = JwtSettings.FromConfiguration(configuration);
        var signingInput = $"{parts[0]}.{parts[1]}";
        var expectedSignature = Sign(signingInput, settings.SigningKey);
        if (!FixedTimeEquals(parts[2], expectedSignature))
        {
            error = "Invalid token signature.";
            return false;
        }

        JsonDocument payload;
        try
        {
            payload = JsonDocument.Parse(Base64UrlDecode(parts[1]));
        }
        catch
        {
            error = "Invalid token payload.";
            return false;
        }

        using (payload)
        {
            var root = payload.RootElement;
            if (!StringClaimEquals(root, "iss", settings.Issuer) || !StringClaimEquals(root, "aud", settings.Audience))
            {
                error = "Invalid token issuer or audience.";
                return false;
            }

            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            if (!root.TryGetProperty("exp", out var exp) || exp.GetInt64() <= now)
            {
                error = "Token expired.";
                return false;
            }

            if (root.TryGetProperty("nbf", out var nbf) && nbf.GetInt64() > now)
            {
                error = "Token is not active yet.";
                return false;
            }

            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, ReadString(root, "sub")),
                new(ClaimTypes.Email, ReadString(root, "email")),
                new(ClaimTypes.Role, ReadString(root, "role")),
                new("jti", ReadString(root, "jti"))
            };

            if (root.TryGetProperty("permissions", out var permissions) && permissions.ValueKind == JsonValueKind.Array)
            {
                foreach (var permission in permissions.EnumerateArray())
                {
                    var value = permission.GetString();
                    if (!string.IsNullOrWhiteSpace(value))
                    {
                        claims.Add(new Claim("permission", value));
                    }
                }
            }

            principal = new ClaimsPrincipal(new ClaimsIdentity(claims, "HmsJwt"));
            error = "";
            return true;
        }
    }

    private static bool IsAnonymousPath(PathString path, IEnumerable<string> prefixes)
    {
        foreach (var prefix in prefixes)
        {
            if (path.StartsWithSegments(prefix, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private static Task WriteUnauthorizedAsync(HttpContext context, string message)
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        context.Response.ContentType = "application/json";
        return context.Response.WriteAsJsonAsync(ApiResponse<object>.Fail(message));
    }

    private static string Sign(string signingInput, string key)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key));
        return Base64UrlEncode(hmac.ComputeHash(Encoding.UTF8.GetBytes(signingInput)));
    }

    private static bool StringClaimEquals(JsonElement root, string name, string expected) =>
        string.Equals(ReadString(root, name), expected, StringComparison.Ordinal);

    private static string ReadString(JsonElement root, string name) =>
        root.TryGetProperty(name, out var value) ? value.GetString() ?? "" : "";

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] Base64UrlDecode(string value)
    {
        var base64 = value.Replace('-', '+').Replace('_', '/');
        base64 = base64.PadRight(base64.Length + ((4 - base64.Length % 4) % 4), '=');
        return Convert.FromBase64String(base64);
    }

    private static bool FixedTimeEquals(string left, string right)
    {
        var leftBytes = Encoding.UTF8.GetBytes(left);
        var rightBytes = Encoding.UTF8.GetBytes(right);
        return leftBytes.Length == rightBytes.Length && CryptographicOperations.FixedTimeEquals(leftBytes, rightBytes);
    }

    private sealed record JwtSettings(string Issuer, string Audience, string SigningKey, int TokenLifetimeMinutes)
    {
        public static JwtSettings FromConfiguration(IConfiguration configuration)
        {
            var signingKey = configuration[$"{JwtSection}:SigningKey"];
            if (string.IsNullOrWhiteSpace(signingKey) || Encoding.UTF8.GetByteCount(signingKey) < 32)
            {
                throw new InvalidOperationException("Security:Jwt:SigningKey must be configured and at least 32 bytes.");
            }

            return new JwtSettings(
                configuration[$"{JwtSection}:Issuer"] ?? "HMS.Platform",
                configuration[$"{JwtSection}:Audience"] ?? "HMS.Web",
                signingKey,
                configuration.GetValue($"{JwtSection}:TokenLifetimeMinutes", 480));
        }
    }
}
