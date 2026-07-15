using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Npgsql;

namespace HMS.Clinical.Infrastructure;

public sealed class ClinicalDbContext(DbContextOptions<ClinicalDbContext> options) : DbContext(options)
{
    public DbSet<ClinicalEncounter> Encounters => Set<ClinicalEncounter>();
    public DbSet<VitalSign> VitalSigns => Set<VitalSign>();
    public DbSet<Diagnosis> Diagnoses => Set<Diagnosis>();
    public DbSet<Prescription> Prescriptions => Set<Prescription>();
    public DbSet<LabRequest> LabRequests => Set<LabRequest>();
    public DbSet<EnterpriseRecord> EnterpriseRecords => Set<EnterpriseRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ClinicalEncounter>(entity =>
        {
            entity.ToTable("clinical_encounters");
            entity.HasKey(encounter => encounter.Id);
            entity.Property(encounter => encounter.PatientId).HasColumnName("patient_id");
            entity.Property(encounter => encounter.DoctorId).HasColumnName("doctor_id");
            entity.Property(encounter => encounter.VisitType).HasColumnName("visit_type").HasMaxLength(80);
            entity.Property(encounter => encounter.ChiefComplaint).HasColumnName("chief_complaint");
            entity.Property(encounter => encounter.Assessment).HasColumnName("assessment");
            entity.Property(encounter => encounter.Plan).HasColumnName("plan");
            entity.Property(encounter => encounter.EncounterAtUtc).HasColumnName("encounter_at_utc").HasDefaultValueSql("now()");
        });

        modelBuilder.Entity<VitalSign>(entity =>
        {
            entity.ToTable("vital_signs");
            entity.HasKey(vital => vital.Id);
            entity.Property(vital => vital.PatientId).HasColumnName("patient_id");
            entity.Property(vital => vital.TemperatureC).HasColumnName("temperature_c").HasPrecision(5, 2);
            entity.Property(vital => vital.Pulse).HasColumnName("pulse");
            entity.Property(vital => vital.RespiratoryRate).HasColumnName("respiratory_rate");
            entity.Property(vital => vital.BloodPressure).HasColumnName("blood_pressure").HasMaxLength(40);
            entity.Property(vital => vital.WeightKg).HasColumnName("weight_kg").HasPrecision(6, 2);
            entity.Property(vital => vital.HeightCm).HasColumnName("height_cm").HasPrecision(6, 2);
            entity.Property(vital => vital.RecordedAtUtc).HasColumnName("recorded_at_utc").HasDefaultValueSql("now()");
        });

        modelBuilder.Entity<Diagnosis>(entity =>
        {
            entity.ToTable("diagnoses");
            entity.HasKey(diagnosis => diagnosis.Id);
            entity.Property(diagnosis => diagnosis.PatientId).HasColumnName("patient_id");
            entity.Property(diagnosis => diagnosis.DoctorId).HasColumnName("doctor_id");
            entity.Property(diagnosis => diagnosis.Code).HasColumnName("code").HasMaxLength(40);
            entity.Property(diagnosis => diagnosis.Description).HasColumnName("description");
            entity.Property(diagnosis => diagnosis.Severity).HasColumnName("severity").HasMaxLength(60);
            entity.Property(diagnosis => diagnosis.DiagnosedAtUtc).HasColumnName("diagnosed_at_utc").HasDefaultValueSql("now()");
        });

        modelBuilder.Entity<Prescription>(entity =>
        {
            entity.ToTable("prescriptions");
            entity.HasKey(prescription => prescription.Id);
            entity.Property(prescription => prescription.PatientId).HasColumnName("patient_id");
            entity.Property(prescription => prescription.DoctorId).HasColumnName("doctor_id");
            entity.Property(prescription => prescription.Medication).HasColumnName("medication").HasMaxLength(240);
            entity.Property(prescription => prescription.Instructions).HasColumnName("instructions");
            entity.Property(prescription => prescription.OrderedAtUtc).HasColumnName("ordered_at_utc").HasDefaultValueSql("now()");
        });

