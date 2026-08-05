param(
    [switch]$SkipBuild,
    [int]$TimeoutSeconds = 90
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
$logDir = Join-Path $root ".runtime-logs"
$tempDir = Join-Path $root ".runtime-tmp"
$localConfig = Join-Path $root "hms.local.ps1"
$dotnetHome = Join-Path $backend ".dotnet-home"
$dotnetAppData = Join-Path $backend ".appdata"

if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

if (-not (Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir | Out-Null
}

$env:DOTNET_CLI_HOME = $dotnetHome
$env:APPDATA = $dotnetAppData
$env:DOTNET_NOLOGO = "true"
$env:DOTNET_SKIP_FIRST_TIME_EXPERIENCE = "1"
$env:DOTNET_CLI_TELEMETRY_OPTOUT = "1"
$env:DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE = "1"
$env:TEMP = $tempDir
$env:TMP = $tempDir
$env:ASPNETCORE_ENVIRONMENT = "Development"

$nugetConfigDir = Join-Path $dotnetAppData "NuGet"
if (-not (Test-Path $nugetConfigDir)) {
    New-Item -ItemType Directory -Path $nugetConfigDir -Force | Out-Null
}
Copy-Item -LiteralPath (Join-Path $backend "NuGet.Config") -Destination (Join-Path $nugetConfigDir "NuGet.Config") -Force

if (Test-Path $localConfig) {
    . $localConfig
}

function New-Base64Secret {
    param([int]$ByteCount = 48)

    $bytes = New-Object byte[] $ByteCount
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $rng.GetBytes($bytes)
    } finally {
        $rng.Dispose()
    }

    [Convert]::ToBase64String($bytes)
}

if ([string]::IsNullOrWhiteSpace($env:Security__Jwt__SigningKey)) {
    $env:Security__Jwt__SigningKey = New-Base64Secret
    Write-Warning "Security__Jwt__SigningKey was not configured. A temporary development signing key was generated for this seed run."
}

if ([string]::IsNullOrWhiteSpace($env:Seed__DefaultPassword)) {
    throw "Seed__DefaultPassword is required. Copy hms.local.example.ps1 to hms.local.ps1 and set Seed__DefaultPassword before running this script."
}

$pgHost = if ([string]::IsNullOrWhiteSpace($env:HMS_POSTGRES_HOST)) { "localhost" } else { $env:HMS_POSTGRES_HOST }
$pgPort = if ([string]::IsNullOrWhiteSpace($env:HMS_POSTGRES_PORT)) { "5432" } else { $env:HMS_POSTGRES_PORT }
$pgUser = if ([string]::IsNullOrWhiteSpace($env:HMS_POSTGRES_USER)) { "postgres" } else { $env:HMS_POSTGRES_USER }

if ([string]::IsNullOrWhiteSpace($env:ConnectionStrings__IdentityDb) -or
    [string]::IsNullOrWhiteSpace($env:ConnectionStrings__PatientManagementDb) -or
    [string]::IsNullOrWhiteSpace($env:ConnectionStrings__ClinicalDb) -or
    [string]::IsNullOrWhiteSpace($env:ConnectionStrings__BillingDb)) {

    if ([string]::IsNullOrWhiteSpace($env:HMS_POSTGRES_PASSWORD)) {
        throw "Database password is not configured. Set HMS_POSTGRES_PASSWORD in hms.local.ps1, or set the ConnectionStrings__* environment variables."
    }

    $env:ConnectionStrings__IdentityDb = "Host=$pgHost;Port=$pgPort;Database=hms_identity_db;Username=$pgUser;Password=$env:HMS_POSTGRES_PASSWORD"
    $env:ConnectionStrings__PatientManagementDb = "Host=$pgHost;Port=$pgPort;Database=hms_patient_management_db;Username=$pgUser;Password=$env:HMS_POSTGRES_PASSWORD"
    $env:ConnectionStrings__ClinicalDb = "Host=$pgHost;Port=$pgPort;Database=hms_clinical_db;Username=$pgUser;Password=$env:HMS_POSTGRES_PASSWORD"
    $env:ConnectionStrings__BillingDb = "Host=$pgHost;Port=$pgPort;Database=hms_billing_db;Username=$pgUser;Password=$env:HMS_POSTGRES_PASSWORD"
}

$env:Database__ResetLegacySchemaOnStartup = if ([string]::IsNullOrWhiteSpace($env:Database__ResetLegacySchemaOnStartup)) { "true" } else { $env:Database__ResetLegacySchemaOnStartup }
$env:Email__ExposeLocalSetupLinks = "true"

if (-not $SkipBuild) {
    Write-Host "Building backend solution..."
    Push-Location $backend
    dotnet restore .\HMS.sln --configfile .\NuGet.Config -p:NuGetAudit=false
    dotnet build .\HMS.sln --no-restore -p:NuGetAudit=false
    Pop-Location
}

$services = @(
    @{
        Name = "Identity/Admin"
        Project = "src\Services\Identity\HMS.Identity.Api\HMS.Identity.Api.csproj"
        Url = "http://localhost:5501"
        Health = "http://localhost:5501/health"
    },
    @{
        Name = "Patient Management"
        Project = "src\Services\Patients\HMS.Patients.Api\HMS.Patients.Api.csproj"
        Url = "http://localhost:5502"
        Health = "http://localhost:5502/health"
    },
    @{
        Name = "Clinical"
        Project = "src\Services\Clinical\HMS.Clinical.Api\HMS.Clinical.Api.csproj"
        Url = "http://localhost:5504"
        Health = "http://localhost:5504/health"
    },
    @{
        Name = "Billing"
        Project = "src\Services\Billing\HMS.Billing.Api\HMS.Billing.Api.csproj"
        Url = "http://localhost:5505"
        Health = "http://localhost:5505/health"
    }
)

function Wait-HmsHealth {
    param(
        [string]$Name,
        [string]$HealthUrl,
        [System.Diagnostics.Process]$Process,
        [int]$TimeoutSeconds
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if ($Process.HasExited) {
            throw "$Name stopped before becoming healthy. Check .runtime-logs/seed-$($Name -replace '[^A-Za-z0-9]+','-').err.log."
        }

        try {
            $response = Invoke-WebRequest -Uri $HealthUrl -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
                return
            }
        } catch {
        }

        Start-Sleep -Seconds 2
    }

    throw "$Name did not become healthy within $TimeoutSeconds seconds."
}

