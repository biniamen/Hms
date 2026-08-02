using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HMS.Billing.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPricingValidityAndInvoiceReferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "reference_id",
                table: "invoice_items",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "reference_type",
                table: "invoice_items",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "service_date_utc",
                table: "invoice_items",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "validity_days",
                table: "doctor_service_prices",
                type: "integer",
                nullable: false,
                defaultValue: 10);

            migrationBuilder.AddCheckConstraint(
                name: "ck_doctor_service_prices_validity_days_positive",
                table: "doctor_service_prices",
                sql: "validity_days > 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_doctor_service_prices_validity_days_positive",
                table: "doctor_service_prices");

            migrationBuilder.DropColumn(
                name: "reference_id",
                table: "invoice_items");

            migrationBuilder.DropColumn(
                name: "reference_type",
                table: "invoice_items");

            migrationBuilder.DropColumn(
                name: "service_date_utc",
                table: "invoice_items");

            migrationBuilder.DropColumn(
                name: "validity_days",
                table: "doctor_service_prices");
        }
    }
}