        modelBuilder.Entity<LabRequest>(entity =>
        {
            entity.ToTable("lab_requests");
            entity.HasKey(request => request.Id);
            entity.Property(request => request.PatientId).HasColumnName("patient_id");
            entity.Property(request => request.DoctorId).HasColumnName("doctor_id");
            entity.Property(request => request.TestName).HasColumnName("test_name").HasMaxLength(240);
            entity.Property(request => request.Status).HasColumnName("status").HasMaxLength(60);
            entity.Property(request => request.OrderedAtUtc).HasColumnName("ordered_at_utc").HasDefaultValueSql("now()");
        });

        modelBuilder.Entity<EnterpriseRecord>(entity =>
        {
            entity.ToTable("enterprise_records");
            entity.HasKey(record => record.Id);
            entity.HasIndex(record => record.RecordNumber).IsUnique();
            entity.Property(record => record.Area).HasColumnName("area").HasMaxLength(80);
            entity.Property(record => record.RecordNumber).HasColumnName("record_number").HasMaxLength(40);
            entity.Property(record => record.PatientId).HasColumnName("patient_id");
            entity.Property(record => record.Title).HasColumnName("title");
            entity.Property(record => record.Department).HasColumnName("department").HasMaxLength(120);
            entity.Property(record => record.Owner).HasColumnName("owner").HasMaxLength(120);
            entity.Property(record => record.Priority).HasColumnName("priority").HasMaxLength(40);
            entity.Property(record => record.Status).HasColumnName("status").HasMaxLength(40);
            entity.Property(record => record.Amount).HasColumnName("amount").HasPrecision(12, 2);
            entity.Property(record => record.DueAtUtc).HasColumnName("due_at_utc");
            entity.Property(record => record.Details).HasColumnName("details");
            entity.Property(record => record.CreatedAtUtc).HasColumnName("created_at_utc").HasDefaultValueSql("now()");
            entity.Property(record => record.UpdatedAtUtc).HasColumnName("updated_at_utc").HasDefaultValueSql("now()");
        });
    }
}

