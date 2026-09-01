using HMS.Contracts;
using HMS.Patients.Infrastructure;
using HMS.SharedKernel;
using HMS.SharedKernel.Constants;
using Microsoft.EntityFrameworkCore;
using RabbitMQ.Client;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Services.AddOpenApi();
builder.Services.AddHmsCors(builder.Configuration);
builder.Services.AddHttpClient();

var connectionString = builder.Configuration.RequireConnectionString("PatientManagementDb", "PatientsDb");

await PatientsDatabaseBootstrapper.EnsureDatabaseExistsAsync(connectionString);
await PostgresDatabaseBootstrapper.ResetLegacySchemaIfRequestedAsync(
    connectionString,
    builder.Configuration.GetValue("Database:ResetLegacySchemaOnStartup", false));
builder.Services.AddDbContext<PatientsDbContext>(options => options.UseNpgsql(connectionString));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();
app.UseHmsJwtAuthentication("/health", "/openapi");

await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<PatientsDbContext>();
    await db.Database.MigrateAsync();
    await PatientsSeedData.SeedAsync(db);
}

await EnsureRabbitMqAsync(app.Configuration);

app.MapGet("/health", () => Results.Ok(ApiResponse<object>.Ok(new { service = "patient-management", status = "healthy" })));

app.MapGet("/api/patients", async (
    PatientsDbContext db,
    HttpContext httpContext,
    bool history = false,
    int page = 1,
    int pageSize = 100) =>
{
    IQueryable<Patient> query = db.Patients
        .AsNoTracking()
        .Include(patient => patient.InsuranceCompany);

    // Doctors only see the patients they have an appointment with ("my patients").
    // Every other role — receptionist, admin, nurse, billing, pharmacy, lab — gets
    // the full registry so the front desk can book appointments for any patient.
    if (!history && TryGetDoctorId(httpContext, out var doctorId))
    {
        query = query.Where(patient => db.Appointments.Any(appointment =>
            appointment.PatientId == patient.Id &&
            appointment.DoctorId == doctorId &&
            appointment.Status != "Cancelled" &&
            appointment.Status != "No Show"));
    }

    var patients = await ToPagedListAsync(query
        .OrderByDescending(patient => patient.CreatedAtUtc)
        .ThenBy(patient => patient.Mrn), httpContext, page, pageSize);

    return Results.Ok(ApiResponse<IEnumerable<PatientDto>>.Ok(patients.Select(ToPatientDto)));
});

app.MapGet("/api/patients/{id:guid}", async (Guid id, PatientsDbContext db, HttpContext httpContext) =>
{
    var patient = await db.Patients
        .AsNoTracking()
        .Include(item => item.InsuranceCompany)
        .FirstOrDefaultAsync(item => item.Id == id);

    if (patient is null)
    {
        return Results.NotFound(ApiResponse<object>.Fail("Patient not found."));
    }

    if (TryGetDoctorId(httpContext, out var doctorId) &&
        !await db.Appointments.AnyAsync(appointment => appointment.PatientId == id && appointment.DoctorId == doctorId))
    {
        return Results.NotFound(ApiResponse<object>.Fail("Patient not found."));
    }

    return Results.Ok(ApiResponse<PatientDto>.Ok(ToPatientDto(patient)));
});

app.MapGet("/api/insurance-companies", async (
    PatientsDbContext db,
    HttpContext httpContext,
    int page = 1,
    int pageSize = 100) =>
{
    var companies = await ToPagedListAsync(db.InsuranceCompanies
        .AsNoTracking()
        .OrderBy(company => company.Name)
        .Select(company => new InsuranceCompanyDto(
            company.Id,
            company.Name,
            company.PayerCode,
            company.ContactPerson ?? "",
            company.Phone,
            company.Email ?? "",
            company.Address ?? "",
            company.CoverageType,
            company.CoveragePercent,
            company.SpouseCoverageAllowed,
            company.IsActive)), httpContext, page, pageSize);

    return Results.Ok(ApiResponse<IEnumerable<InsuranceCompanyDto>>.Ok(companies));
});

app.MapPost("/api/insurance-companies", async (CreateInsuranceCompanyRequest request, PatientsDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.Name) ||
        string.IsNullOrWhiteSpace(request.PayerCode) ||
        string.IsNullOrWhiteSpace(request.Phone))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Company name, payer code, and phone are required."));
    }

    var payerCode = NormalizeCode(request.PayerCode);
    var company = await db.InsuranceCompanies.FirstOrDefaultAsync(item => item.PayerCode == payerCode);
    if (company is null)
    {
        company = new InsuranceCompany { Id = Guid.NewGuid(), PayerCode = payerCode };
        db.InsuranceCompanies.Add(company);
    }

    company.Name = request.Name.Trim();
    company.ContactPerson = CleanOrNull(request.ContactPerson);
    company.Phone = request.Phone.Trim();
    company.Email = CleanOrNull(request.Email);
    company.Address = CleanOrNull(request.Address);
    company.CoverageType = Clean(request.CoverageType, "Corporate");
    company.CoveragePercent = Math.Clamp(request.CoveragePercent, 0, 100);
    company.SpouseCoverageAllowed = request.SpouseCoverageAllowed;
    company.IsActive = true;

    await db.SaveChangesAsync();

    return Results.Created("/api/insurance-companies", ApiResponse<InsuranceCompanyDto>.Ok(
        new InsuranceCompanyDto(company.Id, company.Name, company.PayerCode, company.ContactPerson ?? "", company.Phone, company.Email ?? "", company.Address ?? "", company.CoverageType, company.CoveragePercent, company.SpouseCoverageAllowed, company.IsActive),
        "Insurance company registered."));
});

