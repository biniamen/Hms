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
            entity.Property(invoice => invoice.InsuranceCoveredAmount).HasColumnName("insurance_covered_amount").HasPrecision(12, 2).HasDefaultValue(0m);
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
    /// <summary>
    /// Portion of this invoice carried by the patient's insurer. The patient is
    /// clinically cleared once <c>Total - InsuranceCoveredAmount - Paid &lt;= 0</c>,
    /// i.e. the patient's own share (copay) is settled even when the insurer's
    /// portion is still awaiting claim settlement.
    /// </summary>
    public decimal InsuranceCoveredAmount { get; set; }
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
        if (!await db.DoctorServicePrices.AnyAsync())
        {
            var seededDoctorId = Guid.Parse("8f334882-8d97-4d54-a011-97d7c8c2a201");
            db.DoctorServicePrices.AddRange(
                new DoctorServicePrice { Id = Guid.Parse("ae43a4c5-7f6b-4f97-a774-9923e3c1a001"), DoctorId = seededDoctorId, ServiceCode = "CONSULTATION", ServiceName = "Consultation", Amount = 500, Currency = "ETB", ValidityDays = 10 },
                new DoctorServicePrice { Id = Guid.Parse("ae43a4c5-7f6b-4f97-a774-9923e3c1a002"), DoctorId = seededDoctorId, ServiceCode = "FOLLOW_UP", ServiceName = "Follow-up Visit", Amount = 300, Currency = "ETB", ValidityDays = 15 },
                new DoctorServicePrice { Id = Guid.Parse("ae43a4c5-7f6b-4f97-a774-9923e3c1a003"), DoctorId = seededDoctorId, ServiceCode = "EMERGENCY", ServiceName = "Emergency Consultation", Amount = 800, Currency = "ETB", ValidityDays = 1 });
        }

        if (!await db.Invoices.AnyAsync())
        {
            var cashInvoice = new Invoice
            {
            Id = Guid.Parse("9ba2c72a-29f0-4f4c-8f43-890a53b327da"),
            InvoiceNumber = "INV-2026-0001",
            PatientId = Guid.Parse("f64d3368-a4da-4d44-9612-5c302b0ec29a"),
            Description = "General consultation and medication",
            Subtotal = 750,
            Discount = 0,
            Tax = 0,
            Total = 750,
            Paid = 0,
            Status = "Unpaid",
            DueAtUtc = DateTime.UtcNow.AddDays(7),
            CreatedAtUtc = DateTime.UtcNow.AddHours(-1),
            PaymentType = "Cash",
            Items =
            [
                new InvoiceItem { Id = Guid.Parse("639967cd-4ed2-49da-bdb3-72f82124a5bd"), ServiceCode = "CONS", Description = "General consultation", Quantity = 1, UnitPrice = 350, Discount = 0, LineTotal = 350 },
                new InvoiceItem { Id = Guid.Parse("523fc856-9019-48f0-83d4-42d8a64679c5"), ServiceCode = "MED", Description = "Medication package", Quantity = 1, UnitPrice = 400, Discount = 0, LineTotal = 400 }
            ]
            };

            var insuranceInvoice = new Invoice
            {
            Id = Guid.Parse("295a57f4-2334-428d-a6f9-a596614684ad"),
            InvoiceNumber = "INV-2026-0002",
            PatientId = Guid.Parse("d5c6bf11-de68-4c3f-97d2-6d7fd12f8e80"),
            Description = "Corporate outpatient visit",
            Subtotal = 1200,
            Discount = 120,
            Tax = 0,
            Total = 1080,
            Paid = 500,
            Status = "Partially Paid",
            DueAtUtc = DateTime.UtcNow.AddDays(7),
            CreatedAtUtc = DateTime.UtcNow.AddHours(-2),
            PaymentType = "Insurance",
            InsuranceProvider = "EthioLife Corporate Insurance",
            Items =
            [
                new InvoiceItem { Id = Guid.Parse("79efe26d-5fcf-44d0-80c4-3cd46c29b28d"), ServiceCode = "CONS", Description = "Specialist consultation", Quantity = 1, UnitPrice = 600, Discount = 0, LineTotal = 600 },
                new InvoiceItem { Id = Guid.Parse("80b25318-57ff-4e76-b984-fecfb7801519"), ServiceCode = "LAB", Description = "CBC and chemistry panel", Quantity = 1, UnitPrice = 600, Discount = 0, LineTotal = 600 }
            ],
            Payments =
            [
                new Payment { Id = Guid.Parse("afcf9f59-b025-4014-9711-f92c0af6af03"), ReceiptNumber = "RCT-20260708-0001", Amount = 500, Method = "Insurance", Reference = "ELIFE-CLAIM-0001", ReceivedBy = "Accountant Selam", PaidAtUtc = DateTime.UtcNow.AddHours(-1), BalanceAfterPayment = 580 }
            ]
            };

            db.Invoices.AddRange(cashInvoice, insuranceInvoice);
        }

        await db.SaveChangesAsync();
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
