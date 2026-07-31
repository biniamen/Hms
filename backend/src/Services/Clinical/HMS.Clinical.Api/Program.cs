using HMS.Clinical.Infrastructure;
using HMS.Contracts;
using HMS.SharedKernel;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Services.AddOpenApi();
builder.Services.AddHmsCors(builder.Configuration);

var connectionString = builder.Configuration.RequireConnectionString("ClinicalDb");
var resetLegacySchema = builder.Configuration.GetValue("Database:ResetLegacySchemaOnStartup", false);

await ClinicalDatabaseBootstrapper.EnsureDatabaseExistsAsync(connectionString);
await PostgresDatabaseBootstrapper.ResetSchemaIfMigrationIsMissingAsync(
    connectionString,
    resetLegacySchema,
    "20260728083105_InitialCreate",
    "clinical_encounters",
    "vital_signs",
    "diagnoses",
    "prescriptions",
    "lab_requests",
    "diagnostic_tests",
    "enterprise_records");
await PostgresDatabaseBootstrapper.ResetLegacySchemaIfRequestedAsync(
    connectionString,
    resetLegacySchema);
builder.Services.AddDbContext<ClinicalDbContext>(options => options.UseNpgsql(connectionString));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();
app.UseHmsJwtAuthentication("/health", "/openapi");

await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ClinicalDbContext>();
    await db.Database.MigrateAsync();
    await ClinicalSeedData.SeedAsync(db);
}

app.MapGet("/health", () => Results.Ok(ApiResponse<object>.Ok(new { service = "clinical", status = "healthy" })));

app.MapGet("/api/clinical/encounters", async (ClinicalDbContext db) =>
{
    var encounters = await db.Encounters
        .AsNoTracking()
        .OrderByDescending(encounter => encounter.EncounterAtUtc)
        .Select(encounter => new ClinicalEncounterDto(encounter.Id, encounter.PatientId, encounter.DoctorId, encounter.VisitType, encounter.ChiefComplaint, encounter.Assessment, encounter.Plan, encounter.EncounterAtUtc))
        .ToListAsync();

    return Results.Ok(ApiResponse<IEnumerable<ClinicalEncounterDto>>.Ok(encounters));
});

app.MapPost("/api/clinical/encounters", async (CreateClinicalEncounterRequest request, ClinicalDbContext db) =>
{
    var encounter = new ClinicalEncounter
    {
        Id = Guid.NewGuid(),
        PatientId = request.PatientId,
        DoctorId = request.DoctorId,
        VisitType = Clean(request.VisitType, "Outpatient"),
        ChiefComplaint = Clean(request.ChiefComplaint, ""),
        Assessment = Clean(request.Assessment, ""),
        Plan = Clean(request.Plan, ""),
        EncounterAtUtc = DateTime.UtcNow
    };

    db.Encounters.Add(encounter);
    await db.SaveChangesAsync();

    return Results.Created($"/api/clinical/encounters/{encounter.Id}", ApiResponse<ClinicalEncounterDto>.Ok(
        new ClinicalEncounterDto(encounter.Id, encounter.PatientId, encounter.DoctorId, encounter.VisitType, encounter.ChiefComplaint, encounter.Assessment, encounter.Plan, encounter.EncounterAtUtc),
        "Clinical encounter saved."));
});

app.MapGet("/api/clinical/vitals", async (ClinicalDbContext db) =>
{
    var vitals = await db.VitalSigns
        .AsNoTracking()
        .OrderByDescending(vital => vital.RecordedAtUtc)
        .Select(vital => new VitalSignDto(vital.Id, vital.PatientId, vital.TemperatureC, vital.Pulse, vital.RespiratoryRate, vital.BloodPressure, vital.WeightKg, vital.HeightCm, vital.RecordedAtUtc))
        .ToListAsync();

    return Results.Ok(ApiResponse<IEnumerable<VitalSignDto>>.Ok(vitals));
});

