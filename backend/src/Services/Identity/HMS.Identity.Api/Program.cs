using HMS.Contracts;
using HMS.Identity.Infrastructure;
using HMS.SharedKernel;
using HMS.SharedKernel.Constants;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Net.Mail;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Services.AddOpenApi();
builder.Services.AddHmsCors(builder.Configuration);

var connectionString = builder.Configuration.RequireConnectionString("IdentityDb");

await IdentityDatabaseBootstrapper.EnsureDatabaseExistsAsync(connectionString);
await PostgresDatabaseBootstrapper.ResetLegacySchemaIfRequestedAsync(
    connectionString,
    builder.Configuration.GetValue("Database:ResetLegacySchemaOnStartup", false));
builder.Services.AddDbContext<IdentityDbContext>(options => options.UseNpgsql(connectionString));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();
app.UseHmsJwtAuthentication(
    "/health",
    "/openapi",
    "/api/auth/login",
    "/api/auth/setup-password",
    "/api/auth/forgot-password");

await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
    await db.Database.MigrateAsync();
    await IdentitySeedData.SeedAsync(db, app.Configuration["Seed:DefaultPassword"]);
    await UpgradeLegacyPasswordsAsync(db);
}

app.MapGet("/health", () => Results.Ok(ApiResponse<object>.Ok(new { service = "identity", status = "healthy" })));

app.MapPost("/api/auth/login", async (LoginRequest request, IdentityDbContext db) =>
{
    var email = request.EmailAddress.Trim().ToLowerInvariant();
    var employee = await db.Employees.FirstOrDefaultAsync(item => item.EmailAddress.ToLower() == email);
    if (employee is null || !employee.IsActive)
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Invalid email address or password."));
    }

    if (!employee.PasswordSetupCompleted)
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Password setup is required before this account can sign in. Please use the invitation link sent to your email."));
    }

    if (!IdentitySecurity.VerifyPassword(request.Password, employee.PasswordHash))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Invalid email address or password."));
    }

    var permission = await PermissionTextAsync(db, employee.RoleCode);
    var permissions = await PermissionsForRoleAsync(db, employee.RoleCode);
    var token = HmsSecurity.CreateAccessToken(app.Configuration, employee.Id.ToString("D"), employee.EmailAddress, employee.RoleCode, permissions);
    var response = new LoginResponse(token, employee.Id, employee.EmailAddress, employee.RoleCode, permission);
    return Results.Ok(ApiResponse<LoginResponse>.Ok(response, "Login successful."));
}).WithValidation<LoginRequest>();

app.MapGet("/api/employees", async (
    IdentityDbContext db,
    HttpContext httpContext,
    int page = 1,
    int pageSize = 100) =>
{
    var employees = await ToPagedListAsync(db.Employees
        .AsNoTracking()
        .OrderByDescending(employee => employee.CreatedAtUtc)
        .ThenBy(employee => employee.EmployeeNo), httpContext, page, pageSize);

    var permissionsByRole = await PermissionsByRoleAsync(db);
    var latestTokens = await LatestOpenTokensByEmployeeAsync(db);
    var response = employees.Select(employee => ToEmployeeDto(employee, PermissionText(permissionsByRole, employee.RoleCode), latestTokens.GetValueOrDefault(employee.Id)));
    return Results.Ok(ApiResponse<IEnumerable<EmployeeDto>>.Ok(response));
}).RequireHmsRoles(HmsRoles.Admin, HmsRoles.HRManager);

app.MapGet("/api/employees/{id:guid}", async (Guid id, IdentityDbContext db) =>
{
    var employee = await db.Employees.AsNoTracking().FirstOrDefaultAsync(item => item.Id == id);
    if (employee is null)
    {
        return Results.NotFound(ApiResponse<object>.Fail("Employee not found."));
    }

    var permission = await PermissionTextAsync(db, employee.RoleCode);
    var latestToken = await LatestOpenTokenAsync(db, employee.Id);
    return Results.Ok(ApiResponse<EmployeeDto>.Ok(ToEmployeeDto(employee, permission, latestToken)));
});

