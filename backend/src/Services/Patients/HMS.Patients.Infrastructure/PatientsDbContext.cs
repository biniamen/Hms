using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using HMS.SharedKernel;

namespace HMS.Patients.Infrastructure;

public sealed class PatientsDbContext(DbContextOptions<PatientsDbContext> options) : DbContext(options)
{
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<InsuranceCompany> InsuranceCompanies => Set<InsuranceCompany>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<Bed> Beds => Set<Bed>();
    public DbSet<BedAdmission> BedAdmissions => Set<BedAdmission>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<InsuranceCompany>(entity =>
        {
            entity.ToTable("insurance_companies");
            entity.HasKey(company => company.Id);
            entity.HasIndex(company => company.PayerCode).IsUnique();
            entity.Property(company => company.Name).HasColumnName("name").HasMaxLength(180);
            entity.Property(company => company.PayerCode).HasColumnName("payer_code").HasMaxLength(40);
            entity.Property(company => company.ContactPerson).HasColumnName("contact_person").HasMaxLength(160);
            entity.Property(company => company.Phone).HasColumnName("phone").HasMaxLength(32);
            entity.Property(company => company.Email).HasColumnName("email").HasMaxLength(160);
            entity.Property(company => company.Address).HasColumnName("address");
            entity.Property(company => company.CoverageType).HasColumnName("coverage_type").HasMaxLength(80);
            entity.Property(company => company.CoveragePercent).HasColumnName("coverage_percent").HasPrecision(5, 2);
            entity.Property(company => company.SpouseCoverageAllowed).HasColumnName("spouse_coverage_allowed");
            entity.Property(company => company.IsActive).HasColumnName("is_active");
            entity.Property(company => company.CreatedAtUtc).HasColumnName("created_at").HasDefaultValueSql("now()");
        });