app.MapPost("/api/clinical/vitals", async (CreateVitalSignRequest request, ClinicalDbContext db) =>
{
    var vital = new VitalSign
    {
        Id = Guid.NewGuid(),
        PatientId = request.PatientId,
        TemperatureC = request.TemperatureC,
        Pulse = request.Pulse,
        RespiratoryRate = request.RespiratoryRate,
        BloodPressure = Clean(request.BloodPressure, ""),
        WeightKg = request.WeightKg,
        HeightCm = request.HeightCm,
        RecordedAtUtc = DateTime.UtcNow
    };

    db.VitalSigns.Add(vital);
    await db.SaveChangesAsync();

    return Results.Created($"/api/clinical/vitals/{vital.Id}", ApiResponse<VitalSignDto>.Ok(
        new VitalSignDto(vital.Id, vital.PatientId, vital.TemperatureC, vital.Pulse, vital.RespiratoryRate, vital.BloodPressure, vital.WeightKg, vital.HeightCm, vital.RecordedAtUtc),
        "Vitals recorded."));
});

app.MapGet("/api/clinical/diagnoses", async (ClinicalDbContext db) =>
{
    var diagnoses = await db.Diagnoses
        .AsNoTracking()
        .OrderByDescending(diagnosis => diagnosis.DiagnosedAtUtc)
        .Select(diagnosis => new DiagnosisDto(diagnosis.Id, diagnosis.PatientId, diagnosis.DoctorId, diagnosis.Code, diagnosis.Description, diagnosis.Severity, diagnosis.DiagnosedAtUtc))
        .ToListAsync();

    return Results.Ok(ApiResponse<IEnumerable<DiagnosisDto>>.Ok(diagnoses));
});

app.MapPost("/api/clinical/diagnoses", async (CreateDiagnosisRequest request, ClinicalDbContext db) =>
{
    var diagnosis = new Diagnosis
    {
        Id = Guid.NewGuid(),
        PatientId = request.PatientId,
        DoctorId = request.DoctorId,
        Code = Clean(request.Code, ""),
        Description = Clean(request.Description, ""),
        Severity = Clean(request.Severity, "Normal"),
        DiagnosedAtUtc = DateTime.UtcNow
    };

    db.Diagnoses.Add(diagnosis);
    await db.SaveChangesAsync();

    return Results.Created($"/api/clinical/diagnoses/{diagnosis.Id}", ApiResponse<DiagnosisDto>.Ok(
        new DiagnosisDto(diagnosis.Id, diagnosis.PatientId, diagnosis.DoctorId, diagnosis.Code, diagnosis.Description, diagnosis.Severity, diagnosis.DiagnosedAtUtc),
        "Diagnosis added."));
});

app.MapGet("/api/clinical/prescriptions", async (ClinicalDbContext db) =>
{
    var prescriptions = await db.Prescriptions
        .AsNoTracking()
        .OrderByDescending(prescription => prescription.OrderedAtUtc)
        .Select(prescription => new PrescriptionDto(prescription.Id, prescription.PatientId, prescription.DoctorId, prescription.Medication, prescription.Instructions, prescription.OrderedAtUtc))
        .ToListAsync();

    return Results.Ok(ApiResponse<IEnumerable<PrescriptionDto>>.Ok(prescriptions));
});

app.MapPost("/api/clinical/prescriptions", async (CreatePrescriptionRequest request, ClinicalDbContext db) =>
{
    var prescription = new Prescription
    {
        Id = Guid.NewGuid(),
        PatientId = request.PatientId,
        DoctorId = request.DoctorId,
        Medication = Clean(request.Medication, ""),
        Instructions = Clean(request.Instructions, ""),
        OrderedAtUtc = DateTime.UtcNow
    };

    db.Prescriptions.Add(prescription);
    await db.SaveChangesAsync();

    return Results.Created($"/api/clinical/prescriptions/{prescription.Id}", ApiResponse<PrescriptionDto>.Ok(
        new PrescriptionDto(prescription.Id, prescription.PatientId, prescription.DoctorId, prescription.Medication, prescription.Instructions, prescription.OrderedAtUtc),
        "Prescription created."));
}).WithValidation<CreatePrescriptionRequest>();