foreach ($service in $services) {
    $safeName = $service.Name -replace '[^A-Za-z0-9]+', '-'
    $stdout = Join-Path $logDir "seed-$safeName.out.log"
    $stderr = Join-Path $logDir "seed-$safeName.err.log"
    if (Test-Path $stdout) { Remove-Item -LiteralPath $stdout -Force }
    if (Test-Path $stderr) { Remove-Item -LiteralPath $stderr -Force }

    Write-Host "Migrating and seeding $($service.Name)..."
    $projectPath = Join-Path $backend $service.Project
    $arguments = "run --project `"$projectPath`" --no-build --urls $($service.Url)"

    $process = Start-Process -FilePath "dotnet" `
        -ArgumentList $arguments `
        -WorkingDirectory $backend `
        -WindowStyle Hidden `
        -RedirectStandardOutput $stdout `
        -RedirectStandardError $stderr `
        -PassThru

    try {
        Wait-HmsHealth -Name $service.Name -HealthUrl $service.Health -Process $process -TimeoutSeconds $TimeoutSeconds
        Write-Host "$($service.Name) database migrated and seeded."
    } finally {
        if (-not $process.HasExited) {
            Stop-Process -Id $process.Id -Force
            $process.WaitForExit()
        }
    }
}

Write-Host ""
Write-Host "HMS database seed completed successfully."
Write-Host ""
Write-Host "Databases prepared:"
Write-Host "  - hms_identity_db"
Write-Host "  - hms_patient_management_db"
Write-Host "  - hms_clinical_db"
Write-Host "  - hms_billing_db"
Write-Host ""
Write-Host "Seeded table groups:"
Write-Host "  - Identity: employees, roles, permissions, role_permissions, departments, password_setup_tokens, email_outbox"
Write-Host "  - Patient Management: patients, insurance_companies, appointments, beds"
Write-Host "  - Clinical: clinical_encounters, vital_signs, diagnoses, prescriptions, lab_requests, diagnostic_tests, enterprise_records"
Write-Host "  - Billing: invoices, invoice_items, payments, doctor_service_prices"
Write-Host ""
Write-Host "Seed login users use the password from Seed__DefaultPassword in hms.local.ps1."
Write-Host "Example users:"
Write-Host "  - admin@hms.local"
Write-Host "  - doctor@hms.local"
Write-Host "  - receptionist@hms.local"
Write-Host "  - nurse@hms.local"
Write-Host "  - pharmacist@hms.local"
Write-Host "  - lab@hms.local"
Write-Host "  - accountant@hms.local"
