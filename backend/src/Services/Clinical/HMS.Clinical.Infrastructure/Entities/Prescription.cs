using HMS.SharedKernel;

namespace HMS.Clinical.Infrastructure.Entities;

public class Prescription : Entity
{
    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public string Medication { get; set; } = string.Empty;
    public string Instructions { get; set; } = string.Empty;
}