app.MapPost("/api/employees", async (CreateEmployeeRequest request, IdentityDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.FirstName) ||
        string.IsNullOrWhiteSpace(request.LastName) ||
        string.IsNullOrWhiteSpace(request.EmailAddress) ||
        string.IsNullOrWhiteSpace(request.Role))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("First name, last name, email, and role are required."));
    }

    var role = NormalizeKey(request.Role);
    if (!await db.Roles.AnyAsync(item => item.RoleCode == role))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Selected role does not exist."));
    }

    if (await db.Employees.AnyAsync(item => item.EmailAddress.ToLower() == request.EmailAddress.Trim().ToLower()))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("An employee with this email already exists."));
    }

    var employee = new Employee
    {
        Id = Guid.NewGuid(),
        EmployeeNo = await NextEmployeeNoAsync(db),
        FirstName = request.FirstName.Trim(),
        LastName = request.LastName.Trim(),
        EmailAddress = request.EmailAddress.Trim(),
        Phone = CleanOrNull(request.Phone),
        RoleCode = role,
        Department = CleanOrNull(request.Department),
        Specialization = CleanOrNull(request.Specialization),
        PasswordHash = "",
        IsActive = true,
        PasswordSetupCompleted = false,
        CreatedAtUtc = DateTime.UtcNow
    };

    var inviteToken = IdentitySecurity.CreateSecureToken();
    var setupUrl = BuildSetupUrl(app.Configuration, inviteToken);
    var expiresAtUtc = DateTime.UtcNow.AddHours(app.Configuration.GetValue("PasswordSetup:TokenLifetimeHours", 48));

    await using var transaction = await db.Database.BeginTransactionAsync();
    db.Employees.Add(employee);
    await SavePasswordSetupTokenAsync(db, employee.Id, inviteToken, expiresAtUtc);
    await db.SaveChangesAsync();
    await transaction.CommitAsync();

    await SendInvitationEmailAsync(app.Configuration, db, employee.EmailAddress, $"{employee.FirstName} {employee.LastName}", setupUrl);

    var permission = await PermissionTextAsync(db, employee.RoleCode);
    var latestToken = await LatestOpenTokenAsync(db, employee.Id);
    return Results.Created($"/api/employees/{employee.Id}", ApiResponse<EmployeeInviteResponse>.Ok(
        new EmployeeInviteResponse(ToEmployeeDto(employee, permission, latestToken), setupUrl),
        "Employee created. Password setup invitation prepared."));
}).WithValidation<CreateEmployeeRequest>().RequireHmsRoles(HmsRoles.Admin, HmsRoles.HRManager);

app.MapPost("/api/employees/with-password", async (CreateEmployeeWithPasswordRequest request, IdentityDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.FirstName) ||
        string.IsNullOrWhiteSpace(request.LastName) ||
        string.IsNullOrWhiteSpace(request.EmailAddress) ||
        string.IsNullOrWhiteSpace(request.Role) ||
        string.IsNullOrWhiteSpace(request.Password))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("First name, last name, email, role, and password are required."));
    }

    var role = NormalizeKey(request.Role);
    if (!await db.Roles.AnyAsync(item => item.RoleCode == role))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Selected role does not exist."));
    }

    if (await db.Employees.AnyAsync(item => item.EmailAddress.ToLower() == request.EmailAddress.Trim().ToLower()))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("An employee with this email already exists."));
    }

    var passwordValidation = IdentitySecurity.ValidatePassword(request.Password);
    if (passwordValidation is not null)
    {
        return Results.BadRequest(ApiResponse<object>.Fail(passwordValidation));
    }

    var employee = new Employee
    {
        Id = Guid.NewGuid(),
        EmployeeNo = await NextEmployeeNoAsync(db),
        FirstName = request.FirstName.Trim(),
        LastName = request.LastName.Trim(),
        EmailAddress = request.EmailAddress.Trim(),
        Phone = CleanOrNull(request.Phone),
        RoleCode = role,
        Department = CleanOrNull(request.Department),
        Specialization = CleanOrNull(request.Specialization),
        PasswordHash = IdentitySecurity.HashPassword(request.Password),
        IsActive = true,
        PasswordSetupCompleted = true,
        CreatedAtUtc = DateTime.UtcNow
    };

    db.Employees.Add(employee);
    await db.SaveChangesAsync();

    var permission = await PermissionTextAsync(db, employee.RoleCode);
    var latestToken = await LatestOpenTokenAsync(db, employee.Id);
    return Results.Created($"/api/employees/{employee.Id}", ApiResponse<EmployeeDto>.Ok(
        ToEmployeeDto(employee, permission, latestToken),
        "Employee created with password."));
}).WithValidation<CreateEmployeeWithPasswordRequest>().RequireHmsRoles(HmsRoles.Admin, HmsRoles.HRManager);

