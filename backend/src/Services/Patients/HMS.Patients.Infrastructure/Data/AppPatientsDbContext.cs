using HMS.Patients.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace HMS.Patients.Infrastructure.Data;

public class AppPatientsDbContext : DbContext
{
    public AppPatientsDbContext(DbContextOptions<AppPatientsDbContext> options) : base(options) { }

    public DbSet<Patient> Patients => Set<Patient>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Patient>(entity =>
        {
            entity.ToTable("patients");
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Mrn).HasMaxLength(32).IsRequired();
            entity.HasIndex(p => p.Mrn).IsUnique();
            entity.Property(p => p.FirstName).HasMaxLength(96).IsRequired();
            entity.Property(p => p.LastName).HasMaxLength(96).IsRequired();
            entity.Property(p => p.Phone).HasMaxLength(32).IsRequired();
            entity.Property(p => p.Gender).HasMaxLength(32).IsRequired();
            entity.Property(p => p.DateOfBirth).IsRequired();
            entity.Property(p => p.Address).HasColumnType("text");
            entity.Property(p => p.BloodType).HasMaxLength(16);
            entity.Property(p => p.EmergencyContactName).HasMaxLength(160);
            entity.Property(p => p.EmergencyContactPhone).HasMaxLength(32);
            entity.Property(p => p.PhotoContentType).HasMaxLength(80);
            entity.Property(p => p.PhotoData).HasColumnType("bytea");
        });

        SeedData(modelBuilder);
    }

    private static void SeedData(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Patient>().HasData(
            new Patient
            {
                Id = Guid.Parse("f64d3368-a4da-4d44-9612-5c302b0ec29a"),
                Mrn = "MRN-0001",
                FirstName = "Sara",
                LastName = "Bekele",
                Phone = "0920000001",
                Gender = "Female",
                DateOfBirth = new DateOnly(1995, 5, 10),
                Address = "Bole, Addis Ababa",
                BloodType = "O+",
                EmergencyContactName = "Meron Bekele",
                EmergencyContactPhone = "0921000001",
                CreatedAtUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new Patient
            {
                Id = Guid.Parse("d5c6bf11-de68-4c3f-97d2-6d7fd12f8e80"),
                Mrn = "MRN-0002",
                FirstName = "Dawit",
                LastName = "Alemu",
                Phone = "0920000002",
                Gender = "Male",
                DateOfBirth = new DateOnly(1988, 2, 20),
                Address = "CMC, Addis Ababa",
                BloodType = "A+",
                EmergencyContactName = "Alem Alemu",
                EmergencyContactPhone = "0921000002",
                CreatedAtUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            }
        );
    }
}
