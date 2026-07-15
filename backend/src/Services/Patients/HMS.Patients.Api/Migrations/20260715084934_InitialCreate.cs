using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace HMS.Patients.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "patients",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Mrn = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    FirstName = table.Column<string>(type: "character varying(96)", maxLength: 96, nullable: false),
                    LastName = table.Column<string>(type: "character varying(96)", maxLength: 96, nullable: false),
                    Phone = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Gender = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    DateOfBirth = table.Column<DateOnly>(type: "date", nullable: false),
                    Address = table.Column<string>(type: "text", nullable: true),
                    BloodType = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    EmergencyContactName = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    EmergencyContactPhone = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    PhotoContentType = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    PhotoData = table.Column<byte[]>(type: "bytea", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_patients", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "patients",
                columns: new[] { "Id", "Address", "BloodType", "CreatedAtUtc", "DateOfBirth", "EmergencyContactName", "EmergencyContactPhone", "FirstName", "Gender", "LastName", "Mrn", "Phone", "PhotoContentType", "PhotoData", "UpdatedAtUtc" },
                values: new object[,]
                {
                    { new Guid("d5c6bf11-de68-4c3f-97d2-6d7fd12f8e80"), "CMC, Addis Ababa", "A+", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateOnly(1988, 2, 20), "Alem Alemu", "0921000002", "Dawit", "Male", "Alemu", "MRN-0002", "0920000002", null, null, null },
                    { new Guid("f64d3368-a4da-4d44-9612-5c302b0ec29a"), "Bole, Addis Ababa", "O+", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateOnly(1995, 5, 10), "Meron Bekele", "0921000001", "Sara", "Female", "Bekele", "MRN-0001", "0920000001", null, null, null }
                });

            migrationBuilder.CreateIndex(
                name: "IX_patients_Mrn",
                table: "patients",
                column: "Mrn",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "patients");
        }
    }
}
