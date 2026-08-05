# HMS Platform

Hospital Management System platform built with ASP.NET Core Web API services, Angular, Tailwind CSS, YARP API Gateway, PostgreSQL, RabbitMQ, Redis, and Docker Compose.

The first-phase product covers identity and administration, patient management, clinical workflow, billing, and an Enterprise HMS operations desk for cross-department hospital work.

## Project Layout

```text
hms-platform/
  backend/
    HMS.sln
    NuGet.Config
    src/
      ApiGateway/HMS.ApiGateway
      BuildingBlocks/HMS.SharedKernel
      BuildingBlocks/HMS.Contracts
      Services/Identity
      Services/Patients
      Services/Clinical
      Services/Billing
  newfrontend/              # Active Angular UI
  frontend/
    hms-web                 # Legacy UI kept for reference only
  deploy/
    docker-compose.yml
    postgres/init/01-hms-seed.sql
  docs/
    HMS_ARCHITECTURE_CEO_BRIEF.md
    ENTERPRISE_OPERATIONS_WORKFLOW.md
```

## Core Services

| Service | Port | Responsibility |
|---|---:|---|
| API Gateway | 5200 | Single frontend entry point |
| Identity/Admin API | 5101 | Login, employees, roles, permissions, password setup/reset, email outbox |
| Patient Management API | 5102 | Patients, photos, insurance selection, appointments, queue, beds |
| Clinical API | 5104 | Encounters, vitals, diagnoses, prescriptions, lab requests, enterprise records |
| Billing API | 5105 | Invoices, service line items, payments, receipts |
| Angular Web | 4200 | Browser-based HMS workspace |
| PostgreSQL | 5432 | Service databases |
| RabbitMQ UI | 15672 | Event broker dashboard |
| pgAdmin | 5050 | PostgreSQL admin UI |
| Redis | 6379 | Cache/session support |

Appointments are handled inside the Patient Management service. The old standalone Appointments project is not part of the active solution.
`newfrontend` is the active frontend used by local startup, Docker Compose, CI, and generated API clients. The older `frontend/hms-web` project is retained only as a reference and should not be used for new UI work.

## Prerequisites

Install these before running without Docker:

- .NET 9 SDK
- Node.js and npm
- PostgreSQL running on `localhost:5432`
- PowerShell

Docker users only need Docker Desktop.

## Database Configuration

Default local PostgreSQL connection:

```text
Host: localhost
Port: 5432
Username: configured locally
Password: configured locally
```

Databases used by the services:

```text
hms_identity_db
hms_patient_management_db
hms_clinical_db
hms_billing_db
```

When using Docker Compose, the PostgreSQL container and init script create the required databases automatically.

Persistence standard:

- Each active backend service uses EF Core with its own PostgreSQL database.
- Each service applies its EF Core migrations on startup.
- Each service seeds the default data required for local testing.
- The Docker PostgreSQL init script only creates database shells; EF Core owns schemas, migrations, and seed behavior.

EF Core migration projects:

```text
Identity  -> backend/src/Services/Identity/HMS.Identity.Infrastructure
Patients  -> backend/src/Services/Patients/HMS.Patients.Infrastructure
Clinical  -> backend/src/Services/Clinical/HMS.Clinical.Infrastructure
Billing   -> backend/src/Services/Billing/HMS.Billing.Infrastructure
```

For a clean first run on a developer machine, keep these service databases empty or drop and recreate them once before starting the services. This avoids conflicts with older raw-SQL tables that were created before EF Core migrations were introduced.

pgAdmin:

```text
URL: http://localhost:5050
Email: configured in deploy/.env
Password: configured in deploy/.env
```

When registering the Docker PostgreSQL server in pgAdmin:

```text
Host name/address: postgres
Port: 5432
Maintenance database: hms_identity_db
Username: configured locally
Password: configured locally
```

Create a private local runtime config before starting without Docker:

```powershell
cd "D:\Mine Only\Private\hms-platform"
Copy-Item .\hms.local.example.ps1 .\hms.local.ps1
notepad .\hms.local.ps1
```

Set:

```powershell
$env:HMS_POSTGRES_PASSWORD = "your-postgres-password"
$env:Security__Jwt__SigningKey = "at-least-32-random-characters"
$env:Seed__DefaultPassword = "your-local-bootstrap-password"
```

`hms.local.ps1` is ignored by Git.

## SMTP Configuration

The application supports secure user onboarding. When an administrator creates a user, the Identity service sends a one-time password setup link. If SMTP is not configured, the link is saved in the Email Outbox for local testing.

Create a private SMTP file:

```powershell
cd "D:\Mine Only\Private\hms-platform"
Copy-Item .\smtp.local.example.ps1 .\smtp.local.ps1
notepad .\smtp.local.ps1
```

Set your Gmail address and Gmail App Password:

```powershell
$env:Email__FromAddress = "your-gmail-address@gmail.com"
$env:Email__Smtp__Username = "your-gmail-address@gmail.com"
$env:Email__Smtp__Password = "your-gmail-app-password"
$env:Email__ExposeLocalSetupLinks = "false"
```

Notes:

- Use a Gmail App Password, not the normal Gmail login password.
- The startup script removes spaces from the app password automatically.
- `smtp.local.ps1` is ignored by Git and must not be pushed.
- Keep real credentials out of `smtp.local.example.ps1`.

## Run Without Docker

Recommended local startup:

```powershell
cd "D:\Mine Only\Private\hms-platform"
powershell -ExecutionPolicy Bypass -File .\start-hms.ps1
```

The script will:

1. Load local runtime settings from `hms.local.ps1` when present.
2. Load SMTP settings from `smtp.local.ps1` when present.
3. Restore packages using `backend/NuGet.Config`.
4. Build the backend solution.
5. Install frontend packages when `node_modules` is missing.
6. Start Identity, Patients, Clinical, Billing, and API Gateway.
7. Start Angular.
8. Write runtime logs to `.runtime-logs`.

Open the system:

```text
http://localhost:4200
```

API Gateway:

```text
http://localhost:5200
```

Wait about 60-90 seconds for Angular to compile after starting the script.

## Seed Local Database

Use this after cloning the project on a new developer machine, or when a teammate needs the default HMS test data in PostgreSQL.

1. Create local runtime config:

```powershell
cd "D:\Mine Only\Private\hms-platform"
Copy-Item .\hms.local.example.ps1 .\hms.local.ps1
notepad .\hms.local.ps1
```

2. Set these values in `hms.local.ps1`:

```powershell
$env:HMS_POSTGRES_HOST = "localhost"
$env:HMS_POSTGRES_PORT = "5432"
$env:HMS_POSTGRES_USER = "postgres"
$env:HMS_POSTGRES_PASSWORD = "your-postgres-password"
$env:Security__Jwt__SigningKey = "at-least-32-random-characters"
$env:Seed__DefaultPassword = "your-local-login-password"
```

3. Run the seed script:

```powershell
powershell -ExecutionPolicy Bypass -File .\seed-hms.ps1
```

The script creates/migrates and seeds:

```text
hms_identity_db
hms_patient_management_db
hms_clinical_db
hms_billing_db
```

It seeds default users, roles, permissions, departments, doctors, patients, insurance companies, appointments, beds, vitals, encounters, prescriptions, lab requests, diagnostic tests, invoices, payments, and enterprise operation records.

