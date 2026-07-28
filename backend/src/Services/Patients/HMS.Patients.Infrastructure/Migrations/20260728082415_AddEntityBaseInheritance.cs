using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HMS.Patients.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddEntityBaseInheritance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "patients",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CreatedByIp",
                table: "patients",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAtUtc",
                table: "patients",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "patients",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "patients",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "insurance_companies",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CreatedByIp",
                table: "insurance_companies",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAtUtc",
                table: "insurance_companies",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "insurance_companies",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "insurance_companies",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "beds",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CreatedByIp",
                table: "beds",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAtUtc",
                table: "beds",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "beds",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "beds",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "created_at",
                table: "beds",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "now()");

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "appointments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CreatedByIp",
                table: "appointments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAtUtc",
                table: "appointments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "appointments",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "appointments",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "patients");

            migrationBuilder.DropColumn(
                name: "CreatedByIp",
                table: "patients");

            migrationBuilder.DropColumn(
                name: "DeletedAtUtc",
                table: "patients");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "patients");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "patients");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "insurance_companies");

            migrationBuilder.DropColumn(
                name: "CreatedByIp",
                table: "insurance_companies");

            migrationBuilder.DropColumn(
                name: "DeletedAtUtc",
                table: "insurance_companies");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "insurance_companies");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "insurance_companies");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "beds");

            migrationBuilder.DropColumn(
                name: "CreatedByIp",
                table: "beds");

            migrationBuilder.DropColumn(
                name: "DeletedAtUtc",
                table: "beds");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "beds");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "beds");

            migrationBuilder.DropColumn(
                name: "created_at",
                table: "beds");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "appointments");

            migrationBuilder.DropColumn(
                name: "CreatedByIp",
                table: "appointments");

            migrationBuilder.DropColumn(
                name: "DeletedAtUtc",
                table: "appointments");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "appointments");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "appointments");
        }
    }
}