app.MapPost("/api/patients", async (CreatePatientRequest request, PatientsDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.FirstName) ||
        string.IsNullOrWhiteSpace(request.LastName) ||
        string.IsNullOrWhiteSpace(request.Phone) ||
        string.IsNullOrWhiteSpace(request.Gender))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("First name, last name, phone, and gender are required."));
    }

    var phone = request.Phone.Trim();
    var normalizedPhone = NormalizePhone(phone);
    var existingByPhone = await db.Patients
        .AsNoTracking()
        .FirstOrDefaultAsync(patient => patient.Phone == phone);
    if (existingByPhone is null)
    {
        // Catch formatting variants (spaces, dashes, punctuation) that the exact
        // SQL match above cannot, by normalizing in memory.
        var candidate = (await db.Patients.AsNoTracking()
                .Select(patient => new { patient.Id, patient.Mrn, patient.FirstName, patient.LastName, patient.Phone })
                .ToListAsync())
            .FirstOrDefault(patient => NormalizePhone(patient.Phone) == normalizedPhone);
        if (candidate is not null)
        {
            existingByPhone = await db.Patients.AsNoTracking().FirstAsync(patient => patient.Id == candidate.Id);
        }
    }
    if (existingByPhone is not null)
    {
        return Results.BadRequest(ApiResponse<object>.Fail(
            $"A patient with phone number {phone} is already registered (MRN {existingByPhone.Mrn}, {existingByPhone.FirstName} {existingByPhone.LastName}). Please use the existing record instead of registering a duplicate."));
    }

    var firstName = request.FirstName.Trim();
    var lastName = request.LastName.Trim();
    var existingByNameDob = await db.Patients
        .AsNoTracking()
        .FirstOrDefaultAsync(patient =>
            patient.FirstName.ToLower() == firstName.ToLower() &&
            patient.LastName.ToLower() == lastName.ToLower() &&
            patient.DateOfBirth == request.DateOfBirth);
    if (existingByNameDob is not null)
    {
        return Results.BadRequest(ApiResponse<object>.Fail(
            $"This patient already exists (MRN {existingByNameDob.Mrn}, {existingByNameDob.FirstName} {existingByNameDob.LastName}). Please use the existing record instead of registering again."));
    }

    var (photoContentType, photoData) = ParsePhoto(request.PhotoDataUrl);
    var patient = new Patient
    {
        Id = Guid.NewGuid(),
        Mrn = await NextMrnAsync(db),
        FirstName = request.FirstName.Trim(),
        LastName = request.LastName.Trim(),
        Email = CleanOrNull(request.Email),
        Phone = request.Phone.Trim(),
        Gender = request.Gender.Trim(),
        DateOfBirth = request.DateOfBirth,
        NationalId = CleanOrNull(request.NationalId),
        MaritalStatus = CleanOrNull(request.MaritalStatus),
        Occupation = CleanOrNull(request.Occupation),
        Address = CleanOrNull(request.Address),
        BloodType = CleanOrNull(request.BloodType),
        InsuranceCompanyId = request.InsuranceCompanyId,
        EmployerName = CleanOrNull(request.EmployerName),
        InsurancePlan = CleanOrNull(request.InsurancePlan),
        InsuranceProvider = CleanOrNull(request.InsuranceProvider),
        InsurancePolicyNumber = CleanOrNull(request.InsurancePolicyNumber),
        EmergencyContactName = CleanOrNull(request.EmergencyContactName),
        EmergencyContactPhone = CleanOrNull(request.EmergencyContactPhone),
        PhotoContentType = photoContentType,
        PhotoData = photoData,
        CreatedAtUtc = DateTime.UtcNow
    };

    db.Patients.Add(patient);
    await db.SaveChangesAsync();

    patient = (await db.Patients.AsNoTracking().Include(item => item.InsuranceCompany).FirstAsync(item => item.Id == patient.Id))!;
    var dto = ToPatientDto(patient);
    await PublishPatientRegisteredAsync(app.Configuration, dto);

    return Results.Created($"/api/patients/{patient.Id}", ApiResponse<PatientDto>.Ok(dto, "Patient registered."));
}).WithValidation<CreatePatientRequest>();

