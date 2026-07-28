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
            entity.Property(bed => bed.IsAvailable).HasColumnName("is_available");
            entity.Property(bed => bed.CreatedAtUtc).HasColumnName("created_at").HasDefaultValueSql("now()");
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
    public InsuranceCompany? InsuranceCompany { get; set; }
    public List<Appointment> Appointments { get; set; } = [];
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
    public bool IsAvailable { get; set; } = true;
}

public static class PatientsSeedData
{
    public static async Task SeedAsync(PatientsDbContext db)
    {
        await UpsertInsuranceCompaniesAsync(db);
        await UpsertPatientsAsync(db);
        await UpsertBedsAsync(db);
        await UpsertAppointmentsAsync(db);
        await db.SaveChangesAsync();
    }

    private static async Task UpsertInsuranceCompaniesAsync(PatientsDbContext db)
    {
        var companies = new[]
        {
            new InsuranceCompany { Id = Guid.Parse("7d910412-70b0-47f6-8f81-9ee8d59a5fd0"), Name = "EthioLife Corporate Insurance", PayerCode = "ELIFE", ContactPerson = "Abebe Insurance Desk", Phone = "0911200100", Email = "claims@ethiolife.example", Address = "Kazanchis, Addis Ababa", CoverageType = "Corporate", CoveragePercent = 85, IsActive = true },
            new InsuranceCompany { Id = Guid.Parse("9c864a76-f3f1-4b1c-98ce-14034e7f8e67"), Name = "Unity Staff Medical Fund", PayerCode = "UNITY", ContactPerson = "Hirut Benefits Office", Phone = "0911200200", Email = "medical@unityfund.example", Address = "Bole, Addis Ababa", CoverageType = "Employer Fund", CoveragePercent = 70, IsActive = true },
            new InsuranceCompany { Id = Guid.Parse("6fa694f8-f82c-4e58-96e5-3026077d4116"), Name = "Community Based Health Insurance", PayerCode = "CBHI", ContactPerson = "CBHI Liaison", Phone = "0911200300", Email = "support@cbhi.example", Address = "Kirkos, Addis Ababa", CoverageType = "Community", CoveragePercent = 60, IsActive = true }
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
                existing.IsActive = true;
            }
        }
    }

    private static async Task UpsertPatientsAsync(PatientsDbContext db)
    {
        var patients = new[]
        {
            new Patient { Id = Guid.Parse("f64d3368-a4da-4d44-9612-5c302b0ec29a"), Mrn = "MRN-0001", FirstName = "Sara", LastName = "Bekele", Email = "sara.bekele@example.com", Phone = "0920000001", Gender = "Female", DateOfBirth = new DateOnly(1995, 5, 10), NationalId = "ET-10001", MaritalStatus = "Single", Occupation = "Teacher", Address = "Bole, Addis Ababa", BloodType = "O+", InsuranceCompanyId = Guid.Parse("6fa694f8-f82c-4e58-96e5-3026077d4116"), EmployerName = "Bole Primary School", InsurancePlan = "CBHI Standard", InsuranceProvider = "Community Based Health Insurance", InsurancePolicyNumber = "CBHI-0001", EmergencyContactName = "Meron Bekele", EmergencyContactPhone = "0921000001" },
            new Patient { Id = Guid.Parse("d5c6bf11-de68-4c3f-97d2-6d7fd12f8e80"), Mrn = "MRN-0002", FirstName = "Dawit", LastName = "Alemu", Email = "dawit.alemu@example.com", Phone = "0920000002", Gender = "Male", DateOfBirth = new DateOnly(1988, 2, 20), NationalId = "ET-10002", MaritalStatus = "Married", Occupation = "Driver", Address = "CMC, Addis Ababa", BloodType = "A+", InsuranceCompanyId = Guid.Parse("7d910412-70b0-47f6-8f81-9ee8d59a5fd0"), EmployerName = "Ethio Logistics PLC", InsurancePlan = "Corporate Gold", InsuranceProvider = "EthioLife Corporate Insurance", InsurancePolicyNumber = "INS-0002", EmergencyContactName = "Alem Alemu", EmergencyContactPhone = "0921000002" }
        };

        foreach (var patient in patients)
        {
            if (!await db.Patients.AnyAsync(item => item.Mrn == patient.Mrn))
            {
                db.Patients.Add(patient);
            }
        }
    }

    private static async Task UpsertBedsAsync(PatientsDbContext db)
    {
        var beds = new[]
        {
            new Bed { Id = Guid.Parse("c7e6c2bc-972f-47c1-a206-5f4e27f50cf7"), Ward = "General Ward A", Room = "101", BedNumber = "A1", IsAvailable = true },
            new Bed { Id = Guid.Parse("e33cfb8d-6d4a-4785-ac08-f436dc63a476"), Ward = "General Ward A", Room = "102", BedNumber = "A2", IsAvailable = true },
            new Bed { Id = Guid.Parse("c0b45ba1-93ea-4071-8397-c96214872c5b"), Ward = "Emergency", Room = "201", BedNumber = "E1", IsAvailable = false }
        };

        foreach (var bed in beds)
        {
            if (!await db.Beds.AnyAsync(item => item.BedNumber == bed.BedNumber))
            {
                db.Beds.Add(bed);
            }
        }
    }

    private static async Task UpsertAppointmentsAsync(PatientsDbContext db)
    {
        var id = Guid.Parse("29cb54e6-b268-4f62-ac89-41ca434658c7");
        if (!await db.Appointments.AnyAsync(item => item.Id == id))
        {
            db.Appointments.Add(new Appointment
            {
                Id = id,
                PatientId = Guid.Parse("f64d3368-a4da-4d44-9612-5c302b0ec29a"),
                DoctorId = Guid.Parse("8f334882-8d97-4d54-a011-97d7c8c2a201"),
                StartsAtUtc = DateTime.UtcNow.AddDays(1),
                Status = "Scheduled",
                Reason = "General consultation",
                Department = "Outpatient",
                AppointmentType = "Consultation",
                Priority = "Normal",
                Notes = "Initial appointment"
            });
        }
    }
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
