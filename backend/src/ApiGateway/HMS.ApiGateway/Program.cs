using HMS.SharedKernel;
using System.Diagnostics;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Services.AddOpenApi();
builder.Services.AddHmsCors(builder.Configuration);
builder.Services.AddHttpClient();
builder.Services.AddReverseProxy().LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

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

app.MapGet("/health", () => Results.Ok(new { service = "api-gateway", status = "healthy" }));

app.MapGet("/api/operations/services", async (IHttpClientFactory httpClientFactory, IWebHostEnvironment environment) =>
{
    var services = OperationsServices(environment);
    var client = httpClientFactory.CreateClient();
    var checks = services.Select(async service =>
    {
        var isHealthy = false;
        try
        {
            using var response = await client.GetAsync($"{service.Url}/health");
            isHealthy = response.IsSuccessStatusCode;
        }
        catch
        {
            isHealthy = false;
        }

        return service with
        {
            Status = isHealthy ? "Running" : "Stopped",
            CanStart = environment.IsDevelopment() && !RunningInContainer() && !isHealthy && !string.IsNullOrWhiteSpace(service.ProjectPath)
        };
    });

    return Results.Ok(await Task.WhenAll(checks));
}).RequireHmsRoles("ADMIN");

app.MapPost("/api/operations/services/{id}/start", (string id, IWebHostEnvironment environment) =>
{
    if (!environment.IsDevelopment() || RunningInContainer())
    {
        return Results.BadRequest(new { message = "Starting services from the UI is available only in local Development mode." });
    }

    var service = OperationsServices(environment).FirstOrDefault(item => string.Equals(item.Id, id, StringComparison.OrdinalIgnoreCase));
    if (service is null || string.IsNullOrWhiteSpace(service.ProjectPath))
    {
        return Results.NotFound(new { message = "Service not found or cannot be started from the gateway." });
    }

    var backendRoot = FindBackendRoot();
    if (backendRoot is null)
    {
        return Results.BadRequest(new { message = "Backend root could not be found. Start services manually from the README commands." });
    }

    var projectPath = Path.Combine(backendRoot, service.ProjectPath);
    if (!File.Exists(projectPath))
    {
        return Results.BadRequest(new { message = $"Project file not found: {projectPath}" });
    }

    var startInfo = new ProcessStartInfo
    {
        FileName = "dotnet",
        WorkingDirectory = backendRoot,
        UseShellExecute = false,
        CreateNoWindow = true
    };
    startInfo.ArgumentList.Add("run");
    startInfo.ArgumentList.Add("--project");
    startInfo.ArgumentList.Add(projectPath);
    startInfo.ArgumentList.Add("--urls");
    startInfo.ArgumentList.Add(service.Url);
    startInfo.Environment["ASPNETCORE_ENVIRONMENT"] = "Development";

    Process.Start(startInfo);
    return Results.Accepted($"/api/operations/services/{service.Id}", new { message = $"{service.Name} start requested.", service.Url });
}).RequireHmsRoles("ADMIN");

app.MapReverseProxy();

app.Run();

static IReadOnlyList<ServiceStatus> OperationsServices(IWebHostEnvironment environment)
{
    var inContainer = RunningInContainer();
    var identityUrl = inContainer ? "http://identity-api:8080" : "http://localhost:5101";
    var patientUrl = inContainer ? "http://patients-api:8080" : "http://localhost:5102";
    var clinicalUrl = inContainer ? "http://clinical-api:8080" : "http://localhost:5104";
    var billingUrl = inContainer ? "http://billing-api:8080" : "http://localhost:5105";

    return
    [
        new("identity", "Identity/Admin Service", identityUrl, "Login, employees, roles, permissions", @"src\Services\Identity\HMS.Identity.Api\HMS.Identity.Api.csproj", "Unknown", false),
        new("patient-management", "Patient Management Service", patientUrl, "Patients, patient photos, appointments, beds", @"src\Services\Patients\HMS.Patients.Api\HMS.Patients.Api.csproj", "Unknown", false),
        new("clinical", "Clinical Service", clinicalUrl, "Encounters, vitals, diagnoses, prescriptions, lab requests", @"src\Services\Clinical\HMS.Clinical.Api\HMS.Clinical.Api.csproj", "Unknown", false),
        new("billing", "Billing Service", billingUrl, "Invoices, payments, billing workflow", @"src\Services\Billing\HMS.Billing.Api\HMS.Billing.Api.csproj", "Unknown", false)
    ];
}

static bool RunningInContainer() =>
    string.Equals(Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER"), "true", StringComparison.OrdinalIgnoreCase);

static string? FindBackendRoot()
{
    var current = new DirectoryInfo(Directory.GetCurrentDirectory());
    while (current is not null)
    {
        if (File.Exists(Path.Combine(current.FullName, "HMS.sln")))
        {
            return current.FullName;
        }

        current = current.Parent;
    }

    return null;
}

sealed record ServiceStatus(
    string Id,
    string Name,
    string Url,
    string Description,
    string ProjectPath,
    string Status,
    bool CanStart);