app.MapPut("/api/employees/{id:guid}", async (Guid id, UpdateEmployeeRequest request, IdentityDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.FirstName) ||
        string.IsNullOrWhiteSpace(request.LastName) ||
        string.IsNullOrWhiteSpace(request.EmailAddress) ||
        string.IsNullOrWhiteSpace(request.Role))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("First name, last name, email, and role are required."));
    }

    var employee = await db.Employees.FirstOrDefaultAsync(item => item.Id == id);
    if (employee is null)
    {
        return Results.NotFound(ApiResponse<object>.Fail("Employee not found."));
    }

    var role = NormalizeKey(request.Role);
    if (!await db.Roles.AnyAsync(item => item.RoleCode == role))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Selected role does not exist."));
    }

    var email = request.EmailAddress.Trim();
    var normalizedEmail = email.ToLowerInvariant();
    if (await db.Employees.AnyAsync(item => item.Id != id && item.EmailAddress.ToLower() == normalizedEmail))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("An employee with this email already exists."));
    }

    employee.FirstName = request.FirstName.Trim();
    employee.LastName = request.LastName.Trim();
    employee.EmailAddress = email;
    employee.Phone = CleanOrNull(request.Phone);
    employee.RoleCode = role;
    employee.Department = CleanOrNull(request.Department);
    employee.Specialization = CleanOrNull(request.Specialization);

    await db.SaveChangesAsync();

    var permission = await PermissionTextAsync(db, employee.RoleCode);
    var latestToken = await LatestOpenTokenAsync(db, employee.Id);
    return Results.Ok(ApiResponse<EmployeeDto>.Ok(ToEmployeeDto(employee, permission, latestToken), "Employee updated."));
}).RequireHmsRoles(HmsRoles.Admin, HmsRoles.HRManager);

app.MapPut("/api/employees/{id:guid}/status", async (Guid id, UpdateEmployeeStatusRequest request, IdentityDbContext db) =>
{
    var employee = await db.Employees.FirstOrDefaultAsync(item => item.Id == id);
    if (employee is null)
    {
        return Results.NotFound(ApiResponse<object>.Fail("Employee not found."));
    }

    employee.IsActive = request.IsActive;
    await db.SaveChangesAsync();

    var permission = await PermissionTextAsync(db, employee.RoleCode);
    var latestToken = await LatestOpenTokenAsync(db, employee.Id);
    return Results.Ok(ApiResponse<EmployeeDto>.Ok(
        ToEmployeeDto(employee, permission, latestToken),
        request.IsActive ? "Employee enabled." : "Employee disabled."));
}).RequireHmsRoles(HmsRoles.Admin, HmsRoles.HRManager);

app.MapPost("/api/employees/{id:guid}/invite", async (Guid id, IdentityDbContext db) =>
{
    var employee = await db.Employees.FirstOrDefaultAsync(item => item.Id == id);
    if (employee is null)
    {
        return Results.NotFound(ApiResponse<object>.Fail("Employee not found."));
    }

    if (!employee.IsActive)
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Inactive employees cannot receive setup invitations."));
    }

    var inviteToken = IdentitySecurity.CreateSecureToken();
    var setupUrl = BuildSetupUrl(app.Configuration, inviteToken);
    var expiresAtUtc = DateTime.UtcNow.AddHours(app.Configuration.GetValue("PasswordSetup:TokenLifetimeHours", 48));

    await SavePasswordSetupTokenAsync(db, employee.Id, inviteToken, expiresAtUtc);
    await db.SaveChangesAsync();

    await SendInvitationEmailAsync(app.Configuration, db, employee.EmailAddress, $"{employee.FirstName} {employee.LastName}", setupUrl);

    var permission = await PermissionTextAsync(db, employee.RoleCode);
    var latestToken = await LatestOpenTokenAsync(db, employee.Id);
    return Results.Ok(ApiResponse<EmployeeInviteResponse>.Ok(
        new EmployeeInviteResponse(ToEmployeeDto(employee, permission, latestToken), setupUrl),
        "Password setup invitation prepared."));
}).RequireHmsRoles(HmsRoles.Admin, HmsRoles.HRManager);

