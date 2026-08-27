using HMS.Clinical.Infrastructure;
using HMS.Contracts;
using HMS.SharedKernel;
using HMS.SharedKernel.Constants;
using Microsoft.EntityFrameworkCore;
using System.Net.Http.Json;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Services.AddOpenApi();
builder.Services.AddHmsCors(builder.Configuration);
builder.Services.AddHttpClient();

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
        .Select(test => new DiagnosticTestDto(test.Id, test.GroupName, test.SubGroup, test.TestName, test.SpecimenType, test.Unit, test.ReferenceRange, test.SortOrder, test.Price, test.Currency, test.IsActive))
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
    test.Price = Math.Max(0, request.Price);
    test.Currency = Clean(request.Currency, "ETB").ToUpperInvariant();
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
    test.Price = Math.Max(0, request.Price);
    test.Currency = Clean(request.Currency, "ETB").ToUpperInvariant();
    test.IsActive = request.IsActive;
    test.UpdatedAtUtc = DateTime.UtcNow;

    await db.SaveChangesAsync();

    return Results.Ok(ApiResponse<DiagnosticTestDto>.Ok(ToDiagnosticTestDto(test), "Diagnostic catalog item updated."));
}).WithValidation<CreateDiagnosticTestRequest>();

app.MapGet("/api/clinical/lab-requests", async (
    ClinicalDbContext db,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    HttpContext httpContext) =>
{
    var records = await db.LabRequests
        .AsNoTracking()
        .OrderByDescending(request => request.OrderedAtUtc)
        .ToListAsync();

    var paymentSnapshot = await GetLabPaymentSnapshotAsync(httpClientFactory, configuration, httpContext);
    var role = httpContext.User.FindFirstValue(ClaimTypes.Role) ?? "";
    var isLabTechnician = role.Equals(HmsRoles.LabTechnician, StringComparison.OrdinalIgnoreCase);

    if (isLabTechnician && !paymentSnapshot.Success)
    {
        var emergencyRequests = records
            .Where(IsEmergencyLabRequest)
            .Select(request => ToLabRequestDto(request) with { Status = "Requested" })
            .ToList();

        if (emergencyRequests.Count == 0)
        {
            return Results.Problem(
                detail: paymentSnapshot.Message,
                statusCode: StatusCodes.Status503ServiceUnavailable,
                title: "Billing verification unavailable");
        }

        return Results.Ok(ApiResponse<IEnumerable<LabRequestDto>>.Ok(emergencyRequests));
    }

    var visibleRecords = isLabTechnician
        ? records.Where(request => paymentSnapshot.PaidLabRequestIds.Contains(request.Id) || IsEmergencyLabRequest(request))
        : records;

    var labRequests = visibleRecords
        .Select(request =>
        {
            var dto = ToLabRequestDto(request);
            var released = paymentSnapshot.PaidLabRequestIds.Contains(request.Id) || IsEmergencyLabRequest(request);
            return released && request.Status.Equals("Awaiting Payment", StringComparison.OrdinalIgnoreCase)
                ? dto with { Status = "Requested" }
                : dto;
        })
        .ToList();

    return Results.Ok(ApiResponse<IEnumerable<LabRequestDto>>.Ok(labRequests));
})
.RequireHmsRoles(HmsRoles.Doctor, HmsRoles.LabTechnician, HmsRoles.Admin);

