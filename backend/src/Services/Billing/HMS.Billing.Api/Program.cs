using HMS.Billing.Infrastructure;
using HMS.Contracts;
using HMS.SharedKernel;
using HMS.SharedKernel.Constants;
using Microsoft.EntityFrameworkCore;
using System.Net.Http.Json;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Services.AddOpenApi();
builder.Services.AddHmsCors(builder.Configuration);
builder.Services.AddHttpClient();

var connectionString = builder.Configuration.RequireConnectionString("BillingDb");

await BillingDatabaseBootstrapper.EnsureDatabaseExistsAsync(connectionString);
await PostgresDatabaseBootstrapper.ResetLegacySchemaIfRequestedAsync(
    connectionString,
    builder.Configuration.GetValue("Database:ResetLegacySchemaOnStartup", false));
builder.Services.AddDbContext<BillingDbContext>(options => options.UseNpgsql(connectionString));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();
app.UseHmsJwtAuthentication("/health", "/openapi");

await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<BillingDbContext>();
    await db.Database.MigrateAsync();
    await BillingSeedData.SeedAsync(db);
}

app.MapGet("/health", () => Results.Ok(ApiResponse<object>.Ok(new { service = "billing", status = "healthy" })));

app.MapGet("/api/billing/doctor-prices", async (BillingDbContext db, Guid? doctorId, bool activeOnly = false) =>
{
    var query = db.DoctorServicePrices
        .AsNoTracking()
        .Where(price => !price.IsDeleted);

    if (doctorId.HasValue)
    {
        query = query.Where(price => price.DoctorId == doctorId.Value);
    }

    if (activeOnly)
    {
        query = query.Where(price => price.IsActive);
    }

    var priceEntities = await query
        .OrderBy(price => price.DoctorId)
        .ThenBy(price => price.ServiceName)
        .ToListAsync();
    var prices = priceEntities.Select(ToDoctorServicePriceDto).ToList();

    return Results.Ok(ApiResponse<IEnumerable<DoctorServicePriceDto>>.Ok(prices));
});

app.MapGet("/api/billing/doctor-prices/quote", async (Guid doctorId, string serviceCode, Guid? patientId, BillingDbContext db) =>
{
    if (doctorId == Guid.Empty || string.IsNullOrWhiteSpace(serviceCode))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Doctor and service code are required."));
    }

    var normalizedServiceCode = NormalizeServiceCode(serviceCode);
    var price = await db.DoctorServicePrices
        .AsNoTracking()
        .FirstOrDefaultAsync(item =>
            item.DoctorId == doctorId &&
            item.ServiceCode == normalizedServiceCode &&
            item.IsActive &&
            !item.IsDeleted);

    return price is null
        ? Results.NotFound(ApiResponse<object>.Fail("No active price is configured for this doctor and service."))
        : Results.Ok(ApiResponse<DoctorServicePriceQuoteDto>.Ok(await BuildDoctorServiceQuoteAsync(db, price, patientId)));
});

app.MapPut("/api/billing/doctor-prices/{doctorId:guid}/{serviceCode}", async (
    Guid doctorId,
    string serviceCode,
    UpsertDoctorServicePriceRequest request,
    BillingDbContext db,
    HttpContext httpContext) =>
{
    if (doctorId == Guid.Empty || string.IsNullOrWhiteSpace(serviceCode))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Doctor and service code are required."));
    }

    var normalizedServiceCode = NormalizeServiceCode(serviceCode);
    if (normalizedServiceCode.Length > 40)
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Service code cannot exceed 40 characters."));
    }

    var now = DateTime.UtcNow;
    var currentUserId = CurrentUserId(httpContext);
    var price = await db.DoctorServicePrices.FirstOrDefaultAsync(item =>
        item.DoctorId == doctorId &&
        item.ServiceCode == normalizedServiceCode);

    var wasCreated = price is null;
    if (price is null)
    {
        price = new DoctorServicePrice
        {
            Id = Guid.NewGuid(),
            DoctorId = doctorId,
            ServiceCode = normalizedServiceCode,
            CreatedAtUtc = now,
            CreatedBy = currentUserId,
            CreatedByIp = httpContext.Connection.RemoteIpAddress?.ToString()
        };
        db.DoctorServicePrices.Add(price);
    }

    price.ServiceName = request.ServiceName.Trim();
    price.Amount = request.Amount;
    price.Currency = request.Currency.Trim().ToUpperInvariant();
    price.ValidityDays = request.ValidityDays;
    price.IsActive = request.IsActive;
    price.IsDeleted = false;
    price.DeletedAtUtc = null;
    price.UpdatedAtUtc = now;
    price.UpdatedBy = currentUserId;

    await db.SaveChangesAsync();

    var response = ApiResponse<DoctorServicePriceDto>.Ok(
        ToDoctorServicePriceDto(price),
        wasCreated ? "Doctor price created." : "Doctor price updated.");

    return wasCreated
        ? Results.Created($"/api/billing/doctor-prices/{doctorId}/{normalizedServiceCode}", response)
        : Results.Ok(response);
})
.WithValidation<UpsertDoctorServicePriceRequest>()
.RequireHmsRoles(HmsRoles.Admin, HmsRoles.Accountant);

