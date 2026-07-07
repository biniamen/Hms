namespace HMS.Contracts;

public sealed record LoginRequest(string EmailAddress, string Password);
public sealed record LoginResponse(string AccessToken, Guid EmployeeId, string EmailAddress, string Role, string Permission);
public sealed record EmployeeDto(Guid Id, string FirstName, string LastName, string EmailAddress, string Role, string Permission);
public sealed record CreateEmployeeRequest(string FirstName, string LastName, string EmailAddress, string Role);
public sealed record RolePermissionDto(string Role, string Description, string[] Permissions, int UserCount);
public sealed record UpdateRolePermissionRequest(string Description, string[] Permissions);
