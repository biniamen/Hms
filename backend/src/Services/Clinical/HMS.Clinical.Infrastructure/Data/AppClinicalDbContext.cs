using HMS.Clinical.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace HMS.Clinical.Infrastructure.Data;

public class AppClinicalDbContext : DbContext
{
    public AppClinicalDbContext(DbContextOptions<AppClinicalDbContext> options) : base(options) { }

    public DbSet<ClinicalEncounter> Encounters => Set<ClinicalEncounter>();
    public DbSet<VitalSign> Vitals => Set<VitalSign>();
    public DbSet<Diagnosis> Diagnoses => Set<Diagnosis>();
    public DbSet<Prescription> Prescriptions => Set<Prescription>();
    public DbSet<LabRequest> LabRequests => Set<LabRequest>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ClinicalEncounter>(entity =>
        {
            entity.ToTable("clinical_encounters");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PatientId).IsRequired();
            entity.Property(e => e.DoctorId).IsRequired();
            entity.Property(e => e.VisitType).HasMaxLength(64).IsRequired();
            entity.Property(e => e.ChiefComplaint).HasMaxLength(256).IsRequired();
            entity.Property(e => e.Assessment).HasMaxLength(512);
            entity.Property(e => e.Plan).HasMaxLength(512);
        });

        modelBuilder.Entity<VitalSign>(entity =>
        {
            entity.ToTable("vital_signs");
            entity.HasKey(v => v.Id);
            entity.Property(v => v.PatientId).IsRequired();
            entity.Property(v => v.TemperatureC).HasColumnType("decimal(5,2)");
            entity.Property(v => v.Pulse).IsRequired();
            entity.Property(v => v.RespiratoryRate).IsRequired();
            entity.Property(v => v.BloodPressure).HasMaxLength(16).IsRequired();
            entity.Property(v => v.WeightKg).HasColumnType("decimal(6,2)");
            entity.Property(v => v.HeightCm).HasColumnType("decimal(6,2)");
        });

        modelBuilder.Entity<Diagnosis>(entity =>
        {
            entity.ToTable("diagnoses");
            entity.HasKey(d => d.Id);
            entity.Property(d => d.PatientId).IsRequired();
            entity.Property(d => d.DoctorId).IsRequired();
            entity.Property(d => d.Code).HasMaxLength(16).IsRequired();
            entity.Property(d => d.Description).HasMaxLength(256).IsRequired();
            entity.Property(d => d.Severity).HasMaxLength(32).IsRequired();
        });

        modelBuilder.Entity<Prescription>(entity =>
        {
            entity.ToTable("prescriptions");
            entity.HasKey(p => p.Id);
            entity.Property(p => p.PatientId).IsRequired();
            entity.Property(p => p.DoctorId).IsRequired();
            entity.Property(p => p.Medication).HasMaxLength(160).IsRequired();
            entity.Property(p => p.Instructions).HasMaxLength(240).IsRequired();
        });

        modelBuilder.Entity<LabRequest>(entity =>
        {
            entity.ToTable("lab_requests");
            entity.HasKey(l => l.Id);
            entity.Property(l => l.PatientId).IsRequired();
            entity.Property(l => l.DoctorId).IsRequired();
            entity.Property(l => l.TestName).HasMaxLength(160).IsRequired();
            entity.Property(l => l.Status).HasMaxLength(32).IsRequired();
        });

        SeedData(modelBuilder);
    }

    private static void SeedData(ModelBuilder modelBuilder)
    {
        var saraPatientId = Guid.Parse("f64d3368-a4da-4d44-9612-5c302b0ec29a");
        var dawitPatientId = Guid.Parse("d5c6bf11-de68-4c3f-97d2-6d7fd12f8e80");
        var doctorId = Guid.Parse("8f334882-8d97-4d54-a011-97d7c8c2a201");
        var baseDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        modelBuilder.Entity<ClinicalEncounter>().HasData(
            new ClinicalEncounter
            {
                Id = Guid.Parse("7a58c9f1-4412-48dd-9165-7f08de63f863"),
                PatientId = saraPatientId,
                DoctorId = doctorId,
                VisitType = "Outpatient",
                ChiefComplaint = "Fever and sore throat",
                Assessment = "Likely bacterial pharyngitis",
                Plan = "Antibiotics, hydration, follow-up in 5 days",
                CreatedAtUtc = baseDate
            }
        );

        modelBuilder.Entity<VitalSign>().HasData(
            new VitalSign
            {
                Id = Guid.Parse("a4d6c3ef-6d9f-4d35-9e92-40f980022f6a"),
                PatientId = saraPatientId,
                TemperatureC = 37.8m,
                Pulse = 92,
                RespiratoryRate = 18,
                BloodPressure = "118/76",
                WeightKg = 62.5m,
                HeightCm = 164m,
                CreatedAtUtc = baseDate
            }
        );

        modelBuilder.Entity<Diagnosis>().HasData(
            new Diagnosis
            {
                Id = Guid.Parse("f4231a15-8a45-48cd-824a-28f454ccdfc1"),
                PatientId = saraPatientId,
                DoctorId = doctorId,
                Code = "J02.9",
                Description = "Acute pharyngitis",
                Severity = "Moderate",
                CreatedAtUtc = baseDate
            }
        );

        modelBuilder.Entity<Prescription>().HasData(
            new Prescription
            {
                Id = Guid.Parse("325cf3a1-2af1-4b69-8a17-6fac5c547915"),
                PatientId = saraPatientId,
                DoctorId = doctorId,
                Medication = "Amoxicillin 500mg",
                Instructions = "Take one capsule every 8 hours for 5 days",
                CreatedAtUtc = baseDate
            }
        );

        modelBuilder.Entity<LabRequest>().HasData(
            new LabRequest
            {
                Id = Guid.Parse("3cb3eb61-03a4-4fec-8517-9d2778f6e40d"),
                PatientId = dawitPatientId,
                DoctorId = doctorId,
                TestName = "Complete Blood Count",
                Status = "Requested",
                CreatedAtUtc = baseDate
            }
        );
    }
}
