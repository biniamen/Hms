namespace HMS.SharedKernel;

/// <summary>
/// Base entity class providing common audit fields for all domain entities.
/// </summary>
public abstract class Entity
{
    /// <summary>Unique identifier for the entity.</summary>
    public Guid Id { get; init; } = Guid.NewGuid();

    /// <summary>UTC timestamp when the entity was created.</summary>
    public DateTime CreatedAtUtc { get; init; } = DateTime.UtcNow;

    /// <summary>UTC timestamp of the last update, if any.</summary>
    public DateTime? UpdatedAtUtc { get; set; }

    /// <summary>ID of the user who created this entity.</summary>
    public Guid? CreatedBy { get; set; }

    /// <summary>ID of the user who last updated this entity.</summary>
    public Guid? UpdatedBy { get; set; }

    /// <summary>IP address of the client that created this entity.</summary>
    public string? CreatedByIp { get; set; }

    /// <summary>Indicates whether this entity is soft-deleted.</summary>
    public bool IsDeleted { get; set; }

    /// <summary>UTC timestamp when this entity was soft-deleted, if any.</summary>
    public DateTime? DeletedAtUtc { get; set; }
}

/// <summary>
/// Marker interface for entities that require audit logging.
/// </summary>
public interface IAuditable
{
    Guid Id { get; }
    DateTime CreatedAtUtc { get; }
    DateTime? UpdatedAtUtc { get; set; }
}
