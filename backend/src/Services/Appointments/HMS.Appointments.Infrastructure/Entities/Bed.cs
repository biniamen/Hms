using HMS.SharedKernel;

namespace HMS.Appointments.Infrastructure.Entities;

public class Bed : Entity
{
    public string Ward { get; set; } = string.Empty;
    public string Room { get; set; } = string.Empty;
    public string BedNumber { get; set; } = string.Empty;
    public bool IsAvailable { get; set; }
}
