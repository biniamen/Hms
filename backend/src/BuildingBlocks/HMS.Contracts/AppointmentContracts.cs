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

public sealed record BedDto(Guid Id, string Ward, string Room, string BedNumber, bool IsAvailable);
public sealed record CreateBedRequest(string Ward, string Room, string BedNumber, bool IsAvailable = true);
public sealed record BedStatusUpdateRequest(bool IsAvailable);
public sealed record QueueSummaryDto(Guid DoctorId, string DoctorName, string Department, int Scheduled, int Waiting, int InService, int Completed);
public sealed record AppointmentStatusUpdateRequest(string Status);