app.MapPost("/api/clinical/lab-requests", async (
    CreateLabRequestRequest request,
    ClinicalDbContext db,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    HttpContext httpContext) =>
{
    if (string.IsNullOrWhiteSpace(request.TestName))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("At least one diagnostic test is required."));
    }

    var catalogIds = (request.TestCatalogIds ?? Array.Empty<Guid>())
        .Where(id => id != Guid.Empty)
        .Distinct()
        .ToArray();

    if (catalogIds.Length == 0)
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Select one or more priced diagnostic catalog tests."));
    }

    var selectedTests = await db.DiagnosticTests
        .AsNoTracking()
        .Where(test => catalogIds.Contains(test.Id) && test.IsActive)
        .OrderBy(test => test.GroupName)
        .ThenBy(test => test.TestName)
        .ToListAsync();

    if (selectedTests.Count != catalogIds.Length)
    {
        return Results.BadRequest(ApiResponse<object>.Fail("One or more selected diagnostic tests are missing or inactive."));
    }

    if (selectedTests.Any(test => test.Price <= 0))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Every selected diagnostic test must have a price greater than zero before it can be ordered."));
    }

    var currencies = selectedTests
        .Select(test => Clean(test.Currency, "ETB").ToUpperInvariant())
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray();

    if (currencies.Length != 1)
    {
        return Results.BadRequest(ApiResponse<object>.Fail("All tests in one laboratory request must use the same currency."));
    }

    var isEmergencyOrder = IsEmergencyText(request.Priority) || IsEmergencyText(request.Category) || IsEmergencyText(request.ClinicalNote);

    var labRequest = new LabRequest
    {
        Id = Guid.NewGuid(),
        PatientId = request.PatientId,
        DoctorId = request.DoctorId,
        TestName = Clean(request.TestName, ""),
        TestCatalogIds = string.Join(",", catalogIds),
        Category = Clean(request.Category, "Laboratory"),
        Priority = Clean(request.Priority, "Routine"),
        SpecimenType = Clean(request.SpecimenType, ""),
        ClinicalNote = Clean(request.ClinicalNote, ""),
        Status = isEmergencyOrder ? "Requested" : "Awaiting Payment",
        OrderedAtUtc = DateTime.UtcNow,
        UpdatedAtUtc = DateTime.UtcNow
    };

    db.LabRequests.Add(labRequest);
    await db.SaveChangesAsync();

    // Payment collection must first detect whether the patient has insurance so the
    // laboratory charge is routed through the payer (claim) instead of a cash sale.
    var coverage = await GetPatientInsuranceAsync(httpClientFactory, configuration, httpContext, labRequest.PatientId);
    var paymentType = coverage.HasInsurance ? "Insurance" : "Cash";
    var insuranceProvider = coverage.HasInsurance ? coverage.Provider : null;

    var invoiceRequest = new CreateInvoiceRequest(
        labRequest.PatientId,
        $"Laboratory services - {labRequest.TestName} ({currencies[0]})",
        0,
        0,
        0,
        paymentType,
        insuranceProvider,
        selectedTests.Select(test => new InvoiceItemRequest(
            $"LAB-{test.Id.ToString("N")[..8]}",
            test.TestName,
            1,
            test.Price,
            0,
            "LAB_REQUEST",
            labRequest.Id,
            labRequest.OrderedAtUtc)).ToArray());

    var invoiceResult = await CreateLabInvoiceAsync(
        invoiceRequest,
        httpClientFactory,
        configuration,
        httpContext);

    if (!invoiceResult.Success)
    {
        db.LabRequests.Remove(labRequest);
        await db.SaveChangesAsync();
        return Results.Problem(
            detail: invoiceResult.Message,
            statusCode: StatusCodes.Status502BadGateway,
            title: "Laboratory invoice could not be created");
    }

    var releaseMessage = isEmergencyOrder
        ? "Emergency diagnostic order released to the laboratory immediately. Charges remain on the patient account for final billing or insurance claim."
        : coverage.HasInsurance
            ? $"Lab request sent to Billing. It will be released to the laboratory as soon as the patient's copay is collected; the covered portion is settled through {coverage.Provider} by claim."
            : "Lab request sent to Billing. It will be released to the laboratory after full payment.";

    return Results.Created($"/api/clinical/lab-requests/{labRequest.Id}", ApiResponse<LabRequestDto>.Ok(
        ToLabRequestDto(labRequest),
        releaseMessage));
})
.RequireHmsRoles(HmsRoles.Doctor, HmsRoles.Admin);

