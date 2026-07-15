using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace HMS.Appointments.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "appointments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientId = table.Column<Guid>(type: "uuid", nullable: false),
                    DoctorId = table.Column<Guid>(type: "uuid", nullable: false),
                    StartsAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Reason = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_appointments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "beds",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Ward = table.Column<string>(type: "character varying(96)", maxLength: 96, nullable: false),
                    Room = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    BedNumber = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    IsAvailable = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_beds", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "appointments",
                columns: new[] { "Id", "CreatedAtUtc", "DoctorId", "PatientId", "Reason", "StartsAtUtc", "Status", "UpdatedAtUtc" },
                values: new object[] { new Guid("29cb54e6-b268-4f62-ac89-41ca434658c7"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new Guid("8f334882-8d97-4d54-a011-97d7c8c2a201"), new Guid("f64d3368-a4da-4d44-9612-5c302b0ec29a"), "General consultation", new DateTime(2026, 1, 2, 10, 0, 0, 0, DateTimeKind.Utc), "Scheduled", null });

            migrationBuilder.InsertData(
                table: "beds",
                columns: new[] { "Id", "BedNumber", "CreatedAtUtc", "Room", "UpdatedAtUtc", "Ward" },
                values: new object[] { new Guid("a1b2c3d4-e5f6-7890-abcd-ef1234567890"), "E1", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "201", null, "Emergency" });

            migrationBuilder.InsertData(
                table: "beds",
                columns: new[] { "Id", "BedNumber", "CreatedAtUtc", "IsAvailable", "Room", "UpdatedAtUtc", "Ward" },
                values: new object[,]
                {
                    { new Guid("c7e6c2bc-972f-47c1-a206-5f4e27f50cf7"), "A1", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, "101", null, "General Ward A" },
                    { new Guid("e33cfb8d-6d4a-4785-ac08-f436dc63a476"), "A2", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, "102", null, "General Ward A" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_beds_Ward_Room_BedNumber",
                table: "beds",
                columns: new[] { "Ward", "Room", "BedNumber" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "appointments");

            migrationBuilder.DropTable(
                name: "beds");
        }
    }
}
