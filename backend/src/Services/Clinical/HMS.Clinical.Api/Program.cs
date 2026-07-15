using HMS.Clinical.Infrastructure.Data;
using HMS.Clinical.Infrastructure.Entities;
using HMS.Contracts;
using HMS.SharedKernel;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var clinicalAssembly = typeof(Program).Assembly.GetName().Name;
builder.Services.AddDbContext<AppClinicalDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("ClinicalDb"),
        b => b.MigrationsAssembly(clinicalAssembly)));

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
    var db = scope.ServiceProvider.GetRequiredService<AppClinicalDbContext>();
    await db.Database.MigrateAsync();
}

app.MapGet("/health", () => Results.Ok(ApiResponse<object>.Ok(new { service = "clinical", status = "healthy" })));

// ── Encounters (Admin, Doctor) ──
app.MapGet("/api/clinical/encounters", async (AppClinicalDbContext db) =>
{
    var encounters = await db.Encounters
        .OrderByDescending(e => e.CreatedAtUtc)
        .Select(e => new ClinicalEncounterDto(e.Id, e.PatientId, e.DoctorId, e.VisitType, e.ChiefComplaint, e.Assessment, e.Plan, e.CreatedAtUtc))
        .ToListAsync();

    return Results.Ok(ApiResponse<IEnumerable<ClinicalEncounterDto>>.Ok(encounters));
})
.RequireAuthorization(policy => policy.RequireRole("ADMIN", "DOCTOR"));

app.MapPost("/api/clinical/encounters", async (CreateClinicalEncounterRequest request, AppClinicalDbContext db) =>
{
    var encounter = new ClinicalEncounter
    {
        PatientId = request.PatientId,
        DoctorId = request.DoctorId,
        VisitType = request.VisitType,
        ChiefComplaint = request.ChiefComplaint,
        Assessment = request.Assessment,
        Plan = request.Plan
    };

    db.Encounters.Add(encounter);
    await db.SaveChangesAsync();

    var dto = new ClinicalEncounterDto(encounter.Id, encounter.PatientId, encounter.DoctorId, encounter.VisitType, encounter.ChiefComplaint, encounter.Assessment, encounter.Plan, encounter.CreatedAtUtc);
    return Results.Created($"/api/clinical/encounters/{encounter.Id}", ApiResponse<ClinicalEncounterDto>.Ok(dto, "Clinical encounter saved."));
})
.RequireAuthorization(policy => policy.RequireRole("ADMIN", "DOCTOR"));

// ── Vitals (Admin, Doctor, Nurse) ──
app.MapGet("/api/clinical/vitals", async (AppClinicalDbContext db) =>
{
    var vitals = await db.Vitals
        .OrderByDescending(v => v.CreatedAtUtc)
        .Select(v => new VitalSignDto(v.Id, v.PatientId, v.TemperatureC, v.Pulse, v.RespiratoryRate, v.BloodPressure, v.WeightKg, v.HeightCm, v.CreatedAtUtc))
        .ToListAsync();

    return Results.Ok(ApiResponse<IEnumerable<VitalSignDto>>.Ok(vitals));
})
.RequireAuthorization(policy => policy.RequireRole("ADMIN", "DOCTOR", "NURSE"));

app.MapPost("/api/clinical/vitals", async (CreateVitalSignRequest request, AppClinicalDbContext db) =>
{
    var vital = new VitalSign
    {
        PatientId = request.PatientId,
        TemperatureC = request.TemperatureC,
        Pulse = request.Pulse,
        RespiratoryRate = request.RespiratoryRate,
        BloodPressure = request.BloodPressure,
        WeightKg = request.WeightKg,
        HeightCm = request.HeightCm
    };

    db.Vitals.Add(vital);
    await db.SaveChangesAsync();

    var dto = new VitalSignDto(vital.Id, vital.PatientId, vital.TemperatureC, vital.Pulse, vital.RespiratoryRate, vital.BloodPressure, vital.WeightKg, vital.HeightCm, vital.CreatedAtUtc);
    return Results.Created($"/api/clinical/vitals/{vital.Id}", ApiResponse<VitalSignDto>.Ok(dto, "Vitals recorded."));
})
.RequireAuthorization(policy => policy.RequireRole("ADMIN", "DOCTOR", "NURSE"));