app.MapPut("/api/billing/doctor-prices/{id:guid}/status", async (
    Guid id,
    UpdateDoctorServicePriceStatusRequest request,
    BillingDbContext db,
    HttpContext httpContext) =>
{
    var price = await db.DoctorServicePrices.FirstOrDefaultAsync(item => item.Id == id && !item.IsDeleted);
    if (price is null)
    {
        return Results.NotFound(ApiResponse<object>.Fail("Doctor price not found."));
    }

    price.IsActive = request.IsActive;
    price.UpdatedAtUtc = DateTime.UtcNow;
    price.UpdatedBy = CurrentUserId(httpContext);
    await db.SaveChangesAsync();

    return Results.Ok(ApiResponse<DoctorServicePriceDto>.Ok(
        ToDoctorServicePriceDto(price),
        request.IsActive ? "Doctor price activated." : "Doctor price deactivated."));
})
.RequireHmsRoles(HmsRoles.Admin, HmsRoles.Accountant);

app.MapGet("/api/billing/invoices", async (BillingDbContext db) =>
{
    var invoiceEntities = await db.Invoices
        .AsNoTracking()
        .Include(invoice => invoice.Items)
        .OrderByDescending(invoice => invoice.CreatedAtUtc)
        .ToListAsync();

    var invoices = invoiceEntities.Select(ToInvoiceDto).ToList();
    return Results.Ok(ApiResponse<IEnumerable<InvoiceDto>>.Ok(invoices));
});

app.MapGet("/api/billing/invoices/{id:guid}", async (Guid id, BillingDbContext db) =>
{
    var invoice = await db.Invoices
        .AsNoTracking()
        .Include(item => item.Items)
        .FirstOrDefaultAsync(invoice => invoice.Id == id);

    return invoice is null
        ? Results.NotFound(ApiResponse<object>.Fail("Invoice not found."))
        : Results.Ok(ApiResponse<InvoiceDto>.Ok(ToInvoiceDto(invoice)));
});

