using HMS.Contracts;
using HMS.Patients.Infrastructure;
using HMS.SharedKernel;
using Microsoft.EntityFrameworkCore;
using RabbitMQ.Client;
using System.Security.Claims;
using System.Text;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Services.AddOpenApi();
builder.Services.AddHmsCors(builder.Configuration);

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

app.MapGet("/api/patients", async (PatientsDbContext db, HttpContext httpContext) =>
{
    IQueryable<Patient> query = db.Patients
        .AsNoTracking()
        .Include(patient => patient.InsuranceCompany);

    if (TryGetDoctorId(httpContext, out var doctorId))
    {
        query = query.Where(patient => db.Appointments.Any(appointment =>
            appointment.PatientId == patient.Id && appointment.DoctorId == doctorId));
    }

    var patients = await query
        .OrderByDescending(patient => patient.CreatedAtUtc)
        .ThenBy(patient => patient.Mrn)
        .ToListAsync();

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

app.MapGet("/api/insurance-companies", async (PatientsDbContext db) =>
{
    var companies = await db.InsuranceCompanies
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
            company.IsActive))
        .ToListAsync();

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
    company.IsActive = true;

    await db.SaveChangesAsync();

    return Results.Created("/api/insurance-companies", ApiResponse<InsuranceCompanyDto>.Ok(
        new InsuranceCompanyDto(company.Id, company.Name, company.PayerCode, company.ContactPerson ?? "", company.Phone, company.Email ?? "", company.Address ?? "", company.CoverageType, company.CoveragePercent, company.IsActive),
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
});

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

app.MapGet("/api/appointments", async (PatientsDbContext db, HttpContext httpContext) =>
{
    var query = db.Appointments.AsNoTracking();
    if (TryGetDoctorId(httpContext, out var doctorId))
    {
        query = query.Where(appointment => appointment.DoctorId == doctorId);
    }

    var appointments = await query
        .OrderByDescending(appointment => appointment.StartsAtUtc)
        .ToListAsync();

    return Results.Ok(ApiResponse<IEnumerable<AppointmentDto>>.Ok(ToAppointmentDtos(appointments)));
});

app.MapGet("/api/appointments/queue", async (PatientsDbContext db, HttpContext httpContext) =>
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

    var summaries = appointments
        .GroupBy(appointment => new { appointment.DoctorId, appointment.Department })
        .OrderBy(group => group.Key.Department)
        .Select(group => new QueueSummaryDto(
            group.Key.DoctorId,
            group.Key.DoctorId.ToString(),
            group.Key.Department,
            group.Count(item => item.Status == "Scheduled"),
            group.Count(item => item.Status == "Waiting"),
            group.Count(item => item.Status == "In Service"),
            group.Count(item => item.Status == "Completed")))
        .ToList();

    return Results.Ok(ApiResponse<IEnumerable<QueueSummaryDto>>.Ok(summaries));
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

    var appointment = new Appointment
    {
        Id = Guid.NewGuid(),
        PatientId = request.PatientId,
        DoctorId = request.DoctorId,
        StartsAtUtc = ToUtc(request.StartsAtUtc),
        Status = "Waiting",
        Reason = request.Reason.Trim(),
        Department = Clean(request.Department, "Outpatient"),
        AppointmentType = Clean(request.AppointmentType, "Consultation"),
        Priority = Clean(request.Priority, "Normal"),
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

app.MapGet("/api/beds", async (PatientsDbContext db) =>
{
    var beds = await db.Beds
        .AsNoTracking()
        .OrderBy(bed => bed.Ward)
        .ThenBy(bed => bed.Room)
        .ThenBy(bed => bed.BedNumber)
        .Select(bed => new BedDto(bed.Id, bed.Ward, bed.Room, bed.BedNumber, bed.IsAvailable))
        .ToListAsync();

    return Results.Ok(ApiResponse<IEnumerable<BedDto>>.Ok(beds));
});

app.Run();

static bool TryGetDoctorId(HttpContext httpContext, out Guid doctorId)
{
    doctorId = Guid.Empty;
    var role = httpContext.User.FindFirstValue(ClaimTypes.Role) ?? "";
    if (!role.Equals("DOCTOR", StringComparison.OrdinalIgnoreCase))
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
        photoDataUrl);
}

static List<AppointmentDto> ToAppointmentDtos(IEnumerable<Appointment> appointments)
{
    var orderedAppointments = appointments
        .OrderBy(appointment => appointment.StartsAtUtc)
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
                .Count(appointment => appointment.Status is "Scheduled" or "Waiting");
            queueValues[current.Id] = (index + 1, waitingAhead);
        }
    }

    return orderedAppointments
        .OrderByDescending(appointment => appointment.StartsAtUtc)
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
