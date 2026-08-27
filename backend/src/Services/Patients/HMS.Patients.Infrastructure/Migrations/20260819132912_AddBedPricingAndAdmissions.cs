using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HMS.Patients.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBedPricingAndAdmissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE beds ADD COLUMN IF NOT EXISTS admitted_at_utc timestamp with time zone NULL;
                ALTER TABLE beds ADD COLUMN IF NOT EXISTS category character varying(32) NOT NULL DEFAULT 'Normal';
                ALTER TABLE beds ADD COLUMN IF NOT EXISTS currency character varying(3) NOT NULL DEFAULT 'ETB';
                ALTER TABLE beds ADD COLUMN IF NOT EXISTS current_admission_id uuid NULL;
                ALTER TABLE beds ADD COLUMN IF NOT EXISTS current_patient_id uuid NULL;
                ALTER TABLE beds ADD COLUMN IF NOT EXISTS current_patient_mrn character varying(32) NULL;
                ALTER TABLE beds ADD COLUMN IF NOT EXISTS current_patient_name character varying(180) NULL;
                ALTER TABLE beds ADD COLUMN IF NOT EXISTS daily_rate numeric(12,2) NOT NULL DEFAULT 0;

                UPDATE beds SET category = 'Normal' WHERE category IS NULL OR category = '';
                UPDATE beds SET currency = 'ETB' WHERE currency IS NULL OR currency = '';

                CREATE TABLE IF NOT EXISTS bed_admissions (
                    "Id" uuid NOT NULL,
                    patient_id uuid NOT NULL,
                    patient_name character varying(180) NOT NULL,
                    patient_mrn character varying(32) NOT NULL,
                    bed_id uuid NOT NULL,
                    ward character varying(96) NOT NULL,
                    room character varying(32) NOT NULL,
                    bed_number character varying(32) NOT NULL,
                    bed_category character varying(32) NOT NULL,
                    daily_rate numeric(12,2) NOT NULL,
                    currency character varying(3) NOT NULL,
                    admitted_at_utc timestamp with time zone NOT NULL,
                    discharged_at_utc timestamp with time zone NULL,
                    chargeable_days integer NOT NULL DEFAULT 0,
                    bed_charge numeric(12,2) NOT NULL DEFAULT 0,
                    status character varying(32) NOT NULL,
                    notes text NULL,
                    created_at timestamp with time zone NOT NULL DEFAULT now(),
                    "CreatedBy" uuid NULL,
                    "UpdatedBy" uuid NULL,
                    "CreatedByIp" text NULL,
                    "IsDeleted" boolean NOT NULL DEFAULT false,
                    "DeletedAtUtc" timestamp with time zone NULL,
                    CONSTRAINT "PK_bed_admissions" PRIMARY KEY ("Id"),
                    CONSTRAINT "FK_bed_admissions_beds_bed_id" FOREIGN KEY (bed_id) REFERENCES beds ("Id") ON DELETE RESTRICT,
                    CONSTRAINT "FK_bed_admissions_patients_patient_id" FOREIGN KEY (patient_id) REFERENCES patients ("Id") ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS "IX_bed_admissions_bed_id_status" ON bed_admissions (bed_id, status);
                CREATE INDEX IF NOT EXISTS "IX_bed_admissions_patient_id_status" ON bed_admissions (patient_id, status);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP TABLE IF EXISTS bed_admissions;
                ALTER TABLE beds DROP COLUMN IF EXISTS admitted_at_utc;
                ALTER TABLE beds DROP COLUMN IF EXISTS category;
                ALTER TABLE beds DROP COLUMN IF EXISTS currency;
                ALTER TABLE beds DROP COLUMN IF EXISTS current_admission_id;
                ALTER TABLE beds DROP COLUMN IF EXISTS current_patient_id;
                ALTER TABLE beds DROP COLUMN IF EXISTS current_patient_mrn;
                ALTER TABLE beds DROP COLUMN IF EXISTS current_patient_name;
                ALTER TABLE beds DROP COLUMN IF EXISTS daily_rate;
                """);
        }
    }
}
