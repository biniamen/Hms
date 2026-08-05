using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using HMS.SharedKernel;

namespace HMS.Billing.Infrastructure;

public sealed class BillingDbContext(DbContextOptions<BillingDbContext> options) : DbContext(options)
{
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<DoctorServicePrice> DoctorServicePrices => Set<DoctorServicePrice>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.ToTable("invoices");
            entity.HasKey(invoice => invoice.Id);
            entity.HasIndex(invoice => invoice.InvoiceNumber).IsUnique();
            entity.Property(invoice => invoice.InvoiceNumber).HasColumnName("invoice_number").HasMaxLength(40);
            entity.Property(invoice => invoice.PatientId).HasColumnName("patient_id");
            entity.Property(invoice => invoice.Description).HasColumnName("description");
            entity.Property(invoice => invoice.Subtotal).HasColumnName("subtotal").HasPrecision(12, 2);
            entity.Property(invoice => invoice.Discount).HasColumnName("discount").HasPrecision(12, 2);
            entity.Property(invoice => invoice.Tax).HasColumnName("tax").HasPrecision(12, 2);
            entity.Property(invoice => invoice.Total).HasColumnName("total").HasPrecision(12, 2);
            entity.Property(invoice => invoice.Paid).HasColumnName("paid").HasPrecision(12, 2);
            entity.Property(invoice => invoice.Status).HasColumnName("status").HasMaxLength(40);
            entity.Property(invoice => invoice.DueAtUtc).HasColumnName("due_at_utc");
            entity.Property(invoice => invoice.CreatedAtUtc).HasColumnName("created_at_utc").HasDefaultValueSql("now()");
            entity.Property(invoice => invoice.PaymentType).HasColumnName("payment_type").HasMaxLength(60);
            entity.Property(invoice => invoice.InsuranceProvider).HasColumnName("insurance_provider").HasMaxLength(180);
        });

        modelBuilder.Entity<InvoiceItem>(entity =>
        {
            entity.ToTable("invoice_items");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.InvoiceId).HasColumnName("invoice_id");
            entity.Property(item => item.ServiceCode).HasColumnName("service_code").HasMaxLength(40);
            entity.Property(item => item.Description).HasColumnName("description");
            entity.Property(item => item.Quantity).HasColumnName("quantity");
            entity.Property(item => item.UnitPrice).HasColumnName("unit_price").HasPrecision(12, 2);
            entity.Property(item => item.Discount).HasColumnName("discount").HasPrecision(12, 2);
            entity.Property(item => item.LineTotal).HasColumnName("line_total").HasPrecision(12, 2);
            entity.Property(item => item.ReferenceType).HasColumnName("reference_type").HasMaxLength(40);
            entity.Property(item => item.ReferenceId).HasColumnName("reference_id");
            entity.Property(item => item.ServiceDateUtc).HasColumnName("service_date_utc");
            entity.Property(item => item.CreatedAtUtc).HasColumnName("created_at_utc").HasDefaultValueSql("now()");
            entity.HasOne(item => item.Invoice)
                .WithMany(invoice => invoice.Items)
                .HasForeignKey(item => item.InvoiceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.ToTable("payments");
            entity.HasKey(payment => payment.Id);
            entity.HasIndex(payment => payment.ReceiptNumber).IsUnique();
            entity.Property(payment => payment.InvoiceId).HasColumnName("invoice_id");
            entity.Property(payment => payment.ReceiptNumber).HasColumnName("receipt_number").HasMaxLength(40);
            entity.Property(payment => payment.Amount).HasColumnName("amount").HasPrecision(12, 2);
            entity.Property(payment => payment.Method).HasColumnName("method").HasMaxLength(60);
            entity.Property(payment => payment.Reference).HasColumnName("reference").HasMaxLength(120);
            entity.Property(payment => payment.ReceivedBy).HasColumnName("received_by").HasMaxLength(120);
            entity.Property(payment => payment.PaidAtUtc).HasColumnName("paid_at_utc").HasDefaultValueSql("now()");
            entity.Property(payment => payment.CreatedAtUtc).HasColumnName("created_at_utc").HasDefaultValueSql("now()");
            entity.Property(payment => payment.BalanceAfterPayment).HasColumnName("balance_after_payment").HasPrecision(12, 2);
            entity.HasOne(payment => payment.Invoice)
                .WithMany(invoice => invoice.Payments)
                .HasForeignKey(payment => payment.InvoiceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<DoctorServicePrice>(entity =>
        {
            entity.ToTable("doctor_service_prices", table =>
            {
                table.HasCheckConstraint("ck_doctor_service_prices_amount_positive", "amount > 0");
                table.HasCheckConstraint("ck_doctor_service_prices_validity_days_positive", "validity_days > 0");
            });
            entity.HasKey(price => price.Id);
            entity.HasIndex(price => new { price.DoctorId, price.ServiceCode }).IsUnique();
            entity.Property(price => price.DoctorId).HasColumnName("doctor_id");
            entity.Property(price => price.ServiceCode).HasColumnName("service_code").HasMaxLength(40);
            entity.Property(price => price.ServiceName).HasColumnName("service_name").HasMaxLength(120);
            entity.Property(price => price.Amount).HasColumnName("amount").HasPrecision(12, 2);
            entity.Property(price => price.Currency).HasColumnName("currency").HasMaxLength(3).HasDefaultValue("ETB");
            entity.Property(price => price.ValidityDays).HasColumnName("validity_days").HasDefaultValue(10);
            entity.Property(price => price.IsActive).HasColumnName("is_active");
            entity.Property(price => price.CreatedAtUtc).HasColumnName("created_at_utc").HasDefaultValueSql("now()");
            entity.Property(price => price.UpdatedAtUtc).HasColumnName("updated_at_utc").HasDefaultValueSql("now()");
            entity.Property(price => price.CreatedBy).HasColumnName("created_by");
            entity.Property(price => price.UpdatedBy).HasColumnName("updated_by");
            entity.Property(price => price.CreatedByIp).HasColumnName("created_by_ip").HasMaxLength(64);
            entity.Property(price => price.IsDeleted).HasColumnName("is_deleted").HasDefaultValue(false);
            entity.Property(price => price.DeletedAtUtc).HasColumnName("deleted_at_utc");
        });
    }
}

public sealed class DoctorServicePrice : Entity
{
    public Guid DoctorId { get; set; }
    public string ServiceCode { get; set; } = "";
    public string ServiceName { get; set; } = "";
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "ETB";
    public int ValidityDays { get; set; } = 10;
    public bool IsActive { get; set; } = true;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class Invoice : Entity
{
    public string InvoiceNumber { get; set; } = "";
    public Guid PatientId { get; set; }
    public string Description { get; set; } = "";
    public decimal Subtotal { get; set; }
    public decimal Discount { get; set; }
    public decimal Tax { get; set; }
    public decimal Total { get; set; }
    public decimal Paid { get; set; }
    public string Status { get; set; } = "Unpaid";
    public DateTime DueAtUtc { get; set; }
    public string PaymentType { get; set; } = "Cash";
    public string? InsuranceProvider { get; set; }
    public List<InvoiceItem> Items { get; set; } = [];
    public List<Payment> Payments { get; set; } = [];
}

public sealed class InvoiceItem : Entity
{
    public Guid InvoiceId { get; set; }
    public string ServiceCode { get; set; } = "";
    public string Description { get; set; } = "";
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Discount { get; set; }
    public decimal LineTotal { get; set; }
    public string? ReferenceType { get; set; }
    public Guid? ReferenceId { get; set; }
    public DateTime? ServiceDateUtc { get; set; }
    public Invoice? Invoice { get; set; }
}

public sealed class Payment : Entity
{
    public Guid InvoiceId { get; set; }
    public string ReceiptNumber { get; set; } = "";
    public decimal Amount { get; set; }
    public string Method { get; set; } = "";
    public string? Reference { get; set; }
    public string ReceivedBy { get; set; } = "";
    public DateTime PaidAtUtc { get; set; } = DateTime.UtcNow;
    public decimal BalanceAfterPayment { get; set; }
    public Invoice? Invoice { get; set; }
}

public static class BillingSeedData
{
    public static async Task SeedAsync(BillingDbContext db)
    {
        await UpsertDoctorServicePricesAsync(db);
        await UpsertInvoicesAsync(db);
        await db.SaveChangesAsync();
        await UpsertInvoiceItemsAsync(db);
        await UpsertPaymentsAsync(db);
        await db.SaveChangesAsync();
    }

    private static async Task UpsertDoctorServicePricesAsync(BillingDbContext db)
    {
        var internalMedicineDoctorId = Guid.Parse("8f334882-8d97-4d54-a011-97d7c8c2a201");
        var emergencyDoctorId = Guid.Parse("47c3095d-adcc-4e1d-bfc0-b16d70c15201");
        var cardiologyDoctorId = Guid.Parse("d7f768c4-e28c-4b46-94d8-68ed9a325404");
        var maternityDoctorId = Guid.Parse("a6303a4a-e409-409f-a21c-8abb44ea5303");

        var prices = new[]
        {
            new DoctorServicePrice { Id = Guid.Parse("ae43a4c5-7f6b-4f97-a774-9923e3c1a001"), DoctorId = internalMedicineDoctorId, ServiceCode = "CONSULTATION", ServiceName = "Consultation", Amount = 500, Currency = "ETB", ValidityDays = 10 },
            new DoctorServicePrice { Id = Guid.Parse("ae43a4c5-7f6b-4f97-a774-9923e3c1a002"), DoctorId = internalMedicineDoctorId, ServiceCode = "FOLLOW_UP", ServiceName = "Follow-up Visit", Amount = 300, Currency = "ETB", ValidityDays = 15 },
            new DoctorServicePrice { Id = Guid.Parse("ae43a4c5-7f6b-4f97-a774-9923e3c1a003"), DoctorId = internalMedicineDoctorId, ServiceCode = "EMERGENCY", ServiceName = "Emergency Consultation", Amount = 800, Currency = "ETB", ValidityDays = 1 },
            new DoctorServicePrice { Id = Guid.Parse("ae43a4c5-7f6b-4f97-a774-9923e3c1a004"), DoctorId = emergencyDoctorId, ServiceCode = "ER_TRIAGE", ServiceName = "Emergency Triage", Amount = 650, Currency = "ETB", ValidityDays = 1 },
            new DoctorServicePrice { Id = Guid.Parse("ae43a4c5-7f6b-4f97-a774-9923e3c1a005"), DoctorId = cardiologyDoctorId, ServiceCode = "CARD_REVIEW", ServiceName = "Cardiology Review", Amount = 900, Currency = "ETB", ValidityDays = 15 },
            new DoctorServicePrice { Id = Guid.Parse("ae43a4c5-7f6b-4f97-a774-9923e3c1a006"), DoctorId = maternityDoctorId, ServiceCode = "ANC_VISIT", ServiceName = "Antenatal Care Visit", Amount = 450, Currency = "ETB", ValidityDays = 30 }
        };

        foreach (var price in prices)
        {
            var existing = await db.DoctorServicePrices.FirstOrDefaultAsync(item => item.Id == price.Id);
            if (existing is null)
            {
                db.DoctorServicePrices.Add(price);
            }
            else
            {
                existing.DoctorId = price.DoctorId;
                existing.ServiceCode = price.ServiceCode;
                existing.ServiceName = price.ServiceName;
                existing.Amount = price.Amount;
                existing.Currency = price.Currency;
                existing.ValidityDays = price.ValidityDays;
                existing.IsActive = true;
                existing.UpdatedAtUtc = DateTime.UtcNow;
            }
        }
    }

    private static async Task UpsertInvoicesAsync(BillingDbContext db)
    {
        var invoices = new[]
        {
            new Invoice { Id = Guid.Parse("9ba2c72a-29f0-4f4c-8f43-890a53b327da"), InvoiceNumber = "INV-2026-0001", PatientId = Guid.Parse("f64d3368-a4da-4d44-9612-5c302b0ec29a"), Description = "General consultation and medication", Subtotal = 750, Discount = 0, Tax = 0, Total = 750, Paid = 0, Status = "Unpaid", DueAtUtc = DateTime.UtcNow.AddDays(7), CreatedAtUtc = DateTime.UtcNow.AddHours(-1), PaymentType = "Cash" },
            new Invoice { Id = Guid.Parse("295a57f4-2334-428d-a6f9-a596614684ad"), InvoiceNumber = "INV-2026-0002", PatientId = Guid.Parse("d5c6bf11-de68-4c3f-97d2-6d7fd12f8e80"), Description = "Corporate outpatient visit", Subtotal = 1200, Discount = 120, Tax = 0, Total = 1080, Paid = 500, Status = "Partially Paid", DueAtUtc = DateTime.UtcNow.AddDays(7), CreatedAtUtc = DateTime.UtcNow.AddHours(-2), PaymentType = "Insurance", InsuranceProvider = "EthioLife Corporate Insurance" },
            new Invoice { Id = Guid.Parse("ff3323a8-f93c-4918-a61c-a341eaaaf003"), InvoiceNumber = "INV-2026-0003", PatientId = Guid.Parse("55d16cd5-e42f-4bb0-b1ef-02f4e6284a03"), Description = "Cardiology review, ECG, and labs", Subtotal = 1850, Discount = 100, Tax = 0, Total = 1750, Paid = 1750, Status = "Paid", DueAtUtc = DateTime.UtcNow.AddDays(3), CreatedAtUtc = DateTime.UtcNow.AddHours(-3), PaymentType = "Corporate Credit", InsuranceProvider = "Unity Staff Medical Fund" },
            new Invoice { Id = Guid.Parse("b01013ee-4630-4f0d-bdb8-6f2479506f04"), InvoiceNumber = "INV-2026-0004", PatientId = Guid.Parse("f857a7b1-9689-480d-a110-111226b77104"), Description = "Pediatric outpatient consultation", Subtotal = 500, Discount = 0, Tax = 0, Total = 500, Paid = 0, Status = "Unpaid", DueAtUtc = DateTime.UtcNow.AddDays(5), CreatedAtUtc = DateTime.UtcNow.AddMinutes(-90), PaymentType = "Cash" },
            new Invoice { Id = Guid.Parse("ec64ec77-ef2c-445a-b5a5-89d9a7ee2a05"), InvoiceNumber = "INV-2026-0005", PatientId = Guid.Parse("0ef7e12a-1017-4039-83c4-d90301515f05"), Description = "Antenatal care and ultrasound", Subtotal = 1350, Discount = 0, Tax = 0, Total = 1350, Paid = 800, Status = "Partially Paid", DueAtUtc = DateTime.UtcNow.AddDays(10), CreatedAtUtc = DateTime.UtcNow.AddDays(-1), PaymentType = "Insurance", InsuranceProvider = "EthioLife Corporate Insurance" }
        };

        foreach (var invoice in invoices)
        {
            var existing = await db.Invoices.FirstOrDefaultAsync(item => item.InvoiceNumber == invoice.InvoiceNumber);
            if (existing is null)
            {
                db.Invoices.Add(invoice);
            }
            else
            {
                existing.PatientId = invoice.PatientId;
                existing.Description = invoice.Description;
                existing.Subtotal = invoice.Subtotal;
                existing.Discount = invoice.Discount;
                existing.Tax = invoice.Tax;
                existing.Total = invoice.Total;
                existing.Paid = invoice.Paid;
                existing.Status = invoice.Status;
                existing.DueAtUtc = invoice.DueAtUtc;
                existing.PaymentType = invoice.PaymentType;
                existing.InsuranceProvider = invoice.InsuranceProvider;
            }
        }
    }

    private static async Task UpsertInvoiceItemsAsync(BillingDbContext db)
    {
        var items = new[]
        {
            new InvoiceItem { Id = Guid.Parse("639967cd-4ed2-49da-bdb3-72f82124a5bd"), InvoiceId = Guid.Parse("9ba2c72a-29f0-4f4c-8f43-890a53b327da"), ServiceCode = "CONS", Description = "General consultation", Quantity = 1, UnitPrice = 350, Discount = 0, LineTotal = 350, ReferenceType = "Appointment", ReferenceId = Guid.Parse("29cb54e6-b268-4f62-ac89-41ca434658c7"), ServiceDateUtc = DateTime.UtcNow.AddHours(-1) },
            new InvoiceItem { Id = Guid.Parse("523fc856-9019-48f0-83d4-42d8a64679c5"), InvoiceId = Guid.Parse("9ba2c72a-29f0-4f4c-8f43-890a53b327da"), ServiceCode = "MED", Description = "Medication package", Quantity = 1, UnitPrice = 400, Discount = 0, LineTotal = 400, ReferenceType = "Prescription", ReferenceId = Guid.Parse("325cf3a1-2af1-4b69-8a17-6fac5c547915"), ServiceDateUtc = DateTime.UtcNow.AddHours(-1) },
            new InvoiceItem { Id = Guid.Parse("79efe26d-5fcf-44d0-80c4-3cd46c29b28d"), InvoiceId = Guid.Parse("295a57f4-2334-428d-a6f9-a596614684ad"), ServiceCode = "CONS", Description = "Specialist consultation", Quantity = 1, UnitPrice = 600, Discount = 0, LineTotal = 600, ReferenceType = "Encounter", ReferenceId = Guid.Parse("12c72cf1-3217-41e2-8f74-72efa8ad3c01"), ServiceDateUtc = DateTime.UtcNow.AddHours(-2) },
            new InvoiceItem { Id = Guid.Parse("80b25318-57ff-4e76-b984-fecfb7801519"), InvoiceId = Guid.Parse("295a57f4-2334-428d-a6f9-a596614684ad"), ServiceCode = "LAB", Description = "CBC and chemistry panel", Quantity = 1, UnitPrice = 600, Discount = 0, LineTotal = 600, ReferenceType = "LabRequest", ReferenceId = Guid.Parse("3cb3eb61-03a4-4fec-8517-9d2778f6e40d"), ServiceDateUtc = DateTime.UtcNow.AddHours(-2) },
            new InvoiceItem { Id = Guid.Parse("1cd2352b-c0b3-4264-a938-f16af246a006"), InvoiceId = Guid.Parse("ff3323a8-f93c-4918-a61c-a341eaaaf003"), ServiceCode = "CARD", Description = "Cardiology review", Quantity = 1, UnitPrice = 900, Discount = 100, LineTotal = 800, ReferenceType = "Encounter", ReferenceId = Guid.Parse("81429586-1dd0-40a8-a77d-b32f513a5b02"), ServiceDateUtc = DateTime.UtcNow.AddHours(-3) },
            new InvoiceItem { Id = Guid.Parse("21aa953f-bc58-45e4-a3fd-db69f400ee07"), InvoiceId = Guid.Parse("ff3323a8-f93c-4918-a61c-a341eaaaf003"), ServiceCode = "ECG", Description = "ECG and cardiac lab panel", Quantity = 1, UnitPrice = 950, Discount = 0, LineTotal = 950, ReferenceType = "LabRequest", ReferenceId = Guid.Parse("e640c416-d999-422f-a4c7-63e5b1640d02"), ServiceDateUtc = DateTime.UtcNow.AddHours(-3) },
            new InvoiceItem { Id = Guid.Parse("5504e570-9687-48b4-9b4c-0b5a57878308"), InvoiceId = Guid.Parse("b01013ee-4630-4f0d-bdb8-6f2479506f04"), ServiceCode = "PED_CONS", Description = "Pediatric outpatient consultation", Quantity = 1, UnitPrice = 500, Discount = 0, LineTotal = 500, ReferenceType = "Appointment", ReferenceId = Guid.Parse("d19846d8-e394-4a91-ae2f-d2d7ea535804"), ServiceDateUtc = DateTime.UtcNow.AddMinutes(-90) },
            new InvoiceItem { Id = Guid.Parse("cfd82b2f-46ed-4806-9cb9-53a6e166cf09"), InvoiceId = Guid.Parse("ec64ec77-ef2c-445a-b5a5-89d9a7ee2a05"), ServiceCode = "ANC", Description = "Antenatal care visit", Quantity = 1, UnitPrice = 450, Discount = 0, LineTotal = 450, ReferenceType = "Encounter", ReferenceId = Guid.Parse("c316f642-3b66-442d-b59e-661ba2046f03"), ServiceDateUtc = DateTime.UtcNow.AddDays(-1) },
            new InvoiceItem { Id = Guid.Parse("d148f171-2214-4d32-ad37-4af710424a0a"), InvoiceId = Guid.Parse("ec64ec77-ef2c-445a-b5a5-89d9a7ee2a05"), ServiceCode = "US", Description = "Obstetric ultrasound", Quantity = 1, UnitPrice = 900, Discount = 0, LineTotal = 900, ReferenceType = "LabRequest", ReferenceId = Guid.Parse("9707a9de-7a37-40b7-a10b-c92e47b2ba03"), ServiceDateUtc = DateTime.UtcNow.AddDays(-1) }
        };

        foreach (var item in items)
        {
            if (!await db.Invoices.AnyAsync(invoice => invoice.Id == item.InvoiceId))
            {
                continue;
            }

            var existing = await db.InvoiceItems.FirstOrDefaultAsync(row => row.Id == item.Id);
            if (existing is null)
            {
                db.InvoiceItems.Add(item);
            }
            else
            {
                existing.InvoiceId = item.InvoiceId;
                existing.ServiceCode = item.ServiceCode;
                existing.Description = item.Description;
                existing.Quantity = item.Quantity;
                existing.UnitPrice = item.UnitPrice;
                existing.Discount = item.Discount;
                existing.LineTotal = item.LineTotal;
                existing.ReferenceType = item.ReferenceType;
                existing.ReferenceId = item.ReferenceId;
                existing.ServiceDateUtc = item.ServiceDateUtc;
            }
        }
    }

    private static async Task UpsertPaymentsAsync(BillingDbContext db)
    {
        var payments = new[]
        {
            new Payment { Id = Guid.Parse("afcf9f59-b025-4014-9711-f92c0af6af03"), InvoiceId = Guid.Parse("295a57f4-2334-428d-a6f9-a596614684ad"), ReceiptNumber = "RCT-20260708-0001", Amount = 500, Method = "Insurance", Reference = "ELIFE-CLAIM-0001", ReceivedBy = "Accountant Selam", PaidAtUtc = DateTime.UtcNow.AddHours(-1), BalanceAfterPayment = 580 },
            new Payment { Id = Guid.Parse("01d8f2ea-7883-45c0-a17a-e54e39017c04"), InvoiceId = Guid.Parse("ff3323a8-f93c-4918-a61c-a341eaaaf003"), ReceiptNumber = "RCT-20260708-0002", Amount = 1000, Method = "Bank Transfer", Reference = "UNITY-TRX-0002", ReceivedBy = "Cashier Samuel", PaidAtUtc = DateTime.UtcNow.AddHours(-2), BalanceAfterPayment = 750 },
            new Payment { Id = Guid.Parse("2f7078d3-1c5a-476e-bdaa-e9c08f791d05"), InvoiceId = Guid.Parse("ff3323a8-f93c-4918-a61c-a341eaaaf003"), ReceiptNumber = "RCT-20260708-0003", Amount = 750, Method = "Cash", Reference = "", ReceivedBy = "Cashier Samuel", PaidAtUtc = DateTime.UtcNow.AddHours(-1), BalanceAfterPayment = 0 },
            new Payment { Id = Guid.Parse("dc138abf-9204-49b8-9ab7-73ce60e68b06"), InvoiceId = Guid.Parse("ec64ec77-ef2c-445a-b5a5-89d9a7ee2a05"), ReceiptNumber = "RCT-20260708-0004", Amount = 800, Method = "Insurance", Reference = "ELIFE-ANC-0004", ReceivedBy = "Accountant Selam", PaidAtUtc = DateTime.UtcNow.AddDays(-1).AddHours(2), BalanceAfterPayment = 550 }
        };

        foreach (var payment in payments)
        {
            if (!await db.Invoices.AnyAsync(invoice => invoice.Id == payment.InvoiceId))
            {
                continue;
            }

            var existing = await db.Payments.FirstOrDefaultAsync(row => row.ReceiptNumber == payment.ReceiptNumber);
            if (existing is null)
            {
                db.Payments.Add(payment);
            }
            else
            {
                existing.InvoiceId = payment.InvoiceId;
                existing.Amount = payment.Amount;
                existing.Method = payment.Method;
                existing.Reference = payment.Reference;
                existing.ReceivedBy = payment.ReceivedBy;
                existing.PaidAtUtc = payment.PaidAtUtc;
                existing.BalanceAfterPayment = payment.BalanceAfterPayment;
            }
        }
    }
}

public static class BillingDatabaseBootstrapper
{
    public static Task EnsureDatabaseExistsAsync(string connectionString) =>
        PostgresDatabaseBootstrapper.EnsureDatabaseExistsAsync(connectionString);
}

public sealed class BillingDbContextFactory : IDesignTimeDbContextFactory<BillingDbContext>
{
    public BillingDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__BillingDb")
            ?? throw new InvalidOperationException("Set ConnectionStrings__BillingDb before running EF Core design-time commands.");

        var options = new DbContextOptionsBuilder<BillingDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        return new BillingDbContext(options);
    }
}
