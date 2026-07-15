using HMS.SharedKernel;

namespace HMS.Billing.Infrastructure.Entities;

public class Payment : Entity
{
    public Guid InvoiceId { get; set; }
    public decimal Amount { get; set; }
    public string Method { get; set; } = string.Empty;
    public DateTime PaidAtUtc { get; set; } = DateTime.UtcNow;
}
