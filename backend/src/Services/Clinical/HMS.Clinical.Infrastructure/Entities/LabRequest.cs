using HMS.SharedKernel;

namespace HMS.Clinical.Infrastructure.Entities;

public class LabRequest : Entity
{
    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public string TestName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}
