namespace HMS.SharedKernel.Enums;

/// <summary>
/// Standard lifecycle status for enterprise records and appointments.
/// </summary>
public enum RecordStatus
{
    Open = 0,
    InProgress = 1,
    UnderReview = 2,
    Completed = 3,
    Cancelled = 4,
    Closed = 5
}

/// <summary>
/// Priority levels for tasks, appointments, and enterprise records.
/// </summary>
public enum Priority
{
    Low = 0,
    Normal = 1,
    High = 2,
    Urgent = 3,
    Critical = 4
}

/// <summary>
/// Gender options for patient registration.
/// </summary>
public enum Gender
{
    Male = 0,
    Female = 1,
    Other = 2
}

/// <summary>
/// Blood type classification.
/// </summary>
public enum BloodType
{
    APositive = 0,
    ANegative = 1,
    BPositive = 2,
    BNegative = 3,
    ABPositive = 4,
    ABNegative = 5,
    OPositive = 6,
    ONegative = 7
}

/// <summary>
/// Appointment status values used in the queue management system.
/// </summary>
public enum AppointmentStatus
{
    Scheduled = 0,
    Waiting = 1,
    InService = 2,
    Completed = 3,
    Cancelled = 4,
    NoShow = 5
}

/// <summary>
/// Payment method options.
/// </summary>
public enum PaymentMethod
{
    Cash = 0,
    Card = 1,
    MobileMoney = 2,
    BankTransfer = 3,
    Insurance = 4
}

/// <summary>
/// Invoice payment status.
/// </summary>
public enum InvoiceStatus
{
    Unpaid = 0,
    PartiallyPaid = 1,
    Paid = 2,
    Overdue = 3,
    Cancelled = 4
}
