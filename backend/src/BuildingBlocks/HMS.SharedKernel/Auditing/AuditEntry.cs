using System.ComponentModel.DataAnnotations;

namespace HMS.SharedKernel.Auditing;

/// <summary>
/// Represents a single auditable action performed within the system.
/// Stores who did what, when, and from where.
/// </summary>
public sealed class AuditEntry
{
    /// <summary>Unique identifier for this audit record.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>ID of the user who performed the action.</summary>
    [MaxLength(64)]
    public string? UserId { get; set; }

    /// <summary>Email of the user who performed the action.</summary>
    [MaxLength(256)]
    public string? UserEmail { get; set; }

    /// <summary>Role of the user at the time of action.</summary>
    [MaxLength(64)]
    public string? UserRole { get; set; }

    /// <summary>The type of action performed (Create, Update, Delete, Login, Logout, Access).</summary>
    [MaxLength(32)]
    public required string Action { get; set; }

    /// <summary>The name of the entity being acted upon (e.g., "Patient", "Employee", "Invoice").</summary>
    [MaxLength(128)]
    public string? EntityName { get; set; }

    /// <summary>The ID of the entity being acted upon.</summary>
    [MaxLength(64)]
    public string? EntityId { get; set; }

    /// <summary>Brief description of what happened.</summary>
    [MaxLength(512)]
    public string? Description { get; set; }

    /// <summary>JSON serialization of the changes (old/new values for updates).</summary>
    public string? Changes { get; set; }

    /// <summary>The module or service area where the action occurred.</summary>
    [MaxLength(128)]
    public string? Module { get; set; }

    /// <summary>IP address of the client.</summary>
    [MaxLength(45)]
    public string? IpAddress { get; set; }

    /// <summary>User-agent of the client.</summary>
    [MaxLength(512)]
    public string? UserAgent { get; set; }

    /// <summary>Request path that triggered this audit.</summary>
    [MaxLength(512)]
    public string? RequestPath { get; set; }

    /// <summary>HTTP method used (GET, POST, PUT, DELETE).</summary>
    [MaxLength(10)]
    public string? HttpMethod { get; set; }

    /// <summary>UTC timestamp when this audit entry was created.</summary>
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Standard audit action constants.
/// </summary>
public static class AuditActions
{
    public const string Create = "CREATE";
    public const string Update = "UPDATE";
    public const string Delete = "DELETE";
    public const string Login = "LOGIN";
    public const string Logout = "LOGOUT";
    public const string Access = "ACCESS";
    public const string Export = "EXPORT";
    public const string Print = "PRINT";
    public const string StatusChange = "STATUS_CHANGE";
    public const string PasswordReset = "PASSWORD_RESET";
    public const string View = "VIEW";
}

/// <summary>
/// Service interface for recording audit entries.
/// </summary>
public interface IAuditService
{
    /// <summary>Records an audit entry asynchronously.</summary>
    Task RecordAsync(AuditEntry entry, CancellationToken cancellationToken = default);

    /// <summary>Records a create action.</summary>
    Task RecordCreateAsync(string entityName, string entityId, string? description = null,
        string? module = null, CancellationToken cancellationToken = default);

    /// <summary>Records an update action with change details.</summary>
    Task RecordUpdateAsync(string entityName, string entityId, string? changes = null,
        string? description = null, string? module = null, CancellationToken cancellationToken = default);

    /// <summary>Records a delete action.</summary>
    Task RecordDeleteAsync(string entityName, string entityId, string? description = null,
        string? module = null, CancellationToken cancellationToken = default);

    /// <summary>Records a login action.</summary>
    Task RecordLoginAsync(string userId, string userEmail, string? userRole = null,
        CancellationToken cancellationToken = default);

    /// <summary>Records a logout action.</summary>
    Task RecordLogoutAsync(string userId, string userEmail,
        CancellationToken cancellationToken = default);

    /// <summary>Records a module access action.</summary>
    Task RecordAccessAsync(string module, string? description = null,
        CancellationToken cancellationToken = default);
}
