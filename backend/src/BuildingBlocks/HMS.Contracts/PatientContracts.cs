using System.ComponentModel.DataAnnotations;

namespace HMS.Contracts;

public sealed record PatientDto(
    Guid Id,
    string Mrn,
    string FirstName,
    string LastName,
    string? Email,
    string Phone,
    string Gender,
    DateOnly DateOfBirth,
    string? NationalId,
    string? MaritalStatus,
    string? Occupation,
    string? Address,
    string? BloodType,
    Guid? InsuranceCompanyId,
    string? InsuranceCompanyName,
    string? EmployerName,
    string? InsurancePlan,
    string? InsuranceProvider,
    string? InsurancePolicyNumber,
    string? EmergencyContactName,
    string? EmergencyContactPhone,
    string? PhotoDataUrl,
    decimal? InsuranceCoveragePercent,
    string IdentityStatus,
    bool IsIdentityPending,
    string? TemporaryName,
    int? EstimatedAgeYears,
    string? BroughtBy,
    string? IncidentType,
    string? IncidentLocation,
    string? TriageLevel,
    bool MedicoLegalCase,
    string? EmergencyNotes);

public sealed record CreatePatientRequest(
    [Required(ErrorMessage = "First name is required")]
    [StringLength(100, MinimumLength = 1)] string FirstName,
    [Required(ErrorMessage = "Last name is required")]
    [StringLength(100, MinimumLength = 1)] string LastName,
    [EmailAddress(ErrorMessage = "Invalid email format")] string? Email,
    [Required(ErrorMessage = "Phone is required")]
    [Phone(ErrorMessage = "Invalid phone number")] string Phone,
    [Required(ErrorMessage = "Gender is required")] string Gender,
    DateOnly DateOfBirth,
    string? NationalId,
    string? MaritalStatus,
    string? Occupation,
    string? Address,
    string? BloodType,
    Guid? InsuranceCompanyId,
    string? EmployerName,
    string? InsurancePlan,
    string? InsuranceProvider,
    string? InsurancePolicyNumber,
    string? EmergencyContactName,
    string? EmergencyContactPhone,
    string? PhotoDataUrl);

public sealed record UpdatePatientRequest(
    [Required(ErrorMessage = "First name is required")]
    [StringLength(100, MinimumLength = 1)] string FirstName,
    [Required(ErrorMessage = "Last name is required")]
    [StringLength(100, MinimumLength = 1)] string LastName,
    [EmailAddress(ErrorMessage = "Invalid email format")] string? Email,
    [Required(ErrorMessage = "Phone is required")]
    [Phone(ErrorMessage = "Invalid phone number")] string Phone,
    [Required(ErrorMessage = "Gender is required")] string Gender,
    DateOnly DateOfBirth,
    string? NationalId,
    string? MaritalStatus,
    string? Occupation,
    string? Address,
    string? BloodType,
    Guid? InsuranceCompanyId,
    string? EmployerName,
    string? InsurancePlan,
    string? InsuranceProvider,
    string? InsurancePolicyNumber,
    string? EmergencyContactName,
    string? EmergencyContactPhone,
    string? PhotoDataUrl);

public sealed record CreateUnknownEmergencyPatientRequest(
    string? Gender,
    [Range(0, 120, ErrorMessage = "Estimated age must be between 0 and 120")]
    int? EstimatedAgeYears,
    [Required(ErrorMessage = "Brought by is required")] string BroughtBy,
    [Required(ErrorMessage = "Incident type is required")] string IncidentType,
    [Required(ErrorMessage = "Incident location is required")] string IncidentLocation,
    [Required(ErrorMessage = "Triage level is required")] string TriageLevel,
    Guid DoctorId,
    string? Department,
    string? EmergencyNotes,
    bool MedicoLegalCase,
    string? PhotoDataUrl);

public sealed record UnknownEmergencyPatientDto(
    PatientDto Patient,
    AppointmentDto Appointment);

public sealed record InsuranceCompanyDto(
    Guid Id,
    string Name,
    string PayerCode,
    string ContactPerson,
    string Phone,
    string Email,
    string Address,
    string CoverageType,
    decimal CoveragePercent,
    bool SpouseCoverageAllowed,
    bool IsActive);

public sealed record CreateInsuranceCompanyRequest(
    [Required(ErrorMessage = "Company name is required")] string Name,
    [Required(ErrorMessage = "Payer code is required")] string PayerCode,
    string ContactPerson,
    [Required(ErrorMessage = "Phone is required")] string Phone,
    [EmailAddress(ErrorMessage = "Invalid email format")] string Email,
    string Address,
    string CoverageType,
    [Range(0, 100, ErrorMessage = "Coverage percent must be between 0 and 100")]
    decimal CoveragePercent,
    bool SpouseCoverageAllowed);
