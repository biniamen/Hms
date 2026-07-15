-- Database bootstrap only.
-- EF Core migrations own tables, relationships, indexes, and seed data.

SELECT 'CREATE DATABASE hms_identity_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'hms_identity_db')\gexec

SELECT 'CREATE DATABASE hms_patient_management_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'hms_patient_management_db')\gexec

SELECT 'CREATE DATABASE hms_clinical_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'hms_clinical_db')\gexec

SELECT 'CREATE DATABASE hms_billing_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'hms_billing_db')\gexec