app.MapPost("/api/billing/invoices", async (
    CreateInvoiceRequest request,
    BillingDbContext db,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    HttpContext httpContext) =>
{
    if (request.PatientId == Guid.Empty || string.IsNullOrWhiteSpace(request.Description))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Patient and invoice description are required."));
    }

    var items = BuildInvoiceItems(request);
    if (items.Length == 0)
    {
        return Results.BadRequest(ApiResponse<object>.Fail("At least one invoice item is required."));
    }

    // Payment collection must first detect whether the patient has insurance so the
    // charge is routed through the payer (claim) instead of collected as a cash sale.
    // An explicitly supplied payment type is always respected: only an absent type is
    // resolved here, and the payer name is only attached to insurance-routed invoices.
    // The patient lookup happens only when it is actually needed: an absent payment
    // type, an insurance invoice missing its payer name, or an insurance invoice
    // without an explicit covered amount. Plain cash invoices skip the HTTP call.
    var paymentType = Clean(request.PaymentType, "");
    var insuranceProvider = CleanOrNull(request.InsuranceProvider);
    var paymentTypeIsInsurance = paymentType.Equals("Insurance", StringComparison.OrdinalIgnoreCase);
    var needsPatientLookup = string.IsNullOrWhiteSpace(paymentType)
        || (paymentTypeIsInsurance && (insuranceProvider is null || request.InsuranceCoveredAmount is null or <= 0));

    var coverage = needsPatientLookup
        ? await GetPatientInsuranceAsync(httpClientFactory, configuration, httpContext, request.PatientId)
        : new PatientInsuranceSnapshot(false, null, null, null, "Lookup skipped.");

    if (string.IsNullOrWhiteSpace(paymentType))
    {
        paymentType = coverage.HasInsurance ? "Insurance" : "Cash";
        insuranceProvider = coverage.HasInsurance ? coverage.Provider : null;
        paymentTypeIsInsurance = paymentType.Equals("Insurance", StringComparison.OrdinalIgnoreCase);
    }
    else if (paymentTypeIsInsurance && insuranceProvider is null)
    {
        insuranceProvider = coverage.HasInsurance ? coverage.Provider : null;
    }

    var isInsuranceRouted = paymentTypeIsInsurance;
    if (isInsuranceRouted && string.IsNullOrWhiteSpace(insuranceProvider))
    {
        return Results.BadRequest(ApiResponse<object>.Fail(
            "An insurance-routed invoice requires the payer name. Confirm the patient's insurance provider before charging."));
    }

    var subtotal = items.Sum(item => item.LineTotal);
    var discount = Math.Max(0, request.Discount);
    var tax = Math.Max(0, request.Tax);
    var total = Math.Max(0, subtotal - discount + tax);

    // The insurance-covered amount is the authoritative patient liability split for
    // clinical clearance: the patient is cleared once their own share (copay) is
    // settled, even while the insurer's portion awaits claim settlement. The payer's
    // coverage percentage comes from the patient's insurance record; an explicit
    // covered amount supplied by the caller (e.g. negotiated rate) always wins.
    var insuranceCoveredAmount = 0m;
    if (isInsuranceRouted)
    {
        insuranceCoveredAmount = request.InsuranceCoveredAmount is > 0
            ? Math.Min(total, request.InsuranceCoveredAmount.Value)
            : coverage.CoveragePercent is > 0
                ? Math.Round(total * (coverage.CoveragePercent.Value / 100m), 2, MidpointRounding.AwayFromZero)
                : 0m;
    }

    var invoice = new Invoice
    {
        Id = Guid.NewGuid(),
        InvoiceNumber = await NextInvoiceNumberAsync(db),
        PatientId = request.PatientId,
        Description = request.Description.Trim(),
        Subtotal = subtotal,
        Discount = discount,
        Tax = tax,
        Total = total,
        Paid = 0,
        InsuranceCoveredAmount = insuranceCoveredAmount,
        Status = "Unpaid",
        DueAtUtc = DateTime.UtcNow.AddDays(7),
        CreatedAtUtc = DateTime.UtcNow,
        PaymentType = paymentType,
        InsuranceProvider = insuranceProvider,
        Items = items.Select(item => new InvoiceItem
        {
            Id = item.Id,
            ServiceCode = item.ServiceCode,
            Description = item.Description,
            Quantity = item.Quantity,
            UnitPrice = item.UnitPrice,
            Discount = item.Discount,
            LineTotal = item.LineTotal,
            ReferenceType = item.ReferenceType,
            ReferenceId = item.ReferenceId,
            ServiceDateUtc = item.ServiceDateUtc
        }).ToList()
    };

    db.Invoices.Add(invoice);
    await db.SaveChangesAsync();

    var message = isInsuranceRouted
        ? $"Invoice created and routed through {insuranceProvider} for claim settlement."
        : "Invoice created.";
    return Results.Created($"/api/billing/invoices/{invoice.Id}", ApiResponse<InvoiceDto>.Ok(ToInvoiceDto(invoice), message));
}).WithValidation<CreateInvoiceRequest>();

