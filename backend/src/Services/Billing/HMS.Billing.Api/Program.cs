using HMS.Contracts;
using HMS.SharedKernel;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();

var invoices = new List<InvoiceDto>
{
    new(
        Guid.Parse("9ba2c72a-29f0-4f4c-8f43-890a53b327da"),
        Guid.Parse("f64d3368-a4da-4d44-9612-5c302b0ec29a"),
        "General consultation and medication",
        750m,
        "Unpaid",
        DateTime.UtcNow.AddHours(-1))
};

app.MapGet("/health", () => Results.Ok(ApiResponse<object>.Ok(new { service = "billing", status = "healthy" })));

app.MapGet("/api/billing/invoices", () => Results.Ok(ApiResponse<IEnumerable<InvoiceDto>>.Ok(invoices)));

app.MapPost("/api/billing/invoices", (CreateInvoiceRequest request) =>
{
    var invoice = new InvoiceDto(Guid.NewGuid(), request.PatientId, request.Description, request.Amount, "Unpaid", DateTime.UtcNow);
    invoices.Add(invoice);
    return Results.Created($"/api/billing/invoices/{invoice.Id}", ApiResponse<InvoiceDto>.Ok(invoice, "Invoice created."));
});

app.MapPost("/api/billing/payments", (PaymentRequest request) =>
{
    var invoiceIndex = invoices.FindIndex(i => i.Id == request.InvoiceId);
    if (invoiceIndex < 0)
    {
        return Results.NotFound(ApiResponse<object>.Fail("Invoice not found."));
    }

    var invoice = invoices[invoiceIndex];
    invoices[invoiceIndex] = invoice with { Status = request.Amount >= invoice.Amount ? "Paid" : "PartiallyPaid" };
    return Results.Ok(ApiResponse<InvoiceDto>.Ok(invoices[invoiceIndex], "Payment recorded."));
});

app.Run();