app.MapPost("/api/auth/forgot-password", async (ForgotPasswordRequest request, IdentityDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.EmailAddress))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Email address is required."));
    }

    var email = request.EmailAddress.Trim().ToLowerInvariant();
    var employee = await db.Employees.FirstOrDefaultAsync(item => item.EmailAddress.ToLower() == email);
    if (employee is null || !employee.IsActive)
    {
        return Results.Ok(ApiResponse<PasswordResetResponse>.Ok(
            new PasswordResetResponse(true, null),
            "If the email exists, a password reset link will be prepared."));
    }

    var resetToken = IdentitySecurity.CreateSecureToken();
    var setupUrl = BuildSetupUrl(app.Configuration, resetToken);
    var expiresAtUtc = DateTime.UtcNow.AddHours(app.Configuration.GetValue("PasswordSetup:TokenLifetimeHours", 48));
    await SavePasswordSetupTokenAsync(db, employee.Id, resetToken, expiresAtUtc);
    await db.SaveChangesAsync();

    await SendPasswordEmailAsync(
        app.Configuration,
        db,
        employee.EmailAddress,
        $"{employee.FirstName} {employee.LastName}",
        setupUrl,
        "Reset your HMS password",
        "Use the secure link below to reset your HMS account password:");

    var exposeLink = ShouldExposeLocalSetupLinks(app.Configuration);
    return Results.Ok(ApiResponse<PasswordResetResponse>.Ok(
        new PasswordResetResponse(true, exposeLink ? setupUrl : null),
        "If the email exists, a password reset link will be prepared."));
});

app.MapPost("/api/auth/setup-password", async (SetupPasswordRequest request, IdentityDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.Token) || string.IsNullOrWhiteSpace(request.Password))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Setup token and password are required."));
    }

    var passwordValidation = IdentitySecurity.ValidatePassword(request.Password);
    if (passwordValidation is not null)
    {
        return Results.BadRequest(ApiResponse<object>.Fail(passwordValidation));
    }

    var tokenHash = IdentitySecurity.HashToken(request.Token);
    var setupToken = await db.PasswordSetupTokens
        .Include(token => token.Employee)
        .OrderByDescending(token => token.CreatedAtUtc)
        .FirstOrDefaultAsync(token => token.TokenHash == tokenHash && token.UsedAtUtc == null && token.ExpiresAtUtc > DateTime.UtcNow);

    if (setupToken?.Employee is null)
    {
        return Results.BadRequest(ApiResponse<object>.Fail("This password setup link is invalid or expired."));
    }

    if (!setupToken.Employee.IsActive)
    {
        return Results.BadRequest(ApiResponse<object>.Fail("The employee account is inactive or no longer available."));
    }

    setupToken.Employee.PasswordHash = IdentitySecurity.HashPassword(request.Password);
    setupToken.Employee.PasswordSetupCompleted = true;
    setupToken.UsedAtUtc = DateTime.UtcNow;
    await db.SaveChangesAsync();

    return Results.Ok(ApiResponse<object>.Ok(new { employeeId = setupToken.EmployeeId }, "Password setup completed. You can now sign in."));
});

app.MapGet("/api/auth/email-outbox", async (
    string? recipient,
    IdentityDbContext db,
    HttpContext httpContext,
    int page = 1,
    int pageSize = 25) =>
{
    var query = db.EmailOutbox.AsNoTracking();
    if (!string.IsNullOrWhiteSpace(recipient))
    {
        var filter = recipient.Trim().ToLowerInvariant();
        query = query.Where(message => message.Recipient.ToLower() == filter);
    }

    var messages = await ToPagedListAsync(query
        .OrderByDescending(message => message.CreatedAtUtc), httpContext, page, pageSize);

    return Results.Ok(ApiResponse<IEnumerable<EmailOutboxDto>>.Ok(messages.Select(message => new EmailOutboxDto(
        message.Id,
        message.Recipient,
        message.Subject,
        message.Status,
        message.CreatedAtUtc,
        message.SentAtUtc,
        message.Error,
        ExtractFirstUrl(message.Body)))));
}).RequireHmsRoles(HmsRoles.Admin, HmsRoles.HRManager);

app.MapGet("/api/auth/email-outbox/latest-link", async (string recipient, IdentityDbContext db) =>
{
    var filter = recipient.Trim().ToLowerInvariant();
    var message = await db.EmailOutbox
        .AsNoTracking()
        .Where(item => item.Recipient.ToLower() == filter)
        .OrderByDescending(item => item.CreatedAtUtc)
        .FirstOrDefaultAsync();

    var setupUrl = message is null ? null : ExtractFirstUrl(message.Body);
    return string.IsNullOrWhiteSpace(setupUrl)
        ? Results.NotFound(ApiResponse<object>.Fail("No setup link found."))
        : Results.Ok(ApiResponse<object>.Ok(new { setupUrl }));
}).RequireHmsRoles(HmsRoles.Admin, HmsRoles.HRManager);

