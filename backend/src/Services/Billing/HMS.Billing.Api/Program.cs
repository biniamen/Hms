using HMS.Billing.Infrastructure;
using HMS.Contracts;
using HMS.SharedKernel;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Services.AddOpenApi();
builder.Services.AddHmsCors(builder.Configuration);

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

app.MapPost("/api/billing/invoices", async (CreateInvoiceRequest request, BillingDbContext db) =>
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

    var subtotal = items.Sum(item => item.LineTotal);
    var discount = Math.Max(0, request.Discount);
    var tax = Math.Max(0, request.Tax);
    var total = Math.Max(0, subtotal - discount + tax);
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
        Status = "Unpaid",
        DueAtUtc = DateTime.UtcNow.AddDays(7),
        CreatedAtUtc = DateTime.UtcNow,
        PaymentType = Clean(request.PaymentType, "Cash"),
        InsuranceProvider = CleanOrNull(request.InsuranceProvider),
        Items = items.Select(item => new InvoiceItem
        {
            Id = item.Id,
            ServiceCode = item.ServiceCode,
            Description = item.Description,
            Quantity = item.Quantity,
            UnitPrice = item.UnitPrice,
            Discount = item.Discount,
            LineTotal = item.LineTotal
        }).ToList()
    };

    db.Invoices.Add(invoice);
    await db.SaveChangesAsync();

    return Results.Created($"/api/billing/invoices/{invoice.Id}", ApiResponse<InvoiceDto>.Ok(ToInvoiceDto(invoice), "Invoice created."));
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

    var balance = invoice.Total - invoice.Paid;
    if (request.Amount > balance)
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Payment amount cannot exceed the current invoice balance."));
    }

    await using var transaction = await db.Database.BeginTransactionAsync();
    var paid = invoice.Paid + request.Amount;
    var balanceAfterPayment = invoice.Total - paid;
    invoice.Paid = paid;
    invoice.Status = balanceAfterPayment <= 0 ? "Paid" : "Partially Paid";

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
});

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
        invoice.Total - invoice.Paid,
        invoice.Status,
        invoice.DueAtUtc,
        invoice.CreatedAtUtc,
        invoice.Items
            .OrderBy(item => item.Description)
            .Select(item => new InvoiceItemDto(item.Id, item.ServiceCode, item.Description, item.Quantity, item.UnitPrice, item.Discount, item.LineTotal))
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
                    lineTotal);
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
            request.Amount)
    ];
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
