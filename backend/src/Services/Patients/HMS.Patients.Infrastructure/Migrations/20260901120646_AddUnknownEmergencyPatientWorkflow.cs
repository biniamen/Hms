using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HMS.Patients.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUnknownEmergencyPatientWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "brought_by",
                table: "patients",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "emergency_notes",
                table: "patients",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "estimated_age_years",
                table: "patients",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "identity_resolved_at_utc",
                table: "patients",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "identity_status",
                table: "patients",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "Verified");

            migrationBuilder.AddColumn<string>(
                name: "incident_location",
                table: "patients",
                type: "character varying(240)",
                maxLength: 240,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "incident_type",
                table: "patients",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_identity_pending",
                table: "patients",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "medico_legal_case",
                table: "patients",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "temporary_name",
                table: "patients",
                type: "character varying(160)",
                maxLength: 160,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "triage_level",
                table: "patients",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "brought_by",
                table: "patients");

            migrationBuilder.DropColumn(
                name: "emergency_notes",
                table: "patients");

            migrationBuilder.DropColumn(
                name: "estimated_age_years",
                table: "patients");

            migrationBuilder.DropColumn(
                name: "identity_resolved_at_utc",
                table: "patients");

            migrationBuilder.DropColumn(
                name: "identity_status",
                table: "patients");

            migrationBuilder.DropColumn(
                name: "incident_location",
                table: "patients");

            migrationBuilder.DropColumn(
                name: "incident_type",
                table: "patients");

            migrationBuilder.DropColumn(
                name: "is_identity_pending",
                table: "patients");

            migrationBuilder.DropColumn(
                name: "medico_legal_case",
                table: "patients");

            migrationBuilder.DropColumn(
                name: "temporary_name",
                table: "patients");

            migrationBuilder.DropColumn(
                name: "triage_level",
                table: "patients");
        }
    }
}