app.MapGet("/api/roles", async (
    IdentityDbContext db,
    HttpContext httpContext,
    int page = 1,
    int pageSize = 100) =>
{
    var roles = await ToPagedListAsync(db.Roles
        .AsNoTracking()
        .OrderBy(role => role.RoleCode), httpContext, page, pageSize);

    var rolePermissions = await db.RolePermissions.AsNoTracking().ToListAsync();
    var userCounts = await db.Employees
        .AsNoTracking()
        .GroupBy(employee => employee.RoleCode)
        .Select(group => new { Role = group.Key, Count = group.Count() })
        .ToDictionaryAsync(item => item.Role, item => item.Count);

    var response = roles.Select(role => new RolePermissionDto(
        role.RoleCode,
        role.Description,
        rolePermissions
            .Where(permission => permission.RoleCode == role.RoleCode)
            .Select(permission => permission.PermissionKey)
            .OrderBy(permission => permission)
            .ToArray(),
        userCounts.GetValueOrDefault(role.RoleCode)));

    return Results.Ok(ApiResponse<IEnumerable<RolePermissionDto>>.Ok(response));
}).RequireHmsRoles(HmsRoles.Admin);

app.MapPost("/api/roles", async (CreateRoleRequest request, IdentityDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.Role) || string.IsNullOrWhiteSpace(request.Description))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Role and description are required."));
    }

    var roleCode = NormalizeKey(request.Role);
    var role = await db.Roles.FirstOrDefaultAsync(item => item.RoleCode == roleCode);
    if (role is null)
    {
        role = new Role { RoleCode = roleCode };
        db.Roles.Add(role);
    }

    role.Description = request.Description.Trim();
    await ReplaceRolePermissionsAsync(db, roleCode, request.Permissions);
    await db.SaveChangesAsync();

    return Results.Created($"/api/roles/{roleCode}", ApiResponse<object>.Ok(new { role = roleCode }, "Role saved."));
}).RequireHmsRoles(HmsRoles.Admin);

app.MapPut("/api/roles/{roleCode}", async (string roleCode, UpdateRolePermissionRequest request, IdentityDbContext db) =>
{
    var normalizedRole = NormalizeKey(roleCode);
    var role = await db.Roles.FirstOrDefaultAsync(item => item.RoleCode == normalizedRole);
    if (role is null)
    {
        return Results.NotFound(ApiResponse<object>.Fail("Role not found."));
    }

    role.Description = Clean(request.Description, role.Description);
    await ReplaceRolePermissionsAsync(db, normalizedRole, request.Permissions);
    await db.SaveChangesAsync();

    return Results.Ok(ApiResponse<object>.Ok(new { role = normalizedRole }, "Role permissions updated."));
}).RequireHmsRoles(HmsRoles.Admin);

app.MapGet("/api/permissions", async (
    IdentityDbContext db,
    HttpContext httpContext,
    int page = 1,
    int pageSize = 100) =>
{
    var permissions = await ToPagedListAsync(db.Permissions
        .AsNoTracking()
        .OrderBy(permission => permission.Module)
        .ThenBy(permission => permission.Key)
        .Select(permission => new PermissionDto(permission.Key, permission.Description, permission.Module)), httpContext, page, pageSize);

    return Results.Ok(ApiResponse<IEnumerable<PermissionDto>>.Ok(permissions));
}).RequireHmsRoles(HmsRoles.Admin);

app.MapPost("/api/permissions", async (CreatePermissionRequest request, IdentityDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.Key) || string.IsNullOrWhiteSpace(request.Description))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Permission key and description are required."));
    }

    var key = NormalizeKey(request.Key);
    var permission = await db.Permissions.FirstOrDefaultAsync(item => item.Key == key);
    if (permission is null)
    {
        permission = new Permission { Key = key };
        db.Permissions.Add(permission);
    }

    permission.Description = request.Description.Trim();
    permission.Module = Clean(request.Module, "Custom");
    await db.SaveChangesAsync();

    return Results.Created($"/api/permissions/{key}", ApiResponse<PermissionDto>.Ok(new PermissionDto(permission.Key, permission.Description, permission.Module), "Permission saved."));
}).RequireHmsRoles(HmsRoles.Admin);

