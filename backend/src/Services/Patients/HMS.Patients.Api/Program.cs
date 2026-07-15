using HMS.Contracts;
using HMS.Patients.Infrastructure.Data;
using HMS.Patients.Infrastructure.Entities;
using HMS.SharedKernel;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var patientsAssembly = typeof(Program).Assembly.GetName().Name;
builder.Services.AddDbContext<AppPatientsDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("PatientsDb"),
        b => b.MigrationsAssembly(patientsAssembly)));

builder.Services.AddHttpClient("rabbitmq");

// ── JWT Authentication ──
var jwtSection = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSection["SecretKey"]!;
var issuer = jwtSection["Issuer"]!;
var audience = jwtSection["Audience"]!;

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = issuer,
        ValidAudience = audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// Auto-migrate on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppPatientsDbContext>();
    await db.Database.MigrateAsync();
}

await EnsureRabbitMqAsync(app.Services.GetRequiredService<IHttpClientFactory>(), app.Configuration);

app.MapGet("/health", () => Results.Ok(ApiResponse<object>.Ok(new { service = "patients", status = "healthy" })));

// ── Patients endpoints ──
app.MapGet("/api/patients", async (AppPatientsDbContext db) =>
{
    var patients = await db.Patients
        .OrderByDescending(p => p.CreatedAtUtc)
        .ThenBy(p => p.Mrn)
        .ToListAsync();

    var result = patients.Select(p => new PatientDto(
        p.Id,
        p.Mrn,
        p.FirstName,
        p.LastName,
        p.Phone,
        p.Gender,
        p.DateOfBirth,
        p.Address,
        p.BloodType,
        p.EmergencyContactName,
        p.EmergencyContactPhone,
        p.PhotoData is { Length: > 0 } && !string.IsNullOrWhiteSpace(p.PhotoContentType)
            ? $"data:{p.PhotoContentType};base64,{Convert.ToBase64String(p.PhotoData)}"
            : null));

    return Results.Ok(ApiResponse<IEnumerable<PatientDto>>.Ok(result));
})
.RequireAuthorization(policy => policy.RequireRole("ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"));

app.MapGet("/api/patients/{id:guid}", async (Guid id, AppPatientsDbContext db) =>
{
    var patient = await db.Patients.FindAsync(id);
    if (patient is null)
    {
        return Results.NotFound(ApiResponse<object>.Fail("Patient not found."));
    }

    var photoDataUrl = patient.PhotoData is { Length: > 0 } && !string.IsNullOrWhiteSpace(patient.PhotoContentType)
        ? $"data:{patient.PhotoContentType};base64,{Convert.ToBase64String(patient.PhotoData)}"
        : null;

    var dto = new PatientDto(
        patient.Id, patient.Mrn, patient.FirstName, patient.LastName,
        patient.Phone, patient.Gender, patient.DateOfBirth,
        patient.Address, patient.BloodType,
        patient.EmergencyContactName, patient.EmergencyContactPhone,
        photoDataUrl);

    return Results.Ok(ApiResponse<PatientDto>.Ok(dto));
})
.RequireAuthorization(policy => policy.RequireRole("ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"));

app.MapPost("/api/patients", async (CreatePatientRequest request, AppPatientsDbContext db,
    IHttpClientFactory httpClientFactory, IConfiguration configuration) =>
{
    if (string.IsNullOrWhiteSpace(request.FirstName) ||
        string.IsNullOrWhiteSpace(request.LastName) ||
        string.IsNullOrWhiteSpace(request.Phone) ||
        string.IsNullOrWhiteSpace(request.Gender))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("First name, last name, phone, and gender are required."));
    }

    var (photoContentType, photoData) = ParsePhoto(request.PhotoDataUrl);

    // Generate next MRN
    var maxMrn = await db.Patients
        .OrderByDescending(p => p.Mrn)
        .Select(p => p.Mrn)
        .FirstOrDefaultAsync();

    var nextNumber = 1;
    if (maxMrn != null && int.TryParse(maxMrn.Replace("MRN-", ""), out var lastNumber))
    {
        nextNumber = lastNumber + 1;
    }
    var mrn = $"MRN-{nextNumber:0000}";

    var patient = new Patient
    {
        Mrn = mrn,
        FirstName = request.FirstName.Trim(),
        LastName = request.LastName.Trim(),
        Phone = request.Phone.Trim(),
        Gender = request.Gender.Trim(),
        DateOfBirth = request.DateOfBirth,
        Address = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim(),
        BloodType = string.IsNullOrWhiteSpace(request.BloodType) ? null : request.BloodType.Trim(),
        EmergencyContactName = string.IsNullOrWhiteSpace(request.EmergencyContactName) ? null : request.EmergencyContactName.Trim(),
        EmergencyContactPhone = string.IsNullOrWhiteSpace(request.EmergencyContactPhone) ? null : request.EmergencyContactPhone.Trim(),
        PhotoContentType = photoContentType,
        PhotoData = photoData
    };

    db.Patients.Add(patient);
    await db.SaveChangesAsync();

    var photoDataUrl = photoData is { Length: > 0 } && !string.IsNullOrWhiteSpace(photoContentType)
        ? $"data:{photoContentType};base64,{Convert.ToBase64String(photoData)}"
        : null;

    var dto = new PatientDto(
        patient.Id, patient.Mrn, patient.FirstName, patient.LastName,
        patient.Phone, patient.Gender, patient.DateOfBirth,
        patient.Address, patient.BloodType,
        patient.EmergencyContactName, patient.EmergencyContactPhone,
        photoDataUrl);

    // Publish RabbitMQ event asynchronously (fire-and-forget)
    _ = PublishPatientRegisteredAsync(httpClientFactory, configuration, dto);

    return Results.Created($"/api/patients/{patient.Id}", ApiResponse<PatientDto>.Ok(dto, "Patient registered."));
})
.RequireAuthorization(policy => policy.RequireRole("ADMIN", "RECEPTIONIST", "NURSE"));