app.MapPut("/api/billing/invoices/{id:guid}/status", async (Guid id, UpdateInvoiceStatusRequest request, BillingDbContext db) =>
{
    var allowedStatuses = new[] { "Unpaid", "Cancelled", "Voided" };
    var requestedStatus = allowedStatuses.FirstOrDefault(status => status.Equals(request.Status, StringComparison.OrdinalIgnoreCase));
    if (requestedStatus is null)
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Invoice status can be changed only to Unpaid, Cancelled, or Voided. Paid and Partially Paid are controlled by payment collection."));
    }

    var invoice = await db.Invoices
        .Include(item => item.Items)
        .FirstOrDefaultAsync(item => item.Id == id);
    if (invoice is null)
    {
        return Results.NotFound(ApiResponse<object>.Fail("Invoice not found."));
    }

    if ((requestedStatus is "Cancelled" or "Voided") && invoice.Paid > 0)
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Paid or partially paid invoices cannot be cancelled or voided."));
    }

    invoice.Status = requestedStatus == "Unpaid"
        ? ResolvePaymentStatus(invoice.Total, invoice.Paid)
        : requestedStatus;

    await db.SaveChangesAsync();

    return Results.Ok(ApiResponse<InvoiceDto>.Ok(ToInvoiceDto(invoice), "Invoice status updated."));
});

app.MapGet("/api/billing/payments", async (BillingDbContext db) =>
{
    var payments = await db.Payments
        .AsNoTracking()
        .OrderByDescending(payment => payment.PaidAtUtc)
        .Select(payment => new PaymentDto(
            payment.Id,
            payment.InvoiceId,
            payment.ReceiptNumber,
            payment.Amount,
            payment.Method,
            payment.Reference,
            payment.ReceivedBy,
            payment.PaidAtUtc))
        .ToListAsync();

    return Results.Ok(ApiResponse<IEnumerable<PaymentDto>>.Ok(payments));
});

app.MapPost("/api/billing/payments", async (PaymentRequest request, BillingDbContext db) =>
{
    if (request.InvoiceId == Guid.Empty || request.Amount <= 0 || string.IsNullOrWhiteSpace(request.Method))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Invoice, amount, and payment method are required."));
    }

    var invoice = await db.Invoices.Include(item => item.Items).FirstOrDefaultAsync(item => item.Id == request.InvoiceId);
    if (invoice is null)
    {
        return Results.NotFound(ApiResponse<object>.Fail("Invoice not found."));
    }

    if (invoice.Status is "Cancelled" or "Voided")
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Cancelled or voided invoices cannot receive payments."));
    }

    var balance = invoice.Total - invoice.Paid;
    if (request.Amount > balance)
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Payment amount cannot exceed the current invoice balance."));
    }

    // Insurance detection guard: a charge routed through a payer must never be fully
    // settled with patient cash. The insurer's portion is recorded through a claim or
    // remittance; patient cash may only cover the patient's own share (copay). The
    // covered amount is authoritative on the invoice, so once the copay is settled the
    // patient is clinically cleared even while the insurer's portion awaits claim.
    var insuranceRouted = invoice.PaymentType?.Equals("Insurance", StringComparison.OrdinalIgnoreCase) == true
        || !string.IsNullOrWhiteSpace(invoice.InsuranceProvider);
    if (insuranceRouted && IsPatientPaymentMethod(request.Method))
    {
        var patientShareRemaining = Math.Max(0m, invoice.Total - invoice.InsuranceCoveredAmount - invoice.Paid);
        if (request.Amount > patientShareRemaining)
        {
            var payer = invoice.InsuranceProvider ?? "the patient's insurance payer";
            return Results.BadRequest(ApiResponse<object>.Fail(
                $"This charge is covered by {payer}. Patient cash may only cover the patient's own share; " +
                $"the remaining copay is {patientShareRemaining:0.00}. Settle the insured portion by submitting a claim " +
                "or recording the insurer's remittance using an insurance payment method."));
        }
    }

    await using var transaction = await db.Database.BeginTransactionAsync();
    var paid = invoice.Paid + request.Amount;
    var balanceAfterPayment = invoice.Total - paid;
    invoice.Paid = paid;
    invoice.Status = ResolvePaymentStatus(invoice.Total, paid);

    var payment = new Payment
    {
        Id = Guid.NewGuid(),
        InvoiceId = invoice.Id,
        ReceiptNumber = await NextReceiptNumberAsync(db),
        Amount = request.Amount,
        Method = request.Method.Trim(),
        Reference = CleanOrNull(request.Reference),
        ReceivedBy = Clean(request.ReceivedBy, "Cashier"),
        PaidAtUtc = DateTime.UtcNow,
        BalanceAfterPayment = balanceAfterPayment
    };

    db.Payments.Add(payment);
    await db.SaveChangesAsync();
    await transaction.CommitAsync();

    payment.Invoice = invoice;
    return Results.Ok(ApiResponse<ReceiptDto>.Ok(ToReceiptDto(payment), "Payment recorded and receipt prepared."));
}).WithValidation<PaymentRequest>();

