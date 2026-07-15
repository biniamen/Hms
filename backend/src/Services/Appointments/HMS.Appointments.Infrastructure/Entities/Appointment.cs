using HMS.SharedKernel;

namespace HMS.Appointments.Infrastructure.Entities;

public class Appointment : Entity
{
    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public DateTime StartsAtUtc { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
}