app.MapGet("/api/departments", async (
    IdentityDbContext db,
    HttpContext httpContext,
    int page = 1,
    int pageSize = 100) =>
{
    var departmentEntities = await ToPagedListAsync(db.Departments
        .AsNoTracking()
        .OrderBy(department => department.Name), httpContext, page, pageSize);
    var departments = departmentEntities
        .Select(department => new DepartmentDto(department.Id, department.Code, department.Name, department.Type, department.Location, ParseSpecializations(department.Specializations)))
        .ToList();

    return Results.Ok(ApiResponse<IEnumerable<DepartmentDto>>.Ok(departments));
});

app.MapPost("/api/departments", async (CreateDepartmentRequest request, IdentityDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Department code and name are required."));
    }

    var code = NormalizeKey(request.Code);
    var department = await db.Departments.FirstOrDefaultAsync(item => item.Code == code);
    if (department is null)
    {
        department = new Department { Id = Guid.NewGuid(), Code = code };
        db.Departments.Add(department);
    }

    department.Name = request.Name.Trim();
    department.Type = Clean(request.Type, "Clinical");
    department.Location = Clean(request.Location, "Main Campus");
    department.Specializations = SerializeSpecializations(request.Specializations);
    await db.SaveChangesAsync();

    return Results.Created($"/api/departments/{department.Id}", ApiResponse<DepartmentDto>.Ok(
        new DepartmentDto(department.Id, department.Code, department.Name, department.Type, department.Location, ParseSpecializations(department.Specializations)),
        "Department saved."));
}).RequireHmsRoles(HmsRoles.Admin);

app.MapGet("/api/doctors", async (
    IdentityDbContext db,
    HttpContext httpContext,
    int page = 1,
    int pageSize = 100) =>
{
    var doctors = await ToPagedListAsync(db.Employees
        .AsNoTracking()
        .Where(employee => employee.RoleCode == HmsRoles.Doctor && employee.IsActive)
        .OrderBy(employee => employee.FirstName)
        .ThenBy(employee => employee.LastName)
        .Select(employee => new DoctorProfileDto(employee.Id, employee.FirstName, employee.LastName, employee.EmailAddress, employee.Department, employee.Specialization, 0, employee.IsActive)), httpContext, page, pageSize);

    return Results.Ok(ApiResponse<IEnumerable<DoctorProfileDto>>.Ok(doctors));
});

app.Run();

static async Task<List<T>> ToPagedListAsync<T>(
    IQueryable<T> query,
    HttpContext httpContext,
    int page,
    int pageSize)
{
    var (normalizedPage, normalizedPageSize) = NormalizePaging(page, pageSize);
    var totalCount = await query.CountAsync();
    WritePaginationHeaders(httpContext, totalCount, normalizedPage, normalizedPageSize);
    return await query
        .Skip((normalizedPage - 1) * normalizedPageSize)
        .Take(normalizedPageSize)
        .ToListAsync();
}

static (int Page, int PageSize) NormalizePaging(int page, int pageSize)
{
    var normalizedPage = Math.Max(1, page);
    var normalizedPageSize = Math.Clamp(pageSize, 1, 500);
    return (normalizedPage, normalizedPageSize);
}

static void WritePaginationHeaders(
    HttpContext httpContext,
    int totalCount,
    int page,
    int pageSize)
{
    httpContext.Response.Headers["X-Total-Count"] = totalCount.ToString();
    httpContext.Response.Headers["X-Page"] = page.ToString();
    httpContext.Response.Headers["X-Page-Size"] = pageSize.ToString();
    httpContext.Response.Headers["X-Total-Pages"] = Math.Max(1, (int)Math.Ceiling(totalCount / (double)pageSize)).ToString();
}

static EmployeeDto ToEmployeeDto(Employee employee, string permission, PasswordSetupToken? latestToken) =>
    new(
        employee.Id,
        employee.EmployeeNo,
        employee.FirstName,
        employee.LastName,
        employee.EmailAddress,
        employee.Phone,
        employee.RoleCode,
        permission,
        employee.Department,
        employee.Specialization,
        employee.IsActive,
        employee.PasswordSetupCompleted,
        latestToken?.SentAtUtc,
        latestToken?.ExpiresAtUtc);

static async Task<Dictionary<string, string[]>> PermissionsByRoleAsync(IdentityDbContext db)
{
    var rolePermissions = await db.RolePermissions.AsNoTracking().ToListAsync();
    return rolePermissions
        .GroupBy(permission => permission.RoleCode)
        .ToDictionary(
            group => group.Key,
            group => group.Select(permission => permission.PermissionKey).OrderBy(permission => permission).ToArray());
}

static string PermissionText(Dictionary<string, string[]> permissionsByRole, string role) =>
    permissionsByRole.TryGetValue(role, out var permissions) ? string.Join(", ", permissions) : string.Empty;