app.MapPost("/api/patients/unknown-emergency", async (CreateUnknownEmergencyPatientRequest request, PatientsDbContext db) =>
{
    if (request.DoctorId == Guid.Empty ||
        string.IsNullOrWhiteSpace(request.BroughtBy) ||
        string.IsNullOrWhiteSpace(request.IncidentType) ||
        string.IsNullOrWhiteSpace(request.IncidentLocation) ||
        string.IsNullOrWhiteSpace(request.TriageLevel))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Doctor, brought by, incident type, incident location, and triage level are required."));
    }

    var gender = Clean(request.Gender, "Unknown");
    var estimatedAge = Math.Clamp(request.EstimatedAgeYears ?? 35, 0, 120);
    var mrn = await NextEmergencyMrnAsync(db);
    var (photoContentType, photoData) = ParsePhoto(request.PhotoDataUrl);
    var incidentType = Clean(request.IncidentType, "Emergency");
    var triageLevel = NormalizeEmergencyTriage(request.TriageLevel);
    var department = Clean(request.Department, "Emergency");

    await using var transaction = await db.Database.BeginTransactionAsync();

    var patient = new Patient
    {
        Id = Guid.NewGuid(),
        Mrn = mrn,
        FirstName = "Unknown",
        LastName = gender.Equals("Unknown", StringComparison.OrdinalIgnoreCase) ? "Emergency Patient" : gender,
        Email = null,
        Phone = $"UNKNOWN-{mrn}",
        Gender = gender,
        DateOfBirth = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(-estimatedAge)),
        NationalId = null,
        MaritalStatus = null,
        Occupation = "Unknown emergency patient",
        Address = CleanOrNull(request.IncidentLocation),
        BloodType = null,
        InsuranceCompanyId = null,
        EmployerName = null,
        InsurancePlan = "Identity Pending",
        InsuranceProvider = "Self Pay",
        InsurancePolicyNumber = null,
        EmergencyContactName = CleanOrNull(request.BroughtBy),
        EmergencyContactPhone = "",
        PhotoContentType = photoContentType,
        PhotoData = photoData,
        IdentityStatus = "Identity Pending",
        IsIdentityPending = true,
        TemporaryName = $"Unknown {gender}",
        EstimatedAgeYears = estimatedAge,
        BroughtBy = request.BroughtBy.Trim(),
        IncidentType = incidentType,
        IncidentLocation = request.IncidentLocation.Trim(),
        TriageLevel = triageLevel,
        MedicoLegalCase = request.MedicoLegalCase,
        EmergencyNotes = CleanOrNull(request.EmergencyNotes),
        CreatedAtUtc = DateTime.UtcNow
    };

    var appointment = new Appointment
    {
        Id = Guid.NewGuid(),
        PatientId = patient.Id,
        DoctorId = request.DoctorId,
        StartsAtUtc = DateTime.UtcNow,
        Status = "Waiting",
        Reason = $"{incidentType}; identity pending",
        Department = department,
        AppointmentType = "Emergency",
        Priority = "Emergency",
        Notes = BuildUnknownEmergencyNotes(request, mrn, triageLevel),
        CreatedAtUtc = DateTime.UtcNow
    };

    db.Patients.Add(patient);
    db.Appointments.Add(appointment);
    await db.SaveChangesAsync();
    await transaction.CommitAsync();

    var patientDto = ToPatientDto(patient);
    await PublishPatientRegisteredAsync(app.Configuration, patientDto);
    var appointmentDto = ToAppointmentDtos(await db.Appointments.AsNoTracking().Where(item => item.Id == appointment.Id).ToListAsync()).First();

    return Results.Created($"/api/patients/{patient.Id}", ApiResponse<UnknownEmergencyPatientDto>.Ok(
        new UnknownEmergencyPatientDto(patientDto, appointmentDto),
        "Unknown emergency patient registered and placed in the emergency queue."));
}).WithValidation<CreateUnknownEmergencyPatientRequest>();

app.MapPut("/api/patients/{id:guid}", async (Guid id, UpdatePatientRequest request, PatientsDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.FirstName) ||
        string.IsNullOrWhiteSpace(request.LastName) ||
        string.IsNullOrWhiteSpace(request.Phone) ||
        string.IsNullOrWhiteSpace(request.Gender))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("First name, last name, phone, and gender are required."));
    }

    var patient = await db.Patients
        .Include(item => item.InsuranceCompany)
        .FirstOrDefaultAsync(item => item.Id == id);
    if (patient is null)
    {
        return Results.NotFound(ApiResponse<object>.Fail("Patient not found."));
    }

    if (request.InsuranceCompanyId is Guid companyId &&
        companyId != Guid.Empty &&
        !await db.InsuranceCompanies.AnyAsync(company => company.Id == companyId && company.IsActive))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Selected insurance company does not exist or is inactive."));
    }

    patient.FirstName = request.FirstName.Trim();
    patient.LastName = request.LastName.Trim();
    patient.Email = CleanOrNull(request.Email);
    patient.Phone = request.Phone.Trim();
    patient.Gender = request.Gender.Trim();
    patient.DateOfBirth = request.DateOfBirth;
    patient.NationalId = CleanOrNull(request.NationalId);
    patient.MaritalStatus = CleanOrNull(request.MaritalStatus);
    patient.Occupation = CleanOrNull(request.Occupation);
    patient.Address = CleanOrNull(request.Address);
    patient.BloodType = CleanOrNull(request.BloodType);
    patient.InsuranceCompanyId = request.InsuranceCompanyId is Guid value && value != Guid.Empty ? value : null;
    patient.EmployerName = CleanOrNull(request.EmployerName);
    patient.InsurancePlan = CleanOrNull(request.InsurancePlan);
    patient.InsuranceProvider = CleanOrNull(request.InsuranceProvider);
    patient.InsurancePolicyNumber = CleanOrNull(request.InsurancePolicyNumber);
    patient.EmergencyContactName = CleanOrNull(request.EmergencyContactName);
    patient.EmergencyContactPhone = CleanOrNull(request.EmergencyContactPhone);
    if (patient.IsIdentityPending)
    {
        patient.IsIdentityPending = false;
        patient.IdentityStatus = "Verified";
        patient.IdentityResolvedAtUtc = DateTime.UtcNow;
    }

    if (request.PhotoDataUrl is not null)
    {
        var (photoContentType, photoData) = ParsePhoto(request.PhotoDataUrl);
        patient.PhotoContentType = photoContentType;
        patient.PhotoData = photoData;
    }

    await db.SaveChangesAsync();

    patient = (await db.Patients.AsNoTracking().Include(item => item.InsuranceCompany).FirstAsync(item => item.Id == patient.Id))!;
    return Results.Ok(ApiResponse<PatientDto>.Ok(ToPatientDto(patient), "Patient updated."));
});

app.MapGet("/api/appointments", async (
    PatientsDbContext db,
    HttpContext httpContext,
    int page = 1,
    int pageSize = 100) =>
{
    var query = db.Appointments.AsNoTracking();
    if (TryGetDoctorId(httpContext, out var doctorId))
    {
        query = query.Where(appointment => appointment.DoctorId == doctorId);
    }

    var appointments = await ToPagedListAsync(query
        .OrderBy(appointment =>
            appointment.Priority == "Emergency" || appointment.AppointmentType == "Emergency" ? 0 :
            appointment.Priority == "Urgent" || appointment.Priority == "Critical" || appointment.Priority == "High" ? 1 :
            2)
        .ThenBy(appointment =>
            appointment.Status == "In Service" || appointment.Status == "In Progress" ? 0 :
            appointment.Status == "Waiting" || appointment.Status == "Scheduled" ? 1 :
            appointment.Status == "Completed" ? 2 :
            3)
        .ThenBy(appointment => appointment.StartsAtUtc)
        .ThenBy(appointment => appointment.CreatedAtUtc), httpContext, page, pageSize);

    return Results.Ok(ApiResponse<IEnumerable<AppointmentDto>>.Ok(ToAppointmentDtos(appointments)));
});

