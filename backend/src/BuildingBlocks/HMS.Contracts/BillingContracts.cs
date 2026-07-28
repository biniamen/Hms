using System.ComponentModel.DataAnnotations;

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

public sealed record InvoiceItemRequest(
    string ServiceCode,
    [Required(ErrorMessage = "Description is required")] string Description,
    [Range(1, int.MaxValue, ErrorMessage = "Quantity must be at least 1")] int Quantity,
    [Range(0.01, double.MaxValue, ErrorMessage = "Unit price must be greater than 0")] decimal UnitPrice,
    [Range(0, double.MaxValue, ErrorMessage = "Discount cannot be negative")] decimal Discount);

public sealed record CreateInvoiceRequest(
    [Required] Guid PatientId,
    [Required(ErrorMessage = "Description is required")] string Description,
    [Range(0, double.MaxValue, ErrorMessage = "Amount cannot be negative")] decimal Amount,
    [Range(0, double.MaxValue, ErrorMessage = "Discount cannot be negative")] decimal Discount,
    [Range(0, double.MaxValue, ErrorMessage = "Tax cannot be negative")] decimal Tax,
    string PaymentType,
    string? InsuranceProvider,
    InvoiceItemRequest[]? Items);

public sealed record UpdateInvoiceStatusRequest(
    [Required(ErrorMessage = "Status is required")] string Status);

public sealed record PaymentDto(Guid Id, Guid InvoiceId, string ReceiptNumber, decimal Amount, string Method, string? Reference, string ReceivedBy, DateTime PaidAtUtc);

public sealed record PaymentRequest(
    [Required] Guid InvoiceId,
    [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than 0")] decimal Amount,
    [Required(ErrorMessage = "Payment method is required")] string Method,
    string? Reference,
    string? ReceivedBy);

public sealed record ReceiptDto(Guid Id, string ReceiptNumber, string InvoiceNumber, Guid InvoiceId, Guid PatientId, decimal Amount, string Method, string? Reference, string ReceivedBy, DateTime PaidAtUtc, decimal BalanceAfterPayment);