public sealed class ClinicalEncounter
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public string VisitType { get; set; } = "";
    public string ChiefComplaint { get; set; } = "";
    public string Assessment { get; set; } = "";
    public string Plan { get; set; } = "";
    public DateTime EncounterAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class VitalSign
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public decimal TemperatureC { get; set; }
    public int Pulse { get; set; }
    public int RespiratoryRate { get; set; }
    public string BloodPressure { get; set; } = "";
    public decimal WeightKg { get; set; }
    public decimal HeightCm { get; set; }
    public DateTime RecordedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class Diagnosis
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public string Code { get; set; } = "";
    public string Description { get; set; } = "";
    public string Severity { get; set; } = "";
    public DateTime DiagnosedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class Prescription
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public string Medication { get; set; } = "";
    public string Instructions { get; set; } = "";
    public DateTime OrderedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class LabRequest
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public string TestName { get; set; } = "";
    public string Status { get; set; } = "Requested";
    public DateTime OrderedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class EnterpriseRecord
{
    public Guid Id { get; set; }
    public string Area { get; set; } = "";
    public string RecordNumber { get; set; } = "";
    public Guid? PatientId { get; set; }
    public string Title { get; set; } = "";
    public string Department { get; set; } = "";
    public string Owner { get; set; } = "";
    public string Priority { get; set; } = "";
    public string Status { get; set; } = "";
    public decimal Amount { get; set; }
    public DateTime? DueAtUtc { get; set; }
    public string Details { get; set; } = "";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

public static class ClinicalSeedData
{
    public static async Task SeedAsync(ClinicalDbContext db)
    {
        var doctorId = Guid.Parse("8f334882-8d97-4d54-a011-97d7c8c2a201");
        var saraId = Guid.Parse("f64d3368-a4da-4d44-9612-5c302b0ec29a");
        var dawitId = Guid.Parse("d5c6bf11-de68-4c3f-97d2-6d7fd12f8e80");

        if (!await db.Encounters.AnyAsync())
        {
            db.Encounters.Add(new ClinicalEncounter { Id = Guid.Parse("7a58c9f1-4412-48dd-9165-7f08de63f863"), PatientId = saraId, DoctorId = doctorId, VisitType = "Outpatient", ChiefComplaint = "Fever and sore throat", Assessment = "Likely bacterial pharyngitis", Plan = "Antibiotics, hydration, follow-up in 5 days", EncounterAtUtc = DateTime.UtcNow.AddHours(-4) });
        }

        if (!await db.VitalSigns.AnyAsync())
        {
            db.VitalSigns.Add(new VitalSign { Id = Guid.Parse("a4d6c3ef-6d9f-4d35-9e92-40f980022f6a"), PatientId = saraId, TemperatureC = 37.8m, Pulse = 92, RespiratoryRate = 18, BloodPressure = "118/76", WeightKg = 62.5m, HeightCm = 164m, RecordedAtUtc = DateTime.UtcNow.AddHours(-4) });
        }

        if (!await db.Diagnoses.AnyAsync())
        {
            db.Diagnoses.Add(new Diagnosis { Id = Guid.Parse("f4231a15-8a45-48cd-824a-28f454ccdfc1"), PatientId = saraId, DoctorId = doctorId, Code = "J02.9", Description = "Acute pharyngitis", Severity = "Moderate", DiagnosedAtUtc = DateTime.UtcNow.AddHours(-3) });
        }

        if (!await db.Prescriptions.AnyAsync())
        {
            db.Prescriptions.Add(new Prescription { Id = Guid.Parse("325cf3a1-2af1-4b69-8a17-6fac5c547915"), PatientId = saraId, DoctorId = doctorId, Medication = "Amoxicillin 500mg", Instructions = "Take one capsule every 8 hours for 5 days", OrderedAtUtc = DateTime.UtcNow.AddHours(-3) });
        }

        if (!await db.LabRequests.AnyAsync())
        {
            db.LabRequests.Add(new LabRequest { Id = Guid.Parse("3cb3eb61-03a4-4fec-8517-9d2778f6e40d"), PatientId = dawitId, DoctorId = doctorId, TestName = "Complete Blood Count", Status = "Requested", OrderedAtUtc = DateTime.UtcNow.AddHours(-2) });
        }

        await UpsertEnterpriseRecordsAsync(db);
        await db.SaveChangesAsync();
    }

    private static async Task UpsertEnterpriseRecordsAsync(ClinicalDbContext db)
    {
        var records = new[]
        {
            new EnterpriseRecord { Id = Guid.Parse("407e17b2-1611-4bb7-b149-c59b1a4f1c10"), Area = "Pharmacy", RecordNumber = "PHA-2026-0001", PatientId = Guid.Parse("f64d3368-a4da-4d44-9612-5c302b0ec29a"), Title = "Amoxicillin dispensing and stock posting", Department = "Pharmacy", Owner = "Pharmacist", Priority = "High", Status = "In Progress", Amount = 400, DueAtUtc = DateTime.UtcNow.AddHours(2), Details = "Review prescription, dispense medicine, post stock movement, and confirm patient counselling.", CreatedAtUtc = DateTime.UtcNow.AddHours(-3), UpdatedAtUtc = DateTime.UtcNow.AddHours(-1) },
            new EnterpriseRecord { Id = Guid.Parse("4c10bec1-a158-489f-8951-cf833c65f101"), Area = "Laboratory", RecordNumber = "LAB-2026-0001", PatientId = Guid.Parse("d5c6bf11-de68-4c3f-97d2-6d7fd12f8e80"), Title = "CBC sample processing", Department = "Laboratory", Owner = "Lab Technician", Priority = "Normal", Status = "Open", Amount = 600, DueAtUtc = DateTime.UtcNow.AddHours(5), Details = "Collect specimen, run analyzer, verify result, and release to clinician.", CreatedAtUtc = DateTime.UtcNow.AddHours(-2), UpdatedAtUtc = DateTime.UtcNow.AddHours(-2) },
            new EnterpriseRecord { Id = Guid.Parse("d914fd10-4f0e-46c8-88e7-3c9586cbd551"), Area = "Radiology", RecordNumber = "RAD-2026-0001", PatientId = Guid.Parse("f64d3368-a4da-4d44-9612-5c302b0ec29a"), Title = "Chest X-ray order", Department = "Radiology", Owner = "Radiology Officer", Priority = "Normal", Status = "Open", Amount = 850, DueAtUtc = DateTime.UtcNow.AddDays(1), Details = "Schedule imaging, attach report reference, and notify doctor when report is ready.", CreatedAtUtc = DateTime.UtcNow.AddHours(-1), UpdatedAtUtc = DateTime.UtcNow.AddHours(-1) },
            new EnterpriseRecord { Id = Guid.Parse("72efc934-cec0-4db2-bc66-76e55ca4b581"), Area = "Inpatient", RecordNumber = "ADM-2026-0001", PatientId = Guid.Parse("d5c6bf11-de68-4c3f-97d2-6d7fd12f8e80"), Title = "Medical ward admission", Department = "Medical Ward", Owner = "Charge Nurse", Priority = "High", Status = "In Progress", Amount = 0, DueAtUtc = DateTime.UtcNow.AddHours(4), Details = "Assign bed, capture admission note, start nursing care plan, and prepare daily ward round list.", CreatedAtUtc = DateTime.UtcNow.AddHours(-4), UpdatedAtUtc = DateTime.UtcNow.AddMinutes(-30) },
            new EnterpriseRecord { Id = Guid.Parse("501b7cf7-4815-4457-9d01-0e84ac38e137"), Area = "Emergency", RecordNumber = "EMR-2026-0001", Title = "Triage bay readiness check", Department = "Emergency", Owner = "ER Nurse", Priority = "High", Status = "Open", Amount = 0, DueAtUtc = DateTime.UtcNow.AddHours(1), Details = "Confirm triage desk, emergency trolley, oxygen, and fast-track queue readiness.", CreatedAtUtc = DateTime.UtcNow.AddMinutes(-30), UpdatedAtUtc = DateTime.UtcNow.AddMinutes(-30) },
            new EnterpriseRecord { Id = Guid.Parse("9e88ed27-f031-4fd1-9339-3f69dc97d201"), Area = "Operating Theatre", RecordNumber = "OT-2026-0001", Title = "Morning theatre availability", Department = "Operating Theatre", Owner = "Theatre Coordinator", Priority = "High", Status = "Under Review", Amount = 0, DueAtUtc = DateTime.UtcNow.AddHours(2), Details = "Confirm theatre list, anesthesia readiness, checklist forms, and recovery bed availability.", CreatedAtUtc = DateTime.UtcNow.AddHours(-1), UpdatedAtUtc = DateTime.UtcNow.AddMinutes(-20) },
            new EnterpriseRecord { Id = Guid.Parse("f5fc42fb-20e7-4ad2-9f81-9477b2e13e32"), Area = "Inventory", RecordNumber = "INVST-2026-0001", Title = "Paracetamol reorder level reached", Department = "Main Store", Owner = "Store Keeper", Priority = "High", Status = "Open", Amount = 12500, DueAtUtc = DateTime.UtcNow.AddDays(1), Details = "Raise reorder request, validate stock card, and prepare issue plan for pharmacy.", CreatedAtUtc = DateTime.UtcNow.AddHours(-2), UpdatedAtUtc = DateTime.UtcNow.AddHours(-2) },
            new EnterpriseRecord { Id = Guid.Parse("c20de208-967a-4cf0-9bfe-c2f5f536a7ce"), Area = "Procurement", RecordNumber = "PR-2026-0001", Title = "Laboratory reagent purchase request", Department = "Procurement", Owner = "Procurement Officer", Priority = "Normal", Status = "Open", Amount = 48500, DueAtUtc = DateTime.UtcNow.AddDays(3), Details = "Collect quotations, prepare approval, and convert to purchase order after authorization.", CreatedAtUtc = DateTime.UtcNow.AddDays(-1), UpdatedAtUtc = DateTime.UtcNow.AddDays(-1) },
            new EnterpriseRecord { Id = Guid.Parse("7a283a3c-c041-4a50-a772-aa5d84ecab0d"), Area = "Asset Management", RecordNumber = "AST-2026-0001", Title = "Ultrasound asset verification", Department = "Radiology", Owner = "Asset Officer", Priority = "Normal", Status = "In Progress", Amount = 0, DueAtUtc = DateTime.UtcNow.AddDays(2), Details = "Verify location, custodian, serial number, warranty, and preventive maintenance schedule.", CreatedAtUtc = DateTime.UtcNow.AddHours(-6), UpdatedAtUtc = DateTime.UtcNow.AddHours(-1) },
            new EnterpriseRecord { Id = Guid.Parse("1d705fab-8a31-48c4-9df1-2c8ae15e2f96"), Area = "Biomedical Maintenance", RecordNumber = "BIO-2026-0001", Title = "Patient monitor calibration", Department = "Biomedical", Owner = "Biomedical Engineer", Priority = "High", Status = "Open", Amount = 0, DueAtUtc = DateTime.UtcNow.AddDays(1), Details = "Perform calibration, attach service note, and release equipment back to ward.", CreatedAtUtc = DateTime.UtcNow.AddHours(-3), UpdatedAtUtc = DateTime.UtcNow.AddHours(-3) },
            new EnterpriseRecord { Id = Guid.Parse("5eb05659-b7a0-497a-a033-93f81a6b8c3b"), Area = "Insurance Claims", RecordNumber = "CLM-2026-0001", PatientId = Guid.Parse("d5c6bf11-de68-4c3f-97d2-6d7fd12f8e80"), Title = "Corporate outpatient claim preparation", Department = "Billing", Owner = "Claims Officer", Priority = "High", Status = "In Progress", Amount = 1080, DueAtUtc = DateTime.UtcNow.AddDays(2), Details = "Attach invoice, patient eligibility, service lines, and submit claim to payer.", CreatedAtUtc = DateTime.UtcNow.AddHours(-3), UpdatedAtUtc = DateTime.UtcNow.AddHours(-1) },
            new EnterpriseRecord { Id = Guid.Parse("35dce8e0-a7e6-4e56-b1c1-50a9d3902db2"), Area = "Security Audit", RecordNumber = "AUD-2026-0001", Title = "User access review", Department = "Administration", Owner = "System Admin", Priority = "Normal", Status = "Open", Amount = 0, DueAtUtc = DateTime.UtcNow.AddDays(5), Details = "Review users, roles, permission assignments, password setup status, and access exceptions.", CreatedAtUtc = DateTime.UtcNow.AddDays(-1), UpdatedAtUtc = DateTime.UtcNow.AddDays(-1) },
            new EnterpriseRecord { Id = Guid.Parse("4ea9dbd9-cb71-4ca9-93c4-9e47f6db4303"), Area = "Notifications", RecordNumber = "NTF-2026-0001", Title = "SMS reminder provider setup", Department = "IT", Owner = "System Admin", Priority = "Normal", Status = "Open", Amount = 0, DueAtUtc = DateTime.UtcNow.AddDays(3), Details = "Configure provider, sender ID, retry policy, and delivery report tracking.", CreatedAtUtc = DateTime.UtcNow.AddDays(-1), UpdatedAtUtc = DateTime.UtcNow.AddDays(-1) },
            new EnterpriseRecord { Id = Guid.Parse("5b4e0142-cdab-4893-ad18-201b0b9726fc"), Area = "Documents", RecordNumber = "DOC-2026-0001", PatientId = Guid.Parse("f64d3368-a4da-4d44-9612-5c302b0ec29a"), Title = "Patient document indexing", Department = "Records", Owner = "Records Officer", Priority = "Normal", Status = "Open", Amount = 0, DueAtUtc = DateTime.UtcNow.AddDays(4), Details = "Index consent form, clinical attachment, and scanned document reference.", CreatedAtUtc = DateTime.UtcNow.AddDays(-1), UpdatedAtUtc = DateTime.UtcNow.AddDays(-1) },
            new EnterpriseRecord { Id = Guid.Parse("2b150679-1444-4c4f-a682-391909366c98"), Area = "Reporting", RecordNumber = "RPT-2026-0001", Title = "Daily hospital performance pack", Department = "Finance", Owner = "Reporting Officer", Priority = "Normal", Status = "Open", Amount = 0, DueAtUtc = DateTime.UtcNow.AddDays(1), Details = "Prepare patient flow, revenue, queue, bed occupancy, and department workload report.", CreatedAtUtc = DateTime.UtcNow.AddHours(-2), UpdatedAtUtc = DateTime.UtcNow.AddHours(-2) },
            new EnterpriseRecord { Id = Guid.Parse("0a73704f-a6c1-4418-b8b2-e18f90062708"), Area = "Integration", RecordNumber = "INT-2026-0001", Title = "Payment gateway readiness", Department = "IT", Owner = "Integration Officer", Priority = "Normal", Status = "Under Review", Amount = 0, DueAtUtc = DateTime.UtcNow.AddDays(7), Details = "Validate API contract, credentials, callback URL, and reconciliation fields.", CreatedAtUtc = DateTime.UtcNow.AddDays(-1), UpdatedAtUtc = DateTime.UtcNow.AddHours(-6) }
        };

        foreach (var record in records)
        {
            if (!await db.EnterpriseRecords.AnyAsync(item => item.RecordNumber == record.RecordNumber))
            {
                db.EnterpriseRecords.Add(record);
            }
        }
    }
}

public static class ClinicalDatabaseBootstrapper
{
    public static async Task EnsureDatabaseExistsAsync(string connectionString)
    {
        var targetBuilder = new NpgsqlConnectionStringBuilder(connectionString);
        var databaseName = targetBuilder.Database;
        if (string.IsNullOrWhiteSpace(databaseName))
        {
            return;
        }

        var adminBuilder = new NpgsqlConnectionStringBuilder(connectionString)
        {
            Database = "postgres",
            Pooling = false
        };

        await using var connection = new NpgsqlConnection(adminBuilder.ConnectionString);
        await connection.OpenAsync();
        await using var existsCommand = new NpgsqlCommand(
            "select exists(select 1 from pg_database where datname = @database_name)",
            connection);
        existsCommand.Parameters.AddWithValue("database_name", databaseName);
        var exists = (bool)(await existsCommand.ExecuteScalarAsync() ?? false);
        if (!exists)
        {
            await using var createCommand = new NpgsqlCommand($"create database {QuoteIdentifier(databaseName)}", connection);
            await createCommand.ExecuteNonQueryAsync();
        }
    }

    private static string QuoteIdentifier(string value) => "\"" + value.Replace("\"", "\"\"") + "\"";
}

public sealed class ClinicalDbContextFactory : IDesignTimeDbContextFactory<ClinicalDbContext>
{
    public ClinicalDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<ClinicalDbContext>()
            .UseNpgsql("Host=localhost;Port=5432;Database=hms_clinical_db;Username=postgres;Password=Amen@2461")
            .Options;

        return new ClinicalDbContext(options);
    }
}
