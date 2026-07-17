namespace HMS.SharedKernel.Constants;

/// <summary>
/// System-wide constants for HMS Platform.
/// Centralizes magic strings to prevent duplication across services.
/// </summary>
public static class HmsRoles
{
    public const string Admin = "ADMIN";
    public const string Doctor = "DOCTOR";
    public const string Receptionist = "RECEPTIONIST";
    public const string Nurse = "NURSE";
    public const string Pharmacist = "PHARMACIST";
    public const string LabTechnician = "LAB_TECHNICIAN";
    public const string Accountant = "ACCOUNTANT";
    public const string Cashier = "CASHIER";
    public const string HRManager = "HR_MANAGER";
}

/// <summary>
/// Permission keys used across the platform for role-based access control.
/// </summary>
public static class HmsPermissions
{
    public const string All = "ALL";
    public const string ManageUsers = "MANAGE_USERS";
    public const string ManageRoles = "MANAGE_ROLES";
    public const string ManageDepartments = "MANAGE_DEPARTMENTS";
    public const string ManageInsurance = "MANAGE_INSURANCE";
    public const string RegisterPatients = "REGISTER_PATIENTS";
    public const string BookAppointments = "BOOK_APPOINTMENTS";
    public const string ViewPatients = "VIEW_PATIENTS";
    public const string ManageClinical = "MANAGE_CLINICAL";
    public const string CaptureVitals = "CAPTURE_VITALS";
    public const string OrderLabs = "ORDER_LABS";
    public const string Prescribe = "PRESCRIBE";
    public const string ViewLabRequests = "VIEW_LAB_REQUESTS";
    public const string DispenseMedicine = "DISPENSE_MEDICINE";
    public const string CreateInvoices = "CREATE_INVOICES";
    public const string RecordPayments = "RECORD_PAYMENTS";
    public const string ViewFinance = "VIEW_FINANCE";
}

/// <summary>
/// Enterprise service area names used in the operations desk.
/// </summary>
public static class EnterpriseAreas
{
    public const string Pharmacy = "Pharmacy";
    public const string Laboratory = "Laboratory";
    public const string Radiology = "Radiology";
    public const string Inpatient = "Inpatient";
    public const string Emergency = "Emergency";
    public const string OperatingTheatre = "Operating Theatre";
    public const string Inventory = "Inventory";
    public const string Procurement = "Procurement";
    public const string AssetManagement = "Asset Management";
    public const string BiomedicalMaintenance = "Biomedical Maintenance";
    public const string InsuranceClaims = "Insurance Claims";
    public const string SecurityAudit = "Security Audit";
    public const string Notifications = "Notifications";
    public const string Documents = "Documents";
    public const string Reporting = "Reporting";
    public const string Integration = "Integration";
}

/// <summary>
/// Configuration section and key names for consistent access.
/// </summary>
public static class ConfigurationKeys
{
    public const string JwtSection = "Security:Jwt";
    public const string JwtSigningKey = "Security:Jwt:SigningKey";
    public const string JwtIssuer = "Security:Jwt:Issuer";
    public const string JwtAudience = "Security:Jwt:Audience";
    public const string JwtTokenLifetimeMinutes = "Security:Jwt:TokenLifetimeMinutes";
    public const string SeedDefaultPassword = "Seed:DefaultPassword";
    public const string EmailFromAddress = "Email:FromAddress";
    public const string EmailFromName = "Email:FromName";
    public const string EmailSmtpHost = "Email:Smtp:Host";
    public const string EmailSmtpPort = "Email:Smtp:Port";
    public const string EmailSmtpUsername = "Email:Smtp:Username";
    public const string EmailSmtpPassword = "Email:Smtp:Password";
    public const string EmailExposeLocalLinks = "Email:ExposeLocalSetupLinks";
    public const string CorsAllowedOrigins = "Cors:AllowedOrigins";
    public const string RabbitMqHostName = "RabbitMq:HostName";
    public const string RabbitMqPort = "RabbitMq:Port";
    public const string RabbitMqUsername = "RabbitMq:Username";
    public const string RabbitMqPassword = "RabbitMq:Password";
}

/// <summary>
/// Database connection string names used across all services.
/// </summary>
public static class ConnectionStringNames
{
    public const string IdentityDb = "IdentityDb";
    public const string PatientManagementDb = "PatientManagementDb";
    public const string ClinicalDb = "ClinicalDb";
    public const string BillingDb = "BillingDb";

    /// <summary>Alternative names for backward compatibility.</summary>
    public static readonly string[] PatientsDbAliases = ["PatientManagementDb", "PatientsDb"];
}
