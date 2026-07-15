using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HMS.Patients.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "beds",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ward = table.Column<string>(type: "character varying(96)", maxLength: 96, nullable: false),
                    room = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    bed_number = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    is_available = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_beds", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "insurance_companies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    payer_code = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    contact_person = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    phone = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    email = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    address = table.Column<string>(type: "text", nullable: true),
                    coverage_type = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    coverage_percent = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_insurance_companies", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "patients",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    mrn = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    first_name = table.Column<string>(type: "character varying(96)", maxLength: 96, nullable: false),
                    last_name = table.Column<string>(type: "character varying(96)", maxLength: 96, nullable: false),
                    email = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    phone = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    gender = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    date_of_birth = table.Column<DateOnly>(type: "date", nullable: false),
                    national_id = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    marital_status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    occupation = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    address = table.Column<string>(type: "text", nullable: true),
                    blood_type = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    insurance_company_id = table.Column<Guid>(type: "uuid", nullable: true),
                    employer_name = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: true),
                    insurance_plan = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    insurance_provider = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    insurance_policy_number = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    emergency_contact_name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    emergency_contact_phone = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    photo_content_type = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    photo_data = table.Column<byte[]>(type: "bytea", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_patients", x => x.Id);
                    table.ForeignKey(
                        name: "FK_patients_insurance_companies_insurance_company_id",
                        column: x => x.insurance_company_id,
                        principalTable: "insurance_companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "appointments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    patient_id = table.Column<Guid>(type: "uuid", nullable: false),
                    doctor_id = table.Column<Guid>(type: "uuid", nullable: false),
                    starts_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    reason = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    department = table.Column<string>(type: "character varying(96)", maxLength: 96, nullable: false),
                    appointment_type = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    priority = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_appointments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_appointments_patients_patient_id",
                        column: x => x.patient_id,
                        principalTable: "patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_appointments_doctor_id_starts_at_utc",
                table: "appointments",
                columns: new[] { "doctor_id", "starts_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_appointments_patient_id",
                table: "appointments",
                column: "patient_id");

            migrationBuilder.CreateIndex(
                name: "IX_beds_bed_number",
                table: "beds",
                column: "bed_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_insurance_companies_payer_code",
                table: "insurance_companies",
                column: "payer_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_patients_insurance_company_id",
                table: "patients",
                column: "insurance_company_id");

            migrationBuilder.CreateIndex(
                name: "IX_patients_mrn",
                table: "patients",
                column: "mrn",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "appointments");

            migrationBuilder.DropTable(
                name: "beds");

            migrationBuilder.DropTable(
                name: "patients");

            migrationBuilder.DropTable(
                name: "insurance_companies");
        }
    }
}
