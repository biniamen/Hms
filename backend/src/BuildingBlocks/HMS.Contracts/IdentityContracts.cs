using System.ComponentModel.DataAnnotations;

namespace HMS.Contracts;

public sealed record LoginRequest(
    [Required(ErrorMessage = "Email is required")]
    [EmailAddress(ErrorMessage = "Invalid email format")]
    string EmailAddress,
    [Required(ErrorMessage = "Password is required")]
    string Password);

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
    [Required(ErrorMessage = "First name is required")]
    [StringLength(100, MinimumLength = 1)] string FirstName,
    [Required(ErrorMessage = "Last name is required")]
    [StringLength(100, MinimumLength = 1)] string LastName,
    [Required(ErrorMessage = "Email is required")]
    [EmailAddress(ErrorMessage = "Invalid email format")] string EmailAddress,
    [Phone(ErrorMessage = "Invalid phone number")] string? Phone,
    [Required(ErrorMessage = "Role is required")] string Role,
    string? Department,
    string? Specialization);

public sealed record UpdateEmployeeRequest(
    [Required(ErrorMessage = "First name is required")]
    [StringLength(100, MinimumLength = 1)] string FirstName,
    [Required(ErrorMessage = "Last name is required")]
    [StringLength(100, MinimumLength = 1)] string LastName,
    [Required(ErrorMessage = "Email is required")]
    [EmailAddress(ErrorMessage = "Invalid email format")] string EmailAddress,
    [Phone(ErrorMessage = "Invalid phone number")] string? Phone,
    [Required(ErrorMessage = "Role is required")] string Role,
    string? Department,
    string? Specialization);

public sealed record UpdateEmployeeStatusRequest(
    [Required] bool IsActive);

public sealed record CreateEmployeeWithPasswordRequest(
    [Required(ErrorMessage = "First name is required")]
    [StringLength(100, MinimumLength = 1)] string FirstName,
    [Required(ErrorMessage = "Last name is required")]
    [StringLength(100, MinimumLength = 1)] string LastName,
    [Required(ErrorMessage = "Email is required")]
    [EmailAddress(ErrorMessage = "Invalid email format")] string EmailAddress,
    [Phone(ErrorMessage = "Invalid phone number")] string? Phone,
    [Required(ErrorMessage = "Role is required")] string Role,
    string? Department,
    string? Specialization,
    [Required(ErrorMessage = "Password is required")]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "Password must be at least 8 characters")]
    string Password);

public sealed record EmployeeInviteResponse(EmployeeDto Employee, string SetupUrl);

public sealed record SetupPasswordRequest(
    [Required(ErrorMessage = "Token is required")] string Token,
    [Required(ErrorMessage = "Password is required")]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "Password must be at least 8 characters")]
    string Password);

public sealed record ForgotPasswordRequest(
    [Required(ErrorMessage = "Email is required")]
    [EmailAddress(ErrorMessage = "Invalid email format")]
    string EmailAddress);

public sealed record PasswordResetResponse(bool Accepted, string? SetupUrl);

public sealed record EmailOutboxDto(Guid Id, string Recipient, string Subject, string Status, DateTime CreatedAtUtc, DateTime? SentAtUtc, string? Error, string? SetupUrl);

public sealed record RolePermissionDto(string Role, string Description, string[] Permissions, int UserCount);

public sealed record CreateRoleRequest(
    [Required(ErrorMessage = "Role code is required")]
    [StringLength(50, MinimumLength = 2)] string Role,
    [Required(ErrorMessage = "Description is required")] string Description,
    string[] Permissions);

public sealed record UpdateRolePermissionRequest(
    [Required(ErrorMessage = "Description is required")] string Description,
    string[] Permissions);

public sealed record PermissionDto(string Key, string Description, string Module);

public sealed record CreatePermissionRequest(
    [Required(ErrorMessage = "Permission key is required")]
    [StringLength(100, MinimumLength = 2)] string Key,
    [Required(ErrorMessage = "Description is required")] string Description,
    string Module);

public sealed record DepartmentDto(Guid Id, string Code, string Name, string Type, string Location);

public sealed record CreateDepartmentRequest(
    [Required(ErrorMessage = "Code is required")]
    [StringLength(20, MinimumLength = 1)] string Code,
    [Required(ErrorMessage = "Name is required")] string Name,
    string Type,
    string Location);

public sealed record DoctorProfileDto(Guid Id, string FirstName, string LastName, string EmailAddress, string? Department, string? Specialization, int QueueToday, bool IsActive);
