using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HMS.Identity.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "departments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    type = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    location = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_departments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "email_outbox",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    recipient = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    subject = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    body = table.Column<string>(type: "text", nullable: false),
                    status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    sent_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    error = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_email_outbox", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "permissions",
                columns: table => new
                {
                    key = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    description = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    module = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_permissions", x => x.key);
                });

            migrationBuilder.CreateTable(
                name: "roles",
                columns: table => new
                {
                    role = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    description = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_roles", x => x.role);
                });

            migrationBuilder.CreateTable(
                name: "employees",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    employee_no = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    first_name = table.Column<string>(type: "character varying(96)", maxLength: 96, nullable: false),
                    last_name = table.Column<string>(type: "character varying(96)", maxLength: 96, nullable: false),
                    email_address = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    phone = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    role = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    department = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    specialization = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    password_hash = table.Column<string>(type: "text", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    password_setup_completed = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_employees", x => x.Id);
                    table.ForeignKey(
                        name: "FK_employees_roles_role",
                        column: x => x.role,
                        principalTable: "roles",
                        principalColumn: "role",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "role_permissions",
                columns: table => new
                {
                    role = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    permission_key = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_role_permissions", x => new { x.role, x.permission_key });
                    table.ForeignKey(
                        name: "FK_role_permissions_permissions_permission_key",
                        column: x => x.permission_key,
                        principalTable: "permissions",
                        principalColumn: "key",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_role_permissions_roles_role",
                        column: x => x.role,
                        principalTable: "roles",
                        principalColumn: "role",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "password_setup_tokens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    employee_id = table.Column<Guid>(type: "uuid", nullable: false),
                    token_hash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    sent_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    expires_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    used_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_password_setup_tokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_password_setup_tokens_employees_employee_id",
                        column: x => x.employee_id,
                        principalTable: "employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_departments_code",
                table: "departments",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_employees_email_address",
                table: "employees",
                column: "email_address",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_employees_employee_no",
                table: "employees",
                column: "employee_no",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_employees_role",
                table: "employees",
                column: "role");

            migrationBuilder.CreateIndex(
                name: "IX_password_setup_tokens_employee_id",
                table: "password_setup_tokens",
                column: "employee_id");

            migrationBuilder.CreateIndex(
                name: "IX_password_setup_tokens_token_hash",
                table: "password_setup_tokens",
                column: "token_hash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_role_permissions_permission_key",
                table: "role_permissions",
                column: "permission_key");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "departments");

            migrationBuilder.DropTable(
                name: "email_outbox");

            migrationBuilder.DropTable(
                name: "password_setup_tokens");

            migrationBuilder.DropTable(
                name: "role_permissions");

            migrationBuilder.DropTable(
                name: "employees");

            migrationBuilder.DropTable(
                name: "permissions");

            migrationBuilder.DropTable(
                name: "roles");
        }
    }
}
