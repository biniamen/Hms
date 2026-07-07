CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS employees (
    id uuid PRIMARY KEY,
    employee_no varchar(32) NOT NULL UNIQUE,
    full_name varchar(160) NOT NULL,
    email_address varchar(160) NOT NULL UNIQUE,
    role varchar(64) NOT NULL,
    department varchar(96) NOT NULL,
    password_hint varchar(64) NOT NULL DEFAULT 'Admin@123',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS patients (
    id uuid PRIMARY KEY,
    mrn varchar(32) NOT NULL UNIQUE,
    first_name varchar(96) NOT NULL,
    last_name varchar(96) NOT NULL,
    phone varchar(32) NOT NULL,
    gender varchar(32) NOT NULL,
    date_of_birth date NOT NULL,
    address text,
    blood_type varchar(16),
    emergency_contact_name varchar(160),
    emergency_contact_phone varchar(32),
    photo_content_type varchar(80),
    photo_data bytea,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE patients ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS blood_type varchar(16);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_name varchar(160);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_phone varchar(32);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS photo_content_type varchar(80);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS photo_data bytea;

CREATE TABLE IF NOT EXISTS beds (
    id uuid PRIMARY KEY,
    ward varchar(96) NOT NULL,
    bed_no varchar(32) NOT NULL UNIQUE,
    status varchar(32) NOT NULL
);

CREATE TABLE IF NOT EXISTS appointments (
    id uuid PRIMARY KEY,
    patient_id uuid NOT NULL REFERENCES patients(id),
    doctor_employee_id uuid NOT NULL REFERENCES employees(id),
    scheduled_at timestamptz NOT NULL,
    reason varchar(240) NOT NULL,
    status varchar(32) NOT NULL
);

CREATE TABLE IF NOT EXISTS prescriptions (
    id uuid PRIMARY KEY,
    patient_id uuid NOT NULL REFERENCES patients(id),
    doctor_employee_id uuid NOT NULL REFERENCES employees(id),
    medication varchar(160) NOT NULL,
    dosage varchar(96) NOT NULL,
    instructions varchar(240) NOT NULL,
    status varchar(32) NOT NULL
);

CREATE TABLE IF NOT EXISTS lab_requests (
    id uuid PRIMARY KEY,
    patient_id uuid NOT NULL REFERENCES patients(id),
    doctor_employee_id uuid NOT NULL REFERENCES employees(id),
    test_name varchar(160) NOT NULL,
    status varchar(32) NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
    id uuid PRIMARY KEY,
    patient_id uuid NOT NULL REFERENCES patients(id),
    invoice_no varchar(32) NOT NULL UNIQUE,
    total_amount numeric(12,2) NOT NULL,
    status varchar(32) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
    id uuid PRIMARY KEY,
    invoice_id uuid NOT NULL REFERENCES invoices(id),
    amount numeric(12,2) NOT NULL,
    method varchar(32) NOT NULL,
    paid_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO employees (id, employee_no, full_name, email_address, role, department)
VALUES
('fe89d0c5-6232-421b-9926-05eff4433bd9', 'EMP-0001', 'System Administrator', 'admin@hms.local', 'ADMIN', 'Administration'),
('8f334882-8d97-4d54-a011-97d7c8c2a201', 'EMP-0002', 'Dr. Hana Tesfaye', 'doctor@hms.local', 'DOCTOR', 'Outpatient'),
('52f4d81d-e810-4c4e-895b-995f1bbf13a2', 'EMP-0003', 'Marta Abebe', 'receptionist@hms.local', 'RECEPTIONIST', 'Front Desk'),
('43a3b779-c6f9-496c-b8b6-81525947cf12', 'EMP-0004', 'Nurse Daniel Kebede', 'nurse@hms.local', 'NURSE', 'Ward'),
('83f36db8-5c4d-4f2a-9b54-00c31a31ab7d', 'EMP-0005', 'Pharmacist Liya Tadesse', 'pharmacist@hms.local', 'PHARMACIST', 'Pharmacy'),
('7c5b23a5-5970-4b95-8d02-c36c1c9ac8e1', 'EMP-0006', 'Lab Tech Yonatan', 'lab@hms.local', 'LAB_TECHNICIAN', 'Laboratory'),
('fbdd5447-1864-4420-b42d-60ba5afaf23e', 'EMP-0007', 'Accountant Selam', 'accountant@hms.local', 'ACCOUNTANT', 'Finance')
ON CONFLICT (email_address) DO NOTHING;

INSERT INTO patients (id, mrn, first_name, last_name, phone, gender, date_of_birth, address, blood_type, emergency_contact_name, emergency_contact_phone)
VALUES
('f64d3368-a4da-4d44-9612-5c302b0ec29a', 'MRN-0001', 'Sara', 'Bekele', '0920000001', 'Female', '1995-05-10', 'Bole, Addis Ababa', 'O+', 'Meron Bekele', '0921000001'),
('d5c6bf11-de68-4c3f-97d2-6d7fd12f8e80', 'MRN-0002', 'Dawit', 'Alemu', '0920000002', 'Male', '1988-02-20', 'CMC, Addis Ababa', 'A+', 'Alem Alemu', '0921000002')
ON CONFLICT (mrn) DO NOTHING;

INSERT INTO beds (id, ward, bed_no, status)
VALUES
('c7e6c2bc-972f-47c1-a206-5f4e27f50cf7', 'General', 'G-101', 'Available'),
('e33cfb8d-6d4a-4785-ac08-f436dc63a476', 'Maternity', 'M-201', 'Occupied')
ON CONFLICT (bed_no) DO NOTHING;

INSERT INTO appointments (id, patient_id, doctor_employee_id, scheduled_at, reason, status)
VALUES
('29cb54e6-b268-4f62-ac89-41ca434658c7', 'f64d3368-a4da-4d44-9612-5c302b0ec29a', '8f334882-8d97-4d54-a011-97d7c8c2a201', now() + interval '1 day', 'General consultation', 'Scheduled')
ON CONFLICT (id) DO NOTHING;

INSERT INTO prescriptions (id, patient_id, doctor_employee_id, medication, dosage, instructions, status)
VALUES
('325cf3a1-2af1-4b69-8a17-6fac5c547915', 'f64d3368-a4da-4d44-9612-5c302b0ec29a', '8f334882-8d97-4d54-a011-97d7c8c2a201', 'Amoxicillin', '500mg', 'Take one capsule every 8 hours for 5 days', 'Issued')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lab_requests (id, patient_id, doctor_employee_id, test_name, status)
VALUES
('3cb3eb61-03a4-4fec-8517-9d2778f6e40d', 'd5c6bf11-de68-4c3f-97d2-6d7fd12f8e80', '8f334882-8d97-4d54-a011-97d7c8c2a201', 'Complete Blood Count', 'Requested')
ON CONFLICT (id) DO NOTHING;

INSERT INTO invoices (id, patient_id, invoice_no, total_amount, status)
VALUES
('9ba2c72a-29f0-4f4c-8f43-890a53b327da', 'f64d3368-a4da-4d44-9612-5c302b0ec29a', 'INV-0001', 750.00, 'Unpaid')
ON CONFLICT (invoice_no) DO NOTHING;