app.MapGet("/api/appointments/queue", async (
    PatientsDbContext db,
    HttpContext httpContext,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    int page = 1,
    int pageSize = 100) =>
{
    var today = DateTime.UtcNow.Date;
    var tomorrow = today.AddDays(1);
    var query = db.Appointments
        .AsNoTracking()
        .Where(appointment => appointment.StartsAtUtc >= today && appointment.StartsAtUtc < tomorrow);

    if (TryGetDoctorId(httpContext, out var doctorId))
    {
        query = query.Where(appointment => appointment.DoctorId == doctorId);
    }

    var appointments = await query.ToListAsync();

    // Employee names live in the Identity service database, so resolve them from the
    // Identity API when possible. The summary falls back to the doctor ID when Identity
    // is unreachable so the queue view stays available.
    var doctorNames = appointments.Count == 0
        ? new Dictionary<Guid, string>()
        : await GetDoctorNameMapAsync(httpClientFactory, configuration, httpContext);

    var summaries = appointments
        .GroupBy(appointment => new { appointment.DoctorId, appointment.Department })
        .OrderBy(group => group.Key.Department)
        .Select(group => new QueueSummaryDto(
            group.Key.DoctorId,
            doctorNames.GetValueOrDefault(group.Key.DoctorId, group.Key.DoctorId.ToString()),
            group.Key.Department,
            group.Count(item => item.Status == "Scheduled"),
            group.Count(item => item.Status == "Waiting"),
            group.Count(item => item.Status == "In Service"),
            group.Count(item => item.Status == "Completed")))
        .ToList();

    return Results.Ok(ApiResponse<IEnumerable<QueueSummaryDto>>.Ok(PageList(summaries, httpContext, page, pageSize)));
});

app.MapPost("/api/appointments", async (CreateAppointmentRequest request, PatientsDbContext db) =>
{
    if (request.PatientId == Guid.Empty || request.DoctorId == Guid.Empty || string.IsNullOrWhiteSpace(request.Reason))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Patient, doctor, and reason are required."));
    }

    if (!await db.Patients.AnyAsync(patient => patient.Id == request.PatientId))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Selected patient does not exist."));
    }

    var department = Clean(request.Department, "Outpatient");
    var appointmentType = NormalizeAppointmentType(request.AppointmentType);
    var isEmergency = IsEmergencyText(appointmentType) ||
        IsEmergencyText(request.Priority) ||
        IsEmergencyText(department) ||
        IsEmergencyText(request.Reason);

    var appointment = new Appointment
    {
        Id = Guid.NewGuid(),
        PatientId = request.PatientId,
        DoctorId = request.DoctorId,
        StartsAtUtc = isEmergency ? DateTime.UtcNow : ToUtc(request.StartsAtUtc),
        Status = "Waiting",
        Reason = request.Reason.Trim(),
        Department = department,
        AppointmentType = isEmergency ? "Emergency" : appointmentType,
        Priority = isEmergency ? "Emergency" : NormalizePriority(request.Priority),
        Notes = CleanOrNull(request.Notes),
        CreatedAtUtc = DateTime.UtcNow
    };

    db.Appointments.Add(appointment);
    await db.SaveChangesAsync();

    var dto = ToAppointmentDtos(await db.Appointments.AsNoTracking().ToListAsync()).First(item => item.Id == appointment.Id);
    return Results.Created($"/api/appointments/{appointment.Id}", ApiResponse<AppointmentDto>.Ok(dto, "Appointment created."));
});

app.MapPut("/api/appointments/{id:guid}/status", async (Guid id, AppointmentStatusUpdateRequest request, PatientsDbContext db, HttpContext httpContext) =>
{
    var allowed = new[] { "Scheduled", "Waiting", "In Service", "Completed", "Cancelled", "No Show" };
    if (!allowed.Contains(request.Status, StringComparer.OrdinalIgnoreCase))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Invalid queue status."));
    }

    var appointment = await db.Appointments.FirstOrDefaultAsync(item => item.Id == id);
    if (appointment is null)
    {
        return Results.NotFound(ApiResponse<object>.Fail("Appointment not found."));
    }

    if (TryGetDoctorId(httpContext, out var doctorId) && appointment.DoctorId != doctorId)
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    appointment.Status = allowed.First(item => item.Equals(request.Status, StringComparison.OrdinalIgnoreCase));
    await db.SaveChangesAsync();

    var dto = ToAppointmentDtos(await db.Appointments.AsNoTracking().ToListAsync()).First(item => item.Id == appointment.Id);
    return Results.Ok(ApiResponse<AppointmentDto>.Ok(dto, "Queue status updated."));
});

app.MapGet("/api/beds", async (
    PatientsDbContext db,
    HttpContext httpContext,
    int page = 1,
    int pageSize = 100) =>
{
    var beds = await ToPagedListAsync(db.Beds
        .AsNoTracking()
        .OrderBy(bed => bed.Ward)
        .ThenBy(bed => bed.Room)
        .ThenBy(bed => bed.BedNumber), httpContext, page, pageSize);

    return Results.Ok(ApiResponse<IEnumerable<BedDto>>.Ok(beds.Select(ToBedDto)));
});