// ── Diagnoses (Admin, Doctor) ──
app.MapGet("/api/clinical/diagnoses", async (AppClinicalDbContext db) =>
{
    var diagnoses = await db.Diagnoses
        .OrderByDescending(d => d.CreatedAtUtc)
        .Select(d => new DiagnosisDto(d.Id, d.PatientId, d.DoctorId, d.Code, d.Description, d.Severity, d.CreatedAtUtc))
        .ToListAsync();

    return Results.Ok(ApiResponse<IEnumerable<DiagnosisDto>>.Ok(diagnoses));
})
.RequireAuthorization(policy => policy.RequireRole("ADMIN", "DOCTOR"));

app.MapPost("/api/clinical/diagnoses", async (CreateDiagnosisRequest request, AppClinicalDbContext db) =>
{
    var diagnosis = new Diagnosis
    {
        PatientId = request.PatientId,
        DoctorId = request.DoctorId,
        Code = request.Code,
        Description = request.Description,
        Severity = request.Severity
    };

    db.Diagnoses.Add(diagnosis);
    await db.SaveChangesAsync();

    var dto = new DiagnosisDto(diagnosis.Id, diagnosis.PatientId, diagnosis.DoctorId, diagnosis.Code, diagnosis.Description, diagnosis.Severity, diagnosis.CreatedAtUtc);
    return Results.Created($"/api/clinical/diagnoses/{diagnosis.Id}", ApiResponse<DiagnosisDto>.Ok(dto, "Diagnosis added."));
})
.RequireAuthorization(policy => policy.RequireRole("ADMIN", "DOCTOR"));

// ── Prescriptions (Admin, Doctor, Pharmacist) ──
app.MapGet("/api/clinical/prescriptions", async (AppClinicalDbContext db) =>
{
    var prescriptions = await db.Prescriptions
        .OrderByDescending(p => p.CreatedAtUtc)
        .Select(p => new PrescriptionDto(p.Id, p.PatientId, p.DoctorId, p.Medication, p.Instructions, p.CreatedAtUtc))
        .ToListAsync();

    return Results.Ok(ApiResponse<IEnumerable<PrescriptionDto>>.Ok(prescriptions));
})
.RequireAuthorization(policy => policy.RequireRole("ADMIN", "DOCTOR", "PHARMACIST"));

app.MapPost("/api/clinical/prescriptions", async (CreatePrescriptionRequest request, AppClinicalDbContext db) =>
{
    var prescription = new Prescription
    {
        PatientId = request.PatientId,
        DoctorId = request.DoctorId,
        Medication = request.Medication,
        Instructions = request.Instructions
    };

    db.Prescriptions.Add(prescription);
    await db.SaveChangesAsync();

    var dto = new PrescriptionDto(prescription.Id, prescription.PatientId, prescription.DoctorId, prescription.Medication, prescription.Instructions, prescription.CreatedAtUtc);
    return Results.Created($"/api/clinical/prescriptions/{prescription.Id}", ApiResponse<PrescriptionDto>.Ok(dto, "Prescription created."));
})
.RequireAuthorization(policy => policy.RequireRole("ADMIN", "DOCTOR", "PHARMACIST"));

// ── Lab Requests (Admin, Doctor, Lab Technician) ──
app.MapGet("/api/clinical/lab-requests", async (AppClinicalDbContext db) =>
{
    var labRequests = await db.LabRequests
        .OrderByDescending(l => l.CreatedAtUtc)
        .Select(l => new LabRequestDto(l.Id, l.PatientId, l.DoctorId, l.TestName, l.Status, l.CreatedAtUtc))
        .ToListAsync();

    return Results.Ok(ApiResponse<IEnumerable<LabRequestDto>>.Ok(labRequests));
})
.RequireAuthorization(policy => policy.RequireRole("ADMIN", "DOCTOR", "LAB_TECHNICIAN"));

app.MapPost("/api/clinical/lab-requests", async (CreateLabRequestRequest request, AppClinicalDbContext db) =>
{
    var labRequest = new LabRequest
    {
        PatientId = request.PatientId,
        DoctorId = request.DoctorId,
        TestName = request.TestName,
        Status = "Requested"
    };

    db.LabRequests.Add(labRequest);
    await db.SaveChangesAsync();

    var dto = new LabRequestDto(labRequest.Id, labRequest.PatientId, labRequest.DoctorId, labRequest.TestName, labRequest.Status, labRequest.CreatedAtUtc);
    return Results.Created($"/api/clinical/lab-requests/{labRequest.Id}", ApiResponse<LabRequestDto>.Ok(dto, "Lab request created."));
})
.RequireAuthorization(policy => policy.RequireRole("ADMIN", "DOCTOR", "LAB_TECHNICIAN"));

app.Run();
