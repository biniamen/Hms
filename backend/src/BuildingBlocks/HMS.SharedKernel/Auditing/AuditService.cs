using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

namespace HMS.SharedKernel.Auditing;

/// <summary>
/// Implementation of <see cref="IAuditService"/> that uses a pluggable persistence function.
/// The persistence function is responsible for saving the audit entry (to DB, file, etc.).
/// </summary>
public class AuditService : IAuditService
{
    private readonly Func<AuditEntry, CancellationToken, Task> _persistAsync;
    private readonly IHttpContextAccessor? _httpContextAccessor;

    public AuditService(
        Func<AuditEntry, CancellationToken, Task> persistAsync,
        IHttpContextAccessor? httpContextAccessor = null)
    {
        _persistAsync = persistAsync ?? throw new ArgumentNullException(nameof(persistAsync));
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task RecordAsync(AuditEntry entry, CancellationToken cancellationToken = default)
    {
        EnrichFromHttpContext(entry);
        await _persistAsync(entry, cancellationToken);
    }

    public async Task RecordCreateAsync(string entityName, string entityId,
        string? description = null, string? module = null,
        CancellationToken cancellationToken = default)
    {
        var (userId, email, role) = GetCurrentUser();
        await RecordAsync(new AuditEntry
        {
            UserId = userId,
            UserEmail = email,
            UserRole = role,
            Action = AuditActions.Create,
            EntityName = entityName,
            EntityId = entityId,
            Description = description ?? $"{entityName} {entityId} created.",
            Module = module
        }, cancellationToken);
    }

    public async Task RecordUpdateAsync(string entityName, string entityId,
        string? changes = null, string? description = null, string? module = null,
        CancellationToken cancellationToken = default)
    {
        var (userId, email, role) = GetCurrentUser();
        await RecordAsync(new AuditEntry
        {
            UserId = userId,
            UserEmail = email,
            UserRole = role,
            Action = AuditActions.Update,
            EntityName = entityName,
            EntityId = entityId,
            Changes = changes,
            Description = description ?? $"{entityName} {entityId} updated.",
            Module = module
        }, cancellationToken);
    }

    public async Task RecordDeleteAsync(string entityName, string entityId,
        string? description = null, string? module = null,
        CancellationToken cancellationToken = default)
    {
        var (userId, email, role) = GetCurrentUser();
        await RecordAsync(new AuditEntry
        {
            UserId = userId,
            UserEmail = email,
            UserRole = role,
            Action = AuditActions.Delete,
            EntityName = entityName,
            EntityId = entityId,
            Description = description ?? $"{entityName} {entityId} deleted.",
            Module = module
        }, cancellationToken);
    }

    public async Task RecordLoginAsync(string userId, string userEmail,
        string? userRole = null, CancellationToken cancellationToken = default)
    {
        await RecordAsync(new AuditEntry
        {
            UserId = userId,
            UserEmail = userEmail,
            UserRole = userRole,
            Action = AuditActions.Login,
            EntityName = "User",
            EntityId = userId,
            Description = $"User {userEmail} logged in.",
            Module = "Authentication"
        }, cancellationToken);
    }

    public async Task RecordLogoutAsync(string userId, string userEmail,
        CancellationToken cancellationToken = default)
    {
        await RecordAsync(new AuditEntry
        {
            UserId = userId,
            UserEmail = userEmail,
            Action = AuditActions.Logout,
            EntityName = "User",
            EntityId = userId,
            Description = $"User {userEmail} logged out.",
            Module = "Authentication"
        }, cancellationToken);
    }

    public async Task RecordAccessAsync(string module, string? description = null,
        CancellationToken cancellationToken = default)
    {
        var (userId, email, role) = GetCurrentUser();
        await RecordAsync(new AuditEntry
        {
            UserId = userId,
            UserEmail = email,
            UserRole = role,
            Action = AuditActions.Access,
            Description = description ?? $"Accessed module: {module}.",
            Module = module
        }, cancellationToken);
    }

    private void EnrichFromHttpContext(AuditEntry entry)
    {
        var httpContext = _httpContextAccessor?.HttpContext;
        if (httpContext == null) return;

        if (string.IsNullOrWhiteSpace(entry.IpAddress))
            entry.IpAddress = httpContext.Connection.RemoteIpAddress?.ToString();

        if (string.IsNullOrWhiteSpace(entry.UserAgent))
            entry.UserAgent = httpContext.Request.Headers.UserAgent.ToString();

        if (string.IsNullOrWhiteSpace(entry.RequestPath))
            entry.RequestPath = httpContext.Request.Path;

        if (string.IsNullOrWhiteSpace(entry.HttpMethod))
            entry.HttpMethod = httpContext.Request.Method;
    }

    private (string? userId, string? email, string? role) GetCurrentUser()
    {
        var user = _httpContextAccessor?.HttpContext?.User;
        if (user?.Identity?.IsAuthenticated != true)
            return (null, null, null);

        var userId = user.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var email = user.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
        var role = user.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
        return (userId, email, role);
    }
}

/// <summary>
/// Extension methods for registering audit services.
/// </summary>
public static class AuditServiceExtensions
{
    /// <summary>
    /// Registers the audit service with the DI container.
    /// Requires a persistence function to be provided (e.g., saving to DbContext).
    /// </summary>
    /// <example>
    /// services.AddHmsAuditing(async (entry, ct) => {
    ///     dbContext.Set&lt;AuditEntry&gt;().Add(entry);
    ///     await dbContext.SaveChangesAsync(ct);
    /// });
    /// </example>
    public static IServiceCollection AddHmsAuditing(
        this IServiceCollection services,
        Func<AuditEntry, CancellationToken, Task> persistAsync)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(persistAsync);

        services.AddHttpContextAccessor();
        services.AddScoped<IAuditService>(sp =>
        {
            var httpContextAccessor = sp.GetRequiredService<IHttpContextAccessor>();
            return new AuditService(persistAsync, httpContextAccessor);
        });

        return services;
    }
}
