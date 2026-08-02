using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HMS.Patients.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSpouseCoverageToInsuranceCompanies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "spouse_coverage_allowed",
                table: "insurance_companies",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "spouse_coverage_allowed",
                table: "insurance_companies");
        }
    }
}
