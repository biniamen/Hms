using HMS.SharedKernel;

namespace HMS.Billing.Infrastructure.Entities;

public class Invoice : Entity
{
    public Guid PatientId { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Status { get; set; } = string.Empty;
}