app.MapGet("/api/bed-admissions", async (
    PatientsDbContext db,
    HttpContext httpContext,
    bool activeOnly = false,
    int page = 1,
    int pageSize = 100) =>
{
    var query = db.BedAdmissions.AsNoTracking();
    if (activeOnly)
    {
        query = query.Where(admission => admission.Status == "Admitted");
    }

    var admissions = await ToPagedListAsync(query
        .OrderByDescending(admission => admission.AdmittedAtUtc)
        .ThenBy(admission => admission.PatientMrn), httpContext, page, pageSize);

    return Results.Ok(ApiResponse<IEnumerable<BedAdmissionDto>>.Ok(admissions.Select(ToBedAdmissionDto)));
});
app.MapPost("/api/beds", async (CreateBedRequest request, PatientsDbContext db) =>
{
    var ward = Clean(request.Ward, "");
    var room = Clean(request.Room, "");
    var bedNumber = Clean(request.BedNumber, "");
    var category = NormalizeBedCategory(request.Category);
    var currency = Clean(request.Currency, "ETB").ToUpperInvariant();

    if (string.IsNullOrWhiteSpace(ward) || string.IsNullOrWhiteSpace(room) || string.IsNullOrWhiteSpace(bedNumber))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Ward, room, and bed number are required."));
    }

    if (request.DailyRate <= 0)
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Daily bed rate must be greater than zero."));
    }

    if (currency.Length != 3)
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Currency must be a three-letter code such as ETB."));
    }

    if (await db.Beds.AnyAsync(item => item.BedNumber == bedNumber))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("A bed with this bed number already exists."));
    }

    var bed = new Bed
    {
        Id = Guid.NewGuid(),
        Ward = ward,
        Room = room,
        BedNumber = bedNumber,
        Category = category,
        DailyRate = request.DailyRate,
        Currency = currency,
        IsAvailable = request.IsAvailable,
        CreatedAtUtc = DateTime.UtcNow
    };

    db.Beds.Add(bed);
    await db.SaveChangesAsync();

    return Results.Created($"/api/beds/{bed.Id}", ApiResponse<BedDto>.Ok(ToBedDto(bed), "Bed registered."));
});

app.MapPut("/api/beds/{id:guid}/status", async (Guid id, BedStatusUpdateRequest request, PatientsDbContext db) =>
{
    var bed = await db.Beds.FirstOrDefaultAsync(item => item.Id == id);
    if (bed is null)
    {
        return Results.NotFound(ApiResponse<object>.Fail("Bed not found."));
    }

    bed.IsAvailable = request.IsAvailable;
    if (request.IsAvailable)
    {
        bed.CurrentAdmissionId = null;
        bed.CurrentPatientId = null;
        bed.CurrentPatientName = null;
        bed.CurrentPatientMrn = null;
        bed.AdmittedAtUtc = null;
    }

    await db.SaveChangesAsync();

    return Results.Ok(ApiResponse<BedDto>.Ok(ToBedDto(bed), request.IsAvailable ? "Bed released." : "Bed assigned."));
});

app.MapPost("/api/beds/{id:guid}/assign", async (Guid id, AssignBedRequest request, PatientsDbContext db) =>
{
    if (request.PatientId == Guid.Empty)
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Patient is required for admission."));
    }

    var bed = await db.Beds.FirstOrDefaultAsync(item => item.Id == id);
    if (bed is null)
    {
        return Results.NotFound(ApiResponse<object>.Fail("Bed not found."));
    }

    if (!bed.IsAvailable || bed.CurrentPatientId is not null)
    {
        return Results.BadRequest(ApiResponse<object>.Fail("This bed is already occupied."));
    }

    var patient = await db.Patients.AsNoTracking().FirstOrDefaultAsync(item => item.Id == request.PatientId);
    if (patient is null)
    {
        return Results.NotFound(ApiResponse<object>.Fail("Patient not found."));
    }

    var hasActiveAdmission = await db.BedAdmissions.AnyAsync(admission =>
        admission.PatientId == patient.Id && admission.Status == "Admitted");
    if (hasActiveAdmission)
    {
        return Results.BadRequest(ApiResponse<object>.Fail("This patient already has an active bed admission."));
    }

    var admittedAtUtc = DateTime.UtcNow;
    var admission = new BedAdmission
    {
        Id = Guid.NewGuid(),
        PatientId = patient.Id,
        PatientName = $"{patient.FirstName} {patient.LastName}",
        PatientMrn = patient.Mrn,
        BedId = bed.Id,
        Ward = bed.Ward,
        Room = bed.Room,
        BedNumber = bed.BedNumber,
        BedCategory = bed.Category,
        DailyRate = bed.DailyRate,
        Currency = bed.Currency,
        AdmittedAtUtc = admittedAtUtc,
        Status = "Admitted",
        Notes = Clean(request.Notes, ""),
        CreatedAtUtc = DateTime.UtcNow
    };

    bed.IsAvailable = false;
    bed.CurrentAdmissionId = admission.Id;
    bed.CurrentPatientId = patient.Id;
    bed.CurrentPatientName = admission.PatientName;
    bed.CurrentPatientMrn = admission.PatientMrn;
    bed.AdmittedAtUtc = admittedAtUtc;

    db.BedAdmissions.Add(admission);
    await db.SaveChangesAsync();

    return Results.Ok(ApiResponse<BedAdmissionDto>.Ok(ToBedAdmissionDto(admission), "Patient admitted to bed."));
});

