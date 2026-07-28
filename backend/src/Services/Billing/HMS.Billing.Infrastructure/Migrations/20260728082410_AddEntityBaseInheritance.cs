using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HMS.Billing.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddEntityBaseInheritance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "payments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CreatedByIp",
                table: "payments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAtUtc",
                table: "payments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "payments",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "payments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "created_at_utc",
                table: "payments",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "now()");

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "invoices",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CreatedByIp",
                table: "invoices",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAtUtc",
                table: "invoices",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "invoices",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "invoices",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "invoice_items",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CreatedByIp",
                table: "invoice_items",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAtUtc",
                table: "invoice_items",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "invoice_items",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "invoice_items",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "created_at_utc",
                table: "invoice_items",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "now()");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "CreatedByIp",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "DeletedAtUtc",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "created_at_utc",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "invoices");

            migrationBuilder.DropColumn(
                name: "CreatedByIp",
                table: "invoices");

            migrationBuilder.DropColumn(
                name: "DeletedAtUtc",
                table: "invoices");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "invoices");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "invoices");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "invoice_items");

            migrationBuilder.DropColumn(
                name: "CreatedByIp",
                table: "invoice_items");

            migrationBuilder.DropColumn(
                name: "DeletedAtUtc",
                table: "invoice_items");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "invoice_items");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "invoice_items");

            migrationBuilder.DropColumn(
                name: "created_at_utc",
                table: "invoice_items");
        }
    }
}
