using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HMS.Clinical.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "clinical_encounters",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientId = table.Column<Guid>(type: "uuid", nullable: false),
                    DoctorId = table.Column<Guid>(type: "uuid", nullable: false),
                    VisitType = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ChiefComplaint = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    Assessment = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    Plan = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_clinical_encounters", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "diagnoses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientId = table.Column<Guid>(type: "uuid", nullable: false),
                    DoctorId = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Description = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    Severity = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_diagnoses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "lab_requests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientId = table.Column<Guid>(type: "uuid", nullable: false),
                    DoctorId = table.Column<Guid>(type: "uuid", nullable: false),
                    TestName = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_requests", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "prescriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientId = table.Column<Guid>(type: "uuid", nullable: false),
                    DoctorId = table.Column<Guid>(type: "uuid", nullable: false),
                    Medication = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Instructions = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_prescriptions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "vital_signs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientId = table.Column<Guid>(type: "uuid", nullable: false),
                    TemperatureC = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    Pulse = table.Column<int>(type: "integer", nullable: false),
                    RespiratoryRate = table.Column<int>(type: "integer", nullable: false),
                    BloodPressure = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    WeightKg = table.Column<decimal>(type: "numeric(6,2)", nullable: false),
                    HeightCm = table.Column<decimal>(type: "numeric(6,2)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vital_signs", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "clinical_encounters",
                columns: new[] { "Id", "Assessment", "ChiefComplaint", "CreatedAtUtc", "DoctorId", "PatientId", "Plan", "UpdatedAtUtc", "VisitType" },
                values: new object[] { new Guid("7a58c9f1-4412-48dd-9165-7f08de63f863"), "Likely bacterial pharyngitis", "Fever and sore throat", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new Guid("8f334882-8d97-4d54-a011-97d7c8c2a201"), new Guid("f64d3368-a4da-4d44-9612-5c302b0ec29a"), "Antibiotics, hydration, follow-up in 5 days", null, "Outpatient" });

            migrationBuilder.InsertData(
                table: "diagnoses",
                columns: new[] { "Id", "Code", "CreatedAtUtc", "Description", "DoctorId", "PatientId", "Severity", "UpdatedAtUtc" },
                values: new object[] { new Guid("f4231a15-8a45-48cd-824a-28f454ccdfc1"), "J02.9", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Acute pharyngitis", new Guid("8f334882-8d97-4d54-a011-97d7c8c2a201"), new Guid("f64d3368-a4da-4d44-9612-5c302b0ec29a"), "Moderate", null });

            migrationBuilder.InsertData(
                table: "lab_requests",
                columns: new[] { "Id", "CreatedAtUtc", "DoctorId", "PatientId", "Status", "TestName", "UpdatedAtUtc" },
                values: new object[] { new Guid("3cb3eb61-03a4-4fec-8517-9d2778f6e40d"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new Guid("8f334882-8d97-4d54-a011-97d7c8c2a201"), new Guid("d5c6bf11-de68-4c3f-97d2-6d7fd12f8e80"), "Requested", "Complete Blood Count", null });

            migrationBuilder.InsertData(
                table: "prescriptions",
                columns: new[] { "Id", "CreatedAtUtc", "DoctorId", "Instructions", "Medication", "PatientId", "UpdatedAtUtc" },
                values: new object[] { new Guid("325cf3a1-2af1-4b69-8a17-6fac5c547915"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new Guid("8f334882-8d97-4d54-a011-97d7c8c2a201"), "Take one capsule every 8 hours for 5 days", "Amoxicillin 500mg", new Guid("f64d3368-a4da-4d44-9612-5c302b0ec29a"), null });

            migrationBuilder.InsertData(
                table: "vital_signs",
                columns: new[] { "Id", "BloodPressure", "CreatedAtUtc", "HeightCm", "PatientId", "Pulse", "RespiratoryRate", "TemperatureC", "UpdatedAtUtc", "WeightKg" },
                values: new object[] { new Guid("a4d6c3ef-6d9f-4d35-9e92-40f980022f6a"), "118/76", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 164m, new Guid("f64d3368-a4da-4d44-9612-5c302b0ec29a"), 92, 18, 37.8m, null, 62.5m });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "clinical_encounters");

            migrationBuilder.DropTable(
                name: "diagnoses");

            migrationBuilder.DropTable(
                name: "lab_requests");

            migrationBuilder.DropTable(
                name: "prescriptions");

            migrationBuilder.DropTable(
                name: "vital_signs");
        }
    }
}