app.MapPost("/api/beds/{id:guid}/discharge", async (Guid id, DischargeBedRequest request, PatientsDbContext db) =>
{
    var bed = await db.Beds.FirstOrDefaultAsync(item => item.Id == id);
    if (bed is null)
    {
        return Results.NotFound(ApiResponse<object>.Fail("Bed not found."));
    }

    var admission = bed.CurrentAdmissionId is not null
        ? await db.BedAdmissions.FirstOrDefaultAsync(item => item.Id == bed.CurrentAdmissionId)
        : await db.BedAdmissions
            .Where(item => item.BedId == bed.Id && item.Status == "Admitted")
            .OrderByDescending(item => item.AdmittedAtUtc)
            .FirstOrDefaultAsync();

    if (admission is null)
    {
        return Results.BadRequest(ApiResponse<object>.Fail("This bed has no active admission to discharge."));
    }

    var dischargedAtUtc = request.DischargedAtUtc is null ? DateTime.UtcNow : ToUtc(request.DischargedAtUtc.Value);
    if (dischargedAtUtc < admission.AdmittedAtUtc)
    {
        return Results.BadRequest(ApiResponse<object>.Fail("Discharge date cannot be earlier than admission date."));
    }

    var stayHours = Math.Max(1, (dischargedAtUtc - admission.AdmittedAtUtc).TotalHours);
    var chargeableDays = Math.Max(1, (int)Math.Ceiling(stayHours / 24d));
    admission.DischargedAtUtc = dischargedAtUtc;
    admission.ChargeableDays = chargeableDays;
    admission.BedCharge = chargeableDays * admission.DailyRate;
    admission.Status = "Discharged";
    admission.Notes = Clean(request.Notes, admission.Notes ?? "");

    bed.IsAvailable = true;
    bed.CurrentAdmissionId = null;
    bed.CurrentPatientId = null;
    bed.CurrentPatientName = null;
    bed.CurrentPatientMrn = null;
    bed.AdmittedAtUtc = null;

    await db.SaveChangesAsync();

    return Results.Ok(ApiResponse<BedDischargeDto>.Ok(
        new BedDischargeDto(ToBedDto(bed), ToBedAdmissionDto(admission)),
        "Patient discharged and bed charge calculated."));
});

app.Run();

static async Task<List<T>> ToPagedListAsync<T>(
    IQueryable<T> query,
    HttpContext httpContext,
    int page,
    int pageSize)
{
    var (normalizedPage, normalizedPageSize) = NormalizePaging(page, pageSize);
    var totalCount = await query.CountAsync();
    WritePaginationHeaders(httpContext, totalCount, normalizedPage, normalizedPageSize);
    return await query
        .Skip((normalizedPage - 1) * normalizedPageSize)
        .Take(normalizedPageSize)
        .ToListAsync();
}

static List<T> PageList<T>(
    IReadOnlyList<T> items,
    HttpContext httpContext,
    int page,
    int pageSize)
{
    var (normalizedPage, normalizedPageSize) = NormalizePaging(page, pageSize);
    WritePaginationHeaders(httpContext, items.Count, normalizedPage, normalizedPageSize);
    return items
        .Skip((normalizedPage - 1) * normalizedPageSize)
        .Take(normalizedPageSize)
        .ToList();
}

static (int Page, int PageSize) NormalizePaging(int page, int pageSize)
{
    var normalizedPage = Math.Max(1, page);
    var normalizedPageSize = Math.Clamp(pageSize, 1, 500);
    return (normalizedPage, normalizedPageSize);
}

static void WritePaginationHeaders(
    HttpContext httpContext,
    int totalCount,
    int page,
    int pageSize)
{
    httpContext.Response.Headers["X-Total-Count"] = totalCount.ToString();
    httpContext.Response.Headers["X-Page"] = page.ToString();
    httpContext.Response.Headers["X-Page-Size"] = pageSize.ToString();
    httpContext.Response.Headers["X-Total-Pages"] = Math.Max(1, (int)Math.Ceiling(totalCount / (double)pageSize)).ToString();
}

static bool TryGetDoctorId(HttpContext httpContext, out Guid doctorId)
{
    doctorId = Guid.Empty;
    var role = httpContext.User.FindFirstValue(ClaimTypes.Role) ?? "";
    if (!role.Equals(HmsRoles.Doctor, StringComparison.OrdinalIgnoreCase))
    {
        return false;
    }

    var subject = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
    return Guid.TryParse(subject, out doctorId);
}

static PatientDto ToPatientDto(Patient patient)
{
    var photoDataUrl = patient.PhotoData is { Length: > 0 } && !string.IsNullOrWhiteSpace(patient.PhotoContentType)
        ? $"data:{patient.PhotoContentType};base64,{Convert.ToBase64String(patient.PhotoData)}"
        : null;

    return new PatientDto(
        patient.Id,
        patient.Mrn,
        patient.FirstName,
        patient.LastName,
        patient.Email,
        patient.Phone,
        patient.Gender,
        patient.DateOfBirth,
        patient.NationalId,
        patient.MaritalStatus,
        patient.Occupation,
        patient.Address,
        patient.BloodType,
        patient.InsuranceCompanyId,
        patient.InsuranceCompany?.Name,
        patient.EmployerName,
        patient.InsurancePlan,
        patient.InsuranceProvider,
        patient.InsurancePolicyNumber,
        patient.EmergencyContactName,
        patient.EmergencyContactPhone,
        photoDataUrl,
        patient.InsuranceCompany?.CoveragePercent,
        patient.IdentityStatus,
        patient.IsIdentityPending,
        patient.TemporaryName,
        patient.EstimatedAgeYears,
        patient.BroughtBy,
        patient.IncidentType,
        patient.IncidentLocation,
        patient.TriageLevel,
        patient.MedicoLegalCase,
        patient.EmergencyNotes);
}

static BedDto ToBedDto(Bed bed) => new(
    bed.Id,
    bed.Ward,
    bed.Room,
    bed.BedNumber,
    bed.IsAvailable,
    bed.Category,
    bed.DailyRate,
    bed.Currency,
    bed.CurrentAdmissionId,
    bed.CurrentPatientId,
    bed.CurrentPatientName,
    bed.CurrentPatientMrn,
    bed.AdmittedAtUtc);

