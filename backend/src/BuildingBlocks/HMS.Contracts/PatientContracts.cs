namespace HMS.Contracts;

public sealed record PatientDto(
    Guid Id,
    string Mrn,
    string FirstName,
    string LastName,
    string Phone,
    string Gender,
    DateOnly DateOfBirth,
    string? Address,
    string? BloodType,
    string? EmergencyContactName,
    string? EmergencyContactPhone,
    string? PhotoDataUrl);

public sealed record CreatePatientRequest(
    string FirstName,
    string LastName,
    string Phone,
    string Gender,
    DateOnly DateOfBirth,
    string? Address,
    string? BloodType,
    string? EmergencyContactName,
    string? EmergencyContactPhone,
    string? PhotoDataUrl);
