# HMS Platform MVP

Fresh HMS microservice MVP built with:

- ASP.NET Core Web API services on `net9.0`
- Angular standalone frontend
- Tailwind CSS enterprise UI shell
- YARP API Gateway
- Docker Compose
- Local PostgreSQL, pgAdmin, RabbitMQ, and Redis prepared for next-stage development

## Project Layout

```text
hms-platform/
  backend/
    HMS.sln
    src/
      ApiGateway/HMS.ApiGateway
      BuildingBlocks/HMS.SharedKernel
      BuildingBlocks/HMS.Contracts
      Services/Identity
      Services/Patients
      Services/Appointments
      Services/Clinical
      Services/Billing
  frontend/
    hms-web
  deploy/
    docker-compose.yml
  docs/
```

## Current MVP Services

| Service | Port | Responsibility |
|---|---:|---|
| API Gateway | 5000 | Single frontend entry point |
| Identity API | 5101 | Login and employees |
| Patients API | 5102 | Patient registration/list |
| Appointments API | 5103 | Appointments and beds |
| Clinical API | 5104 | Prescriptions and lab requests |
| Billing API | 5105 | Invoices and payments |
| Angular Web | 4200 | HMS UI |
| RabbitMQ UI | 15672 | Message broker dashboard |
| PostgreSQL | 5432 | Local PC database used by Patients API |
| pgAdmin | 5050 | PostgreSQL admin UI |
| Redis | 6379 | Future cache/session support |

## PostgreSQL / pgAdmin

This setup now targets the PostgreSQL server installed on your PC. Docker containers reach it through `host.docker.internal`.

```text
Host from Docker services: host.docker.internal
Host from local machine / pgAdmin on Windows: localhost
Port: 5432
Username: postgres
Password: Amen@2461
Default database: hms_identity_db
```

pgAdmin:

```text
URL: http://localhost:5050
Email: admin@hms.dev
Password: PgAdmin@123
```

When adding the server in pgAdmin, use:

```text
Host name/address: host.docker.internal
Port: 5432
Maintenance database: hms_identity_db
Username: postgres
Password: Amen@2461
```

The Compose file also contains an optional PostgreSQL container for isolated testing. It is disabled by default. Start it only when you explicitly want a Docker-owned database:

```powershell
docker compose --profile docker-db up -d postgres
```

## Seeded Login Users

All seeded users use:

```text
Admin@123
```

```text
admin@hms.local
doctor@hms.local
receptionist@hms.local
nurse@hms.local
pharmacist@hms.local
lab@hms.local
accountant@hms.local
```

## Build Backend

```powershell
cd "D:\Mine Only\Private\hms-platform\backend"
dotnet build .\HMS.sln
```

## Build Frontend

```powershell
cd "D:\Mine Only\Private\hms-platform\frontend\hms-web"
npm.cmd install --cache .\.npm-cache
npm.cmd run build
```

## Run With Docker

```powershell
cd "D:\Mine Only\Private\hms-platform\deploy"
docker compose up --build
```

Then open:

```text
http://localhost:4200
```

The frontend calls the gateway at:

```text
http://localhost:5000
```

## Run Without Docker

Make sure PostgreSQL is running on your PC:

```text
Host: localhost
Port: 5432
Database: hms_identity_db
Username: postgres
Password: Amen@2461
```

Open separate PowerShell windows:

```powershell
cd "D:\Mine Only\Private\hms-platform\backend"
$env:ASPNETCORE_ENVIRONMENT="Development"
dotnet run --project .\src\Services\Identity\HMS.Identity.Api\HMS.Identity.Api.csproj --urls http://localhost:5101
```

```powershell
cd "D:\Mine Only\Private\hms-platform\backend"
$env:ASPNETCORE_ENVIRONMENT="Development"
dotnet run --project .\src\Services\Patients\HMS.Patients.Api\HMS.Patients.Api.csproj --urls http://localhost:5102
```

```powershell
cd "D:\Mine Only\Private\hms-platform\backend"
$env:ASPNETCORE_ENVIRONMENT="Development"
dotnet run --project .\src\Services\Appointments\HMS.Appointments.Api\HMS.Appointments.Api.csproj --urls http://localhost:5103
```

```powershell
cd "D:\Mine Only\Private\hms-platform\backend"
$env:ASPNETCORE_ENVIRONMENT="Development"
dotnet run --project .\src\Services\Clinical\HMS.Clinical.Api\HMS.Clinical.Api.csproj --urls http://localhost:5104
```

```powershell
cd "D:\Mine Only\Private\hms-platform\backend"
$env:ASPNETCORE_ENVIRONMENT="Development"
dotnet run --project .\src\Services\Billing\HMS.Billing.Api\HMS.Billing.Api.csproj --urls http://localhost:5105
```

```powershell
cd "D:\Mine Only\Private\hms-platform\backend"
$env:ASPNETCORE_ENVIRONMENT="Development"
dotnet run --project .\src\ApiGateway\HMS.ApiGateway\HMS.ApiGateway.csproj --urls http://localhost:5000
```

Then start Angular:

```powershell
cd "D:\Mine Only\Private\hms-platform\frontend\hms-web"
npm.cmd start
```

Open:

```text
http://localhost:4200
```

## Quick API Test

```powershell
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:5000/api/auth/login" `
  -ContentType "application/json" `
  -Body '{"emailAddress":"admin@hms.local","password":"Admin@123"}'
```

## RabbitMQ Event Demo

RabbitMQ is used for asynchronous communication between services. In this MVP, the Patients API publishes a `PatientRegistered` event whenever a new patient is registered.

Open RabbitMQ:

```text
http://localhost:15672
Username: guest
Password: guest
```

Then check:

```text
Exchanges: hms.events
Queues: hms.patient-registered
Routing key: patient.registered
```

Register a patient in the Angular Patients module. The queue message count will increase.

## Next Development Steps

1. Replace in-memory lists with EF Core DbContexts per service.
2. Add real JWT authentication and authorization policies.
3. Add migrations for:
   - `hms_identity_db`
   - `hms_patients_db`
   - `hms_appointments_db`
   - `hms_clinical_db`
   - `hms_billing_db`
4. Add RabbitMQ integration events:
   - `PatientRegistered`
   - `AppointmentCreated`
   - `LabRequestCreated`
   - `InvoicePaid`
5. Expand Angular feature modules into real CRUD screens.

For PostgreSQL EF Core, use the Npgsql provider in each infrastructure project:

```powershell
dotnet add .\src\Services\Identity\HMS.Identity.Infrastructure\HMS.Identity.Infrastructure.csproj package Npgsql.EntityFrameworkCore.PostgreSQL
```