static BedAdmissionDto ToBedAdmissionDto(BedAdmission admission) => new(
    admission.Id,
    admission.PatientId,
    admission.PatientName,
    admission.PatientMrn,
    admission.BedId,
    admission.Ward,
    admission.Room,
    admission.BedNumber,
    admission.BedCategory,
    admission.DailyRate,
    admission.Currency,
    admission.AdmittedAtUtc,
    admission.DischargedAtUtc,
    admission.ChargeableDays,
    admission.BedCharge,
    admission.Status,
    admission.Notes);

static List<AppointmentDto> ToAppointmentDtos(IEnumerable<Appointment> appointments)
{
    var orderedAppointments = appointments
        .OrderBy(AppointmentPriorityRank)
        .ThenBy(AppointmentStatusRank)
        .ThenBy(appointment => appointment.StartsAtUtc)
        .ThenBy(appointment => appointment.CreatedAtUtc)
        .ToList();

    var queueValues = new Dictionary<Guid, (int QueueNumber, int WaitingAhead)>();
    foreach (var group in orderedAppointments.GroupBy(appointment => new { appointment.DoctorId, Day = appointment.StartsAtUtc.Date }))
    {
        var groupAppointments = group.ToList();
        for (var index = 0; index < groupAppointments.Count; index++)
        {
            var current = groupAppointments[index];
            var waitingAhead = groupAppointments
                .Take(index)
                .Count(IsQueueBlocking);
            queueValues[current.Id] = (index + 1, waitingAhead);
        }
    }

    return orderedAppointments
        .Select(appointment =>
        {
            var queue = queueValues.GetValueOrDefault(appointment.Id);
            return new AppointmentDto(
                appointment.Id,
                appointment.PatientId,
                appointment.DoctorId,
                appointment.StartsAtUtc,
                appointment.Status,
                appointment.Reason,
                appointment.Department,
                appointment.AppointmentType,
                appointment.Priority,
                appointment.Notes,
                queue.QueueNumber,
                queue.WaitingAhead,
                appointment.Status);
        })
        .ToList();
}

static int AppointmentPriorityRank(Appointment appointment)
{
    if (IsEmergencyText(appointment.Priority) ||
        IsEmergencyText(appointment.AppointmentType) ||
        IsEmergencyText(appointment.Department) ||
        IsEmergencyText(appointment.Reason))
    {
        return 0;
    }

    var priority = (appointment.Priority ?? "").Trim().ToLowerInvariant();
    if (priority is "urgent" or "critical" or "high") return 1;
    return 2;
}

static int AppointmentStatusRank(Appointment appointment)
{
    var status = (appointment.Status ?? "").Trim().ToLowerInvariant();
    if (status is "in service" or "in progress") return 0;
    if (status is "waiting" or "scheduled") return 1;
    if (status is "completed") return 2;
    return 3;
}

static bool IsQueueBlocking(Appointment appointment)
{
    var status = (appointment.Status ?? "").Trim().ToLowerInvariant();
    return status is "scheduled" or "waiting" or "in service" or "in progress";
}

static bool IsEmergencyText(string? value)
{
    if (string.IsNullOrWhiteSpace(value)) return false;
    var text = value.Trim().ToLowerInvariant();
    return text.Contains("emergency") ||
        text.Contains("urgent") ||
        text.Contains("critical") ||
        text.Contains("trauma") ||
        text.Contains("accident") ||
        text.Contains("triage");
}

static string NormalizeAppointmentType(string? value)
{
    var clean = Clean(value, "Consultation").Trim();
    return clean.ToUpperInvariant() switch
    {
        "CONSULTATION" => "Consultation",
        "FOLLOW_UP" => "Follow-up",
        "FOLLOWUP" => "Follow-up",
        "EMERGENCY" => "Emergency",
        "LAB_TEST" => "Lab Test",
        "LABTEST" => "Lab Test",
        "SURGERY" => "Surgery",
        _ => clean
    };
}

static string NormalizeEmergencyTriage(string? value)
{
    var clean = Clean(value, "Emergency").Trim();
    return clean.ToUpperInvariant() switch
    {
        "RED" => "Critical",
        "CRITICAL" => "Critical",
        "RESUSCITATION" => "Critical",
        "ORANGE" => "Emergency",
        "EMERGENCY" => "Emergency",
        "YELLOW" => "Urgent",
        "URGENT" => "Urgent",
        _ => clean
    };
}

static string NormalizeBedCategory(string? value)
{
    var clean = Clean(value, "Normal").Trim();
    return clean.ToUpperInvariant() switch
    {
        "VIP" => "VIP",
        "VVIP" => "VVIP",
        "NORMAL" => "Normal",
        _ => clean
    };
}
static string NormalizePriority(string? value)
{
    var clean = Clean(value, "Normal").Trim();
    return clean.ToUpperInvariant() switch
    {
        "EMERGENCY" => "Emergency",
        "URGENT" => "Urgent",
        "CRITICAL" => "Critical",
        "HIGH" => "High",
        "LOW" => "Low",
        _ => "Normal"
    };
}

static async Task<string> NextMrnAsync(PatientsDbContext db)
{
    var existingMrns = await db.Patients.AsNoTracking().Select(patient => patient.Mrn).ToListAsync();
    var next = existingMrns
        .Select(value => value.Split('-', StringSplitOptions.RemoveEmptyEntries).LastOrDefault())
        .Select(segment => int.TryParse(segment, out var number) ? number : 0)
        .DefaultIfEmpty(0)
        .Max() + 1;

    return $"MRN-{next:0000}";
}

static async Task<string> NextEmergencyMrnAsync(PatientsDbContext db)
{
    var prefix = $"EMR-{DateTime.UtcNow:yyyy}-";
    var existingMrns = await db.Patients
        .AsNoTracking()
        .Where(patient => patient.Mrn.StartsWith(prefix))
        .Select(patient => patient.Mrn)
        .ToListAsync();

    var next = existingMrns
        .Select(value => value[prefix.Length..])
        .Select(segment => int.TryParse(segment, out var number) ? number : 0)
        .DefaultIfEmpty(0)
        .Max() + 1;

    return $"{prefix}{next:0000}";
}

