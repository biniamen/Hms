using System.ComponentModel.DataAnnotations;

namespace HMS.Contracts;

public sealed record DoctorServicePriceDto(
    Guid Id,
    Guid DoctorId,
    string ServiceCode,
    string ServiceName,
    decimal Amount,
    string Currency,
    int ValidityDays,
    bool IsActive,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public sealed record DoctorServicePriceQuoteDto(
    Guid DoctorId,
    string ServiceCode,
    string ServiceName,
    decimal Amount,
    string Currency,
    int ValidityDays,
    bool IsActive,
    bool ChargeRequired,
    DateTime? CoveredUntilUtc,
    string Message);

public sealed record UpsertDoctorServicePriceRequest(
    [Required(ErrorMessage = "Service name is required")]
    [StringLength(120, MinimumLength = 2)] string ServiceName,
    [Range(0.01, double.MaxValue, ErrorMessage = "Price must be greater than 0")] decimal Amount,
    [Required(ErrorMessage = "Currency is required")]
    [RegularExpression("^[A-Za-z]{3}$", ErrorMessage = "Currency must be a three-letter ISO code, for example ETB")]
    string Currency,
    [Range(1, 365, ErrorMessage = "Validity days must be between 1 and 365")]
    int ValidityDays,
    bool IsActive);

public sealed record UpdateDoctorServicePriceStatusRequest(bool IsActive);

public sealed record InvoiceItemDto(
    Guid Id,
    string ServiceCode,
    string Description,
    int Quantity,
    decimal UnitPrice,
    decimal Discount,
    decimal LineTotal,
    string? ReferenceType,
    Guid? ReferenceId,
    DateTime? ServiceDateUtc);

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
    decimal InsuranceCoveredAmount,
    decimal Balance,
    string Status,
    string PaymentType,
    string? InsuranceProvider,
    DateTime DueAtUtc,
    DateTime CreatedAtUtc,
    InvoiceItemDto[] Items);

public sealed record InvoiceItemRequest(
    string ServiceCode,
    [Required(ErrorMessage = "Description is required")] string Description,
    [Range(1, int.MaxValue, ErrorMessage = "Quantity must be at least 1")] int Quantity,
    [Range(0.01, double.MaxValue, ErrorMessage = "Unit price must be greater than 0")] decimal UnitPrice,
    [Range(0, double.MaxValue, ErrorMessage = "Discount cannot be negative")] decimal Discount,
    string? ReferenceType = null,
    Guid? ReferenceId = null,
    DateTime? ServiceDateUtc = null);

public sealed record CreateInvoiceRequest(
    [Required] Guid PatientId,
    [Required(ErrorMessage = "Description is required")] string Description,
    [Range(0, double.MaxValue, ErrorMessage = "Amount cannot be negative")] decimal Amount,
    [Range(0, double.MaxValue, ErrorMessage = "Discount cannot be negative")] decimal Discount,
    [Range(0, double.MaxValue, ErrorMessage = "Tax cannot be negative")] decimal Tax,
    string PaymentType,
    string? InsuranceProvider,
    InvoiceItemRequest[]? Items,
    decimal? InsuranceCoveredAmount = null);

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
