using HMS.Billing.Infrastructure.Data;
using HMS.Billing.Infrastructure.Entities;
using HMS.Contracts;
using HMS.SharedKernel;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var billingAssembly = typeof(Program).Assembly.GetName().Name;
builder.Services.AddDbContext<AppBillingDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("BillingDb"),
        b => b.MigrationsAssembly(billingAssembly)));

// ── JWT Authentication ──
var jwtSection = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSection["SecretKey"]!;
var issuer = jwtSection["Issuer"]!;
var audience = jwtSection["Audience"]!;

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = issuer,
        ValidAudience = audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// Auto-migrate on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppBillingDbContext>();
    await db.Database.MigrateAsync();
}

app.MapGet("/health", () => Results.Ok(ApiResponse<object>.Ok(new { service = "billing", status = "healthy" })));

// ── Invoices ──
app.MapGet("/api/billing/invoices", async (AppBillingDbContext db) =>
{
    var invoices = await db.Invoices
        .OrderByDescending(i => i.CreatedAtUtc)
        .Select(i => new InvoiceDto(i.Id, i.PatientId, i.Description, i.Amount, i.Status, i.CreatedAtUtc))
        .ToListAsync();

    return Results.Ok(ApiResponse<IEnumerable<InvoiceDto>>.Ok(invoices));
})
.RequireAuthorization(policy => policy.RequireRole("ADMIN", "ACCOUNTANT", "CASHIER"));

app.MapPost("/api/billing/invoices", async (CreateInvoiceRequest request, AppBillingDbContext db) =>
{
    var invoice = new Invoice
    {
        PatientId = request.PatientId,
        Description = request.Description,
        Amount = request.Amount,
        Status = "Unpaid"
    };

    db.Invoices.Add(invoice);
    await db.SaveChangesAsync();

    var dto = new InvoiceDto(invoice.Id, invoice.PatientId, invoice.Description, invoice.Amount, invoice.Status, invoice.CreatedAtUtc);
    return Results.Created($"/api/billing/invoices/{invoice.Id}", ApiResponse<InvoiceDto>.Ok(dto, "Invoice created."));
})
.RequireAuthorization(policy => policy.RequireRole("ADMIN", "ACCOUNTANT"));

app.MapPost("/api/billing/payments", async (PaymentRequest request, AppBillingDbContext db) =>
{
    var invoice = await db.Invoices.FindAsync(request.InvoiceId);
    if (invoice is null)
    {
        return Results.NotFound(ApiResponse<object>.Fail("Invoice not found."));
    }

    invoice.Status = request.Amount >= invoice.Amount ? "Paid" : "PartiallyPaid";

    var payment = new Payment
    {
        InvoiceId = request.InvoiceId,
        Amount = request.Amount,
        Method = request.Method,
        PaidAtUtc = DateTime.UtcNow
    };

    db.Payments.Add(payment);
    await db.SaveChangesAsync();

    var dto = new InvoiceDto(invoice.Id, invoice.PatientId, invoice.Description, invoice.Amount, invoice.Status, invoice.CreatedAtUtc);
    return Results.Ok(ApiResponse<InvoiceDto>.Ok(dto, "Payment recorded."));
})
.RequireAuthorization(policy => policy.RequireRole("ADMIN", "CASHIER", "ACCOUNTANT"));

app.Run();
