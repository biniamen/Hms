using HMS.Billing.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace HMS.Billing.Infrastructure.Data;

public class AppBillingDbContext : DbContext
{
    public AppBillingDbContext(DbContextOptions<AppBillingDbContext> options) : base(options) { }

    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<Payment> Payments => Set<Payment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.ToTable("invoices");
            entity.HasKey(i => i.Id);
            entity.Property(i => i.PatientId).IsRequired();
            entity.Property(i => i.Description).HasMaxLength(256).IsRequired();
            entity.Property(i => i.Amount).HasColumnType("decimal(12,2)").IsRequired();
            entity.Property(i => i.Status).HasMaxLength(32).IsRequired();
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.ToTable("payments");
            entity.HasKey(p => p.Id);
            entity.Property(p => p.InvoiceId).IsRequired();
            entity.Property(p => p.Amount).HasColumnType("decimal(12,2)").IsRequired();
            entity.Property(p => p.Method).HasMaxLength(32).IsRequired();
            entity.Property(p => p.PaidAtUtc).IsRequired();
        });

        SeedData(modelBuilder);
    }

    private static void SeedData(ModelBuilder modelBuilder)
    {
        var saraPatientId = Guid.Parse("f64d3368-a4da-4d44-9612-5c302b0ec29a");
        var baseDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        modelBuilder.Entity<Invoice>().HasData(
            new Invoice
            {
                Id = Guid.Parse("9ba2c72a-29f0-4f4c-8f43-890a53b327da"),
                PatientId = saraPatientId,
                Description = "General consultation and medication",
                Amount = 750m,
                Status = "Unpaid",
                CreatedAtUtc = baseDate
            }
        );
    }
}
