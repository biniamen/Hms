namespace HMS.Contracts;

public sealed record AppointmentDto(
    Guid Id,
    Guid PatientId,
    Guid DoctorId,
    DateTime StartsAtUtc,
    string Status,
    string Reason,
    string Department,
    string AppointmentType,
    string Priority,
    string? Notes,
    int QueueNumber,
    int WaitingAhead,
    string QueueStatus);

public sealed record CreateAppointmentRequest(
    Guid PatientId,
    Guid DoctorId,
    DateTime StartsAtUtc,
    string Reason,
    string Department,
    string AppointmentType,
    string Priority,
    string? Notes);

public sealed record BedDto(
    Guid Id,
    string Ward,
    string Room,
    string BedNumber,
    bool IsAvailable,
    string Category,
    decimal DailyRate,
    string Currency,
    Guid? CurrentAdmissionId,
    Guid? CurrentPatientId,
    string? CurrentPatientName,
    string? CurrentPatientMrn,
    DateTime? AdmittedAtUtc);

public sealed record CreateBedRequest(
    string Ward,
    string Room,
    string BedNumber,
    bool IsAvailable = true,
    string Category = "Normal",
    decimal DailyRate = 0,
    string Currency = "ETB");

public sealed record BedStatusUpdateRequest(bool IsAvailable);

public sealed record AssignBedRequest(Guid PatientId, string? Notes);

public sealed record DischargeBedRequest(DateTime? DischargedAtUtc, string? Notes);

public sealed record BedAdmissionDto(
    Guid Id,
    Guid PatientId,
    string PatientName,
    string PatientMrn,
    Guid BedId,
    string Ward,
    string Room,
    string BedNumber,
    string BedCategory,
    decimal DailyRate,
    string Currency,
    DateTime AdmittedAtUtc,
    DateTime? DischargedAtUtc,
    int ChargeableDays,
    decimal BedCharge,
    string Status,
    string? Notes);

public sealed record BedDischargeDto(BedDto Bed, BedAdmissionDto Admission);
public sealed record QueueSummaryDto(Guid DoctorId, string DoctorName, string Department, int Scheduled, int Waiting, int InService, int Completed);
public sealed record AppointmentStatusUpdateRequest(string Status);
