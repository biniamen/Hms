namespace HMS.Contracts;

public sealed record InvoiceItemDto(Guid Id, string ServiceCode, string Description, int Quantity, decimal UnitPrice, decimal Discount, decimal LineTotal);

public sealed record InvoiceDto(
    Guid Id,
    string InvoiceNumber,
    Guid PatientId,
    string Description,
    decimal Subtotal,
    decimal Discount,
    decimal Tax,
    decimal Total,
    decimal Paid,
    decimal Balance,
    string Status,
    DateTime DueAtUtc,
    DateTime CreatedAtUtc,
    InvoiceItemDto[] Items);

public sealed record InvoiceItemRequest(string ServiceCode, string Description, int Quantity, decimal UnitPrice, decimal Discount);
public sealed record CreateInvoiceRequest(Guid PatientId, string Description, decimal Amount, decimal Discount, decimal Tax, string PaymentType, string? InsuranceProvider, InvoiceItemRequest[]? Items);

public sealed record PaymentDto(Guid Id, Guid InvoiceId, string ReceiptNumber, decimal Amount, string Method, string? Reference, string ReceivedBy, DateTime PaidAtUtc);
public sealed record PaymentRequest(Guid InvoiceId, decimal Amount, string Method, string? Reference, string? ReceivedBy);
public sealed record ReceiptDto(Guid Id, string ReceiptNumber, string InvoiceNumber, Guid InvoiceId, Guid PatientId, decimal Amount, string Method, string? Reference, string ReceivedBy, DateTime PaidAtUtc, decimal BalanceAfterPayment);
