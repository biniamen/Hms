using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using HMS.SharedKernel;

namespace HMS.Clinical.Infrastructure;

public sealed class ClinicalDbContext(DbContextOptions<ClinicalDbContext> options) : DbContext(options)
{
    public DbSet<ClinicalEncounter> Encounters => Set<ClinicalEncounter>();
    public DbSet<VitalSign> VitalSigns => Set<VitalSign>();
    public DbSet<Diagnosis> Diagnoses => Set<Diagnosis>();
    public DbSet<Prescription> Prescriptions => Set<Prescription>();
    public DbSet<LabRequest> LabRequests => Set<LabRequest>();
    public DbSet<DiagnosticTest> DiagnosticTests => Set<DiagnosticTest>();
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
            entity.Property(encounter => encounter.CreatedAtUtc).HasColumnName("created_at_utc").HasDefaultValueSql("now()");
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
            entity.Property(vital => vital.CreatedAtUtc).HasColumnName("created_at_utc").HasDefaultValueSql("now()");
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
            entity.Property(diagnosis => diagnosis.CreatedAtUtc).HasColumnName("created_at_utc").HasDefaultValueSql("now()");
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
            entity.Property(prescription => prescription.CreatedAtUtc).HasColumnName("created_at_utc").HasDefaultValueSql("now()");
        });

        modelBuilder.Entity<LabRequest>(entity =>
        {
            entity.ToTable("lab_requests");
            entity.HasKey(request => request.Id);
            entity.Property(request => request.PatientId).HasColumnName("patient_id");
            entity.Property(request => request.DoctorId).HasColumnName("doctor_id");
            entity.Property(request => request.TestName).HasColumnName("test_name").HasMaxLength(240);
            entity.Property(request => request.TestCatalogIds).HasColumnName("test_catalog_ids");
            entity.Property(request => request.Status).HasColumnName("status").HasMaxLength(60);
            entity.Property(request => request.OrderedAtUtc).HasColumnName("ordered_at_utc").HasDefaultValueSql("now()");
            entity.Property(request => request.Category).HasColumnName("category").HasMaxLength(80);
            entity.Property(request => request.Priority).HasColumnName("priority").HasMaxLength(40);
            entity.Property(request => request.SpecimenType).HasColumnName("specimen_type").HasMaxLength(120);
            entity.Property(request => request.ClinicalNote).HasColumnName("clinical_note");
            entity.Property(request => request.ResultSummary).HasColumnName("result_summary");
            entity.Property(request => request.ResultValue).HasColumnName("result_value");
            entity.Property(request => request.ReferenceRange).HasColumnName("reference_range").HasMaxLength(120);
            entity.Property(request => request.ResultFlag).HasColumnName("result_flag").HasMaxLength(40);
            entity.Property(request => request.ResultNotes).HasColumnName("result_notes");
            entity.Property(request => request.PerformedBy).HasColumnName("performed_by").HasMaxLength(120);
            entity.Property(request => request.VerifiedBy).HasColumnName("verified_by").HasMaxLength(120);
            entity.Property(request => request.ResultItemsJson).HasColumnName("result_items_json");
            entity.Property(request => request.CreatedAtUtc).HasColumnName("created_at_utc").HasDefaultValueSql("now()");
            entity.Property(request => request.CollectedAtUtc).HasColumnName("collected_at_utc");
            entity.Property(request => request.ResultedAtUtc).HasColumnName("resulted_at_utc");
            entity.Property(request => request.UpdatedAtUtc).HasColumnName("updated_at_utc").HasDefaultValueSql("now()");
        });

        modelBuilder.Entity<DiagnosticTest>(entity =>
        {
            entity.ToTable("diagnostic_tests");
            entity.HasKey(test => test.Id);
            entity.HasIndex(test => new { test.GroupName, test.SubGroup, test.TestName }).IsUnique();
            entity.Property(test => test.GroupName).HasColumnName("group_name").HasMaxLength(80);
            entity.Property(test => test.SubGroup).HasColumnName("sub_group").HasMaxLength(120);
            entity.Property(test => test.TestName).HasColumnName("test_name").HasMaxLength(180);
            entity.Property(test => test.SpecimenType).HasColumnName("specimen_type").HasMaxLength(120);
            entity.Property(test => test.Unit).HasColumnName("unit").HasMaxLength(40);
            entity.Property(test => test.ReferenceRange).HasColumnName("reference_range").HasMaxLength(120);
            entity.Property(test => test.SortOrder).HasColumnName("sort_order");
            entity.Property(test => test.IsActive).HasColumnName("is_active");
            entity.Property(test => test.CreatedAtUtc).HasColumnName("created_at_utc").HasDefaultValueSql("now()");
            entity.Property(test => test.UpdatedAtUtc).HasColumnName("updated_at_utc").HasDefaultValueSql("now()");
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

public sealed class ClinicalEncounter : Entity
{
    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public string VisitType { get; set; } = "";
    public string ChiefComplaint { get; set; } = "";
    public string Assessment { get; set; } = "";
    public string Plan { get; set; } = "";
    public DateTime EncounterAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class VitalSign : Entity
{
    public Guid PatientId { get; set; }
    public decimal TemperatureC { get; set; }
    public int Pulse { get; set; }
    public int RespiratoryRate { get; set; }
    public string BloodPressure { get; set; } = "";
    public decimal WeightKg { get; set; }
    public decimal HeightCm { get; set; }
    public DateTime RecordedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class Diagnosis : Entity
{
    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public string Code { get; set; } = "";
    public string Description { get; set; } = "";
    public string Severity { get; set; } = "";
    public DateTime DiagnosedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class Prescription : Entity
{
    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public string Medication { get; set; } = "";
    public string Instructions { get; set; } = "";
    public DateTime OrderedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class LabRequest : Entity
{
    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public string TestName { get; set; } = "";
    public string TestCatalogIds { get; set; } = "";
    public string Status { get; set; } = "Requested";
    public DateTime OrderedAtUtc { get; set; } = DateTime.UtcNow;
    public string Category { get; set; } = "Laboratory";
    public string Priority { get; set; } = "Routine";
    public string SpecimenType { get; set; } = "";
    public string ClinicalNote { get; set; } = "";
    public string ResultSummary { get; set; } = "";
    public string ResultValue { get; set; } = "";
    public string ReferenceRange { get; set; } = "";
    public string ResultFlag { get; set; } = "Normal";
    public string ResultNotes { get; set; } = "";
    public string PerformedBy { get; set; } = "";
    public string VerifiedBy { get; set; } = "";
    public string ResultItemsJson { get; set; } = "";
    public DateTime? CollectedAtUtc { get; set; }
    public DateTime? ResultedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class DiagnosticTest : Entity
{
    public string GroupName { get; set; } = "";
    public string SubGroup { get; set; } = "";
    public string TestName { get; set; } = "";
    public string SpecimenType { get; set; } = "";
    public string Unit { get; set; } = "";
    public string ReferenceRange { get; set; } = "";
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class EnterpriseRecord : Entity
{
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
            db.LabRequests.Add(new LabRequest
            {
                Id = Guid.Parse("3cb3eb61-03a4-4fec-8517-9d2778f6e40d"),
                PatientId = dawitId,
                DoctorId = doctorId,
                TestName = "Complete Blood Count",
                Category = "Hematology",
                Priority = "Routine",
                SpecimenType = "Whole blood",
                ClinicalNote = "Baseline workup before treatment decision.",
                Status = "Requested",
                OrderedAtUtc = DateTime.UtcNow.AddHours(-2),
                UpdatedAtUtc = DateTime.UtcNow.AddHours(-2)
            });
        }

        await UpsertDiagnosticTestsAsync(db);
        await UpsertEnterpriseRecordsAsync(db);
        await db.SaveChangesAsync();
    }

    private static async Task UpsertDiagnosticTestsAsync(ClinicalDbContext db)
    {
        var tests = new[]
        {
            new DiagnosticTest { Id = Guid.Parse("8d33f419-79f4-4a3e-a87e-9c0f3b662801"), GroupName = "Hematology", SubGroup = "CBC With Differential", TestName = "White Blood Cell Count", SpecimenType = "Whole blood", Unit = "cells/mm3", ReferenceRange = "4.0-10.8", SortOrder = 10 },
            new DiagnosticTest { Id = Guid.Parse("b2a7b4c1-6e93-4fb7-8546-059d45d7c80b"), GroupName = "Hematology", SubGroup = "CBC With Differential", TestName = "Neutrophil", SpecimenType = "Whole blood", Unit = "%", ReferenceRange = "40-72", SortOrder = 20 },
            new DiagnosticTest { Id = Guid.Parse("4ddf0e77-3427-49ca-98b2-7a613e4169dd"), GroupName = "Hematology", SubGroup = "CBC With Differential", TestName = "Lymphocyte", SpecimenType = "Whole blood", Unit = "%", ReferenceRange = "17-45", SortOrder = 30 },
            new DiagnosticTest { Id = Guid.Parse("6e858c1c-ffea-4a49-af60-b108f29ee5c5"), GroupName = "Hematology", SubGroup = "CBC With Differential", TestName = "Hemoglobin", SpecimenType = "Whole blood", Unit = "gm/dL", ReferenceRange = "12-16", SortOrder = 40 },
            new DiagnosticTest { Id = Guid.Parse("f92dc89c-d240-41e4-b97a-e1848e92456e"), GroupName = "Hematology", SubGroup = "CBC With Differential", TestName = "Platelet Count", SpecimenType = "Whole blood", Unit = "x 10^9/L", ReferenceRange = "150-450", SortOrder = 50 },
            new DiagnosticTest { Id = Guid.Parse("d3916553-aa07-488f-a68b-f7c79af9482c"), GroupName = "Hematology", SubGroup = "Inflammation", TestName = "ESR", SpecimenType = "Whole blood", Unit = "mm/h", ReferenceRange = "0-20", SortOrder = 60 },
            new DiagnosticTest { Id = Guid.Parse("92945363-d19b-49cb-bdc5-44cfc79a58d5"), GroupName = "Biochemistry", SubGroup = "Renal Function", TestName = "Creatinine", SpecimenType = "Serum", Unit = "mg/dL", ReferenceRange = "0.6-1.3", SortOrder = 10 },
            new DiagnosticTest { Id = Guid.Parse("cd868d50-e36f-4d36-9697-12e1be7d851a"), GroupName = "Biochemistry", SubGroup = "Renal Function", TestName = "Urea", SpecimenType = "Serum", Unit = "mg/dL", ReferenceRange = "15-45", SortOrder = 20 },
            new DiagnosticTest { Id = Guid.Parse("5bf19192-e366-4d74-9056-e82e3eb94531"), GroupName = "Biochemistry", SubGroup = "Glucose", TestName = "Random Blood Sugar", SpecimenType = "Plasma", Unit = "mg/dL", ReferenceRange = "70-140", SortOrder = 30 },
            new DiagnosticTest { Id = Guid.Parse("dd589793-e283-4a18-9b2c-6af1f6e72814"), GroupName = "Biochemistry", SubGroup = "Vitamin", TestName = "Vitamin D", SpecimenType = "Serum", Unit = "ng/mL", ReferenceRange = "30-100", SortOrder = 40 },
            new DiagnosticTest { Id = Guid.Parse("b7e30ea4-98af-4d59-b2b9-68bc1e06c4a0"), GroupName = "Biochemistry", SubGroup = "Vitamin", TestName = "Vitamin B12", SpecimenType = "Serum", Unit = "pg/mL", ReferenceRange = "200-900", SortOrder = 50 },
            new DiagnosticTest { Id = Guid.Parse("4d34b33a-a342-4ba4-bfd5-0d8324358fdc"), GroupName = "Microbiology", SubGroup = "Culture", TestName = "Blood Culture", SpecimenType = "Blood", Unit = "", ReferenceRange = "No growth", SortOrder = 10 },
            new DiagnosticTest { Id = Guid.Parse("f4cba693-d37f-4818-8b9e-68e8c9a0e927"), GroupName = "Microbiology", SubGroup = "Microscopy", TestName = "Urine Microscopy", SpecimenType = "Urine", Unit = "", ReferenceRange = "No significant cells", SortOrder = 20 },
            new DiagnosticTest { Id = Guid.Parse("82094f96-0c8a-4b7b-a624-11d6d0ce1f83"), GroupName = "Radiology", SubGroup = "X-Ray", TestName = "Chest X-Ray", SpecimenType = "Imaging only", Unit = "", ReferenceRange = "Radiologist report", SortOrder = 10 },
            new DiagnosticTest { Id = Guid.Parse("fb5b1ed5-e1cf-47a1-9632-ae57df2b0632"), GroupName = "Radiology", SubGroup = "MRI", TestName = "MRI Brain", SpecimenType = "Imaging only", Unit = "", ReferenceRange = "Radiologist report", SortOrder = 20 },
            new DiagnosticTest { Id = Guid.Parse("b96e6277-8ee5-45a3-82b2-b281992743ef"), GroupName = "Radiology", SubGroup = "Ultrasound", TestName = "Abdominal Ultrasound", SpecimenType = "Imaging only", Unit = "", ReferenceRange = "Radiologist report", SortOrder = 30 }
        };

        foreach (var test in tests)
        {
            var existing = await db.DiagnosticTests.FirstOrDefaultAsync(item =>
                item.GroupName == test.GroupName &&
                item.SubGroup == test.SubGroup &&
                item.TestName == test.TestName);

            if (existing is null)
            {
                db.DiagnosticTests.Add(test);
            }
            else
            {
                existing.SpecimenType = test.SpecimenType;
                existing.Unit = test.Unit;
                existing.ReferenceRange = test.ReferenceRange;
                existing.SortOrder = test.SortOrder;
                existing.IsActive = true;
                existing.UpdatedAtUtc = DateTime.UtcNow;
            }
        }
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
    public static Task EnsureDatabaseExistsAsync(string connectionString) =>
        PostgresDatabaseBootstrapper.EnsureDatabaseExistsAsync(connectionString);
}

public sealed class ClinicalDbContextFactory : IDesignTimeDbContextFactory<ClinicalDbContext>
{
    public ClinicalDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__ClinicalDb")
            ?? throw new InvalidOperationException("Set ConnectionStrings__ClinicalDb before running EF Core design-time commands.");

        var options = new DbContextOptionsBuilder<ClinicalDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        return new ClinicalDbContext(options);
    }
}
