using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HMS.Billing.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddInsuranceCoveredAmountToInvoices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "insurance_covered_amount",
                table: "invoices",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "insurance_covered_amount",
                table: "invoices");
        }
    }
}
