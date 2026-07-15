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

var appointments = new List<AppointmentDto>
{
    new(
        Guid.Parse("29cb54e6-b268-4f62-ac89-41ca434658c7"),
        Guid.Parse("f64d3368-a4da-4d44-9612-5c302b0ec29a"),
        Guid.Parse("8f334882-8d97-4d54-a011-97d7c8c2a201"),
        DateTime.UtcNow.AddDays(1),
        "Scheduled",
        "General consultation",
        "Outpatient",
        "Consultation",
        "Normal",
        "Standalone appointments service is retired. Appointment workflows are handled by Patient Management.")
};
var beds = new List<BedDto>
{
    new(Guid.NewGuid(), "General Ward A", "101", "A1", true),
    new(Guid.NewGuid(), "General Ward A", "102", "A2", true),
    new(Guid.NewGuid(), "Emergency", "201", "E1", false)
};

app.MapGet("/health", () => Results.Ok(ApiResponse<object>.Ok(new { service = "appointments", status = "healthy" })));

app.MapGet("/api/appointments", () => Results.Ok(ApiResponse<IEnumerable<AppointmentDto>>.Ok(appointments)));

app.MapPost("/api/appointments", (CreateAppointmentRequest request) =>
{
    var appointment = new AppointmentDto(
        Guid.NewGuid(),
        request.PatientId,
        request.DoctorId,
        request.StartsAtUtc,
        "Scheduled",
        request.Reason,
        string.IsNullOrWhiteSpace(request.Department) ? "Outpatient" : request.Department,
        string.IsNullOrWhiteSpace(request.AppointmentType) ? "Consultation" : request.AppointmentType,
        string.IsNullOrWhiteSpace(request.Priority) ? "Normal" : request.Priority,
        request.Notes);
    appointments.Add(appointment);
    return Results.Created($"/api/appointments/{appointment.Id}", ApiResponse<AppointmentDto>.Ok(appointment, "Appointment created."));
});

app.MapGet("/api/beds", () => Results.Ok(ApiResponse<IEnumerable<BedDto>>.Ok(beds)));

app.Run();
