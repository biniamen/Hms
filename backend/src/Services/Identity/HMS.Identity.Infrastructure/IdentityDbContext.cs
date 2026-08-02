using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using HMS.SharedKernel;
using System.Security.Cryptography;
using System.Text;

namespace HMS.Identity.Infrastructure;

public sealed class IdentityDbContext(DbContextOptions<IdentityDbContext> options) : DbContext(options)
{
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<PasswordSetupToken> PasswordSetupTokens => Set<PasswordSetupToken>();
    public DbSet<EmailOutboxMessage> EmailOutbox => Set<EmailOutboxMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Role>(entity =>
        {
            entity.ToTable("roles");
            entity.HasKey(role => role.RoleCode);
            entity.Property(role => role.RoleCode).HasColumnName("role").HasMaxLength(64);
            entity.Property(role => role.Description).HasColumnName("description").HasMaxLength(240);
        });

        modelBuilder.Entity<Permission>(entity =>
        {
            entity.ToTable("permissions");
            entity.HasKey(permission => permission.Key);
            entity.Property(permission => permission.Key).HasColumnName("key").HasMaxLength(80);
            entity.Property(permission => permission.Description).HasColumnName("description").HasMaxLength(240);
            entity.Property(permission => permission.Module).HasColumnName("module").HasMaxLength(80);
        });