app.MapGet("/api/clinical/diagnostic-tests", async (ClinicalDbContext db) =>
{
    var tests = await db.DiagnosticTests
        .AsNoTracking()
        .OrderBy(test => test.GroupName)
        .ThenBy(test => test.SubGroup)
        .ThenBy(test => test.SortOrder)
        .ThenBy(test => test.TestName)
        .Select(test => new DiagnosticTestDto(test.Id, test.GroupName, test.SubGroup, test.TestName, test.SpecimenType, test.Unit, test.ReferenceRange, test.SortOrder, test.IsActive))
        .ToListAsync();

    return Results.Ok(ApiResponse<IEnumerable<DiagnosticTestDto>>.Ok(tests));
});

app.MapPost("/api/clinical/diagnostic-tests", async (CreateDiagnosticTestRequest request, ClinicalDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.GroupName) || string.IsNullOrWhiteSpace(request.TestName))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Diagnostic group and test name are required."));
    }

    var groupName = Clean(request.GroupName, "");
    var subGroup = Clean(request.SubGroup, "General");
    var testName = Clean(request.TestName, "");

    var test = await db.DiagnosticTests.FirstOrDefaultAsync(item =>
        item.GroupName == groupName &&
        item.SubGroup == subGroup &&
        item.TestName == testName);

    if (test is null)
    {
        test = new DiagnosticTest
        {
            Id = Guid.NewGuid(),
            GroupName = groupName,
            SubGroup = subGroup,
            TestName = testName,
            CreatedAtUtc = DateTime.UtcNow
        };
        db.DiagnosticTests.Add(test);
    }

    test.SpecimenType = Clean(request.SpecimenType, "");
    test.Unit = Clean(request.Unit, "");
    test.ReferenceRange = Clean(request.ReferenceRange, "");
    test.SortOrder = request.SortOrder;
    test.IsActive = request.IsActive;
    test.UpdatedAtUtc = DateTime.UtcNow;

    await db.SaveChangesAsync();

    return Results.Created($"/api/clinical/diagnostic-tests/{test.Id}", ApiResponse<DiagnosticTestDto>.Ok(
        ToDiagnosticTestDto(test),
        "Diagnostic catalog item saved."));
}).WithValidation<CreateDiagnosticTestRequest>();

app.MapPut("/api/clinical/diagnostic-tests/{id:guid}", async (Guid id, CreateDiagnosticTestRequest request, ClinicalDbContext db) =>
{
    var test = await db.DiagnosticTests.FirstOrDefaultAsync(item => item.Id == id);
    if (test is null)
    {
        return Results.NotFound(ApiResponse<object>.Fail("Diagnostic catalog item not found."));
    }

    if (string.IsNullOrWhiteSpace(request.GroupName) || string.IsNullOrWhiteSpace(request.TestName))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Diagnostic group and test name are required."));
    }

    test.GroupName = Clean(request.GroupName, "");
    test.SubGroup = Clean(request.SubGroup, "General");
    test.TestName = Clean(request.TestName, "");
    test.SpecimenType = Clean(request.SpecimenType, "");
    test.Unit = Clean(request.Unit, "");
    test.ReferenceRange = Clean(request.ReferenceRange, "");
    test.SortOrder = request.SortOrder;
    test.IsActive = request.IsActive;
    test.UpdatedAtUtc = DateTime.UtcNow;

    await db.SaveChangesAsync();

    return Results.Ok(ApiResponse<DiagnosticTestDto>.Ok(ToDiagnosticTestDto(test), "Diagnostic catalog item updated."));
}).WithValidation<CreateDiagnosticTestRequest>();

app.MapGet("/api/clinical/lab-requests", async (ClinicalDbContext db) =>
{
    var records = await db.LabRequests
        .AsNoTracking()
        .OrderByDescending(request => request.OrderedAtUtc)
        .ToListAsync();

    var labRequests = records.Select(ToLabRequestDto).ToList();

    return Results.Ok(ApiResponse<IEnumerable<LabRequestDto>>.Ok(labRequests));
});

