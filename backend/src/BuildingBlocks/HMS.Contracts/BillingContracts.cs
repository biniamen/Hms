namespace HMS.Contracts;

public sealed record InvoiceDto(Guid Id, Guid PatientId, string Description, decimal Amount, string Status, DateTime CreatedAtUtc);
public sealed record CreateInvoiceRequest(Guid PatientId, string Description, decimal Amount);
public sealed record PaymentRequest(Guid InvoiceId, decimal Amount, string Method);
