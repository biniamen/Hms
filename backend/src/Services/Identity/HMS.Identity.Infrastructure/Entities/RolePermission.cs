using System.ComponentModel.DataAnnotations;

namespace HMS.Identity.Infrastructure.Entities;

public class RolePermission
{
    [Key]
    public string Role { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string PermissionsJson { get; set; } = "[]";
    public int UserCount { get; set; }
}