static string BuildUnknownEmergencyNotes(CreateUnknownEmergencyPatientRequest request, string mrn, string triageLevel)
{
    var lines = new List<string>
    {
        $"Temporary MRN: {mrn}",
        $"Identity status: pending",
        $"Triage level: {triageLevel}",
        $"Brought by: {request.BroughtBy.Trim()}",
        $"Incident location: {request.IncidentLocation.Trim()}",
        $"Medico-legal case: {(request.MedicoLegalCase ? "Yes" : "No")}"
    };

    if (!string.IsNullOrWhiteSpace(request.EmergencyNotes))
    {
        lines.Add($"Initial notes: {request.EmergencyNotes.Trim()}");
    }

    return string.Join(Environment.NewLine, lines);
}

static async Task EnsureRabbitMqAsync(IConfiguration configuration)
{
    try
    {
        var settings = RabbitMqSettings.FromConfiguration(configuration);
        if (settings is null)
        {
            return;
        }

        await using var connection = await CreateRabbitConnectionAsync(settings);
        await using var channel = await connection.CreateChannelAsync();
        await channel.ExchangeDeclareAsync(settings.Exchange, ExchangeType.Topic, durable: true);
        await channel.QueueDeclareAsync(settings.Queue, durable: true, exclusive: false, autoDelete: false);
        await channel.QueueBindAsync(settings.Queue, settings.Exchange, settings.RoutingKey);
    }
    catch
    {
        // Patient registration must remain available while the broker starts or recovers.
    }
}

static async Task PublishPatientRegisteredAsync(IConfiguration configuration, PatientDto patient)
{
    try
    {
        var settings = RabbitMqSettings.FromConfiguration(configuration);
        if (settings is null)
        {
            return;
        }

        await using var connection = await CreateRabbitConnectionAsync(settings);
        await using var channel = await connection.CreateChannelAsync();
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

        await channel.BasicPublishAsync(
            exchange: settings.Exchange,
            routingKey: settings.RoutingKey,
            mandatory: false,
            body: Encoding.UTF8.GetBytes(payload));
    }
    catch
    {
        // Keep patient registration resilient even if RabbitMQ is temporarily unavailable.
    }
}

static Task<IConnection> CreateRabbitConnectionAsync(RabbitMqSettings settings)
{
    var factory = new ConnectionFactory
    {
        HostName = settings.HostName,
        Port = settings.Port,
        VirtualHost = settings.VirtualHost,
        UserName = settings.Username,
        Password = settings.Password
    };

    return factory.CreateConnectionAsync();
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

static DateTime ToUtc(DateTime value) => value.Kind switch
{
    DateTimeKind.Utc => value,
    DateTimeKind.Local => value.ToUniversalTime(),
    _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
};

static string Clean(string? value, string fallback) =>
    string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();

static string? CleanOrNull(string? value) =>
    string.IsNullOrWhiteSpace(value) ? null : value.Trim();

static string NormalizeCode(string value) => value.Trim().ToUpperInvariant().Replace(' ', '_');

static string NormalizePhone(string? value) =>
    new string((value ?? "").Where(char.IsDigit).ToArray());

static async Task<Dictionary<Guid, string>> GetDoctorNameMapAsync(
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    HttpContext httpContext)
{
    try
    {
        var client = httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{IdentityBaseUrl(configuration)}/api/doctors");
        ForwardAuthorization(httpContext, request);

        using var response = await client.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            return new Dictionary<Guid, string>();
        }

        var envelope = await response.Content.ReadFromJsonAsync<ApiResponse<DoctorProfileDto[]>>();
        return (envelope?.Data ?? [])
            .Where(doctor => doctor.Id != Guid.Empty)
            .ToDictionary(doctor => doctor.Id, doctor => $"{doctor.FirstName} {doctor.LastName}".Trim());
    }
    catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException or JsonException)
    {
        // Queue summary must remain available while the Identity service starts or recovers.
        return new Dictionary<Guid, string>();
    }
}

static string IdentityBaseUrl(IConfiguration configuration) =>
    Clean(configuration["Services:IdentityBaseUrl"], "http://localhost:5101").TrimEnd('/');

static void ForwardAuthorization(HttpContext httpContext, HttpRequestMessage request)
{
    var authorization = httpContext.Request.Headers.Authorization.ToString();
    if (!string.IsNullOrWhiteSpace(authorization))
    {
        request.Headers.TryAddWithoutValidation("Authorization", authorization);
    }
}

sealed record RabbitMqSettings(
    string HostName,
    int Port,
    string VirtualHost,
    string Username,
    string Password,
    string Exchange,
    string Queue,
    string RoutingKey)
{
    public static RabbitMqSettings? FromConfiguration(IConfiguration configuration)
    {
        var hostName = configuration["RabbitMq:HostName"];
        if (string.IsNullOrWhiteSpace(hostName))
        {
            return null;
        }

        var username = configuration["RabbitMq:Username"];
        var password = configuration["RabbitMq:Password"];
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            throw new InvalidOperationException("RabbitMq:Username and RabbitMq:Password must be configured when RabbitMQ is enabled.");
        }

        return new RabbitMqSettings(
            hostName,
            configuration.GetValue("RabbitMq:Port", 5672),
            configuration["RabbitMq:VirtualHost"] ?? "/",
            username,
            password,
            configuration["RabbitMq:Exchange"] ?? "hms.events",
            configuration["RabbitMq:PatientRegisteredQueue"] ?? "hms.patient-registered",
            configuration["RabbitMq:PatientRegisteredRoutingKey"] ?? "patient.registered");
    }
}
