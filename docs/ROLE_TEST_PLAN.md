# HMS MVP Role Test Plan

## Admin

- Login as `admin@hms.local`.
- Verify dashboard opens.
- Open Employees and confirm seeded users load.
- Open Patients, Appointments, Clinical, and Billing.

## Receptionist

- Login as `receptionist@hms.local`.
- Verify Patients and Appointments are visible.
- Confirm Employees and Billing are hidden.

## Doctor

- Login as `doctor@hms.local`.
- Verify Patients, Appointments, and Clinical are visible.

## Nurse

- Login as `nurse@hms.local`.
- Verify Patients and Clinical are visible.

## Pharmacist

- Login as `pharmacist@hms.local`.
- Verify Clinical is visible.

## Lab Technician

- Login as `lab@hms.local`.
- Verify Clinical is visible.

## Accountant

- Login as `accountant@hms.local`.
- Verify Billing is visible.

## Core End-to-End MVP Flow

1. Admin logs in.
2. Admin reviews employee list.
3. Receptionist logs in.
4. Receptionist reviews patients and appointments.
5. Doctor logs in.
6. Doctor reviews clinical area.
7. Accountant logs in.
8. Accountant reviews billing area.

The first MVP uses in-memory data. Data resets when containers restart. PostgreSQL and pgAdmin are already included in Docker Compose for the next implementation milestone.