app.Run();

static async Task EnsureRabbitMqAsync(IHttpClientFactory httpClientFactory, IConfiguration configuration)
{
    try
    {
        var client = RabbitClient(httpClientFactory, configuration);
        await PutJsonAsync(client, "/api/exchanges/%2f/hms.events", new { type = "topic", durable = true });
        await PutJsonAsync(client, "/api/queues/%2f/hms.patient-registered", new { durable = true });
        await PostJsonAsync(client, "/api/bindings/%2f/e/hms.events/q/hms.patient-registered", new { routing_key = "patient.registered", arguments = new { } });
    }
    catch
    {
        // RabbitMQ is optional for local development
    }
}

static async Task PublishPatientRegisteredAsync(IHttpClientFactory httpClientFactory, IConfiguration configuration, PatientDto patient)
{
    try
    {
        var client = RabbitClient(httpClientFactory, configuration);
        var payload = JsonSerializer.Serialize(new
        {
            eventType = "PatientRegistered",
            occurredAtUtc = DateTime.UtcNow,
            patient.Id,
            patient.Mrn,
            patient.FirstName,
            patient.LastName,
            patient.Phone,
            patient.Gender
        });

        await PostJsonAsync(client, "/api/exchanges/%2f/hms.events/publish", new
        {
            properties = new { content_type = "application/json" },
            routing_key = "patient.registered",
            payload,
            payload_encoding = "string"
        });
    }
    catch
    {
        // Keep patient registration resilient even if RabbitMQ is temporarily unavailable.
    }
}

static HttpClient RabbitClient(IHttpClientFactory httpClientFactory, IConfiguration configuration)
{
    var client = httpClientFactory.CreateClient("rabbitmq");
    client.BaseAddress = new Uri(configuration["RabbitMq:ManagementUrl"] ?? "http://localhost:15672");
    var username = configuration["RabbitMq:Username"] ?? "guest";
    var password = configuration["RabbitMq:Password"] ?? "guest";
    var token = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{username}:{password}"));
    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", token);
    return client;
}

static async Task PutJsonAsync(HttpClient client, string path, object payload)
{
    using var response = await client.PutAsJsonAsync(path, payload);
    response.EnsureSuccessStatusCode();
}

static async Task PostJsonAsync(HttpClient client, string path, object payload)
{
    using var response = await client.PostAsJsonAsync(path, payload);
    response.EnsureSuccessStatusCode();
}

static (string? ContentType, byte[]? Data) ParsePhoto(string? photoDataUrl)
{
    if (string.IsNullOrWhiteSpace(photoDataUrl))
    {
        return (null, null);
    }

    var commaIndex = photoDataUrl.IndexOf(',');
    if (!photoDataUrl.StartsWith("data:", StringComparison.OrdinalIgnoreCase) || commaIndex < 0)
    {
        return ("image/jpeg", Convert.FromBase64String(photoDataUrl));
    }

    var metadata = photoDataUrl[5..commaIndex];
    var contentType = metadata.Split(';', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? "image/jpeg";
    var base64 = photoDataUrl[(commaIndex + 1)..];
    return (contentType, Convert.FromBase64String(base64));
}
