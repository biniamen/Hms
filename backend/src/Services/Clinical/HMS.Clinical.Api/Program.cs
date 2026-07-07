using HMS.Contracts;
using HMS.SharedKernel;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();

var doctorId = Guid.Parse("8f334882-8d97-4d54-a011-97d7c8c2a201");
var saraId = Guid.Parse("f64d3368-a4da-4d44-9612-5c302b0ec29a");
var dawitId = Guid.Parse("d5c6bf11-de68-4c3f-97d2-6d7fd12f8e80");

var encounters = new List<ClinicalEncounterDto>
{
    new(Guid.Parse("7a58c9f1-4412-48dd-9165-7f08de63f863"), saraId, doctorId, "Outpatient", "Fever and sore throat", "Likely bacterial pharyngitis", "Antibiotics, hydration, follow-up in 5 days", DateTime.UtcNow.AddHours(-4))
};

var vitals = new List<VitalSignDto>
{
    new(Guid.Parse("a4d6c3ef-6d9f-4d35-9e92-40f980022f6a"), saraId, 37.8m, 92, 18, "118/76", 62.5m, 164m, DateTime.UtcNow.AddHours(-4))
};

var diagnoses = new List<DiagnosisDto>
{
    new(Guid.Parse("f4231a15-8a45-48cd-824a-28f454ccdfc1"), saraId, doctorId, "J02.9", "Acute pharyngitis", "Moderate", DateTime.UtcNow.AddHours(-3))
};

var prescriptions = new List<PrescriptionDto>
{
    new(Guid.Parse("325cf3a1-2af1-4b69-8a17-6fac5c547915"), saraId, doctorId, "Amoxicillin 500mg", "Take one capsule every 8 hours for 5 days", DateTime.UtcNow.AddHours(-3))
};

var labRequests = new List<LabRequestDto>
{
    new(Guid.Parse("3cb3eb61-03a4-4fec-8517-9d2778f6e40d"), dawitId, doctorId, "Complete Blood Count", "Requested", DateTime.UtcNow.AddHours(-2))
};

app.MapGet("/health", () => Results.Ok(ApiResponse<object>.Ok(new { service = "clinical", status = "healthy" })));

app.MapGet("/api/clinical/encounters", () => Results.Ok(ApiResponse<IEnumerable<ClinicalEncounterDto>>.Ok(encounters)));
app.MapPost("/api/clinical/encounters", (CreateClinicalEncounterRequest request) =>
{
    var encounter = new ClinicalEncounterDto(Guid.NewGuid(), request.PatientId, request.DoctorId, request.VisitType, request.ChiefComplaint, request.Assessment, request.Plan, DateTime.UtcNow);
    encounters.Add(encounter);
    return Results.Created($"/api/clinical/encounters/{encounter.Id}", ApiResponse<ClinicalEncounterDto>.Ok(encounter, "Clinical encounter saved."));
});

app.MapGet("/api/clinical/vitals", () => Results.Ok(ApiResponse<IEnumerable<VitalSignDto>>.Ok(vitals)));
app.MapPost("/api/clinical/vitals", (CreateVitalSignRequest request) =>
{
    var vital = new VitalSignDto(Guid.NewGuid(), request.PatientId, request.TemperatureC, request.Pulse, request.RespiratoryRate, request.BloodPressure, request.WeightKg, request.HeightCm, DateTime.UtcNow);
    vitals.Add(vital);
    return Results.Created($"/api/clinical/vitals/{vital.Id}", ApiResponse<VitalSignDto>.Ok(vital, "Vitals recorded."));
});

app.MapGet("/api/clinical/diagnoses", () => Results.Ok(ApiResponse<IEnumerable<DiagnosisDto>>.Ok(diagnoses)));
app.MapPost("/api/clinical/diagnoses", (CreateDiagnosisRequest request) =>
{
    var diagnosis = new DiagnosisDto(Guid.NewGuid(), request.PatientId, request.DoctorId, request.Code, request.Description, request.Severity, DateTime.UtcNow);
    diagnoses.Add(diagnosis);
    return Results.Created($"/api/clinical/diagnoses/{diagnosis.Id}", ApiResponse<DiagnosisDto>.Ok(diagnosis, "Diagnosis added."));
});

app.MapGet("/api/clinical/prescriptions", () => Results.Ok(ApiResponse<IEnumerable<PrescriptionDto>>.Ok(prescriptions)));
app.MapPost("/api/clinical/prescriptions", (CreatePrescriptionRequest request) =>
{
    var prescription = new PrescriptionDto(Guid.NewGuid(), request.PatientId, request.DoctorId, request.Medication, request.Instructions, DateTime.UtcNow);
    prescriptions.Add(prescription);
    return Results.Created($"/api/clinical/prescriptions/{prescription.Id}", ApiResponse<PrescriptionDto>.Ok(prescription, "Prescription created."));
});

app.MapGet("/api/clinical/lab-requests", () => Results.Ok(ApiResponse<IEnumerable<LabRequestDto>>.Ok(labRequests)));
app.MapPost("/api/clinical/lab-requests", (CreateLabRequestRequest request) =>
{
    var labRequest = new LabRequestDto(Guid.NewGuid(), request.PatientId, request.DoctorId, request.TestName, "Requested", DateTime.UtcNow);
    labRequests.Add(labRequest);
    return Results.Created($"/api/clinical/lab-requests/{labRequest.Id}", ApiResponse<LabRequestDto>.Ok(labRequest, "Lab request created."));
});

app.Run();