app.MapGet("/api/billing/receipts", async (BillingDbContext db) =>
{
    var paymentEntities = await db.Payments
        .AsNoTracking()
        .Include(payment => payment.Invoice)
        .OrderByDescending(payment => payment.PaidAtUtc)
        .ToListAsync();

    var receipts = paymentEntities.Select(ToReceiptDto).ToList();
    return Results.Ok(ApiResponse<IEnumerable<ReceiptDto>>.Ok(receipts));
});

app.MapGet("/api/billing/receipts/{id:guid}", async (Guid id, BillingDbContext db) =>
{
    var receipt = await db.Payments
        .AsNoTracking()
        .Include(payment => payment.Invoice)
        .FirstOrDefaultAsync(payment => payment.Id == id);

    return receipt is null
        ? Results.NotFound(ApiResponse<object>.Fail("Receipt not found."))
        : Results.Ok(ApiResponse<ReceiptDto>.Ok(ToReceiptDto(receipt)));
});

app.Run();

static DoctorServicePriceDto ToDoctorServicePriceDto(DoctorServicePrice price) =>
    new(
        price.Id,
        price.DoctorId,
        price.ServiceCode,
        price.ServiceName,
        price.Amount,
        price.Currency,
        price.ValidityDays,
        price.IsActive,
        price.CreatedAtUtc,
        price.UpdatedAtUtc);

static async Task<DoctorServicePriceQuoteDto> BuildDoctorServiceQuoteAsync(
    BillingDbContext db,
    DoctorServicePrice price,
    Guid? patientId)
{
    if (patientId is null || patientId.Value == Guid.Empty)
    {
        return new DoctorServicePriceQuoteDto(
            price.DoctorId,
            price.ServiceCode,
            price.ServiceName,
            price.Amount,
            price.Currency,
            price.ValidityDays,
            price.IsActive,
            true,
            null,
            "Consultation payment is required before vitals and doctor review.");
    }

    // A consultation is covered when the patient's own share is settled: cash invoices
    // need full payment, while insured invoices are covered once the patient's copay
    // has been collected (the insurer's portion settles later through the claim).
    var coveredInvoices = await db.Invoices
        .AsNoTracking()
        .Include(invoice => invoice.Items)
        .Where(invoice =>
            invoice.PatientId == patientId.Value &&
            invoice.Status != "Cancelled" &&
            invoice.Status != "Voided" &&
            invoice.Total - invoice.InsuranceCoveredAmount - invoice.Paid <= 0)
        .ToListAsync();

    var lastCoveredServiceDate = coveredInvoices
        .SelectMany(invoice => invoice.Items
            .Where(item =>
                item.ServiceCode == price.ServiceCode &&
                item.ReferenceType == "DOCTOR" &&
                item.ReferenceId == price.DoctorId)
            .Select(item => item.ServiceDateUtc ?? invoice.CreatedAtUtc))
        .OrderByDescending(serviceDate => serviceDate)
        .FirstOrDefault();

    if (lastCoveredServiceDate == default)
    {
        return new DoctorServicePriceQuoteDto(
            price.DoctorId,
            price.ServiceCode,
            price.ServiceName,
            price.Amount,
            price.Currency,
            price.ValidityDays,
            price.IsActive,
            true,
            null,
            "No settled consultation coverage exists for this patient and doctor.");
    }

    var coveredUntil = lastCoveredServiceDate.AddDays(price.ValidityDays);
    var chargeRequired = DateTime.UtcNow > coveredUntil;

    return new DoctorServicePriceQuoteDto(
        price.DoctorId,
        price.ServiceCode,
        price.ServiceName,
        price.Amount,
        price.Currency,
        price.ValidityDays,
        price.IsActive,
        chargeRequired,
        coveredUntil,
        chargeRequired
            ? "Previous coverage has expired. Consultation payment is required."
            : $"Patient is covered for this doctor until {coveredUntil:yyyy-MM-dd}.");
}