app.MapPost("/api/clinical/lab-requests", async (CreateLabRequestRequest request, ClinicalDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.TestName))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("At least one diagnostic test is required."));
    }

    var labRequest = new LabRequest
    {
        Id = Guid.NewGuid(),
        PatientId = request.PatientId,
        DoctorId = request.DoctorId,
        TestName = Clean(request.TestName, ""),
        TestCatalogIds = string.Join(",", (request.TestCatalogIds ?? Array.Empty<Guid>()).Where(id => id != Guid.Empty)),
        Category = Clean(request.Category, "Laboratory"),
        Priority = Clean(request.Priority, "Routine"),
        SpecimenType = Clean(request.SpecimenType, ""),
        ClinicalNote = Clean(request.ClinicalNote, ""),
        Status = "Requested",
        OrderedAtUtc = DateTime.UtcNow,
        UpdatedAtUtc = DateTime.UtcNow
    };

    db.LabRequests.Add(labRequest);
    await db.SaveChangesAsync();

    return Results.Created($"/api/clinical/lab-requests/{labRequest.Id}", ApiResponse<LabRequestDto>.Ok(
        ToLabRequestDto(labRequest),
        "Lab request created."));
});

app.MapPut("/api/clinical/lab-requests/{id:guid}/result", async (Guid id, UpdateLabResultRequest request, ClinicalDbContext db) =>
{
    var allowedStatuses = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "Requested",
        "Specimen Collected",
        "In Progress",
        "Result Entered",
        "Verified",
        "Completed",
        "Cancelled"
    };

    if (string.IsNullOrWhiteSpace(request.Status) || !allowedStatuses.Contains(request.Status.Trim()))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Select a valid laboratory status."));
    }

    var labRequest = await db.LabRequests.FirstOrDefaultAsync(item => item.Id == id);
    if (labRequest is null)
    {
        return Results.NotFound(ApiResponse<object>.Fail("Lab request not found."));
    }

    var nextStatus = request.Status.Trim();
    var resultRequired = nextStatus is "Result Entered" or "Verified" or "Completed";
    if (resultRequired && string.IsNullOrWhiteSpace(request.ResultSummary) && string.IsNullOrWhiteSpace(request.ResultValue))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Enter the result summary or result value before releasing the result."));
    }

    labRequest.Status = nextStatus;
    labRequest.SpecimenType = Clean(request.SpecimenType, labRequest.SpecimenType);
    labRequest.ResultSummary = Clean(request.ResultSummary, labRequest.ResultSummary);
    labRequest.ResultValue = Clean(request.ResultValue, labRequest.ResultValue);
    labRequest.ReferenceRange = Clean(request.ReferenceRange, labRequest.ReferenceRange);
    labRequest.ResultFlag = Clean(request.ResultFlag, labRequest.ResultFlag);
    labRequest.ResultNotes = Clean(request.ResultNotes, labRequest.ResultNotes);
    labRequest.PerformedBy = Clean(request.PerformedBy, labRequest.PerformedBy);
    labRequest.VerifiedBy = Clean(request.VerifiedBy, labRequest.VerifiedBy);
    labRequest.ResultItemsJson = Clean(request.ResultItemsJson, labRequest.ResultItemsJson);
    labRequest.CollectedAtUtc = request.CollectedAtUtc is null ? labRequest.CollectedAtUtc : ToUtc(request.CollectedAtUtc.Value);
    labRequest.ResultedAtUtc = request.ResultedAtUtc is null
        ? (resultRequired ? DateTime.UtcNow : labRequest.ResultedAtUtc)
        : ToUtc(request.ResultedAtUtc.Value);
    labRequest.UpdatedAtUtc = DateTime.UtcNow;

    await db.SaveChangesAsync();

    return Results.Ok(ApiResponse<LabRequestDto>.Ok(ToLabRequestDto(labRequest), "Lab result updated."));
});