static async Task<string> PermissionTextAsync(IdentityDbContext db, string role)
{
    var permissions = await db.RolePermissions
        .AsNoTracking()
        .Where(permission => permission.RoleCode == role)
        .OrderBy(permission => permission.PermissionKey)
        .Select(permission => permission.PermissionKey)
        .ToListAsync();

    return string.Join(", ", permissions);
}

static async Task<string[]> PermissionsForRoleAsync(IdentityDbContext db, string role) =>
    await db.RolePermissions
        .AsNoTracking()
        .Where(permission => permission.RoleCode == role)
        .OrderBy(permission => permission.PermissionKey)
        .Select(permission => permission.PermissionKey)
        .ToArrayAsync();

static async Task<Dictionary<Guid, PasswordSetupToken>> LatestOpenTokensByEmployeeAsync(IdentityDbContext db)
{
    var tokens = await db.PasswordSetupTokens
        .AsNoTracking()
        .Where(token => token.UsedAtUtc == null)
        .OrderByDescending(token => token.CreatedAtUtc)
        .ToListAsync();

    return tokens
        .GroupBy(token => token.EmployeeId)
        .ToDictionary(group => group.Key, group => group.First());
}

static async Task<PasswordSetupToken?> LatestOpenTokenAsync(IdentityDbContext db, Guid employeeId) =>
    await db.PasswordSetupTokens
        .AsNoTracking()
        .Where(token => token.EmployeeId == employeeId && token.UsedAtUtc == null)
        .OrderByDescending(token => token.CreatedAtUtc)
        .FirstOrDefaultAsync();

static async Task SavePasswordSetupTokenAsync(IdentityDbContext db, Guid employeeId, string rawToken, DateTime expiresAtUtc)
{
    var openTokens = await db.PasswordSetupTokens
        .Where(token => token.EmployeeId == employeeId && token.UsedAtUtc == null)
        .ToListAsync();

    foreach (var token in openTokens)
    {
        token.UsedAtUtc = DateTime.UtcNow;
    }

    db.PasswordSetupTokens.Add(new PasswordSetupToken
    {
        Id = Guid.NewGuid(),
        EmployeeId = employeeId,
        TokenHash = IdentitySecurity.HashToken(rawToken),
        CreatedAtUtc = DateTime.UtcNow,
        SentAtUtc = DateTime.UtcNow,
        ExpiresAtUtc = expiresAtUtc
    });
}

static async Task ReplaceRolePermissionsAsync(IdentityDbContext db, string roleCode, IEnumerable<string>? permissions)
{
    var existing = await db.RolePermissions.Where(permission => permission.RoleCode == roleCode).ToListAsync();
    db.RolePermissions.RemoveRange(existing);

    foreach (var permissionKey in NormalizeKeys(permissions))
    {
        if (!await db.Permissions.AnyAsync(permission => permission.Key == permissionKey))
        {
            db.Permissions.Add(new Permission { Key = permissionKey, Description = permissionKey.Replace('_', ' '), Module = "Custom" });
        }

        db.RolePermissions.Add(new RolePermission { RoleCode = roleCode, PermissionKey = permissionKey });
    }
}

static async Task SendInvitationEmailAsync(IConfiguration configuration, IdentityDbContext db, string recipient, string fullName, string setupUrl)
{
    await SendPasswordEmailAsync(
        configuration,
        db,
        recipient,
        fullName,
        setupUrl,
        "Set up your HMS account password",
        "Your HMS account has been created. Open the secure link below to set your password:");
}