static async Task<PatientInsuranceSnapshot> GetPatientInsuranceAsync(
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    HttpContext httpContext,
    Guid patientId)
{
    try
    {
        var client = httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{PatientsBaseUrl(configuration)}/api/patients/{patientId}");
        ForwardAuthorization(httpContext, request);

        using var response = await client.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            return new PatientInsuranceSnapshot(false, null, null, null, "Patient service rejected the insurance lookup.");
        }

        var envelope = await response.Content.ReadFromJsonAsync<ApiResponse<PatientDto>>();
        var patient = envelope?.Data;
        if (patient is null)
        {
            return new PatientInsuranceSnapshot(false, null, null, null, "Patient record could not be loaded.");
        }

        var hasInsurance = patient.InsuranceCompanyId is not null
            || !string.IsNullOrWhiteSpace(patient.InsuranceProvider)
            || !string.IsNullOrWhiteSpace(patient.InsuranceCompanyName);
        var provider = patient.InsuranceCompanyName ?? patient.InsuranceProvider;
        var coveragePercent = patient.InsuranceCoveragePercent is > 0 ? patient.InsuranceCoveragePercent : null;

        return new PatientInsuranceSnapshot(
            hasInsurance,
            hasInsurance ? provider : null,
            patient.InsurancePolicyNumber,
            coveragePercent,
            hasInsurance
                ? $"Patient is covered by {provider}."
                : "No insurance coverage is recorded for this patient.");
    }
    catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException)
    {
        return new PatientInsuranceSnapshot(false, null, null, null, $"Patient service is unavailable: {exception.Message}");
    }
}

static string PatientsBaseUrl(IConfiguration configuration) =>
    Clean(configuration["Services:PatientsBaseUrl"], "http://localhost:5102").TrimEnd('/');

static void ForwardAuthorization(HttpContext httpContext, HttpRequestMessage request)
{
    var authorization = httpContext.Request.Headers.Authorization.ToString();
    if (!string.IsNullOrWhiteSpace(authorization))
    {
        request.Headers.TryAddWithoutValidation("Authorization", authorization);
    }
}

static bool IsPatientPaymentMethod(string method)
{
    var value = method.Trim().ToLowerInvariant();
    return !value.Contains("insurance");
}

static string NormalizeServiceCode(string serviceCode) =>
    string.Join('_', serviceCode
        .Trim()
        .ToUpperInvariant()
        .Split([' ', '-', '_'], StringSplitOptions.RemoveEmptyEntries));

static Guid? CurrentUserId(HttpContext httpContext)
{
    var subject = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? httpContext.User.FindFirstValue("sub");
    return Guid.TryParse(subject, out var userId) ? userId : null;
}

static InvoiceDto ToInvoiceDto(Invoice invoice) =>
    new(
        invoice.Id,
        invoice.InvoiceNumber,
        invoice.PatientId,
        invoice.Description,
        invoice.Subtotal,
        invoice.Discount,
        invoice.Tax,
        invoice.Total,
        invoice.Paid,
        invoice.InsuranceCoveredAmount,
        invoice.Total - invoice.Paid,
        invoice.Status,
        invoice.PaymentType,
        invoice.InsuranceProvider,
        invoice.DueAtUtc,
        invoice.CreatedAtUtc,
        invoice.Items
            .OrderBy(item => item.Description)
            .Select(item => new InvoiceItemDto(
                item.Id,
                item.ServiceCode,
                item.Description,
                item.Quantity,
                item.UnitPrice,
                item.Discount,
                item.LineTotal,
                item.ReferenceType,
                item.ReferenceId,
                item.ServiceDateUtc))
            .ToArray());

