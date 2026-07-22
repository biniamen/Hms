using System;
using HMS.Clinical.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HMS.Clinical.Infrastructure.Migrations
{
    [DbContext(typeof(ClinicalDbContext))]
    [Migration("20260721130000_AddLabResultWorkflow")]
    public partial class AddLabResultWorkflow : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "category",
                table: "lab_requests",
                type: "character varying(80)",
                maxLength: 80,
                nullable: false,
                defaultValue: "Laboratory");

            migrationBuilder.AddColumn<string>(
                name: "clinical_note",
                table: "lab_requests",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "collected_at_utc",
                table: "lab_requests",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "performed_by",
                table: "lab_requests",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "priority",
                table: "lab_requests",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "Routine");

            migrationBuilder.AddColumn<string>(
                name: "reference_range",
                table: "lab_requests",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "result_flag",
                table: "lab_requests",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "Normal");

            migrationBuilder.AddColumn<string>(
                name: "result_notes",
                table: "lab_requests",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "result_summary",
                table: "lab_requests",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "result_value",
                table: "lab_requests",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "resulted_at_utc",
                table: "lab_requests",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "specimen_type",
                table: "lab_requests",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "updated_at_utc",
                table: "lab_requests",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "now()");

            migrationBuilder.AddColumn<string>(
                name: "verified_by",
                table: "lab_requests",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                defaultValue: "");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "category", table: "lab_requests");
            migrationBuilder.DropColumn(name: "clinical_note", table: "lab_requests");
            migrationBuilder.DropColumn(name: "collected_at_utc", table: "lab_requests");
            migrationBuilder.DropColumn(name: "performed_by", table: "lab_requests");
            migrationBuilder.DropColumn(name: "priority", table: "lab_requests");
            migrationBuilder.DropColumn(name: "reference_range", table: "lab_requests");
            migrationBuilder.DropColumn(name: "result_flag", table: "lab_requests");
            migrationBuilder.DropColumn(name: "result_notes", table: "lab_requests");
            migrationBuilder.DropColumn(name: "result_summary", table: "lab_requests");
            migrationBuilder.DropColumn(name: "result_value", table: "lab_requests");
            migrationBuilder.DropColumn(name: "resulted_at_utc", table: "lab_requests");
            migrationBuilder.DropColumn(name: "specimen_type", table: "lab_requests");
            migrationBuilder.DropColumn(name: "updated_at_utc", table: "lab_requests");
            migrationBuilder.DropColumn(name: "verified_by", table: "lab_requests");
        }
    }
}
