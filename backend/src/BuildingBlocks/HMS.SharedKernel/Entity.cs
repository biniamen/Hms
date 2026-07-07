namespace HMS.SharedKernel;

public abstract class Entity
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public DateTime CreatedAtUtc { get; init; } = DateTime.UtcNow;
    public DateTime? UpdatedAtUtc { get; set; }
}
