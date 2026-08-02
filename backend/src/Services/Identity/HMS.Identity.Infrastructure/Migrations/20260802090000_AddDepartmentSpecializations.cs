using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HMS.Identity.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDepartmentSpecializations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "specializations",
                table: "departments",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "specializations",
                table: "departments");
        }
    }
}
