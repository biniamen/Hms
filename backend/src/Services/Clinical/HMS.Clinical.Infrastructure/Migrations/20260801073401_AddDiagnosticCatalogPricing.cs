using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HMS.Clinical.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDiagnosticCatalogPricing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "currency",
                table: "diagnostic_tests",
                type: "character varying(3)",
                maxLength: 3,
                nullable: false,
                defaultValue: "ETB");

            migrationBuilder.AddColumn<decimal>(
                name: "price",
                table: "diagnostic_tests",
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
                name: "currency",
                table: "diagnostic_tests");

            migrationBuilder.DropColumn(
                name: "price",
                table: "diagnostic_tests");
        }
    }
}