        modelBuilder.Entity<RolePermission>(entity =>
        {
            entity.ToTable("role_permissions");
            entity.HasKey(permission => new { permission.RoleCode, permission.PermissionKey });
            entity.Property(permission => permission.RoleCode).HasColumnName("role").HasMaxLength(64);
            entity.Property(permission => permission.PermissionKey).HasColumnName("permission_key").HasMaxLength(80);
            entity.HasOne(permission => permission.Role)
                .WithMany(role => role.RolePermissions)
                .HasForeignKey(permission => permission.RoleCode)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(permission => permission.Permission)
                .WithMany(permission => permission.RolePermissions)
                .HasForeignKey(permission => permission.PermissionKey)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Department>(entity =>
        {
            entity.ToTable("departments");
            entity.HasKey(department => department.Id);
            entity.HasIndex(department => department.Code).IsUnique();
            entity.Property(department => department.Code).HasColumnName("code").HasMaxLength(32);
            entity.Property(department => department.Name).HasColumnName("name").HasMaxLength(160);
            entity.Property(department => department.Type).HasColumnName("type").HasMaxLength(80);
            entity.Property(department => department.Location).HasColumnName("location").HasMaxLength(160);
            entity.Property(department => department.Specializations).HasColumnName("specializations");
            entity.Property(department => department.CreatedAtUtc).HasColumnName("created_at").HasDefaultValueSql("now()");
        });

        modelBuilder.Entity<Employee>(entity =>
        {
            entity.ToTable("employees");
            entity.HasKey(employee => employee.Id);
            entity.HasIndex(employee => employee.EmployeeNo).IsUnique();
            entity.HasIndex(employee => employee.EmailAddress).IsUnique();
            entity.Property(employee => employee.EmployeeNo).HasColumnName("employee_no").HasMaxLength(40);
            entity.Property(employee => employee.FirstName).HasColumnName("first_name").HasMaxLength(96);
            entity.Property(employee => employee.LastName).HasColumnName("last_name").HasMaxLength(96);
            entity.Property(employee => employee.EmailAddress).HasColumnName("email_address").HasMaxLength(160);
            entity.Property(employee => employee.Phone).HasColumnName("phone").HasMaxLength(40);
            entity.Property(employee => employee.RoleCode).HasColumnName("role").HasMaxLength(64);
            entity.Property(employee => employee.Department).HasColumnName("department").HasMaxLength(120);
            entity.Property(employee => employee.Specialization).HasColumnName("specialization").HasMaxLength(120);
            entity.Property(employee => employee.PasswordHash).HasColumnName("password_hash");
            entity.Property(employee => employee.IsActive).HasColumnName("is_active");
            entity.Property(employee => employee.PasswordSetupCompleted).HasColumnName("password_setup_completed");
            entity.Property(employee => employee.CreatedAtUtc).HasColumnName("created_at").HasDefaultValueSql("now()");
            entity.HasOne(employee => employee.Role)
                .WithMany(role => role.Employees)
                .HasForeignKey(employee => employee.RoleCode)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PasswordSetupToken>(entity =>
        {
            entity.ToTable("password_setup_tokens");
            entity.HasKey(token => token.Id);
            entity.HasIndex(token => token.TokenHash).IsUnique();
            entity.Property(token => token.EmployeeId).HasColumnName("employee_id");
            entity.Property(token => token.TokenHash).HasColumnName("token_hash").HasMaxLength(128);
            entity.Property(token => token.CreatedAtUtc).HasColumnName("created_at_utc").HasDefaultValueSql("now()");
            entity.Property(token => token.SentAtUtc).HasColumnName("sent_at_utc");
            entity.Property(token => token.ExpiresAtUtc).HasColumnName("expires_at_utc");
            entity.Property(token => token.UsedAtUtc).HasColumnName("used_at_utc");
            entity.HasOne(token => token.Employee)
                .WithMany(employee => employee.PasswordSetupTokens)
                .HasForeignKey(token => token.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<EmailOutboxMessage>(entity =>
        {
            entity.ToTable("email_outbox");
            entity.HasKey(message => message.Id);
            entity.Property(message => message.Recipient).HasColumnName("recipient").HasMaxLength(180);
            entity.Property(message => message.Subject).HasColumnName("subject").HasMaxLength(240);
            entity.Property(message => message.Body).HasColumnName("body");
            entity.Property(message => message.Status).HasColumnName("status").HasMaxLength(40);
            entity.Property(message => message.CreatedAtUtc).HasColumnName("created_at_utc").HasDefaultValueSql("now()");
            entity.Property(message => message.SentAtUtc).HasColumnName("sent_at_utc");
            entity.Property(message => message.Error).HasColumnName("error");
        });
    }
}

public sealed class Role
{
    public string RoleCode { get; set; } = "";
    public string Description { get; set; } = "";
    public List<RolePermission> RolePermissions { get; set; } = [];
    public List<Employee> Employees { get; set; } = [];
}

public sealed class Permission
{
    public string Key { get; set; } = "";
    public string Description { get; set; } = "";
    public string Module { get; set; } = "";
    public List<RolePermission> RolePermissions { get; set; } = [];
}

public sealed class RolePermission
{
    public string RoleCode { get; set; } = "";
    public string PermissionKey { get; set; } = "";
    public Role? Role { get; set; }
    public Permission? Permission { get; set; }
}

public sealed class Department : Entity
{
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public string Type { get; set; } = "";
    public string Location { get; set; } = "";
    public string Specializations { get; set; } = "";
}

public sealed class Employee : Entity
{
    public string EmployeeNo { get; set; } = "";
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string EmailAddress { get; set; } = "";
    public string? Phone { get; set; }
    public string RoleCode { get; set; } = "";
    public string? Department { get; set; }
    public string? Specialization { get; set; }
    public string PasswordHash { get; set; } = "";
    public bool IsActive { get; set; } = true;
    public bool PasswordSetupCompleted { get; set; }
    public Role? Role { get; set; }
    public List<PasswordSetupToken> PasswordSetupTokens { get; set; } = [];
}

public sealed class PasswordSetupToken : Entity
{
    public Guid EmployeeId { get; set; }
    public string TokenHash { get; set; } = "";
    public DateTime SentAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? UsedAtUtc { get; set; }
    public Employee? Employee { get; set; }
}

public sealed class EmailOutboxMessage : Entity
{
    public string Recipient { get; set; } = "";
    public string Subject { get; set; } = "";
    public string Body { get; set; } = "";
    public string Status { get; set; } = "";
    public DateTime? SentAtUtc { get; set; }
    public string? Error { get; set; }
}

public static class IdentitySeedData
{
    public static async Task SeedAsync(IdentityDbContext db, string? defaultPassword)
    {
        await UpsertPermissionsAsync(db);
        await UpsertRolesAsync(db);
        await UpsertDepartmentsAsync(db);
        await UpsertEmployeesAsync(db, defaultPassword);
        await db.SaveChangesAsync();
    }

    private static async Task UpsertPermissionsAsync(IdentityDbContext db)
    {
        var permissions = new[]
        {
            new Permission { Key = "ALL", Description = "Full platform access", Module = "Administration" },
            new Permission { Key = "MANAGE_USERS", Description = "Create and manage system users", Module = "Administration" },
            new Permission { Key = "MANAGE_ROLES", Description = "Manage roles and permission assignments", Module = "Administration" },
            new Permission { Key = "MANAGE_DEPARTMENTS", Description = "Manage hospital departments", Module = "Administration" },
            new Permission { Key = "MANAGE_INSURANCE", Description = "Register and manage insurance companies", Module = "Patient Management" },
            new Permission { Key = "REGISTER_PATIENTS", Description = "Register and update patient demographic records", Module = "Patient Management" },
            new Permission { Key = "BOOK_APPOINTMENTS", Description = "Book appointments and manage patient queues", Module = "Patient Management" },
            new Permission { Key = "VIEW_PATIENTS", Description = "View patient records across clinical workflows", Module = "Patient Management" },
            new Permission { Key = "MANAGE_CLINICAL", Description = "Record encounters, diagnoses, and care plans", Module = "Clinical" },
            new Permission { Key = "CAPTURE_VITALS", Description = "Capture nursing vital signs", Module = "Clinical" },
            new Permission { Key = "ORDER_LABS", Description = "Request laboratory investigations", Module = "Clinical" },
            new Permission { Key = "PRESCRIBE", Description = "Create prescriptions", Module = "Clinical" },
            new Permission { Key = "VIEW_LAB_REQUESTS", Description = "View and process laboratory requests", Module = "Clinical" },
            new Permission { Key = "DISPENSE_MEDICINE", Description = "Dispense prescribed medication", Module = "Clinical" },
            new Permission { Key = "CREATE_INVOICES", Description = "Create patient invoices", Module = "Billing" },
            new Permission { Key = "RECORD_PAYMENTS", Description = "Collect payments and produce receipts", Module = "Billing" },
            new Permission { Key = "VIEW_FINANCE", Description = "View billing reports and open balances", Module = "Billing" }
        };

        foreach (var permission in permissions)
        {
            var existing = await db.Permissions.FindAsync(permission.Key);
            if (existing is null)
            {
                db.Permissions.Add(permission);
            }
            else
            {
                existing.Description = permission.Description;
                existing.Module = permission.Module;
            }
        }
    }

    private static async Task UpsertRolesAsync(IdentityDbContext db)
    {
        var roles = new[]
        {
            new Role { RoleCode = "ADMIN", Description = "Full platform administration and configuration" },
            new Role { RoleCode = "DOCTOR", Description = "Clinical care, diagnoses, prescriptions, and lab orders" },
            new Role { RoleCode = "RECEPTIONIST", Description = "Front desk registration and appointment scheduling" },
            new Role { RoleCode = "NURSE", Description = "Vitals capture and doctor assistance" },
            new Role { RoleCode = "PHARMACIST", Description = "Medication review and dispensing" },
            new Role { RoleCode = "LAB_TECHNICIAN", Description = "Lab request processing and results workflow" },
            new Role { RoleCode = "ACCOUNTANT", Description = "Billing, invoices, and payment posting" },
            new Role { RoleCode = "CASHIER", Description = "Payment collection and receipt printing" },
            new Role { RoleCode = "HR_MANAGER", Description = "Employee onboarding and user administration" }
        };

        foreach (var role in roles)
        {
            var existing = await db.Roles.FindAsync(role.RoleCode);
            if (existing is null)
            {
                db.Roles.Add(role);
            }
            else
            {
                existing.Description = role.Description;
            }
        }

        await db.SaveChangesAsync();

        var rolePermissions = new (string Role, string Permission)[]
        {
            ("ADMIN", "ALL"), ("ADMIN", "MANAGE_USERS"), ("ADMIN", "MANAGE_ROLES"), ("ADMIN", "MANAGE_DEPARTMENTS"), ("ADMIN", "MANAGE_INSURANCE"), ("ADMIN", "VIEW_FINANCE"),
            ("DOCTOR", "VIEW_PATIENTS"), ("DOCTOR", "MANAGE_CLINICAL"), ("DOCTOR", "ORDER_LABS"), ("DOCTOR", "PRESCRIBE"),
            ("RECEPTIONIST", "REGISTER_PATIENTS"), ("RECEPTIONIST", "BOOK_APPOINTMENTS"), ("RECEPTIONIST", "VIEW_PATIENTS"),
            ("NURSE", "VIEW_PATIENTS"), ("NURSE", "CAPTURE_VITALS"), ("NURSE", "MANAGE_CLINICAL"),
            ("PHARMACIST", "VIEW_PATIENTS"), ("PHARMACIST", "DISPENSE_MEDICINE"),
            ("LAB_TECHNICIAN", "VIEW_LAB_REQUESTS"), ("LAB_TECHNICIAN", "VIEW_PATIENTS"),
            ("ACCOUNTANT", "CREATE_INVOICES"), ("ACCOUNTANT", "RECORD_PAYMENTS"), ("ACCOUNTANT", "VIEW_FINANCE"),
            ("CASHIER", "RECORD_PAYMENTS"), ("CASHIER", "VIEW_FINANCE"),
            ("HR_MANAGER", "MANAGE_USERS"), ("HR_MANAGER", "MANAGE_ROLES")
        };

        foreach (var item in rolePermissions)
        {
            if (!await db.RolePermissions.AnyAsync(permission => permission.RoleCode == item.Role && permission.PermissionKey == item.Permission))
            {
                db.RolePermissions.Add(new RolePermission { RoleCode = item.Role, PermissionKey = item.Permission });
            }
        }
    }

    private static async Task UpsertDepartmentsAsync(IdentityDbContext db)
    {
        var departments = new[]
        {
            new Department { Id = Guid.Parse("27b29b9e-70b5-45d0-8b48-b6d5323f4f54"), Code = "OPD", Name = "Outpatient", Type = "Clinical", Location = "Block A", Specializations = "Internal Medicine|General Practice|Family Medicine|Cardiology" },
            new Department { Id = Guid.Parse("69915464-0999-4353-a3f5-91d3472ec98a"), Code = "ER", Name = "Emergency", Type = "Clinical", Location = "Ground Floor", Specializations = "Emergency Medicine|Trauma Care|Critical Care|Triage Nursing" },
            new Department { Id = Guid.Parse("ea4b9765-f7d2-409d-a67f-a8f98695629a"), Code = "PED", Name = "Pediatrics", Type = "Clinical", Location = "Block B", Specializations = "Pediatrics|Neonatology|Pediatric Nursing|Child Health" },
            new Department { Id = Guid.Parse("53b54a7a-c189-4fea-b3ba-f85dbe368601"), Code = "MAT", Name = "Maternity", Type = "Clinical", Location = "Block C", Specializations = "Obstetrics|Gynecology|Midwifery|Maternal Health" },
            new Department { Id = Guid.Parse("0a48cb6a-c097-4f33-a6f2-baa1181e4d9a"), Code = "FIN", Name = "Finance", Type = "Administration", Location = "Admin Block", Specializations = "Revenue Cycle|Cashier|Claims Management|Accounting" }
        };

        foreach (var department in departments)
        {
            var existing = await db.Departments.FirstOrDefaultAsync(item => item.Code == department.Code);
            if (existing is null)
            {
                db.Departments.Add(department);
            }
            else
            {
                existing.Name = department.Name;
                existing.Type = department.Type;
                existing.Location = department.Location;
                existing.Specializations = department.Specializations;
            }
        }
    }

    private static async Task UpsertEmployeesAsync(IdentityDbContext db, string? defaultPassword)
    {
        var seedPassword = string.IsNullOrWhiteSpace(defaultPassword) ? null : defaultPassword.Trim();
        var passwordError = seedPassword is null ? null : IdentitySecurity.ValidatePassword(seedPassword);
        if (passwordError is not null)
        {
            throw new InvalidOperationException($"Seed:DefaultPassword is invalid. {passwordError}");
        }

        var employees = new[]
        {
            new Employee { Id = Guid.Parse("fe89d0c5-6232-421b-9926-05eff4433bd9"), EmployeeNo = "EMP-0001", FirstName = "System", LastName = "Administrator", EmailAddress = "admin@hms.local", Phone = "0900000001", RoleCode = "ADMIN", Department = "Administration", Specialization = "Platform Administration" },
            new Employee { Id = Guid.Parse("8f334882-8d97-4d54-a011-97d7c8c2a201"), EmployeeNo = "EMP-0002", FirstName = "Hana", LastName = "Tesfaye", EmailAddress = "doctor@hms.local", Phone = "0900000002", RoleCode = "DOCTOR", Department = "Outpatient", Specialization = "Internal Medicine" },
            new Employee { Id = Guid.Parse("52f4d81d-e810-4c4e-895b-995f1bbf13a2"), EmployeeNo = "EMP-0003", FirstName = "Marta", LastName = "Abebe", EmailAddress = "receptionist@hms.local", Phone = "0900000003", RoleCode = "RECEPTIONIST", Department = "Front Desk", Specialization = "Patient Registration" },
            new Employee { Id = Guid.Parse("43a3b779-c6f9-496c-b8b6-81525947cf12"), EmployeeNo = "EMP-0004", FirstName = "Daniel", LastName = "Kebede", EmailAddress = "nurse@hms.local", Phone = "0900000004", RoleCode = "NURSE", Department = "Ward", Specialization = "General Nursing" },
            new Employee { Id = Guid.Parse("83f36db8-5c4d-4f2a-9b54-00c31a31ab7d"), EmployeeNo = "EMP-0005", FirstName = "Liya", LastName = "Tadesse", EmailAddress = "pharmacist@hms.local", Phone = "0900000005", RoleCode = "PHARMACIST", Department = "Pharmacy", Specialization = "Dispensing" },
            new Employee { Id = Guid.Parse("7c5b23a5-5970-4b95-8d02-c36c1c9ac8e1"), EmployeeNo = "EMP-0006", FirstName = "Yonatan", LastName = "Alemayehu", EmailAddress = "lab@hms.local", Phone = "0900000006", RoleCode = "LAB_TECHNICIAN", Department = "Laboratory", Specialization = "Hematology" },
            new Employee { Id = Guid.Parse("fbdd5447-1864-4420-b42d-60ba5afaf23e"), EmployeeNo = "EMP-0007", FirstName = "Selam", LastName = "Desta", EmailAddress = "accountant@hms.local", Phone = "0900000007", RoleCode = "ACCOUNTANT", Department = "Finance", Specialization = "Revenue Cycle" }
        };

        foreach (var employee in employees)
        {
            var existing = await db.Employees.FirstOrDefaultAsync(item => item.EmailAddress == employee.EmailAddress);
            if (existing is null)
            {
                employee.PasswordHash = seedPassword is null ? "" : IdentitySecurity.HashPassword(seedPassword);
                employee.IsActive = true;
                employee.PasswordSetupCompleted = seedPassword is not null;
                db.Employees.Add(employee);
            }
            else
            {
                existing.EmployeeNo = employee.EmployeeNo;
                existing.FirstName = employee.FirstName;
                existing.LastName = employee.LastName;
                existing.Phone = employee.Phone;
                existing.RoleCode = employee.RoleCode;
                existing.Department = employee.Department;
                existing.Specialization = employee.Specialization;
                existing.IsActive = true;
                if (!existing.PasswordSetupCompleted && string.IsNullOrWhiteSpace(existing.PasswordHash) && seedPassword is not null)
                {
                    existing.PasswordHash = IdentitySecurity.HashPassword(seedPassword);
                    existing.PasswordSetupCompleted = true;
                }
            }
        }
    }
}

public static class IdentitySecurity
{
    public static string CreateSecureToken()
    {
        Span<byte> bytes = stackalloc byte[32];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    public static string HashToken(string token)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(token.Trim()));
        return Convert.ToHexString(hash);
    }

    public static string HashPassword(string password)
    {
        const int iterations = 120_000;
        Span<byte> salt = stackalloc byte[16];
        RandomNumberGenerator.Fill(salt);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, 32);
        return $"pbkdf2${iterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";
    }

    public static bool VerifyPassword(string password, string storedHash)
    {
        if (IsLegacyPassword(storedHash))
        {
            return false;
        }

        var parts = storedHash.Split('$');
        if (parts.Length != 4 || parts[0] != "pbkdf2" || !int.TryParse(parts[1], out var iterations))
        {
            return false;
        }

        var salt = Convert.FromBase64String(parts[2]);
        var expectedHash = Convert.FromBase64String(parts[3]);
        var actualHash = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, expectedHash.Length);
        return CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
    }

    public static bool IsLegacyPassword(string storedHash) =>
        !string.IsNullOrWhiteSpace(storedHash) && !storedHash.StartsWith("pbkdf2$", StringComparison.Ordinal);

    public static string? ValidatePassword(string password)
    {
        if (password.Length < 8)
        {
            return "Password must be at least 8 characters.";
        }

        if (!password.Any(char.IsUpper) || !password.Any(char.IsLower) || !password.Any(char.IsDigit))
        {
            return "Password must include uppercase, lowercase, and number characters.";
        }

        return null;
    }
}

public static class IdentityDatabaseBootstrapper
{
    public static Task EnsureDatabaseExistsAsync(string connectionString) =>
        PostgresDatabaseBootstrapper.EnsureDatabaseExistsAsync(connectionString);
}

public sealed class IdentityDbContextFactory : IDesignTimeDbContextFactory<IdentityDbContext>
{
    public IdentityDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__IdentityDb")
            ?? throw new InvalidOperationException("Set ConnectionStrings__IdentityDb before running EF Core design-time commands.");

        var options = new DbContextOptionsBuilder<IdentityDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        return new IdentityDbContext(options);
    }
}
