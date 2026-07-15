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
    string? PhotoDataUrl);

public sealed record CreatePatientRequest(
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
    string? EmployerName,
    string? InsurancePlan,
    string? InsuranceProvider,
    string? InsurancePolicyNumber,
    string? EmergencyContactName,
    string? EmergencyContactPhone,
    string? PhotoDataUrl);

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
    bool IsActive);

public sealed record CreateInsuranceCompanyRequest(
    string Name,
    string PayerCode,
    string ContactPerson,
    string Phone,
    string Email,
    string Address,
    string CoverageType,
    decimal CoveragePercent);
