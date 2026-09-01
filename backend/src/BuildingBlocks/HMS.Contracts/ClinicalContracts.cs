using System.ComponentModel.DataAnnotations;

namespace HMS.Contracts;

public sealed record ClinicalEncounterDto(Guid Id, Guid PatientId, Guid DoctorId, string VisitType, string ChiefComplaint, string Assessment, string Plan, DateTime EncounterAtUtc);

public sealed record CreateClinicalEncounterRequest(
    [Required] Guid PatientId,
    [Required] Guid DoctorId,
    [Required(ErrorMessage = "Visit type is required")]
    [StringLength(80, MinimumLength = 2, ErrorMessage = "Visit type must be between 2 and 80 characters")]
    string VisitType,
    [Required(ErrorMessage = "Chief complaint is required")]
    [StringLength(1000, MinimumLength = 3, ErrorMessage = "Chief complaint must be between 3 and 1000 characters")]
    string ChiefComplaint,
    [Required(ErrorMessage = "Assessment is required")]
    [StringLength(4000, MinimumLength = 3, ErrorMessage = "Assessment must be between 3 and 4000 characters")]
    string Assessment,
    [Required(ErrorMessage = "Plan is required")]
    [StringLength(4000, MinimumLength = 3, ErrorMessage = "Plan must be between 3 and 4000 characters")]
    string Plan);

public sealed record VitalSignDto(Guid Id, Guid PatientId, decimal TemperatureC, int Pulse, int RespiratoryRate, string BloodPressure, decimal WeightKg, decimal HeightCm, DateTime RecordedAtUtc);

public sealed record CreateVitalSignRequest(
    [Required] Guid PatientId,
    [Range(30, 45, ErrorMessage = "Temperature must be between 30 and 45 C")]
    decimal TemperatureC,
    [Range(20, 240, ErrorMessage = "Pulse must be between 20 and 240 bpm")]
    int Pulse,
    [Range(5, 80, ErrorMessage = "Respiratory rate must be between 5 and 80 breaths/min")]
    int RespiratoryRate,
    [Required(ErrorMessage = "Blood pressure is required")]
    [RegularExpression(@"^\d{2,3}/\d{2,3}$", ErrorMessage = "Blood pressure must use systolic/diastolic format, for example 120/80")]
    string BloodPressure,
    [Range(1, 350, ErrorMessage = "Weight must be between 1 and 350 kg")]
    decimal WeightKg,
    [Range(30, 250, ErrorMessage = "Height must be between 30 and 250 cm")]
    decimal HeightCm);

public sealed record DiagnosisDto(Guid Id, Guid PatientId, Guid DoctorId, string Code, string Description, string Severity, DateTime DiagnosedAtUtc);

public sealed record CreateDiagnosisRequest(
    [Required] Guid PatientId,
    [Required] Guid DoctorId,
    [Required(ErrorMessage = "Diagnosis code is required")]
    [StringLength(80, MinimumLength = 2, ErrorMessage = "Diagnosis code must be between 2 and 80 characters")]
    string Code,
    [Required(ErrorMessage = "Diagnosis description is required")]
    [StringLength(4000, MinimumLength = 3, ErrorMessage = "Diagnosis description must be between 3 and 4000 characters")]
    string Description,
    [Required(ErrorMessage = "Diagnosis severity is required")]
    [StringLength(60, MinimumLength = 2, ErrorMessage = "Diagnosis severity must be between 2 and 60 characters")]
    string Severity);

public sealed record PrescriptionDto(Guid Id, Guid PatientId, Guid DoctorId, string Medication, string Instructions, DateTime OrderedAtUtc);

public sealed record CreatePrescriptionRequest(
    [Required] Guid PatientId,
    [Required] Guid DoctorId,
    [Required(ErrorMessage = "Medication name is required")]
    [StringLength(1000, MinimumLength = 2, ErrorMessage = "Medication summary must be between 2 and 1000 characters")]
    string Medication,
    [StringLength(8000, ErrorMessage = "Prescription instructions cannot exceed 8000 characters")]
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
    decimal Price,
    string Currency,
    bool IsActive);

public sealed record CreateDiagnosticTestRequest(
    [Required(ErrorMessage = "Group name is required")] string GroupName,
    string? SubGroup,
    [Required(ErrorMessage = "Test name is required")] string TestName,
    string? SpecimenType,
    string? Unit,
    string? ReferenceRange,
    int SortOrder = 0,
    [Range(0, double.MaxValue, ErrorMessage = "Diagnostic price cannot be negative")]
    decimal Price = 0,
    [RegularExpression("^[A-Za-z]{3}$", ErrorMessage = "Currency must be a three-letter ISO code, for example ETB")]
    string Currency = "ETB",
    bool IsActive = true);
