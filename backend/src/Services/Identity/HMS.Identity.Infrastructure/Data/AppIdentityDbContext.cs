using HMS.Identity.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace HMS.Identity.Infrastructure.Data;

public class AppIdentityDbContext : DbContext
{
    public AppIdentityDbContext(DbContextOptions<AppIdentityDbContext> options) : base(options) { }

    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Employee>(entity =>
        {
            entity.ToTable("employees");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FirstName).HasMaxLength(96).IsRequired();
            entity.Property(e => e.LastName).HasMaxLength(96).IsRequired();
            entity.Property(e => e.EmailAddress).HasMaxLength(160).IsRequired();
            entity.HasIndex(e => e.EmailAddress).IsUnique();
            entity.Property(e => e.Role).HasMaxLength(64).IsRequired();
            entity.Property(e => e.Permission).HasMaxLength(64).IsRequired();
            entity.Property(e => e.Password).HasMaxLength(128).IsRequired();
            entity.Property(e => e.IsActive).HasDefaultValue(true);
        });

        modelBuilder.Entity<RolePermission>(entity =>
        {
            entity.ToTable("role_permissions");
            entity.HasKey(r => r.Role);
            entity.Property(r => r.Role).HasMaxLength(64);
            entity.Property(r => r.Description).HasMaxLength(256).IsRequired();
            entity.Property(r => r.PermissionsJson).HasColumnName("permissions_json").HasMaxLength(1024).IsRequired();
        });

        SeedData(modelBuilder);
    }

    private static void SeedData(ModelBuilder modelBuilder)
    {
        var adminId = Guid.Parse("fe89d0c5-6232-421b-9926-05eff4433bd9");
        var doctorId = Guid.Parse("8f334882-8d97-4d54-a011-97d7c8c2a201");
        var receptionistId = Guid.Parse("52f4d81d-e810-4c4e-895b-995f1bbf13a2");
        var nurseId = Guid.Parse("43a3b779-c6f9-496c-b8b6-81525947cf12");
        var pharmacistId = Guid.Parse("83f36db8-5c4d-4f2a-9b54-00c31a31ab7d");
        var labId = Guid.Parse("7c5b23a5-5970-4b95-8d02-c36c1c9ac8e1");
        var accountantId = Guid.Parse("fbdd5447-1864-4420-b42d-60ba5afaf23e");

        modelBuilder.Entity<Employee>().HasData(
            new Employee { Id = adminId, FirstName = "System", LastName = "Administrator", EmailAddress = "admin@hms.local", Role = "ADMIN", Permission = "ALL", Password = "Admin@123", IsActive = true, CreatedAtUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Employee { Id = doctorId, FirstName = "Dawit", LastName = "Doctor", EmailAddress = "doctor@hms.local", Role = "DOCTOR", Permission = "MANAGE_PATIENTS", Password = "Admin@123", IsActive = true, CreatedAtUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Employee { Id = receptionistId, FirstName = "Hana", LastName = "Reception", EmailAddress = "receptionist@hms.local", Role = "RECEPTIONIST", Permission = "REGISTER_PATIENTS", Password = "Admin@123", IsActive = true, CreatedAtUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Employee { Id = nurseId, FirstName = "Marta", LastName = "Nurse", EmailAddress = "nurse@hms.local", Role = "NURSE", Permission = "ASSIST_DOCTORS", Password = "Admin@123", IsActive = true, CreatedAtUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Employee { Id = pharmacistId, FirstName = "Selam", LastName = "Pharmacist", EmailAddress = "pharmacist@hms.local", Role = "PHARMACIST", Permission = "MANAGE_MEDICINES", Password = "Admin@123", IsActive = true, CreatedAtUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Employee { Id = labId, FirstName = "Abel", LastName = "Lab", EmailAddress = "lab@hms.local", Role = "LAB_TECHNICIAN", Permission = "CONDUCT_TESTS", Password = "Admin@123", IsActive = true, CreatedAtUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Employee { Id = accountantId, FirstName = "Mekdes", LastName = "Accountant", EmailAddress = "accountant@hms.local", Role = "ACCOUNTANT", Permission = "MANAGE_FINANCES", Password = "Admin@123", IsActive = true, CreatedAtUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) }
        );

        modelBuilder.Entity<RolePermission>().HasData(
            new RolePermission { Role = "ADMIN", Description = "Full platform administration and configuration", PermissionsJson = "[\"ALL\",\"MANAGE_USERS\",\"MANAGE_ROLES\",\"VIEW_REPORTS\"]" },
            new RolePermission { Role = "DOCTOR", Description = "Clinical care, diagnoses, prescriptions, and lab orders", PermissionsJson = "[\"VIEW_PATIENTS\",\"MANAGE_CLINICAL\",\"ORDER_LABS\",\"PRESCRIBE\"]" },
            new RolePermission { Role = "RECEPTIONIST", Description = "Front desk registration and appointment scheduling", PermissionsJson = "[\"REGISTER_PATIENTS\",\"BOOK_APPOINTMENTS\",\"VIEW_PATIENTS\"]" },
            new RolePermission { Role = "NURSE", Description = "Vitals capture and doctor assistance", PermissionsJson = "[\"VIEW_PATIENTS\",\"CAPTURE_VITALS\",\"ASSIST_CLINICAL\"]" },
            new RolePermission { Role = "PHARMACIST", Description = "Medication review and dispensing", PermissionsJson = "[\"VIEW_PRESCRIPTIONS\",\"DISPENSE_MEDICINE\"]" },
            new RolePermission { Role = "LAB_TECHNICIAN", Description = "Lab request processing and results workflow", PermissionsJson = "[\"VIEW_LAB_REQUESTS\",\"UPDATE_LAB_STATUS\"]" },
            new RolePermission { Role = "ACCOUNTANT", Description = "Billing, invoices, and payment posting", PermissionsJson = "[\"CREATE_INVOICES\",\"RECORD_PAYMENTS\",\"VIEW_FINANCE\"]" }
        );
    }
}
