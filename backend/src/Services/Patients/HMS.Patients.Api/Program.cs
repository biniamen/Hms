using HMS.Contracts;
using HMS.SharedKernel;
using Npgsql;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var connectionString = builder.Configuration.GetConnectionString("PatientsDb")
    ?? "Host=localhost;Port=5432;Database=hms_identity_db;Username=postgres;Password=Amen@2461";

builder.Services.AddSingleton(new NpgsqlDataSourceBuilder(connectionString).Build());
builder.Services.AddHttpClient("rabbitmq");

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();

await EnsureDatabaseAsync(app.Services.GetRequiredService<NpgsqlDataSource>());
await EnsureRabbitMqAsync(app.Services.GetRequiredService<IHttpClientFactory>(), app.Configuration);

app.MapGet("/health", () => Results.Ok(ApiResponse<object>.Ok(new { service = "patients", status = "healthy" })));

app.MapGet("/api/patients", async (NpgsqlDataSource dataSource) =>
{
    var patients = new List<PatientDto>();
    await using var connection = await dataSource.OpenConnectionAsync();
    await using var command = new NpgsqlCommand("""
        select id, mrn, first_name, last_name, phone, gender, date_of_birth,
               address, blood_type, emergency_contact_name, emergency_contact_phone,
               photo_content_type, photo_data
        from patients
        order by created_at desc, mrn
        """, connection);

    await using var reader = await command.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        patients.Add(ReadPatient(reader));
    }

    return Results.Ok(ApiResponse<IEnumerable<PatientDto>>.Ok(patients));
});

app.MapGet("/api/patients/{id:guid}", async (Guid id, NpgsqlDataSource dataSource) =>
{
    await using var connection = await dataSource.OpenConnectionAsync();
    await using var command = new NpgsqlCommand("""
        select id, mrn, first_name, last_name, phone, gender, date_of_birth,
               address, blood_type, emergency_contact_name, emergency_contact_phone,
               photo_content_type, photo_data
        from patients
        where id = @id
        """, connection);
    command.Parameters.AddWithValue("id", id);

    await using var reader = await command.ExecuteReaderAsync();
    if (!await reader.ReadAsync())
    {
        return Results.NotFound(ApiResponse<object>.Fail("Patient not found."));
    }

    return Results.Ok(ApiResponse<PatientDto>.Ok(ReadPatient(reader)));
});

app.MapPost("/api/patients", async (CreatePatientRequest request, NpgsqlDataSource dataSource) =>
{
    if (string.IsNullOrWhiteSpace(request.FirstName) ||
        string.IsNullOrWhiteSpace(request.LastName) ||
        string.IsNullOrWhiteSpace(request.Phone) ||
        string.IsNullOrWhiteSpace(request.Gender))
    {
        return Results.BadRequest(ApiResponse<object>.Fail("First name, last name, phone, and gender are required."));
    }

    var (photoContentType, photoData) = ParsePhoto(request.PhotoDataUrl);
    var id = Guid.NewGuid();

    await using var connection = await dataSource.OpenConnectionAsync();
    var mrn = await NextMrnAsync(connection);

    await using var command = new NpgsqlCommand("""
        insert into patients
            (id, mrn, first_name, last_name, phone, gender, date_of_birth,
             address, blood_type, emergency_contact_name, emergency_contact_phone,
             photo_content_type, photo_data)
        values
            (@id, @mrn, @first_name, @last_name, @phone, @gender, @date_of_birth,
             @address, @blood_type, @emergency_contact_name, @emergency_contact_phone,
             @photo_content_type, @photo_data)
        returning id, mrn, first_name, last_name, phone, gender, date_of_birth,
                  address, blood_type, emergency_contact_name, emergency_contact_phone,
                  photo_content_type, photo_data
        """, connection);

    command.Parameters.AddWithValue("id", id);
    command.Parameters.AddWithValue("mrn", mrn);
    command.Parameters.AddWithValue("first_name", request.FirstName.Trim());
    command.Parameters.AddWithValue("last_name", request.LastName.Trim());
    command.Parameters.AddWithValue("phone", request.Phone.Trim());
    command.Parameters.AddWithValue("gender", request.Gender.Trim());
    command.Parameters.AddWithValue("date_of_birth", request.DateOfBirth);
    command.Parameters.AddWithValue("address", DbValue(request.Address));
    command.Parameters.AddWithValue("blood_type", DbValue(request.BloodType));
    command.Parameters.AddWithValue("emergency_contact_name", DbValue(request.EmergencyContactName));
    command.Parameters.AddWithValue("emergency_contact_phone", DbValue(request.EmergencyContactPhone));
    command.Parameters.AddWithValue("photo_content_type", DbValue(photoContentType));
    command.Parameters.AddWithValue("photo_data", photoData is null ? DBNull.Value : photoData);

    await using var reader = await command.ExecuteReaderAsync();
    await reader.ReadAsync();
    var patient = ReadPatient(reader);
    await reader.DisposeAsync();

    await PublishPatientRegisteredAsync(app.Services.GetRequiredService<IHttpClientFactory>(), app.Configuration, patient);

    return Results.Created($"/api/patients/{patient.Id}", ApiResponse<PatientDto>.Ok(patient, "Patient registered."));
});

