using System.ComponentModel.DataAnnotations;

namespace HMS.Contracts;

public sealed record ClinicalEncounterDto(Guid Id, Guid PatientId, Guid DoctorId, string VisitType, string ChiefComplaint, string Assessment, string Plan, DateTime EncounterAtUtc);

public sealed record CreateClinicalEncounterRequest(
    [Required] Guid PatientId,
    [Required] Guid DoctorId,
    string VisitType,
    string ChiefComplaint,
    string Assessment,
    string Plan);

public sealed record VitalSignDto(Guid Id, Guid PatientId, decimal TemperatureC, int Pulse, int RespiratoryRate, string BloodPressure, decimal WeightKg, decimal HeightCm, DateTime RecordedAtUtc);

public sealed record CreateVitalSignRequest(
    [Required] Guid PatientId,
    decimal TemperatureC,
    int Pulse,
    int RespiratoryRate,
    string BloodPressure,
    decimal WeightKg,
    decimal HeightCm);

public sealed record DiagnosisDto(Guid Id, Guid PatientId, Guid DoctorId, string Code, string Description, string Severity, DateTime DiagnosedAtUtc);

public sealed record CreateDiagnosisRequest(
    [Required] Guid PatientId,
    [Required] Guid DoctorId,
    string Code,
    string Description,
    string Severity);

public sealed record PrescriptionDto(Guid Id, Guid PatientId, Guid DoctorId, string Medication, string Instructions, DateTime OrderedAtUtc);

public sealed record CreatePrescriptionRequest(
    [Required] Guid PatientId,
    [Required] Guid DoctorId,
    [Required(ErrorMessage = "Medication name is required")] string Medication,
    string Instructions);

public sealed record LabRequestDto(
    Guid Id,
    Guid PatientId,
    Guid DoctorId,
    string TestName,
    IReadOnlyList<Guid> TestCatalogIds,
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
    string ResultItemsJson,
    DateTime? CollectedAtUtc,
    DateTime? ResultedAtUtc,
    DateTime UpdatedAtUtc);

public sealed record CreateLabRequestRequest(
    [Required] Guid PatientId,
    [Required] Guid DoctorId,
    [Required(ErrorMessage = "Test name is required")] string TestName,
    IReadOnlyList<Guid>? TestCatalogIds = null,
    string? Category = null,
    string? Priority = null,
    string? SpecimenType = null,
    string? ClinicalNote = null);

public sealed record UpdateLabResultRequest(
    [Required(ErrorMessage = "Status is required")] string Status,
    string? SpecimenType,
    string? ResultSummary,
    string? ResultValue,
    string? ReferenceRange,
    string? ResultFlag,
    string? ResultNotes,
    string? PerformedBy,
    string? VerifiedBy,
    string? ResultItemsJson,
    DateTime? CollectedAtUtc,
    DateTime? ResultedAtUtc);

public sealed record DiagnosticTestDto(
    Guid Id,
    string GroupName,
    string SubGroup,
    string TestName,
    string SpecimenType,
    string Unit,
    string ReferenceRange,
    int SortOrder,
    bool IsActive);

public sealed record CreateDiagnosticTestRequest(
    [Required(ErrorMessage = "Group name is required")] string GroupName,
    string? SubGroup,
    [Required(ErrorMessage = "Test name is required")] string TestName,
    string? SpecimenType,
    string? Unit,
    string? ReferenceRange,
    int SortOrder = 0,
    bool IsActive = true);
