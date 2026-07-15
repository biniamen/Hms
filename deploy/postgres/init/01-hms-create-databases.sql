-- Create per-service databases (safe to run multiple times)
SELECT 'CREATE DATABASE hms_patients_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'hms_patients_db')\gexec

SELECT 'CREATE DATABASE hms_appointments_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'hms_appointments_db')\gexec

SELECT 'CREATE DATABASE hms_clinical_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'hms_clinical_db')\gexec

SELECT 'CREATE DATABASE hms_billing_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'hms_billing_db')\gexec