app.Run();

static async Task EnsureDatabaseAsync(NpgsqlDataSource dataSource)
{
    await using var connection = await dataSource.OpenConnectionAsync();
    await using var command = new NpgsqlCommand("""
        create extension if not exists pgcrypto;

        create table if not exists patients (
            id uuid primary key,
            mrn varchar(32) not null unique,
            first_name varchar(96) not null,
            last_name varchar(96) not null,
            phone varchar(32) not null,
            gender varchar(32) not null,
            date_of_birth date not null,
            created_at timestamptz not null default now()
        );

        alter table patients add column if not exists address text;
        alter table patients add column if not exists blood_type varchar(16);
        alter table patients add column if not exists emergency_contact_name varchar(160);
        alter table patients add column if not exists emergency_contact_phone varchar(32);
        alter table patients add column if not exists photo_content_type varchar(80);
        alter table patients add column if not exists photo_data bytea;

        insert into patients
            (id, mrn, first_name, last_name, phone, gender, date_of_birth, address, blood_type, emergency_contact_name, emergency_contact_phone)
        values
            ('f64d3368-a4da-4d44-9612-5c302b0ec29a', 'MRN-0001', 'Sara', 'Bekele', '0920000001', 'Female', '1995-05-10', 'Bole, Addis Ababa', 'O+', 'Meron Bekele', '0921000001'),
            ('d5c6bf11-de68-4c3f-97d2-6d7fd12f8e80', 'MRN-0002', 'Dawit', 'Alemu', '0920000002', 'Male', '1988-02-20', 'CMC, Addis Ababa', 'A+', 'Alem Alemu', '0921000002')
        on conflict (mrn) do nothing;
        """, connection);

    await command.ExecuteNonQueryAsync();
}

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
        // RabbitMQ is optional for local development; API writes should not fail if the broker is warming up.
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

static async Task<string> NextMrnAsync(NpgsqlConnection connection)
{
    await using var command = new NpgsqlCommand("""
        select coalesce(max(nullif(regexp_replace(mrn, '\D', '', 'g'), '')::int), 0) + 1
        from patients
        """, connection);

    var next = (int)(await command.ExecuteScalarAsync() ?? 1);
    return $"MRN-{next:0000}";
}

static PatientDto ReadPatient(NpgsqlDataReader reader)
{
    var photoContentType = NullableString(reader, "photo_content_type");
    var photoData = reader["photo_data"] as byte[];
    var photoDataUrl = photoData is { Length: > 0 } && !string.IsNullOrWhiteSpace(photoContentType)
        ? $"data:{photoContentType};base64,{Convert.ToBase64String(photoData)}"
        : null;

    return new PatientDto(
        reader.GetGuid(reader.GetOrdinal("id")),
        reader.GetString(reader.GetOrdinal("mrn")),
        reader.GetString(reader.GetOrdinal("first_name")),
        reader.GetString(reader.GetOrdinal("last_name")),
        reader.GetString(reader.GetOrdinal("phone")),
        reader.GetString(reader.GetOrdinal("gender")),
        reader.GetFieldValue<DateOnly>(reader.GetOrdinal("date_of_birth")),
        NullableString(reader, "address"),
        NullableString(reader, "blood_type"),
        NullableString(reader, "emergency_contact_name"),
        NullableString(reader, "emergency_contact_phone"),
        photoDataUrl);
}

static string? NullableString(NpgsqlDataReader reader, string columnName)
{
    var ordinal = reader.GetOrdinal(columnName);
    return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
}

static object DbValue(string? value) => string.IsNullOrWhiteSpace(value) ? DBNull.Value : value.Trim();

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