app.MapPut("/api/clinical/lab-requests/{id:guid}/result", async (
    Guid id,
    UpdateLabResultRequest request,
    ClinicalDbContext db,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    HttpContext httpContext) =>
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

    var paymentSnapshot = await GetLabPaymentSnapshotAsync(httpClientFactory, configuration, httpContext);
    if (!paymentSnapshot.Success && !IsEmergencyLabRequest(labRequest))
    {
        return Results.Problem(
            detail: paymentSnapshot.Message,
            statusCode: StatusCodes.Status503ServiceUnavailable,
            title: "Billing verification unavailable");
    }

    if (!paymentSnapshot.PaidLabRequestIds.Contains(labRequest.Id) && !IsEmergencyLabRequest(labRequest))
    {
        return Results.Conflict(ApiResponse<object>.Fail(
            "Laboratory payment is not fully cleared. Results cannot be entered until the related invoice is paid."));
    }

    var nextStatus = request.Status.Trim();
    var resultRequired = nextStatus is "Result Entered" or "Verified" or "Completed";
    if (resultRequired && string.IsNullOrWhiteSpace(request.ResultSummary) && string.IsNullOrWhiteSpace(request.ResultValue))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Enter the result summary or result value before releasing the result."));
    }

    // Laboratory workflow gate: results may only be released once the specimen has been
    // successfully collected. The technician marks the request "Specimen Collected" first,
    // which records the collection timestamp that authorizes result entry.
    var specimenCollected = labRequest.CollectedAtUtc is not null
        || labRequest.Status.Equals("Specimen Collected", StringComparison.OrdinalIgnoreCase);
    if (resultRequired && !specimenCollected)
    {
        return Results.Conflict(ApiResponse<object>.Fail(
            "The specimen has not been collected yet. Mark the request as 'Specimen Collected' before entering results."));
    }

    if (nextStatus.Equals("Specimen Collected", StringComparison.OrdinalIgnoreCase) && labRequest.CollectedAtUtc is null)
    {
        labRequest.CollectedAtUtc = request.CollectedAtUtc is null ? DateTime.UtcNow : ToUtc(request.CollectedAtUtc.Value);
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
})
.RequireHmsRoles(HmsRoles.LabTechnician, HmsRoles.Admin);

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
    test.Price,
    test.Currency,
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

static async Task<ServiceCallResult> CreateLabInvoiceAsync(
    CreateInvoiceRequest invoiceRequest,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    HttpContext httpContext)
{
    try
    {
        var client = httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"{BillingBaseUrl(configuration)}/api/billing/invoices")
        {
            Content = JsonContent.Create(invoiceRequest)
        };
        ForwardAuthorization(httpContext, request);

        using var response = await client.SendAsync(request);
        if (response.IsSuccessStatusCode)
        {
            return new ServiceCallResult(true, "Invoice created.");
        }

        var error = await response.Content.ReadFromJsonAsync<ApiResponse<object>>();
        return new ServiceCallResult(false, error?.Message ?? "Billing service rejected the laboratory invoice.");
    }
    catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException)
    {
        return new ServiceCallResult(false, $"Billing service is unavailable: {exception.Message}");
    }
}

