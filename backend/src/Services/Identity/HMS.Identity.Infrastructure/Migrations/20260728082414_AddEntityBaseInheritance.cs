using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HMS.Identity.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddEntityBaseInheritance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "password_setup_tokens",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CreatedByIp",
                table: "password_setup_tokens",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAtUtc",
                table: "password_setup_tokens",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "password_setup_tokens",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "password_setup_tokens",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "employees",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CreatedByIp",
                table: "employees",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAtUtc",
                table: "employees",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "employees",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "employees",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "email_outbox",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CreatedByIp",
                table: "email_outbox",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAtUtc",
                table: "email_outbox",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "email_outbox",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "email_outbox",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "departments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CreatedByIp",
                table: "departments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAtUtc",
                table: "departments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "departments",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "departments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "created_at",
                table: "departments",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "now()");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "password_setup_tokens");

            migrationBuilder.DropColumn(
                name: "CreatedByIp",
                table: "password_setup_tokens");

            migrationBuilder.DropColumn(
                name: "DeletedAtUtc",
                table: "password_setup_tokens");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "password_setup_tokens");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "password_setup_tokens");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "employees");

            migrationBuilder.DropColumn(
                name: "CreatedByIp",
                table: "employees");

            migrationBuilder.DropColumn(
                name: "DeletedAtUtc",
                table: "employees");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "employees");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "employees");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "email_outbox");

            migrationBuilder.DropColumn(
                name: "CreatedByIp",
                table: "email_outbox");

            migrationBuilder.DropColumn(
                name: "DeletedAtUtc",
                table: "email_outbox");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "email_outbox");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "email_outbox");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "departments");

            migrationBuilder.DropColumn(
                name: "CreatedByIp",
                table: "departments");

            migrationBuilder.DropColumn(
                name: "DeletedAtUtc",
                table: "departments");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "departments");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "departments");

            migrationBuilder.DropColumn(
                name: "created_at",
                table: "departments");
        }
    }
}
