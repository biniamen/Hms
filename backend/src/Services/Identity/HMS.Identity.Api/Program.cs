using HMS.Contracts;
using HMS.Identity.Infrastructure.Data;
using HMS.Identity.Infrastructure.Entities;
using HMS.SharedKernel;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

var identityAssembly = typeof(Program).Assembly.GetName().Name;
builder.Services.AddDbContext<AppIdentityDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("IdentityDb"),
        b => b.MigrationsAssembly(identityAssembly)));

// ── JWT Authentication ──
var jwtSection = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSection["SecretKey"]!;
var issuer = jwtSection["Issuer"]!;
var audience = jwtSection["Audience"]!;

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = issuer,
        ValidAudience = audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// Auto-migrate on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppIdentityDbContext>();
    await db.Database.MigrateAsync();
}

app.MapGet("/health", () => Results.Ok(ApiResponse<object>.Ok(new { service = "identity", status = "healthy" })));

// ── Login (anonymous) ──
app.MapPost("/api/auth/login", async (LoginRequest request, AppIdentityDbContext db) =>
{
    var employee = await db.Employees
        .FirstOrDefaultAsync(e =>
            EF.Functions.ILike(e.EmailAddress, request.EmailAddress) &&
            e.Password == request.Password &&
            e.IsActive);

    if (employee is null)
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Invalid email address or password."));
    }

    // Issue JWT token
    var tokenHandler = new JwtSecurityTokenHandler();
    var key = Encoding.UTF8.GetBytes(secretKey);
    var expiryHours = double.Parse(jwtSection["TokenExpiryHours"] ?? "8");

    var claims = new[]
    {
        new Claim(ClaimTypes.NameIdentifier, employee.Id.ToString()),
        new Claim(ClaimTypes.Email, employee.EmailAddress),
        new Claim(ClaimTypes.Role, employee.Role),
        new Claim("permission", employee.Permission ?? ""),
        new Claim("name", $"{employee.FirstName} {employee.LastName}")
    };

    var tokenDescriptor = new SecurityTokenDescriptor
    {
        Subject = new ClaimsIdentity(claims),
        Expires = DateTime.UtcNow.AddHours(expiryHours),
        Issuer = issuer,
        Audience = audience,
        SigningCredentials = new SigningCredentials(
            new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
    };

    var token = tokenHandler.CreateToken(tokenDescriptor);
    var accessToken = tokenHandler.WriteToken(token);

    var response = new LoginResponse(accessToken, employee.Id, employee.EmailAddress, employee.Role, employee.Permission ?? "");
    return Results.Ok(ApiResponse<LoginResponse>.Ok(response, "Login successful."));
});

// ── Employees (Admin, HR_Manager) ──
app.MapGet("/api/employees", async (AppIdentityDbContext db) =>
{
    var employees = await db.Employees
        .Where(e => e.IsActive)
        .OrderBy(e => e.FirstName)
        .Select(e => new EmployeeDto(e.Id, e.FirstName, e.LastName, e.EmailAddress, e.Role, e.Permission))
        .ToListAsync();

    return Results.Ok(ApiResponse<IEnumerable<EmployeeDto>>.Ok(employees));
})
.RequireAuthorization(policy => policy.RequireRole("ADMIN", "HR_MANAGER"));

app.MapGet("/api/employees/{id:guid}", async (Guid id, AppIdentityDbContext db) =>
{
    var employee = await db.Employees.FindAsync(id);
    if (employee is null)
    {
        return Results.NotFound(ApiResponse<object>.Fail("Employee not found."));
    }

    var dto = new EmployeeDto(employee.Id, employee.FirstName, employee.LastName, employee.EmailAddress, employee.Role, employee.Permission);
    return Results.Ok(ApiResponse<EmployeeDto>.Ok(dto));
})
.RequireAuthorization(policy => policy.RequireRole("ADMIN", "HR_MANAGER"));

app.MapPost("/api/employees", async (CreateEmployeeRequest request, AppIdentityDbContext db) =>
{
    if (await db.Employees.AnyAsync(e => EF.Functions.ILike(e.EmailAddress, request.EmailAddress)))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("An employee with this email already exists."));
    }

    var employee = new Employee
    {
        FirstName = request.FirstName.Trim(),
        LastName = request.LastName.Trim(),
        EmailAddress = request.EmailAddress.Trim().ToLowerInvariant(),
        Role = request.Role,
        Permission = "PENDING_SETUP",
        Password = "ChangeMe@123",
        IsActive = true
    };

    db.Employees.Add(employee);
    await db.SaveChangesAsync();

    var dto = new EmployeeDto(employee.Id, employee.FirstName, employee.LastName, employee.EmailAddress, employee.Role, employee.Permission);
    return Results.Created($"/api/employees/{employee.Id}", ApiResponse<EmployeeDto>.Ok(dto, "Employee created."));
})
.RequireAuthorization(policy => policy.RequireRole("ADMIN", "HR_MANAGER"));

// ── Roles (Admin only) ──
app.MapGet("/api/roles", async (AppIdentityDbContext db) =>
{
    var roles = await db.RolePermissions.ToListAsync();

    var userCounts = await db.Employees
        .GroupBy(e => e.Role)
        .Select(g => new { Role = g.Key, Count = g.Count() })
        .ToListAsync();

    var roleDtos = roles.Select(role =>
    {
        var permissions = JsonSerializer.Deserialize<string[]>(role.PermissionsJson) ?? [];
        var userCount = userCounts.FirstOrDefault(u => u.Role == role.Role)?.Count ?? 0;
        return new RolePermissionDto(role.Role, role.Description, permissions, userCount);
    });

    return Results.Ok(ApiResponse<IEnumerable<RolePermissionDto>>.Ok(roleDtos));
})
.RequireAuthorization(policy => policy.RequireRole("ADMIN"));

app.MapPut("/api/roles/{role}", async (string role, UpdateRolePermissionRequest request, AppIdentityDbContext db) =>
{
    var existing = await db.RolePermissions.FindAsync(role);
    if (existing is null)
    {
        return Results.NotFound(ApiResponse<object>.Fail("Role not found."));
    }

    if (!string.IsNullOrWhiteSpace(request.Description))
    {
        existing.Description = request.Description.Trim();
    }

    if (request.Permissions is { Length: > 0 })
    {
        var filtered = request.Permissions
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .Select(p => p.Trim().ToUpperInvariant())
            .Distinct()
            .ToArray();

        existing.PermissionsJson = JsonSerializer.Serialize(filtered);
    }

    await db.SaveChangesAsync();

    var userCount = await db.Employees.CountAsync(e => e.Role == role);
    var permissions = JsonSerializer.Deserialize<string[]>(existing.PermissionsJson) ?? [];
    var updated = new RolePermissionDto(existing.Role, existing.Description, permissions, userCount);

    return Results.Ok(ApiResponse<RolePermissionDto>.Ok(updated, "Role permissions updated."));
})
.RequireAuthorization(policy => policy.RequireRole("ADMIN"));

app.Run();
