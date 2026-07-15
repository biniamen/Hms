using HMS.Appointments.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace HMS.Appointments.Infrastructure.Data;

public class AppAppointmentsDbContext : DbContext
{
    public AppAppointmentsDbContext(DbContextOptions<AppAppointmentsDbContext> options) : base(options) { }

    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<Bed> Beds => Set<Bed>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Appointment>(entity =>
        {
            entity.ToTable("appointments");
            entity.HasKey(a => a.Id);
            entity.Property(a => a.PatientId).IsRequired();
            entity.Property(a => a.DoctorId).IsRequired();
            entity.Property(a => a.StartsAtUtc).IsRequired();
            entity.Property(a => a.Status).HasMaxLength(32).IsRequired();
            entity.Property(a => a.Reason).HasMaxLength(240).IsRequired();
        });

        modelBuilder.Entity<Bed>(entity =>
        {
            entity.ToTable("beds");
            entity.HasKey(b => b.Id);
            entity.Property(b => b.Ward).HasMaxLength(96).IsRequired();
            entity.Property(b => b.Room).HasMaxLength(32).IsRequired();
            entity.Property(b => b.BedNumber).HasMaxLength(32).IsRequired();
            entity.HasIndex(b => new { b.Ward, b.Room, b.BedNumber }).IsUnique();
            entity.Property(b => b.IsAvailable).HasDefaultValue(true);
        });

        SeedData(modelBuilder);
    }

    private static void SeedData(ModelBuilder modelBuilder)
    {
        var saraPatientId = Guid.Parse("f64d3368-a4da-4d44-9612-5c302b0ec29a");
        var doctorId = Guid.Parse("8f334882-8d97-4d54-a011-97d7c8c2a201");

        modelBuilder.Entity<Appointment>().HasData(
            new Appointment
            {
                Id = Guid.Parse("29cb54e6-b268-4f62-ac89-41ca434658c7"),
                PatientId = saraPatientId,
                DoctorId = doctorId,
                StartsAtUtc = new DateTime(2026, 1, 2, 10, 0, 0, DateTimeKind.Utc),
                Status = "Scheduled",
                Reason = "General consultation",
                CreatedAtUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            }
        );

        modelBuilder.Entity<Bed>().HasData(
            new Bed
            {
                Id = Guid.Parse("c7e6c2bc-972f-47c1-a206-5f4e27f50cf7"),
                Ward = "General Ward A",
                Room = "101",
                BedNumber = "A1",
                IsAvailable = true,
                CreatedAtUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new Bed
            {
                Id = Guid.Parse("e33cfb8d-6d4a-4785-ac08-f436dc63a476"),
                Ward = "General Ward A",
                Room = "102",
                BedNumber = "A2",
                IsAvailable = true,
                CreatedAtUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new Bed
            {
                Id = Guid.Parse("a1b2c3d4-e5f6-7890-abcd-ef1234567890"),
                Ward = "Emergency",
                Room = "201",
                BedNumber = "E1",
                IsAvailable = false,
                CreatedAtUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            }
        );
    }
}
