using HMS.SharedKernel;

namespace HMS.Clinical.Infrastructure.Entities;

public class Diagnosis : Entity
{
    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
}
