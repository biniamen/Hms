namespace HMS.Contracts;

public sealed record ClinicalEncounterDto(Guid Id, Guid PatientId, Guid DoctorId, string VisitType, string ChiefComplaint, string Assessment, string Plan, DateTime EncounterAtUtc);
public sealed record CreateClinicalEncounterRequest(Guid PatientId, Guid DoctorId, string VisitType, string ChiefComplaint, string Assessment, string Plan);
public sealed record VitalSignDto(Guid Id, Guid PatientId, decimal TemperatureC, int Pulse, int RespiratoryRate, string BloodPressure, decimal WeightKg, decimal HeightCm, DateTime RecordedAtUtc);
public sealed record CreateVitalSignRequest(Guid PatientId, decimal TemperatureC, int Pulse, int RespiratoryRate, string BloodPressure, decimal WeightKg, decimal HeightCm);
public sealed record DiagnosisDto(Guid Id, Guid PatientId, Guid DoctorId, string Code, string Description, string Severity, DateTime DiagnosedAtUtc);
public sealed record CreateDiagnosisRequest(Guid PatientId, Guid DoctorId, string Code, string Description, string Severity);
public sealed record PrescriptionDto(Guid Id, Guid PatientId, Guid DoctorId, string Medication, string Instructions, DateTime OrderedAtUtc);
public sealed record CreatePrescriptionRequest(Guid PatientId, Guid DoctorId, string Medication, string Instructions);
public sealed record LabRequestDto(
    Guid Id,
    Guid PatientId,
    Guid DoctorId,
    string TestName,
    string Status,
    DateTime OrderedAtUtc,
    string Category,
    string Priority,
    string SpecimenType,
    string ClinicalNote,
    string ResultSummary,
    string ResultValue,
    string ReferenceRange,
    string ResultFlag,
    string ResultNotes,
    string PerformedBy,
    string VerifiedBy,
    DateTime? CollectedAtUtc,
    DateTime? ResultedAtUtc,
    DateTime UpdatedAtUtc);
public sealed record CreateLabRequestRequest(
    Guid PatientId,
    Guid DoctorId,
    string TestName,
    string? Category = null,
    string? Priority = null,
    string? SpecimenType = null,
    string? ClinicalNote = null);
public sealed record UpdateLabResultRequest(
    string Status,
    string? SpecimenType,
    string? ResultSummary,
    string? ResultValue,
    string? ReferenceRange,
    string? ResultFlag,
    string? ResultNotes,
    string? PerformedBy,
    string? VerifiedBy,
    DateTime? CollectedAtUtc,
    DateTime? ResultedAtUtc);
