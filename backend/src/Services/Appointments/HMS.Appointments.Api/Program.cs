using HMS.Appointments.Infrastructure.Data;
using HMS.Appointments.Infrastructure.Entities;
using HMS.Contracts;
using HMS.SharedKernel;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var appointmentsAssembly = typeof(Program).Assembly.GetName().Name;
builder.Services.AddDbContext<AppAppointmentsDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("AppointmentsDb"),
        b => b.MigrationsAssembly(appointmentsAssembly)));

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
    var db = scope.ServiceProvider.GetRequiredService<AppAppointmentsDbContext>();
    await db.Database.MigrateAsync();
}

app.MapGet("/health", () => Results.Ok(ApiResponse<object>.Ok(new { service = "appointments", status = "healthy" })));

app.MapGet("/api/appointments", async (AppAppointmentsDbContext db) =>
{
    var appointments = await db.Appointments
        .OrderByDescending(a => a.StartsAtUtc)
        .Select(a => new AppointmentDto(a.Id, a.PatientId, a.DoctorId, a.StartsAtUtc, a.Status, a.Reason))
        .ToListAsync();

    return Results.Ok(ApiResponse<IEnumerable<AppointmentDto>>.Ok(appointments));
})
.RequireAuthorization(policy => policy.RequireRole("ADMIN", "DOCTOR", "RECEPTIONIST"));

app.MapPost("/api/appointments", async (CreateAppointmentRequest request, AppAppointmentsDbContext db) =>
{
    var appointment = new Appointment
    {
        PatientId = request.PatientId,
        DoctorId = request.DoctorId,
        StartsAtUtc = request.StartsAtUtc,
        Status = "Scheduled",
        Reason = request.Reason
    };

    db.Appointments.Add(appointment);
    await db.SaveChangesAsync();

    var dto = new AppointmentDto(appointment.Id, appointment.PatientId, appointment.DoctorId, appointment.StartsAtUtc, appointment.Status, appointment.Reason);
    return Results.Created($"/api/appointments/{appointment.Id}", ApiResponse<AppointmentDto>.Ok(dto, "Appointment created."));
})
.RequireAuthorization(policy => policy.RequireRole("ADMIN", "RECEPTIONIST", "DOCTOR"));

app.MapGet("/api/beds", async (AppAppointmentsDbContext db) =>
{
    var beds = await db.Beds
        .OrderBy(b => b.Ward)
        .ThenBy(b => b.BedNumber)
        .Select(b => new BedDto(b.Id, b.Ward, b.Room, b.BedNumber, b.IsAvailable))
        .ToListAsync();

    return Results.Ok(ApiResponse<IEnumerable<BedDto>>.Ok(beds));
})
.RequireAuthorization(policy => policy.RequireRole("ADMIN", "RECEPTIONIST", "NURSE"));

app.Run();