app.MapGet("/api/clinical/enterprise-records", async (string? area, ClinicalDbContext db) =>
{
    var query = db.EnterpriseRecords.AsNoTracking();
    if (!string.IsNullOrWhiteSpace(area))
    {
        var areaFilter = area.Trim();
        query = query.Where(record => record.Area == areaFilter);
    }

    var records = (await query.ToListAsync())
        .OrderBy(record => StatusOrder(record.Status))
        .ThenBy(record => record.DueAtUtc ?? DateTime.MaxValue)
        .ThenByDescending(record => record.CreatedAtUtc)
        .Select(ToEnterpriseRecordDto)
        .ToList();

    return Results.Ok(ApiResponse<IEnumerable<EnterpriseRecordDto>>.Ok(records));
});

app.MapPost("/api/clinical/enterprise-records", async (CreateEnterpriseRecordRequest request, ClinicalDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.Area) || string.IsNullOrWhiteSpace(request.Title))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Service area and title are required."));
    }

    var record = new EnterpriseRecord
    {
        Id = Guid.NewGuid(),
        Area = request.Area.Trim(),
        RecordNumber = await NextRecordNumberAsync(db, request.Area),
        PatientId = request.PatientId is Guid patientId && patientId != Guid.Empty ? patientId : null,
        Title = request.Title.Trim(),
        Department = Clean(request.Department, request.Area),
        Owner = Clean(request.Owner, "Unassigned"),
        Priority = Clean(request.Priority, "Normal"),
        Status = Clean(request.Status, "Open"),
        Amount = Math.Max(0, request.Amount),
        DueAtUtc = request.DueAtUtc is null ? DateTime.UtcNow.AddDays(1) : ToUtc(request.DueAtUtc.Value),
        Details = Clean(request.Details, ""),
        CreatedAtUtc = DateTime.UtcNow,
        UpdatedAtUtc = DateTime.UtcNow
    };

    db.EnterpriseRecords.Add(record);
    await db.SaveChangesAsync();

    return Results.Created($"/api/clinical/enterprise-records/{record.Id}", ApiResponse<EnterpriseRecordDto>.Ok(ToEnterpriseRecordDto(record), "Record saved."));
});

app.MapPut("/api/clinical/enterprise-records/{id:guid}", async (Guid id, CreateEnterpriseRecordRequest request, ClinicalDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.Area) || string.IsNullOrWhiteSpace(request.Title))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Service area and title are required."));
    }

    var record = await db.EnterpriseRecords.FirstOrDefaultAsync(item => item.Id == id);
    if (record is null)
    {
        return Results.NotFound(ApiResponse<object>.Fail("Record not found."));
    }

    record.Area = request.Area.Trim();
    record.PatientId = request.PatientId is Guid patientId && patientId != Guid.Empty ? patientId : null;
    record.Title = request.Title.Trim();
    record.Department = Clean(request.Department, request.Area);
    record.Owner = Clean(request.Owner, "Unassigned");
    record.Priority = Clean(request.Priority, "Normal");
    record.Status = Clean(request.Status, record.Status);
    record.Amount = Math.Max(0, request.Amount);
    record.DueAtUtc = request.DueAtUtc is null ? record.DueAtUtc : ToUtc(request.DueAtUtc.Value);
    record.Details = Clean(request.Details, "");
    record.UpdatedAtUtc = DateTime.UtcNow;

    await db.SaveChangesAsync();

    return Results.Ok(ApiResponse<EnterpriseRecordDto>.Ok(ToEnterpriseRecordDto(record), "Record updated."));
});

app.MapPut("/api/clinical/enterprise-records/{id:guid}/status", async (Guid id, EnterpriseStatusRequest request, ClinicalDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.Status))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Status is required."));
    }

    var record = await db.EnterpriseRecords.FirstOrDefaultAsync(item => item.Id == id);
    if (record is null)
    {
        return Results.NotFound(ApiResponse<object>.Fail("Record not found."));
    }

    record.Status = request.Status.Trim();
    record.UpdatedAtUtc = DateTime.UtcNow;
    await db.SaveChangesAsync();

    return Results.Ok(ApiResponse<EnterpriseRecordDto>.Ok(ToEnterpriseRecordDto(record), "Status updated."));
});

app.Run();

