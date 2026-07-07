using HMS.Contracts;
using HMS.SharedKernel;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();

var employees = new List<EmployeeRecord>
{
    new("Admin", "User", "admin@hms.local", "ADMIN", "ALL", "Admin@123"),
    new("Dawit", "Doctor", "doctor@hms.local", "DOCTOR", "MANAGE_PATIENTS", "Admin@123"),
    new("Hana", "Reception", "receptionist@hms.local", "RECEPTIONIST", "REGISTER_PATIENTS", "Admin@123"),
    new("Marta", "Nurse", "nurse@hms.local", "NURSE", "ASSIST_DOCTORS", "Admin@123"),
    new("Selam", "Pharmacist", "pharmacist@hms.local", "PHARMACIST", "MANAGE_MEDICINES", "Admin@123"),
    new("Abel", "Lab", "lab@hms.local", "LAB_TECHNICIAN", "CONDUCT_TESTS", "Admin@123"),
    new("Mekdes", "Accountant", "accountant@hms.local", "ACCOUNTANT", "MANAGE_FINANCES", "Admin@123")
};

var rolePermissions = new List<RolePermissionDto>
{
    new("ADMIN", "Full platform administration and configuration", ["ALL", "MANAGE_USERS", "MANAGE_ROLES", "VIEW_REPORTS"], 0),
    new("DOCTOR", "Clinical care, diagnoses, prescriptions, and lab orders", ["VIEW_PATIENTS", "MANAGE_CLINICAL", "ORDER_LABS", "PRESCRIBE"], 0),
    new("RECEPTIONIST", "Front desk registration and appointment scheduling", ["REGISTER_PATIENTS", "BOOK_APPOINTMENTS", "VIEW_PATIENTS"], 0),
    new("NURSE", "Vitals capture and doctor assistance", ["VIEW_PATIENTS", "CAPTURE_VITALS", "ASSIST_CLINICAL"], 0),
    new("PHARMACIST", "Medication review and dispensing", ["VIEW_PRESCRIPTIONS", "DISPENSE_MEDICINE"], 0),
    new("LAB_TECHNICIAN", "Lab request processing and results workflow", ["VIEW_LAB_REQUESTS", "UPDATE_LAB_STATUS"], 0),
    new("ACCOUNTANT", "Billing, invoices, and payment posting", ["CREATE_INVOICES", "RECORD_PAYMENTS", "VIEW_FINANCE"], 0)
};

app.MapGet("/health", () => Results.Ok(ApiResponse<object>.Ok(new { service = "identity", status = "healthy" })));

app.MapPost("/api/auth/login", (LoginRequest request) =>
{
    var employee = employees.FirstOrDefault(e =>
        string.Equals(e.EmailAddress, request.EmailAddress, StringComparison.OrdinalIgnoreCase) &&
        e.Password == request.Password);

    if (employee is null)
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Invalid email address or password."));
    }

    var token = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes($"{employee.Id}:{employee.EmailAddress}:{employee.Role}"));
    var response = new LoginResponse(token, employee.Id, employee.EmailAddress, employee.Role, employee.Permission);
    return Results.Ok(ApiResponse<LoginResponse>.Ok(response, "Login successful."));
});

app.MapGet("/api/employees", () =>
    Results.Ok(ApiResponse<IEnumerable<EmployeeDto>>.Ok(employees.Select(e => e.ToDto()))));

app.MapGet("/api/employees/{id:guid}", (Guid id) =>
{
    var employee = employees.FirstOrDefault(e => e.Id == id);
    return employee is null
        ? Results.NotFound(ApiResponse<object>.Fail("Employee not found."))
        : Results.Ok(ApiResponse<EmployeeDto>.Ok(employee.ToDto()));
});

app.MapGet("/api/roles", () =>
{
    var roles = rolePermissions.Select(role =>
        role with { UserCount = employees.Count(employee => employee.Role == role.Role) });

    return Results.Ok(ApiResponse<IEnumerable<RolePermissionDto>>.Ok(roles));
});

app.MapPut("/api/roles/{role}", (string role, UpdateRolePermissionRequest request) =>
{
    var index = rolePermissions.FindIndex(item => string.Equals(item.Role, role, StringComparison.OrdinalIgnoreCase));
    if (index < 0)
    {
        return Results.NotFound(ApiResponse<object>.Fail("Role not found."));
    }

    var existing = rolePermissions[index];
    var permissions = request.Permissions
        .Where(permission => !string.IsNullOrWhiteSpace(permission))
        .Select(permission => permission.Trim().ToUpperInvariant())
        .Distinct()
        .ToArray();

    rolePermissions[index] = existing with
    {
        Description = string.IsNullOrWhiteSpace(request.Description) ? existing.Description : request.Description.Trim(),
        Permissions = permissions.Length == 0 ? existing.Permissions : permissions
    };

    var updated = rolePermissions[index] with
    {
        UserCount = employees.Count(employee => employee.Role == rolePermissions[index].Role)
    };

    return Results.Ok(ApiResponse<RolePermissionDto>.Ok(updated, "Role permissions updated."));
});

app.MapPost("/api/employees", (CreateEmployeeRequest request) =>
{
    if (employees.Any(e => string.Equals(e.EmailAddress, request.EmailAddress, StringComparison.OrdinalIgnoreCase)))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("An employee with this email already exists."));
    }

    var employee = new EmployeeRecord(request.FirstName, request.LastName, request.EmailAddress, request.Role, "PENDING_SETUP", "ChangeMe@123");
    employees.Add(employee);
    return Results.Created($"/api/employees/{employee.Id}", ApiResponse<EmployeeDto>.Ok(employee.ToDto(), "Employee created."));
});

app.Run();

sealed record EmployeeRecord(string FirstName, string LastName, string EmailAddress, string Role, string Permission, string Password)
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public EmployeeDto ToDto() => new(Id, FirstName, LastName, EmailAddress, Role, Permission);
}