static async Task SendPasswordEmailAsync(IConfiguration configuration, IdentityDbContext db, string recipient, string fullName, string setupUrl, string subject, string actionText)
{
    var body = $"""
        Hello {fullName},

        {actionText}

        {setupUrl}

        This link is for one-time use and expires automatically.
        """;

    try
    {
        var smtpHost = configuration["Email:Smtp:Host"];
        if (string.IsNullOrWhiteSpace(smtpHost))
        {
            throw new InvalidOperationException("SMTP host is not configured.");
        }

        var username = configuration["Email:Smtp:Username"]?.Trim();
        var password = configuration["Email:Smtp:Password"]?.Replace(" ", "").Trim();
        var fromAddress = configuration["Email:FromAddress"]?.Trim();
        if (string.IsNullOrWhiteSpace(fromAddress))
        {
            fromAddress = username;
        }

        if (string.IsNullOrWhiteSpace(fromAddress))
        {
            throw new InvalidOperationException("Email sender address is not configured.");
        }

        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            throw new InvalidOperationException("SMTP username or app password is not configured.");
        }

        using var message = new MailMessage
        {
            From = new MailAddress(fromAddress, configuration["Email:FromName"] ?? "HMS Platform"),
            Subject = subject,
            Body = body
        };
        message.To.Add(recipient);

        using var smtpClient = new SmtpClient(smtpHost, configuration.GetValue("Email:Smtp:Port", 587))
        {
            EnableSsl = configuration.GetValue("Email:Smtp:EnableSsl", true),
            DeliveryMethod = SmtpDeliveryMethod.Network,
            UseDefaultCredentials = false,
            Credentials = new NetworkCredential(username, password)
        };

        await smtpClient.SendMailAsync(message);
        await SaveEmailOutboxAsync(db, recipient, subject, body, "Sent", null, DateTime.UtcNow);
    }
    catch (Exception ex)
    {
        await SaveEmailOutboxAsync(db, recipient, subject, body, "Failed", ex.Message, null);
        Console.WriteLine($"Password setup email for {recipient}: {setupUrl}");
    }
}

static async Task SaveEmailOutboxAsync(IdentityDbContext db, string recipient, string subject, string body, string status, string? error, DateTime? sentAtUtc)
{
    db.EmailOutbox.Add(new EmailOutboxMessage
    {
        Id = Guid.NewGuid(),
        Recipient = recipient,
        Subject = subject,
        Body = body,
        Status = status,
        Error = error,
        SentAtUtc = sentAtUtc,
        CreatedAtUtc = DateTime.UtcNow
    });

    await db.SaveChangesAsync();
}

static bool ShouldExposeLocalSetupLinks(IConfiguration configuration) =>
    configuration.GetValue("Email:ExposeLocalSetupLinks", true);

static string BuildSetupUrl(IConfiguration configuration, string token)
{
    var frontendBaseUrl = configuration["PasswordSetup:FrontendBaseUrl"] ?? "http://localhost:4200";
    return $"{frontendBaseUrl.TrimEnd('/')}/setup-password?token={Uri.EscapeDataString(token)}";
}

static string? ExtractFirstUrl(string text)
{
    var start = text.IndexOf("http", StringComparison.OrdinalIgnoreCase);
    if (start < 0)
    {
        return null;
    }

    var end = text.IndexOfAny([' ', '\r', '\n', '\t'], start);
    return end < 0 ? text[start..].Trim() : text[start..end].Trim();
}

static async Task UpgradeLegacyPasswordsAsync(IdentityDbContext db)
{
    var legacyUsers = await db.Employees
        .Where(employee => !employee.PasswordHash.StartsWith("pbkdf2$") && employee.PasswordHash != "" && employee.PasswordSetupCompleted)
        .ToListAsync();

    foreach (var user in legacyUsers)
    {
        user.PasswordHash = IdentitySecurity.HashPassword(user.PasswordHash);
    }

    if (legacyUsers.Count > 0)
    {
        await db.SaveChangesAsync();
    }
}

static async Task<string> NextEmployeeNoAsync(IdentityDbContext db)
{
    var numbers = await db.Employees.AsNoTracking().Select(employee => employee.EmployeeNo).ToListAsync();
    var next = numbers
        .Select(value => value.Split('-', StringSplitOptions.RemoveEmptyEntries).LastOrDefault())
        .Select(segment => int.TryParse(segment, out var number) ? number : 0)
        .DefaultIfEmpty(0)
        .Max() + 1;

    return $"EMP-{next:0000}";
}

static string[] NormalizeKeys(IEnumerable<string>? keys) =>
    (keys ?? [])
        .Where(key => !string.IsNullOrWhiteSpace(key))
        .Select(NormalizeKey)
        .Distinct()
        .ToArray();

static string NormalizeKey(string value) => value.Trim().ToUpperInvariant().Replace(' ', '_');

static string Clean(string? value, string fallback) =>
    string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();

static string[] ParseSpecializations(string? value) =>
    (value ?? "")
        .Split('|', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray();

static string SerializeSpecializations(IEnumerable<string>? values) =>
    string.Join('|', (values ?? [])
        .Where(value => !string.IsNullOrWhiteSpace(value))
        .Select(value => value.Trim())
        .Distinct(StringComparer.OrdinalIgnoreCase));

static string? CleanOrNull(string? value) =>
    string.IsNullOrWhiteSpace(value) ? null : value.Trim();