        modelBuilder.Entity<Patient>(entity =>
        {
            entity.ToTable("patients");
            entity.HasKey(patient => patient.Id);
            entity.HasIndex(patient => patient.Mrn).IsUnique();
            entity.Property(patient => patient.Mrn).HasColumnName("mrn").HasMaxLength(32);
            entity.Property(patient => patient.FirstName).HasColumnName("first_name").HasMaxLength(96);
            entity.Property(patient => patient.LastName).HasColumnName("last_name").HasMaxLength(96);
            entity.Property(patient => patient.Email).HasColumnName("email").HasMaxLength(160);
            entity.Property(patient => patient.Phone).HasColumnName("phone").HasMaxLength(32);
            entity.Property(patient => patient.Gender).HasColumnName("gender").HasMaxLength(32);
            entity.Property(patient => patient.DateOfBirth).HasColumnName("date_of_birth");
            entity.Property(patient => patient.NationalId).HasColumnName("national_id").HasMaxLength(80);
            entity.Property(patient => patient.MaritalStatus).HasColumnName("marital_status").HasMaxLength(40);
            entity.Property(patient => patient.Occupation).HasColumnName("occupation").HasMaxLength(120);
            entity.Property(patient => patient.Address).HasColumnName("address");
            entity.Property(patient => patient.BloodType).HasColumnName("blood_type").HasMaxLength(16);
            entity.Property(patient => patient.InsuranceCompanyId).HasColumnName("insurance_company_id");
            entity.Property(patient => patient.EmployerName).HasColumnName("employer_name").HasMaxLength(180);
            entity.Property(patient => patient.InsurancePlan).HasColumnName("insurance_plan").HasMaxLength(120);
            entity.Property(patient => patient.InsuranceProvider).HasColumnName("insurance_provider").HasMaxLength(160);
            entity.Property(patient => patient.InsurancePolicyNumber).HasColumnName("insurance_policy_number").HasMaxLength(120);
            entity.Property(patient => patient.EmergencyContactName).HasColumnName("emergency_contact_name").HasMaxLength(160);
            entity.Property(patient => patient.EmergencyContactPhone).HasColumnName("emergency_contact_phone").HasMaxLength(32);
            entity.Property(patient => patient.PhotoContentType).HasColumnName("photo_content_type").HasMaxLength(80);
            entity.Property(patient => patient.PhotoData).HasColumnName("photo_data");
            entity.Property(patient => patient.IdentityStatus).HasColumnName("identity_status").HasMaxLength(40).HasDefaultValue("Verified");
            entity.Property(patient => patient.IsIdentityPending).HasColumnName("is_identity_pending");
            entity.Property(patient => patient.TemporaryName).HasColumnName("temporary_name").HasMaxLength(160);
            entity.Property(patient => patient.EstimatedAgeYears).HasColumnName("estimated_age_years");
            entity.Property(patient => patient.BroughtBy).HasColumnName("brought_by").HasMaxLength(120);
            entity.Property(patient => patient.IncidentType).HasColumnName("incident_type").HasMaxLength(120);
            entity.Property(patient => patient.IncidentLocation).HasColumnName("incident_location").HasMaxLength(240);
            entity.Property(patient => patient.TriageLevel).HasColumnName("triage_level").HasMaxLength(40);
            entity.Property(patient => patient.MedicoLegalCase).HasColumnName("medico_legal_case");
            entity.Property(patient => patient.EmergencyNotes).HasColumnName("emergency_notes");
            entity.Property(patient => patient.IdentityResolvedAtUtc).HasColumnName("identity_resolved_at_utc");
            entity.Property(patient => patient.CreatedAtUtc).HasColumnName("created_at").HasDefaultValueSql("now()");
            entity.HasOne(patient => patient.InsuranceCompany)
                .WithMany(company => company.Patients)
                .HasForeignKey(patient => patient.InsuranceCompanyId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Bed>(entity =>
        {
            entity.ToTable("beds");
            entity.HasKey(bed => bed.Id);
            entity.HasIndex(bed => bed.BedNumber).IsUnique();
            entity.Property(bed => bed.Ward).HasColumnName("ward").HasMaxLength(96);
            entity.Property(bed => bed.Room).HasColumnName("room").HasMaxLength(32);
            entity.Property(bed => bed.BedNumber).HasColumnName("bed_number").HasMaxLength(32);
            entity.Property(bed => bed.Category).HasColumnName("category").HasMaxLength(32);
            entity.Property(bed => bed.DailyRate).HasColumnName("daily_rate").HasPrecision(12, 2);
            entity.Property(bed => bed.Currency).HasColumnName("currency").HasMaxLength(3);
            entity.Property(bed => bed.IsAvailable).HasColumnName("is_available");
            entity.Property(bed => bed.CurrentAdmissionId).HasColumnName("current_admission_id");
            entity.Property(bed => bed.CurrentPatientId).HasColumnName("current_patient_id");
            entity.Property(bed => bed.CurrentPatientName).HasColumnName("current_patient_name").HasMaxLength(180);
            entity.Property(bed => bed.CurrentPatientMrn).HasColumnName("current_patient_mrn").HasMaxLength(32);
            entity.Property(bed => bed.AdmittedAtUtc).HasColumnName("admitted_at_utc");
            entity.Property(bed => bed.CreatedAtUtc).HasColumnName("created_at").HasDefaultValueSql("now()");
        });

        modelBuilder.Entity<BedAdmission>(entity =>
        {
            entity.ToTable("bed_admissions");
            entity.HasKey(admission => admission.Id);
            entity.HasIndex(admission => new { admission.PatientId, admission.Status });
            entity.HasIndex(admission => new { admission.BedId, admission.Status });
            entity.Property(admission => admission.PatientId).HasColumnName("patient_id");
            entity.Property(admission => admission.PatientName).HasColumnName("patient_name").HasMaxLength(180);
            entity.Property(admission => admission.PatientMrn).HasColumnName("patient_mrn").HasMaxLength(32);
            entity.Property(admission => admission.BedId).HasColumnName("bed_id");
            entity.Property(admission => admission.Ward).HasColumnName("ward").HasMaxLength(96);
            entity.Property(admission => admission.Room).HasColumnName("room").HasMaxLength(32);
            entity.Property(admission => admission.BedNumber).HasColumnName("bed_number").HasMaxLength(32);
            entity.Property(admission => admission.BedCategory).HasColumnName("bed_category").HasMaxLength(32);
            entity.Property(admission => admission.DailyRate).HasColumnName("daily_rate").HasPrecision(12, 2);
            entity.Property(admission => admission.Currency).HasColumnName("currency").HasMaxLength(3);
            entity.Property(admission => admission.AdmittedAtUtc).HasColumnName("admitted_at_utc");
            entity.Property(admission => admission.DischargedAtUtc).HasColumnName("discharged_at_utc");
            entity.Property(admission => admission.ChargeableDays).HasColumnName("chargeable_days");
            entity.Property(admission => admission.BedCharge).HasColumnName("bed_charge").HasPrecision(12, 2);
            entity.Property(admission => admission.Status).HasColumnName("status").HasMaxLength(32);
            entity.Property(admission => admission.Notes).HasColumnName("notes");
            entity.Property(admission => admission.CreatedAtUtc).HasColumnName("created_at").HasDefaultValueSql("now()");
            entity.HasOne(admission => admission.Bed)
                .WithMany(bed => bed.Admissions)
                .HasForeignKey(admission => admission.BedId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(admission => admission.Patient)
                .WithMany(patient => patient.BedAdmissions)
                .HasForeignKey(admission => admission.PatientId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Appointment>(entity =>
        {
            entity.ToTable("appointments");
            entity.HasKey(appointment => appointment.Id);
            entity.Property(appointment => appointment.PatientId).HasColumnName("patient_id");
            entity.Property(appointment => appointment.DoctorId).HasColumnName("doctor_id");
            entity.Property(appointment => appointment.StartsAtUtc).HasColumnName("starts_at_utc");
            entity.Property(appointment => appointment.Status).HasColumnName("status").HasMaxLength(32);
            entity.Property(appointment => appointment.Reason).HasColumnName("reason").HasMaxLength(240);
            entity.Property(appointment => appointment.Department).HasColumnName("department").HasMaxLength(96);
            entity.Property(appointment => appointment.AppointmentType).HasColumnName("appointment_type").HasMaxLength(80);
            entity.Property(appointment => appointment.Priority).HasColumnName("priority").HasMaxLength(40);
            entity.Property(appointment => appointment.Notes).HasColumnName("notes");
            entity.Property(appointment => appointment.CreatedAtUtc).HasColumnName("created_at").HasDefaultValueSql("now()");
            entity.HasOne(appointment => appointment.Patient)
                .WithMany(patient => patient.Appointments)
                .HasForeignKey(appointment => appointment.PatientId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(appointment => new { appointment.DoctorId, appointment.StartsAtUtc });
        });
    }
}

public sealed class Patient : Entity
{
    public string Mrn { get; set; } = "";
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string? Email { get; set; }
    public string Phone { get; set; } = "";
    public string Gender { get; set; } = "";
    public DateOnly DateOfBirth { get; set; }
    public string? NationalId { get; set; }
    public string? MaritalStatus { get; set; }
    public string? Occupation { get; set; }
    public string? Address { get; set; }
    public string? BloodType { get; set; }
    public Guid? InsuranceCompanyId { get; set; }
    public string? EmployerName { get; set; }
    public string? InsurancePlan { get; set; }
    public string? InsuranceProvider { get; set; }
    public string? InsurancePolicyNumber { get; set; }
    public string? EmergencyContactName { get; set; }
    public string? EmergencyContactPhone { get; set; }
    public string? PhotoContentType { get; set; }
    public byte[]? PhotoData { get; set; }
    public string IdentityStatus { get; set; } = "Verified";
    public bool IsIdentityPending { get; set; }
    public string? TemporaryName { get; set; }
    public int? EstimatedAgeYears { get; set; }
    public string? BroughtBy { get; set; }
    public string? IncidentType { get; set; }
    public string? IncidentLocation { get; set; }
    public string? TriageLevel { get; set; }
    public bool MedicoLegalCase { get; set; }
    public string? EmergencyNotes { get; set; }
    public DateTime? IdentityResolvedAtUtc { get; set; }
    public InsuranceCompany? InsuranceCompany { get; set; }
    public List<Appointment> Appointments { get; set; } = [];
    public List<BedAdmission> BedAdmissions { get; set; } = [];
}

public sealed class InsuranceCompany : Entity
{
    public string Name { get; set; } = "";
    public string PayerCode { get; set; } = "";
    public string? ContactPerson { get; set; }
    public string Phone { get; set; } = "";
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string CoverageType { get; set; } = "Corporate";
    public decimal CoveragePercent { get; set; } = 80;
    public bool SpouseCoverageAllowed { get; set; }
    public bool IsActive { get; set; } = true;
    public List<Patient> Patients { get; set; } = [];
}

public sealed class Appointment : Entity
{
    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public DateTime StartsAtUtc { get; set; }
    public string Status { get; set; } = "";
    public string Reason { get; set; } = "";
    public string Department { get; set; } = "Outpatient";
    public string AppointmentType { get; set; } = "Consultation";
    public string Priority { get; set; } = "Normal";
    public string? Notes { get; set; }
    public Patient? Patient { get; set; }
}

public sealed class Bed : Entity
{
    public string Ward { get; set; } = "";
    public string Room { get; set; } = "";
    public string BedNumber { get; set; } = "";
    public string Category { get; set; } = "Normal";
    public decimal DailyRate { get; set; }
    public string Currency { get; set; } = "ETB";
    public bool IsAvailable { get; set; } = true;
    public Guid? CurrentAdmissionId { get; set; }
    public Guid? CurrentPatientId { get; set; }
    public string? CurrentPatientName { get; set; }
    public string? CurrentPatientMrn { get; set; }
    public DateTime? AdmittedAtUtc { get; set; }
    public List<BedAdmission> Admissions { get; set; } = [];
}

public sealed class BedAdmission : Entity
{
    public Guid PatientId { get; set; }
    public string PatientName { get; set; } = "";
    public string PatientMrn { get; set; } = "";
    public Guid BedId { get; set; }
    public string Ward { get; set; } = "";
    public string Room { get; set; } = "";
    public string BedNumber { get; set; } = "";
    public string BedCategory { get; set; } = "Normal";
    public decimal DailyRate { get; set; }
    public string Currency { get; set; } = "ETB";
    public DateTime AdmittedAtUtc { get; set; }
    public DateTime? DischargedAtUtc { get; set; }
    public int ChargeableDays { get; set; }
    public decimal BedCharge { get; set; }
    public string Status { get; set; } = "Admitted";
    public string? Notes { get; set; }
    public Patient? Patient { get; set; }
    public Bed? Bed { get; set; }
}
public static class PatientsSeedData
{
    public static async Task SeedAsync(PatientsDbContext db)
    {
        await UpsertInsuranceCompaniesAsync(db);
        await UpsertPatientsAsync(db);
        // Persist patients (and companies) before seeding appointments: the
        // appointment seed resolves patient IDs by MRN from the database, so newly
        // inserted patients must be queryable first.
        await db.SaveChangesAsync();
        await UpsertBedsAsync(db);
        await UpsertAppointmentsAsync(db);
        await db.SaveChangesAsync();
    }

    private static async Task UpsertInsuranceCompaniesAsync(PatientsDbContext db)
    {
        var companies = new[]
        {
            new InsuranceCompany { Id = Guid.Parse("7d910412-70b0-47f6-8f81-9ee8d59a5fd0"), Name = "EthioLife Corporate Insurance", PayerCode = "ELIFE", ContactPerson = "Abebe Insurance Desk", Phone = "0911200100", Email = "claims@ethiolife.example", Address = "Kazanchis, Addis Ababa", CoverageType = "Corporate", CoveragePercent = 85, SpouseCoverageAllowed = true, IsActive = true },
            new InsuranceCompany { Id = Guid.Parse("9c864a76-f3f1-4b1c-98ce-14034e7f8e67"), Name = "Unity Staff Medical Fund", PayerCode = "UNITY", ContactPerson = "Hirut Benefits Office", Phone = "0911200200", Email = "medical@unityfund.example", Address = "Bole, Addis Ababa", CoverageType = "Employer Fund", CoveragePercent = 70, SpouseCoverageAllowed = true, IsActive = true },
            new InsuranceCompany { Id = Guid.Parse("6fa694f8-f82c-4e58-96e5-3026077d4116"), Name = "Community Based Health Insurance", PayerCode = "CBHI", ContactPerson = "CBHI Liaison", Phone = "0911200300", Email = "support@cbhi.example", Address = "Kirkos, Addis Ababa", CoverageType = "Community", CoveragePercent = 60, SpouseCoverageAllowed = false, IsActive = true }
        };

        foreach (var company in companies)
        {
            var existing = await db.InsuranceCompanies.FirstOrDefaultAsync(item => item.PayerCode == company.PayerCode);
            if (existing is null)
            {
                db.InsuranceCompanies.Add(company);
            }
            else
            {
                existing.Name = company.Name;
                existing.ContactPerson = company.ContactPerson;
                existing.Phone = company.Phone;
                existing.Email = company.Email;
                existing.Address = company.Address;
                existing.CoverageType = company.CoverageType;
                existing.CoveragePercent = company.CoveragePercent;
                existing.SpouseCoverageAllowed = company.SpouseCoverageAllowed;
                existing.IsActive = true;
            }
        }
    }

    private static async Task UpsertPatientsAsync(PatientsDbContext db)
    {
        var patients = new[]
        {
            new Patient { Id = Guid.Parse("f64d3368-a4da-4d44-9612-5c302b0ec29a"), Mrn = "MRN-0001", FirstName = "Sara", LastName = "Bekele", Email = "sara.bekele@example.com", Phone = "0920000001", Gender = "Female", DateOfBirth = new DateOnly(1995, 5, 10), NationalId = "ET-10001", MaritalStatus = "Single", Occupation = "Teacher", Address = "Bole, Addis Ababa", BloodType = "O+", InsuranceCompanyId = Guid.Parse("6fa694f8-f82c-4e58-96e5-3026077d4116"), EmployerName = "Bole Primary School", InsurancePlan = "CBHI Standard", InsuranceProvider = "Community Based Health Insurance", InsurancePolicyNumber = "CBHI-0001", EmergencyContactName = "Meron Bekele", EmergencyContactPhone = "0921000001" },
            new Patient { Id = Guid.Parse("d5c6bf11-de68-4c3f-97d2-6d7fd12f8e80"), Mrn = "MRN-0002", FirstName = "Dawit", LastName = "Alemu", Email = "dawit.alemu@example.com", Phone = "0920000002", Gender = "Male", DateOfBirth = new DateOnly(1988, 2, 20), NationalId = "ET-10002", MaritalStatus = "Married", Occupation = "Driver", Address = "CMC, Addis Ababa", BloodType = "A+", InsuranceCompanyId = Guid.Parse("7d910412-70b0-47f6-8f81-9ee8d59a5fd0"), EmployerName = "Ethio Logistics PLC", InsurancePlan = "Corporate Gold", InsuranceProvider = "EthioLife Corporate Insurance", InsurancePolicyNumber = "INS-0002", EmergencyContactName = "Alem Alemu", EmergencyContactPhone = "0921000002" },
            new Patient { Id = Guid.Parse("55d16cd5-e42f-4bb0-b1ef-02f4e6284a03"), Mrn = "MRN-0003", FirstName = "Amen", LastName = "Biniyam", Email = "amen.biniyam@example.com", Phone = "0920000003", Gender = "Male", DateOfBirth = new DateOnly(1979, 9, 14), NationalId = "ET-10003", MaritalStatus = "Married", Occupation = "Bank Officer", Address = "Kazanchis, Addis Ababa", BloodType = "B+", InsuranceCompanyId = Guid.Parse("9c864a76-f3f1-4b1c-98ce-14034e7f8e67"), EmployerName = "Unity Bank", InsurancePlan = "Employer Fund", InsuranceProvider = "Unity Staff Medical Fund", InsurancePolicyNumber = "UNITY-0003", EmergencyContactName = "Tigist Hailu", EmergencyContactPhone = "0921000003" },
            new Patient { Id = Guid.Parse("f857a7b1-9689-480d-a110-111226b77104"), Mrn = "MRN-0004", FirstName = "Meron", LastName = "Kassa", Email = "meron.kassa@example.com", Phone = "0920000004", Gender = "Female", DateOfBirth = new DateOnly(2001, 12, 3), NationalId = "ET-10004", MaritalStatus = "Single", Occupation = "Student", Address = "Piassa, Addis Ababa", BloodType = "AB+", EmployerName = "Self", InsurancePlan = "Self Pay", InsuranceProvider = "", InsurancePolicyNumber = "", EmergencyContactName = "Kassa Gemechu", EmergencyContactPhone = "0921000004" },
            new Patient { Id = Guid.Parse("0ef7e12a-1017-4039-83c4-d90301515f05"), Mrn = "MRN-0005", FirstName = "Hirut", LastName = "Tola", Email = "hirut.tola@example.com", Phone = "0920000005", Gender = "Female", DateOfBirth = new DateOnly(1991, 7, 27), NationalId = "ET-10005", MaritalStatus = "Married", Occupation = "Merchant", Address = "Megenagna, Addis Ababa", BloodType = "O-", InsuranceCompanyId = Guid.Parse("7d910412-70b0-47f6-8f81-9ee8d59a5fd0"), EmployerName = "Hirut Trading", InsurancePlan = "Corporate Gold", InsuranceProvider = "EthioLife Corporate Insurance", InsurancePolicyNumber = "INS-0005", EmergencyContactName = "Tola Bekele", EmergencyContactPhone = "0921000005" },
            new Patient { Id = Guid.Parse("b34df4a2-fb6b-43ed-8421-e8eb59fd02f8"), Mrn = $"EMR-{DateTime.UtcNow.Year}-0001", FirstName = "Unknown", LastName = "Male", Email = null, Phone = $"UNKNOWN-EMR-{DateTime.UtcNow.Year}-0001", Gender = "Male", DateOfBirth = new DateOnly(DateTime.UtcNow.Year - 35, 1, 1), NationalId = null, MaritalStatus = null, Occupation = "Unknown emergency patient", Address = "Brought from accident scene", BloodType = null, EmployerName = null, InsurancePlan = "Identity Pending", InsuranceProvider = "Self Pay", InsurancePolicyNumber = null, EmergencyContactName = "Police / Ambulance", EmergencyContactPhone = "", IdentityStatus = "Identity Pending", IsIdentityPending = true, TemporaryName = "Unknown Male", EstimatedAgeYears = 35, BroughtBy = "Ambulance", IncidentType = "Road traffic accident", IncidentLocation = "Unconfirmed accident location", TriageLevel = "Critical", MedicoLegalCase = true, EmergencyNotes = "Sample unknown emergency case for treatment-first workflow review." }
        };

        foreach (var patient in patients)
        {
            var existing = await db.Patients.FirstOrDefaultAsync(item => item.Id == patient.Id);
            if (existing is null)
            {
                // Never hijack an MRN that a real (API-registered) patient already owns:
                // that would silently overwrite live records on every restart. Seed
                // patients whose MRN is taken are simply skipped.
                var mrnTaken = await db.Patients.AnyAsync(item => item.Mrn == patient.Mrn);
                if (!mrnTaken)
                {
                    db.Patients.Add(patient);
                }
            }
            else
            {
                existing.FirstName = patient.FirstName;
                existing.LastName = patient.LastName;
                existing.Email = patient.Email;
                existing.Phone = patient.Phone;
                existing.Gender = patient.Gender;
                existing.DateOfBirth = patient.DateOfBirth;
                existing.NationalId = patient.NationalId;
                existing.MaritalStatus = patient.MaritalStatus;
                existing.Occupation = patient.Occupation;
                existing.Address = patient.Address;
                existing.BloodType = patient.BloodType;
                existing.InsuranceCompanyId = patient.InsuranceCompanyId;
                existing.EmployerName = patient.EmployerName;
                existing.InsurancePlan = patient.InsurancePlan;
                existing.InsuranceProvider = patient.InsuranceProvider;
                existing.InsurancePolicyNumber = patient.InsurancePolicyNumber;
                existing.EmergencyContactName = patient.EmergencyContactName;
                existing.EmergencyContactPhone = patient.EmergencyContactPhone;
                existing.IdentityStatus = patient.IdentityStatus;
                existing.IsIdentityPending = patient.IsIdentityPending;
                existing.TemporaryName = patient.TemporaryName;
                existing.EstimatedAgeYears = patient.EstimatedAgeYears;
                existing.BroughtBy = patient.BroughtBy;
                existing.IncidentType = patient.IncidentType;
                existing.IncidentLocation = patient.IncidentLocation;
                existing.TriageLevel = patient.TriageLevel;
                existing.MedicoLegalCase = patient.MedicoLegalCase;
                existing.EmergencyNotes = patient.EmergencyNotes;
                existing.IdentityResolvedAtUtc = patient.IdentityResolvedAtUtc;
            }
        }
    }

    private static async Task UpsertBedsAsync(PatientsDbContext db)
    {
        var patientsByMrn = (await db.Patients.AsNoTracking().ToListAsync())
            .ToDictionary(patient => patient.Mrn, patient => patient);

        var bedSeeds = new[]
        {
            new BedSeed("c7e6c2bc-972f-47c1-a206-5f4e27f50cf7", "General Ward A", "101", "A1", "Normal", 1200m, true, null),
            new BedSeed("e33cfb8d-6d4a-4785-ac08-f436dc63a476", "General Ward A", "102", "A2", "Normal", 1200m, true, null),
            new BedSeed("c0b45ba1-93ea-4071-8397-c96214872c5b", "Emergency", "201", "E1", "VIP", 1800m, false, "MRN-0002"),
            new BedSeed("79b0da28-9451-4d45-982e-b273fbdde901", "Maternity", "301", "M1", "VIP", 2200m, true, null),
            new BedSeed("4cc4850e-5f83-4591-83de-bf4f0c75bb02", "Pediatrics", "401", "P1", "Normal", 1000m, true, null),
            new BedSeed("b1207213-92a8-4a73-8dd1-c6372de8fc03", "Surgical Ward", "501", "S1", "VVIP", 3500m, true, null)
        };

        foreach (var seed in bedSeeds)
        {
            var bedId = Guid.Parse(seed.Id);
            var existing = await db.Beds.FirstOrDefaultAsync(item => item.BedNumber == seed.BedNumber);
            var bed = existing ?? new Bed { Id = bedId, BedNumber = seed.BedNumber, CreatedAtUtc = DateTime.UtcNow };
            bed.Ward = seed.Ward;
            bed.Room = seed.Room;
            bed.Category = seed.Category;
            bed.DailyRate = seed.DailyRate;
            bed.Currency = "ETB";
            bed.IsAvailable = seed.IsAvailable;

            if (existing is null)
            {
                db.Beds.Add(bed);
            }

            if (seed.CurrentPatientMrn is null || !patientsByMrn.TryGetValue(seed.CurrentPatientMrn, out var patient))
            {
                if (seed.IsAvailable)
                {
                    bed.CurrentAdmissionId = null;
                    bed.CurrentPatientId = null;
                    bed.CurrentPatientName = null;
                    bed.CurrentPatientMrn = null;
                    bed.AdmittedAtUtc = null;
                }
                continue;
            }

            var activeAdmission = await db.BedAdmissions.FirstOrDefaultAsync(admission =>
                admission.PatientId == patient.Id && admission.Status == "Admitted");
            var admittedAtUtc = DateTime.UtcNow.AddDays(-1).AddHours(-4);
            if (activeAdmission is null)
            {
                activeAdmission = new BedAdmission
                {
                    Id = Guid.NewGuid(),
                    PatientId = patient.Id,
                    PatientName = $"{patient.FirstName} {patient.LastName}",
                    PatientMrn = patient.Mrn,
                    BedId = bed.Id,
                    Ward = bed.Ward,
                    Room = bed.Room,
                    BedNumber = bed.BedNumber,
                    BedCategory = bed.Category,
                    DailyRate = bed.DailyRate,
                    Currency = bed.Currency,
                    AdmittedAtUtc = admittedAtUtc,
                    Status = "Admitted",
                    Notes = "Seed inpatient case for ward workflow review.",
                    CreatedAtUtc = DateTime.UtcNow
                };
                db.BedAdmissions.Add(activeAdmission);
            }

            bed.IsAvailable = false;
            bed.CurrentAdmissionId = activeAdmission.Id;
            bed.CurrentPatientId = patient.Id;
            bed.CurrentPatientName = activeAdmission.PatientName;
            bed.CurrentPatientMrn = activeAdmission.PatientMrn;
            bed.AdmittedAtUtc = activeAdmission.AdmittedAtUtc;
        }
    }
    private static async Task UpsertAppointmentsAsync(PatientsDbContext db)
    {
        // Resolve patient IDs by MRN from the actual registry. Seed patients are
        // upserted by ID and may be skipped when their MRN is already owned by an
        // API-registered patient, so hardcoded patient GUIDs would reference rows
        // that may not exist and crash seeding with an FK violation. Appointments
        // whose MRN has no patient row are skipped safely.
        var patientsByMrn = (await db.Patients.AsNoTracking().ToListAsync())
            .ToDictionary(patient => patient.Mrn, patient => patient.Id);

        var appointments = new[]
        {
            new AppointmentSeed("29cb54e6-b268-4f62-ac89-41ca434658c7", "MRN-0001", Guid.Parse("8f334882-8d97-4d54-a011-97d7c8c2a201"), DateTime.UtcNow.AddDays(1), "Scheduled", "General consultation", "Outpatient", "Consultation", "Normal", "Initial appointment"),
            new AppointmentSeed("d50bb3c9-9507-4cb0-b5a5-940c4f595602", "MRN-0002", Guid.Parse("47c3095d-adcc-4e1d-bfc0-b16d70c15201"), DateTime.UtcNow.AddHours(2), "Waiting", "Shortness of breath", "Emergency", "Emergency", "Urgent", "Triage completed, waiting for doctor review."),
            new AppointmentSeed("aac7edfa-e8d7-4646-a223-8ad0d20c3103", "MRN-0003", Guid.Parse("d7f768c4-e28c-4b46-94d8-68ed9a325404"), DateTime.UtcNow.AddHours(4), "In Service", "Hypertension follow-up", "Cardiology", "Follow-up", "Normal", "Bring previous ECG result."),
            new AppointmentSeed("d19846d8-e394-4a91-ae2f-d2d7ea535804", "MRN-0004", Guid.Parse("cd8bfaf4-1afa-43e0-a2c4-a813da015202"), DateTime.UtcNow.AddDays(1).AddHours(3), "Scheduled", "Child fever review", "Pediatrics", "Consultation", "Normal", "First pediatric visit."),
            new AppointmentSeed("4798ef98-7514-430f-a49a-48c7a2b26d05", "MRN-0005", Guid.Parse("a6303a4a-e409-409f-a21c-8abb44ea5303"), DateTime.UtcNow.AddDays(-1), "Completed", "Antenatal check", "Maternity", "Follow-up", "Normal", "Vitals stable, follow-up booked."),
            new AppointmentSeed("c8e7c140-a061-4ea0-95e5-28dc854c1ea6", $"EMR-{DateTime.UtcNow.Year}-0001", Guid.Parse("47c3095d-adcc-4e1d-bfc0-b16d70c15201"), DateTime.UtcNow, "Waiting", "Unknown road traffic accident patient; identity pending.", "Emergency", "Emergency", "Emergency", "Medico-legal emergency case. Treat first, identify and bill later."),
        };

        foreach (var appointment in appointments)
        {
            if (!patientsByMrn.TryGetValue(appointment.PatientMrn, out var patientId))
            {
                continue; // no patient owns this MRN — skip rather than crash
            }

            var appointmentId = Guid.Parse(appointment.Id);
            var existing = await db.Appointments.FirstOrDefaultAsync(item => item.Id == appointmentId);
            if (existing is null)
            {
                db.Appointments.Add(new Appointment
                {
                    Id = appointmentId,
                    PatientId = patientId,
                    DoctorId = appointment.DoctorId,
                    StartsAtUtc = appointment.StartsAtUtc,
                    Status = appointment.Status,
                    Reason = appointment.Reason,
                    Department = appointment.Department,
                    AppointmentType = appointment.AppointmentType,
                    Priority = appointment.Priority,
                    Notes = appointment.Notes,
                });
            }
            else
            {
                existing.PatientId = patientId;
                existing.DoctorId = appointment.DoctorId;
                existing.StartsAtUtc = appointment.StartsAtUtc;
                existing.Status = appointment.Status;
                existing.Reason = appointment.Reason;
                existing.Department = appointment.Department;
                existing.AppointmentType = appointment.AppointmentType;
                existing.Priority = appointment.Priority;
                existing.Notes = appointment.Notes;
            }
        }
    }

    private sealed record BedSeed(string Id, string Ward, string Room, string BedNumber, string Category, decimal DailyRate, bool IsAvailable, string? CurrentPatientMrn);

    private sealed record AppointmentSeed(
        string Id,
        string PatientMrn,
        Guid DoctorId,
        DateTime StartsAtUtc,
        string Status,
        string Reason,
        string Department,
        string AppointmentType,
        string Priority,
        string Notes);
}

public static class PatientsDatabaseBootstrapper
{
    public static Task EnsureDatabaseExistsAsync(string connectionString) =>
        PostgresDatabaseBootstrapper.EnsureDatabaseExistsAsync(connectionString);
}

public sealed class PatientsDbContextFactory : IDesignTimeDbContextFactory<PatientsDbContext>
{
    public PatientsDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__PatientManagementDb")
            ?? Environment.GetEnvironmentVariable("ConnectionStrings__PatientsDb")
            ?? throw new InvalidOperationException("Set ConnectionStrings__PatientManagementDb before running EF Core design-time commands.");

        var options = new DbContextOptionsBuilder<PatientsDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        return new PatientsDbContext(options);
    }
}
