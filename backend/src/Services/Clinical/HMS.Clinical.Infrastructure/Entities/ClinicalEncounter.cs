using HMS.SharedKernel;

namespace HMS.Clinical.Infrastructure.Entities;

public class ClinicalEncounter : Entity
{
    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public string VisitType { get; set; } = string.Empty;
    public string ChiefComplaint { get; set; } = string.Empty;
    public string Assessment { get; set; } = string.Empty;
    public string Plan { get; set; } = string.Empty;
}
