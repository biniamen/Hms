using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace HMS.Identity.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "employees",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FirstName = table.Column<string>(type: "character varying(96)", maxLength: 96, nullable: false),
                    LastName = table.Column<string>(type: "character varying(96)", maxLength: 96, nullable: false),
                    EmailAddress = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Role = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Permission = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Password = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_employees", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "role_permissions",
                columns: table => new
                {
                    Role = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Description = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    permissions_json = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: false),
                    UserCount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_role_permissions", x => x.Role);
                });

            migrationBuilder.InsertData(
                table: "employees",
                columns: new[] { "Id", "CreatedAtUtc", "EmailAddress", "FirstName", "IsActive", "LastName", "Password", "Permission", "Role", "UpdatedAtUtc" },
                values: new object[,]
                {
                    { new Guid("43a3b779-c6f9-496c-b8b6-81525947cf12"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "nurse@hms.local", "Marta", true, "Nurse", "Admin@123", "ASSIST_DOCTORS", "NURSE", null },
                    { new Guid("52f4d81d-e810-4c4e-895b-995f1bbf13a2"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "receptionist@hms.local", "Hana", true, "Reception", "Admin@123", "REGISTER_PATIENTS", "RECEPTIONIST", null },
                    { new Guid("7c5b23a5-5970-4b95-8d02-c36c1c9ac8e1"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "lab@hms.local", "Abel", true, "Lab", "Admin@123", "CONDUCT_TESTS", "LAB_TECHNICIAN", null },
                    { new Guid("83f36db8-5c4d-4f2a-9b54-00c31a31ab7d"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "pharmacist@hms.local", "Selam", true, "Pharmacist", "Admin@123", "MANAGE_MEDICINES", "PHARMACIST", null },
                    { new Guid("8f334882-8d97-4d54-a011-97d7c8c2a201"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "doctor@hms.local", "Dawit", true, "Doctor", "Admin@123", "MANAGE_PATIENTS", "DOCTOR", null },
                    { new Guid("fbdd5447-1864-4420-b42d-60ba5afaf23e"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "accountant@hms.local", "Mekdes", true, "Accountant", "Admin@123", "MANAGE_FINANCES", "ACCOUNTANT", null },
                    { new Guid("fe89d0c5-6232-421b-9926-05eff4433bd9"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "admin@hms.local", "System", true, "Administrator", "Admin@123", "ALL", "ADMIN", null }
                });

            migrationBuilder.InsertData(
                table: "role_permissions",
                columns: new[] { "Role", "Description", "permissions_json", "UserCount" },
                values: new object[,]
                {
                    { "ACCOUNTANT", "Billing, invoices, and payment posting", "[\"CREATE_INVOICES\",\"RECORD_PAYMENTS\",\"VIEW_FINANCE\"]", 0 },
                    { "ADMIN", "Full platform administration and configuration", "[\"ALL\",\"MANAGE_USERS\",\"MANAGE_ROLES\",\"VIEW_REPORTS\"]", 0 },
                    { "DOCTOR", "Clinical care, diagnoses, prescriptions, and lab orders", "[\"VIEW_PATIENTS\",\"MANAGE_CLINICAL\",\"ORDER_LABS\",\"PRESCRIBE\"]", 0 },
                    { "LAB_TECHNICIAN", "Lab request processing and results workflow", "[\"VIEW_LAB_REQUESTS\",\"UPDATE_LAB_STATUS\"]", 0 },
                    { "NURSE", "Vitals capture and doctor assistance", "[\"VIEW_PATIENTS\",\"CAPTURE_VITALS\",\"ASSIST_CLINICAL\"]", 0 },
                    { "PHARMACIST", "Medication review and dispensing", "[\"VIEW_PRESCRIPTIONS\",\"DISPENSE_MEDICINE\"]", 0 },
                    { "RECEPTIONIST", "Front desk registration and appointment scheduling", "[\"REGISTER_PATIENTS\",\"BOOK_APPOINTMENTS\",\"VIEW_PATIENTS\"]", 0 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_employees_EmailAddress",
                table: "employees",
                column: "EmailAddress",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "employees");

            migrationBuilder.DropTable(
                name: "role_permissions");
        }
    }
}
