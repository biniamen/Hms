namespace HMS.Contracts;

public sealed record ClinicalEncounterDto(Guid Id, Guid PatientId, Guid DoctorId, string VisitType, string ChiefComplaint, string Assessment, string Plan, DateTime EncounterAtUtc);
public sealed record CreateClinicalEncounterRequest(Guid PatientId, Guid DoctorId, string VisitType, string ChiefComplaint, string Assessment, string Plan);
public sealed record VitalSignDto(Guid Id, Guid PatientId, decimal TemperatureC, int Pulse, int RespiratoryRate, string BloodPressure, decimal WeightKg, decimal HeightCm, DateTime RecordedAtUtc);
public sealed record CreateVitalSignRequest(Guid PatientId, decimal TemperatureC, int Pulse, int RespiratoryRate, string BloodPressure, decimal WeightKg, decimal HeightCm);
public sealed record DiagnosisDto(Guid Id, Guid PatientId, Guid DoctorId, string Code, string Description, string Severity, DateTime DiagnosedAtUtc);
public sealed record CreateDiagnosisRequest(Guid PatientId, Guid DoctorId, string Code, string Description, string Severity);
public sealed record PrescriptionDto(Guid Id, Guid PatientId, Guid DoctorId, string Medication, string Instructions, DateTime OrderedAtUtc);
public sealed record CreatePrescriptionRequest(Guid PatientId, Guid DoctorId, string Medication, string Instructions);
public sealed record LabRequestDto(Guid Id, Guid PatientId, Guid DoctorId, string TestName, string Status, DateTime OrderedAtUtc);
public sealed record CreateLabRequestRequest(Guid PatientId, Guid DoctorId, string TestName);
