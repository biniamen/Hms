namespace HMS.Contracts;

public sealed record LoginRequest(string EmailAddress, string Password);
public sealed record LoginResponse(string AccessToken, Guid EmployeeId, string EmailAddress, string Role, string Permission);
public sealed record EmployeeDto(
    Guid Id,
    string EmployeeNo,
    string FirstName,
    string LastName,
    string EmailAddress,
    string? Phone,
    string Role,
    string Permission,
    string? Department,
    string? Specialization,
    bool IsActive,
    bool PasswordSetupCompleted,
    DateTime? InvitationSentAtUtc,
    DateTime? PasswordSetupExpiresAtUtc);

public sealed record CreateEmployeeRequest(
    string FirstName,
    string LastName,
    string EmailAddress,
    string? Phone,
    string Role,
    string? Department,
    string? Specialization);

public sealed record EmployeeInviteResponse(EmployeeDto Employee, string SetupUrl);
public sealed record SetupPasswordRequest(string Token, string Password);
public sealed record ForgotPasswordRequest(string EmailAddress);
public sealed record PasswordResetResponse(bool Accepted, string? SetupUrl);
public sealed record EmailOutboxDto(Guid Id, string Recipient, string Subject, string Status, DateTime CreatedAtUtc, DateTime? SentAtUtc, string? Error, string? SetupUrl);

public sealed record RolePermissionDto(string Role, string Description, string[] Permissions, int UserCount);
public sealed record CreateRoleRequest(string Role, string Description, string[] Permissions);
public sealed record UpdateRolePermissionRequest(string Description, string[] Permissions);
public sealed record PermissionDto(string Key, string Description, string Module);
public sealed record CreatePermissionRequest(string Key, string Description, string Module);
public sealed record DepartmentDto(Guid Id, string Code, string Name, string Type, string Location);
public sealed record CreateDepartmentRequest(string Code, string Name, string Type, string Location);
public sealed record DoctorProfileDto(Guid Id, string FirstName, string LastName, string EmailAddress, string? Department, string? Specialization, int QueueToday, bool IsActive);