static ReceiptDto ToReceiptDto(Payment payment) =>
    new(
        payment.Id,
        payment.ReceiptNumber,
        payment.Invoice?.InvoiceNumber ?? "",
        payment.InvoiceId,
        payment.Invoice?.PatientId ?? Guid.Empty,
        payment.Amount,
        payment.Method,
        payment.Reference,
        payment.ReceivedBy,
        payment.PaidAtUtc,
        payment.BalanceAfterPayment);

static InvoiceItemDto[] BuildInvoiceItems(CreateInvoiceRequest request)
{
    if (request.Items is { Length: > 0 })
    {
        return request.Items
            .Where(item => !string.IsNullOrWhiteSpace(item.Description) && item.Quantity > 0 && item.UnitPrice > 0)
            .Select(item =>
            {
                var discount = Math.Max(0, item.Discount);
                var lineTotal = Math.Max(0, item.Quantity * item.UnitPrice - discount);
                return new InvoiceItemDto(
                    Guid.NewGuid(),
                    string.IsNullOrWhiteSpace(item.ServiceCode) ? "GEN" : item.ServiceCode.Trim().ToUpperInvariant(),
                    item.Description.Trim(),
                    item.Quantity,
                    item.UnitPrice,
                    discount,
                    lineTotal,
                    CleanOrNull(item.ReferenceType)?.ToUpperInvariant(),
                    item.ReferenceId,
                    item.ServiceDateUtc ?? DateTime.UtcNow);
            })
            .ToArray();
    }

    if (request.Amount <= 0)
    {
        return [];
    }

    return
    [
        new InvoiceItemDto(
            Guid.NewGuid(),
            "GEN",
            request.Description.Trim(),
            1,
            request.Amount,
            0,
            request.Amount,
            null,
            null,
            DateTime.UtcNow)
    ];
}

static string ResolvePaymentStatus(decimal total, decimal paid)
{
    if (paid <= 0) return "Unpaid";
    return paid >= total ? "Paid" : "Partially Paid";
}

static async Task<string> NextInvoiceNumberAsync(BillingDbContext db)
{
    var year = DateTime.UtcNow.Year;
    var prefix = $"INV-{year}-";
    var existingNumbers = await db.Invoices
        .AsNoTracking()
        .Where(invoice => invoice.InvoiceNumber.StartsWith(prefix))
        .Select(invoice => invoice.InvoiceNumber)
        .ToListAsync();

    var next = existingNumbers
        .Select(LastNumberSegment)
        .DefaultIfEmpty(0)
        .Max() + 1;

    return $"{prefix}{next:0000}";
}

static async Task<string> NextReceiptNumberAsync(BillingDbContext db)
{
    var date = DateTime.UtcNow.ToString("yyyyMMdd");
    var prefix = $"RCT-{date}-";
    var existingNumbers = await db.Payments
        .AsNoTracking()
        .Where(payment => payment.ReceiptNumber.StartsWith(prefix))
        .Select(payment => payment.ReceiptNumber)
        .ToListAsync();

    var next = existingNumbers
        .Select(LastNumberSegment)
        .DefaultIfEmpty(0)
        .Max() + 1;

    return $"{prefix}{next:0000}";
}

static int LastNumberSegment(string value)
{
    var segment = value.Split('-', StringSplitOptions.RemoveEmptyEntries).LastOrDefault();
    return int.TryParse(segment, out var number) ? number : 0;
}

static string Clean(string? value, string fallback) =>
    string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();

static string? CleanOrNull(string? value) =>
    string.IsNullOrWhiteSpace(value) ? null : value.Trim();

sealed record PatientInsuranceSnapshot(
    bool HasInsurance,
    string? Provider,
    string? PolicyNumber,
    decimal? CoveragePercent,
    string Message);
