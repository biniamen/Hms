namespace HMS.Contracts;

public sealed record AppointmentDto(Guid Id, Guid PatientId, Guid DoctorId, DateTime StartsAtUtc, string Status, string Reason);
public sealed record CreateAppointmentRequest(Guid PatientId, Guid DoctorId, DateTime StartsAtUtc, string Reason);
public sealed record BedDto(Guid Id, string Ward, string Room, string BedNumber, bool IsAvailable);
