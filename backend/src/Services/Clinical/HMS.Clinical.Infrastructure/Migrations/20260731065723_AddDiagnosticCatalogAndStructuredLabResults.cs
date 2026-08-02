using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HMS.Clinical.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDiagnosticCatalogAndStructuredLabResults : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "result_items_json",
                table: "lab_requests",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "test_catalog_ids",
                table: "lab_requests",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "diagnostic_tests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    group_name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    sub_group = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    test_name = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    specimen_type = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    unit = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    reference_range = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedByIp = table.Column<string>(type: "text", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_diagnostic_tests", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_diagnostic_tests_group_name_sub_group_test_name",
                table: "diagnostic_tests",
                columns: new[] { "group_name", "sub_group", "test_name" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "diagnostic_tests");

            migrationBuilder.DropColumn(
                name: "result_items_json",
                table: "lab_requests");

            migrationBuilder.DropColumn(
                name: "test_catalog_ids",
                table: "lab_requests");
        }
    }
}