static EnterpriseRecordDto ToEnterpriseRecordDto(EnterpriseRecord record) => new(
    record.Id,
    record.Area,
    record.RecordNumber,
    record.PatientId,
    record.Title,
    record.Department,
    record.Owner,
    record.Priority,
    record.Status,
    record.Amount,
    record.DueAtUtc,
    record.Details,
    record.CreatedAtUtc,
    record.UpdatedAtUtc);

static LabRequestDto ToLabRequestDto(LabRequest request) => new(
    request.Id,
    request.PatientId,
    request.DoctorId,
    request.TestName,
    ParseCatalogIds(request.TestCatalogIds),
    request.Status,
    request.OrderedAtUtc,
    request.Category,
    request.Priority,
    request.SpecimenType,
    request.ClinicalNote,
    request.ResultSummary,
    request.ResultValue,
    request.ReferenceRange,
    request.ResultFlag,
    request.ResultNotes,
    request.PerformedBy,
    request.VerifiedBy,
    request.ResultItemsJson,
    request.CollectedAtUtc,
    request.ResultedAtUtc,
    request.UpdatedAtUtc);

static DiagnosticTestDto ToDiagnosticTestDto(DiagnosticTest test) => new(
    test.Id,
    test.GroupName,
    test.SubGroup,
    test.TestName,
    test.SpecimenType,
    test.Unit,
    test.ReferenceRange,
    test.SortOrder,
    test.IsActive);

static IReadOnlyList<Guid> ParseCatalogIds(string value) =>
    value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .Select(item => Guid.TryParse(item, out var id) ? id : Guid.Empty)
        .Where(id => id != Guid.Empty)
        .ToArray();

static async Task<string> NextRecordNumberAsync(ClinicalDbContext db, string area)
{
    var prefix = area.Trim().ToUpperInvariant() switch
    {
        "PHARMACY" => "PHA",
        "LABORATORY" => "LAB",
        "RADIOLOGY" => "RAD",
        "INPATIENT" => "ADM",
        "EMERGENCY" => "EMR",
        "OPERATING THEATRE" => "OT",
        "INVENTORY" => "INVST",
        "PROCUREMENT" => "PR",
        "ASSET MANAGEMENT" => "AST",
        "BIOMEDICAL MAINTENANCE" => "BIO",
        "INSURANCE CLAIMS" => "CLM",
        "SECURITY AUDIT" => "AUD",
        "NOTIFICATIONS" => "NTF",
        "DOCUMENTS" => "DOC",
        "REPORTING" => "RPT",
        "INTEGRATION" => "INT",
        _ => "OPS"
    };

    var numberPrefix = $"{prefix}-{DateTime.UtcNow:yyyy}-";
    var existingNumbers = await db.EnterpriseRecords
        .AsNoTracking()
        .Where(record => record.RecordNumber.StartsWith(numberPrefix))
        .Select(record => record.RecordNumber)
        .ToListAsync();

    var next = existingNumbers
        .Select(LastNumberSegment)
        .DefaultIfEmpty(0)
        .Max() + 1;

    return $"{numberPrefix}{next:0000}";
}

static int LastNumberSegment(string value)
{
    var segment = value.Split('-', StringSplitOptions.RemoveEmptyEntries).LastOrDefault();
    return int.TryParse(segment, out var number) ? number : 0;
}

static int StatusOrder(string status) => status switch
{
    "Open" => 1,
    "In Progress" => 2,
    "Under Review" => 3,
    "Completed" => 4,
    _ => 5
};

static string Clean(string? value, string fallback) =>
    string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();

static DateTime ToUtc(DateTime value) =>
    value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value, DateTimeKind.Local).ToUniversalTime();

sealed record CreateEnterpriseRecordRequest(
    string Area,
    Guid? PatientId,
    string Title,
    string? Department,
    string? Owner,
    string? Priority,
    string? Status,
    decimal Amount,
    DateTime? DueAtUtc,
    string? Details);

sealed record EnterpriseStatusRequest(string Status);

sealed record EnterpriseRecordDto(
    Guid Id,
    string Area,
    string RecordNumber,
    Guid? PatientId,
    string Title,
    string Department,
    string Owner,
    string Priority,
    string Status,
    decimal Amount,
    DateTime? DueAtUtc,
    string Details,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);