static async Task<LabPaymentSnapshot> GetLabPaymentSnapshotAsync(
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    HttpContext httpContext)
{
    try
    {
        var client = httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{BillingBaseUrl(configuration)}/api/billing/invoices");
        ForwardAuthorization(httpContext, request);

        using var response = await client.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            return new LabPaymentSnapshot(false, [], "Billing service rejected the payment verification request.");
        }

        var envelope = await response.Content.ReadFromJsonAsync<ApiResponse<InvoiceDto[]>>();
        // A laboratory request is released once the patient's own share is settled.
        // Cash invoices need full payment; insured invoices are released as soon as
        // the patient's copay is collected, even while the insurer's portion awaits
        // claim settlement. The covered amount is authoritative on the invoice.
        var paidLabRequestIds = (envelope?.Data ?? [])
            .Where(invoice =>
                !invoice.Status.Equals("Cancelled", StringComparison.OrdinalIgnoreCase) &&
                !invoice.Status.Equals("Voided", StringComparison.OrdinalIgnoreCase) &&
                invoice.Total - invoice.InsuranceCoveredAmount - invoice.Paid <= 0)
            .SelectMany(invoice => invoice.Items)
            .Where(item =>
                item.ReferenceType?.Equals("LAB_REQUEST", StringComparison.OrdinalIgnoreCase) == true &&
                item.ReferenceId.HasValue)
            .Select(item => item.ReferenceId!.Value)
            .ToHashSet();

        return new LabPaymentSnapshot(true, paidLabRequestIds, "Payment information loaded.");
    }
    catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException)
    {
        return new LabPaymentSnapshot(false, [], $"Billing service is unavailable: {exception.Message}");
    }
}

static async Task<PatientInsuranceSnapshot> GetPatientInsuranceAsync(
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    HttpContext httpContext,
    Guid patientId)
{
    try
    {
        var client = httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{PatientsBaseUrl(configuration)}/api/patients/{patientId}");
        ForwardAuthorization(httpContext, request);

        using var response = await client.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            return new PatientInsuranceSnapshot(false, null, null, "Patient service rejected the insurance lookup.");
        }

        var envelope = await response.Content.ReadFromJsonAsync<ApiResponse<PatientDto>>();
        var patient = envelope?.Data;
        if (patient is null)
        {
            return new PatientInsuranceSnapshot(false, null, null, "Patient record could not be loaded.");
        }

        var hasInsurance = patient.InsuranceCompanyId is not null
            || !string.IsNullOrWhiteSpace(patient.InsuranceProvider)
            || !string.IsNullOrWhiteSpace(patient.InsuranceCompanyName);
        var provider = patient.InsuranceCompanyName ?? patient.InsuranceProvider;

        return new PatientInsuranceSnapshot(
            hasInsurance,
            hasInsurance ? provider : null,
            patient.InsurancePolicyNumber,
            hasInsurance
                ? $"Patient is covered by {provider}."
                : "No insurance coverage is recorded for this patient.");
    }
    catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException)
    {
        return new PatientInsuranceSnapshot(false, null, null, $"Patient service is unavailable: {exception.Message}");
    }
}

static bool IsEmergencyLabRequest(LabRequest request) =>
    IsEmergencyText(request.Priority) ||
    IsEmergencyText(request.Category) ||
    IsEmergencyText(request.ClinicalNote) ||
    IsEmergencyText(request.TestName);

static bool IsEmergencyText(string? value)
{
    if (string.IsNullOrWhiteSpace(value)) return false;
    var text = value.Trim().ToLowerInvariant();
    return text.Contains("emergency") ||
        text.Contains("urgent") ||
        text.Contains("critical") ||
        text.Contains("trauma") ||
        text.Contains("accident") ||
        text.Contains("stat") ||
        text.Contains("triage");
}
static string PatientsBaseUrl(IConfiguration configuration) =>
    Clean(configuration["Services:PatientsBaseUrl"], "http://localhost:5102").TrimEnd('/');

static string BillingBaseUrl(IConfiguration configuration) =>
    Clean(configuration["Services:BillingBaseUrl"], "http://localhost:5105").TrimEnd('/');

static void ForwardAuthorization(HttpContext httpContext, HttpRequestMessage request)
{
    var authorization = httpContext.Request.Headers.Authorization.ToString();
    if (!string.IsNullOrWhiteSpace(authorization))
    {
        request.Headers.TryAddWithoutValidation("Authorization", authorization);
    }
}

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

sealed record ServiceCallResult(bool Success, string Message);

sealed record PatientInsuranceSnapshot(
    bool HasInsurance,
    string? Provider,
    string? PolicyNumber,
    string Message);

sealed record LabPaymentSnapshot(bool Success, HashSet<Guid> PaidLabRequestIds, string Message);

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