After seeding, start the system:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-hms.ps1
```

## Run With Docker

```powershell
cd "D:\Mine Only\Private\hms-platform\deploy"
Copy-Item .\docker.env.example .\.env
notepad .\.env
docker compose up --build
```

Then open:

```text
http://localhost:4200
```

## Build Commands

Backend:

```powershell
cd "D:\Mine Only\Private\hms-platform\backend"
$env:APPDATA = Join-Path (Get-Location) ".appdata"
dotnet restore .\HMS.sln --configfile .\NuGet.Config
dotnet build .\HMS.sln --no-restore
```

Frontend:

```powershell
cd "D:\Mine Only\Private\hms-platform\newfrontend"
npm.cmd install --legacy-peer-deps --cache .\.npm-cache
npm.cmd run build -- --no-progress
```

## Seeded Login Users

The seed password is not stored in source code. Set it in `hms.local.ps1` for local startup or `deploy/.env` for Docker:

```text
Seed__DefaultPassword / HMS_SEED_DEFAULT_PASSWORD
```

Users:

```text
admin@hms.local
doctor@hms.local
receptionist@hms.local
nurse@hms.local
pharmacist@hms.local
lab@hms.local
accountant@hms.local
```

## User Onboarding Flow

1. Admin opens Administration.
2. Admin creates an employee/system user.
3. Identity service creates the account as pending.
4. The setup link is sent by SMTP or saved in Email Outbox.
5. The user opens the link and creates a password.
6. The user signs in and sees role-specific modules.

## Enterprise HMS Workspace

Enterprise HMS is the hospital-wide operations desk. It is used for work that needs ownership, priority, due date, patient reference, department handoff, financial value, print/export, or management visibility.

Covered areas:

```text
Pharmacy
Laboratory
Radiology
Inpatient
Emergency
Operating Theatre
Inventory
Procurement
Asset Management
Biomedical Maintenance
Insurance Claims
Security Audit
Notifications
Documents
Reporting
Integration
```

Workflow:

```text
Create record -> assign owner -> set priority and due date -> update status -> review -> close -> report/export
```

Full workflow documentation:

```text
docs/ENTERPRISE_OPERATIONS_WORKFLOW.md
```

## RabbitMQ Event Flow

RabbitMQ is used for asynchronous communication between services. The Patients API publishes a `PatientRegistered` event when a patient is registered.

RabbitMQ:

```text
URL: http://localhost:15672
Username: configured locally
Password: configured locally
```

Check:

```text
Exchange: hms.events
Queue: hms.patient-registered
Routing key: patient.registered
```

## Quick API Test

```powershell
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:5200/api/auth/login" `
  -ContentType "application/json" `
  -Body (@{ emailAddress = "admin@hms.local"; password = $env:Seed__DefaultPassword } | ConvertTo-Json)
```

## GitLab Handoff

The repository is prepared to push source code, scripts, seed data, and selected documentation only.

Included:

```text
README.md
start-hms.ps1
seed-hms.ps1
hms.local.example.ps1
smtp.local.example.ps1
backend/
newfrontend/
deploy/docker-compose.yml
deploy/docker.env.example
deploy/postgres/init/01-hms-seed.sql
docs/HMS_ARCHITECTURE_CEO_BRIEF.md
docs/ENTERPRISE_OPERATIONS_WORKFLOW.md
```

Excluded by `.gitignore`:

```text
smtp.local.ps1
hms.local.ps1
deploy/.env
.runtime-logs/
bin/
obj/
dist/
node_modules/
.angular/
.npm-cache/
*.log
generated Word/PDF/image/report files under docs/
```

Push steps:

```powershell
cd "D:\Mine Only\Private\hms-platform"
git status --short
git add .
git status --short
git commit -m "Finalize HMS first phase"
git branch -M main
git remote add origin <your-gitlab-repository-url>
git push -u origin main
```

If `origin` already exists:

```powershell
git remote set-url origin <your-gitlab-repository-url>
git push -u origin main
```

## Production Hardening Backlog

Recommended work before live hospital rollout:

1. Add refresh-token/session revocation and optional external identity provider integration.
2. Add audit trail and immutable activity history.
3. Add production notification provider for email and SMS.
4. Add CI/CD pipeline in GitLab.
5. Add centralized logging, health checks, metrics, and alerts.
6. Add database backup, restore, and disaster recovery procedures.
7. Add hospital-specific roles, approval flows, reports, and regulatory templates.
