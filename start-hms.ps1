$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "newfrontend"
$logDir = Join-Path $root ".runtime-logs"
$localConfig = Join-Path $root "hms.local.ps1"
$smtpLocalConfig = Join-Path $root "smtp.local.ps1"
$dotnetHome = Join-Path $backend ".dotnet-home"
$dotnetAppData = Join-Path $backend ".appdata"

if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

$env:DOTNET_CLI_HOME = $dotnetHome
$env:APPDATA = $dotnetAppData
$nugetConfigDir = Join-Path $dotnetAppData "NuGet"
if (-not (Test-Path $nugetConfigDir)) {
    New-Item -ItemType Directory -Path $nugetConfigDir -Force | Out-Null
}
Copy-Item -LiteralPath (Join-Path $backend "NuGet.Config") -Destination (Join-Path $nugetConfigDir "NuGet.Config") -Force

if (Test-Path $localConfig) {
    Invoke-Expression (Get-Content -LiteralPath $localConfig -Raw)
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
    Write-Warning "Security__Jwt__SigningKey was not configured. A temporary development signing key was generated for this run."
}

$env:Database__ResetLegacySchemaOnStartup = if ([string]::IsNullOrWhiteSpace($env:Database__ResetLegacySchemaOnStartup)) { "true" } else { $env:Database__ResetLegacySchemaOnStartup }
if ($env:Database__ResetLegacySchemaOnStartup -eq "true") {
    Write-Warning "Legacy database schema reset is enabled for local development. Existing non-migrated HMS tables will be recreated by EF Core."
}

if ([string]::IsNullOrWhiteSpace($env:Seed__DefaultPassword)) {
    $env:Seed__DefaultPassword = "Hms-" + ([Guid]::NewGuid().ToString("N").Substring(0, 12)) + "A1"
    Write-Warning "Seed__DefaultPassword was not configured. Temporary development password: $env:Seed__DefaultPassword"
}

$pgHost = if ([string]::IsNullOrWhiteSpace($env:HMS_POSTGRES_HOST)) { "localhost" } else { $env:HMS_POSTGRES_HOST }
$pgPort = if ([string]::IsNullOrWhiteSpace($env:HMS_POSTGRES_PORT)) { "5432" } else { $env:HMS_POSTGRES_PORT }
$pgUser = if ([string]::IsNullOrWhiteSpace($env:HMS_POSTGRES_USER)) { "postgres" } else { $env:HMS_POSTGRES_USER }

if ([string]::IsNullOrWhiteSpace($env:ConnectionStrings__IdentityDb) -or
    [string]::IsNullOrWhiteSpace($env:ConnectionStrings__PatientManagementDb) -or
    [string]::IsNullOrWhiteSpace($env:ConnectionStrings__ClinicalDb) -or
    [string]::IsNullOrWhiteSpace($env:ConnectionStrings__BillingDb)) {

    if ([string]::IsNullOrWhiteSpace($env:HMS_POSTGRES_PASSWORD)) {
        throw "Database password is not configured. Copy hms.local.example.ps1 to hms.local.ps1 and set HMS_POSTGRES_PASSWORD, or set the ConnectionStrings__* environment variables."
    }

    $env:ConnectionStrings__IdentityDb = "Host=$pgHost;Port=$pgPort;Database=hms_identity_db;Username=$pgUser;Password=$env:HMS_POSTGRES_PASSWORD"
    $env:ConnectionStrings__PatientManagementDb = "Host=$pgHost;Port=$pgPort;Database=hms_patient_management_db;Username=$pgUser;Password=$env:HMS_POSTGRES_PASSWORD"
    $env:ConnectionStrings__ClinicalDb = "Host=$pgHost;Port=$pgPort;Database=hms_clinical_db;Username=$pgUser;Password=$env:HMS_POSTGRES_PASSWORD"
    $env:ConnectionStrings__BillingDb = "Host=$pgHost;Port=$pgPort;Database=hms_billing_db;Username=$pgUser;Password=$env:HMS_POSTGRES_PASSWORD"
}

if (-not [string]::IsNullOrWhiteSpace($env:HMS_RABBITMQ_HOST)) {
    $env:RabbitMq__HostName = $env:HMS_RABBITMQ_HOST
    $env:RabbitMq__Port = if ([string]::IsNullOrWhiteSpace($env:HMS_RABBITMQ_PORT)) { "5672" } else { $env:HMS_RABBITMQ_PORT }
    $env:RabbitMq__Username = $env:HMS_RABBITMQ_USERNAME
    $env:RabbitMq__Password = $env:HMS_RABBITMQ_PASSWORD
}

$env:Email__FromName = "HMS Platform"
$env:Email__Smtp__Host = "smtp.gmail.com"
$env:Email__Smtp__Port = "587"
$env:Email__Smtp__EnableSsl = "true"
$env:Email__ExposeLocalSetupLinks = "false"

if (Test-Path $smtpLocalConfig) {
    Invoke-Expression (Get-Content -LiteralPath $smtpLocalConfig -Raw)
}

if (-not [string]::IsNullOrWhiteSpace($env:Email__Smtp__Password)) {
    $env:Email__Smtp__Password = $env:Email__Smtp__Password -replace "\s", ""
}

if ([string]::IsNullOrWhiteSpace($env:Email__FromAddress) -and
    -not [string]::IsNullOrWhiteSpace($env:Email__Smtp__Username)) {
    $env:Email__FromAddress = $env:Email__Smtp__Username
}

if ([string]::IsNullOrWhiteSpace($env:Email__FromAddress) -or
    [string]::IsNullOrWhiteSpace($env:Email__Smtp__Username) -or
    [string]::IsNullOrWhiteSpace($env:Email__Smtp__Password)) {
    $env:Email__ExposeLocalSetupLinks = "true"
    Write-Warning "SMTP email is not fully configured. Create smtp.local.ps1 with your Gmail address and app password. Local setup links will remain visible in Email Outbox."
} else {
    Write-Host "SMTP email configured for $env:Email__Smtp__Username"
}

$ports = @(5101, 5102, 5104, 5105, 5200, 4200)
$connections = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $ports -contains $_.LocalPort }
foreach ($connection in $connections) {
    try {
        $process = Get-Process -Id $connection.OwningProcess -ErrorAction Stop
        Stop-Process -Id $process.Id -Force
    } catch {
    }
}

$ownPath = $root
try {
    Get-CimInstance Win32_Process -ErrorAction Stop |
        Where-Object {
            $_.CommandLine -and
            $_.CommandLine -like "*$ownPath*" -and
            $_.ProcessId -ne $PID -and
            $_.Name -in @("dotnet.exe", "node.exe", "npm.cmd", "npm.exe")
        } |
        ForEach-Object {
            try {
                Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop
            } catch {
            }
        }
} catch {
}

Start-Sleep -Seconds 2

Push-Location $backend
dotnet restore .\HMS.sln --configfile .\NuGet.Config -p:NuGetAudit=false
dotnet build .\HMS.sln --no-restore -p:NuGetAudit=false
Pop-Location

if (-not (Test-Path (Join-Path $frontend "node_modules"))) {
    Write-Host "Installing frontend packages..."
    Push-Location $frontend
    npm.cmd install --cache .\.npm-cache
    Pop-Location
}

$env:ASPNETCORE_ENVIRONMENT = "Development"

function Start-HmsApi {
    param(
        [string]$Name,
        [string]$ProjectDirectory,
        [string]$Dll,
        [int]$Port
    )

    $workDir = Join-Path $root $ProjectDirectory
    $dllPath = Join-Path $workDir $Dll
    $stdout = Join-Path $logDir "$Name.out.log"
    $stderr = Join-Path $logDir "$Name.err.log"

    if (Test-Path $stdout) {
        try { Remove-Item -LiteralPath $stdout -Force -ErrorAction Stop } catch { $stdout = Join-Path $logDir "$Name.$([DateTime]::Now.ToString('yyyyMMddHHmmss')).out.log" }
    }
    if (Test-Path $stderr) {
        try { Remove-Item -LiteralPath $stderr -Force -ErrorAction Stop } catch { $stderr = Join-Path $logDir "$Name.$([DateTime]::Now.ToString('yyyyMMddHHmmss')).err.log" }
    }

    Start-Process `
        -FilePath "dotnet" `
        -ArgumentList @("`"$dllPath`"", "--urls", "http://localhost:$Port", "--contentRoot", "`"$workDir`"") `
        -WorkingDirectory $root `
        -WindowStyle Hidden `
        -RedirectStandardOutput $stdout `
        -RedirectStandardError $stderr | Out-Null
}

Start-HmsApi "identity" "backend\src\Services\Identity\HMS.Identity.Api" "bin\Debug\net9.0\HMS.Identity.Api.dll" 5101
Start-HmsApi "patients" "backend\src\Services\Patients\HMS.Patients.Api" "bin\Debug\net9.0\HMS.Patients.Api.dll" 5102
Start-HmsApi "clinical" "backend\src\Services\Clinical\HMS.Clinical.Api" "bin\Debug\net9.0\HMS.Clinical.Api.dll" 5104
Start-HmsApi "billing" "backend\src\Services\Billing\HMS.Billing.Api" "bin\Debug\net9.0\HMS.Billing.Api.dll" 5105
Start-HmsApi "gateway" "backend\src\ApiGateway\HMS.ApiGateway" "bin\Debug\net9.0\HMS.ApiGateway.dll" 5200

$frontendOut = Join-Path $logDir "frontend.out.log"
$frontendErr = Join-Path $logDir "frontend.err.log"
if (Test-Path $frontendOut) {
    try { Remove-Item -LiteralPath $frontendOut -Force -ErrorAction Stop } catch { $frontendOut = Join-Path $logDir "frontend.$([DateTime]::Now.ToString('yyyyMMddHHmmss')).out.log" }
}
if (Test-Path $frontendErr) {
    try { Remove-Item -LiteralPath $frontendErr -Force -ErrorAction Stop } catch { $frontendErr = Join-Path $logDir "frontend.$([DateTime]::Now.ToString('yyyyMMddHHmmss')).err.log" }
}
Start-Process -FilePath "npm.cmd" -ArgumentList @("start") -WorkingDirectory $frontend -WindowStyle Hidden -RedirectStandardOutput $frontendOut -RedirectStandardError $frontendErr | Out-Null

Write-Host "HMS services are starting..."
Write-Host "Frontend: http://localhost:4200"
Write-Host "API Gateway: http://localhost:5200"
Write-Host "Logs: $logDir"
Write-Host ""
Write-Host "Opening frontend in browser..."
Start-Sleep -Seconds 15
try {
    Start-Process "http://localhost:4200"
} catch {
    Write-Host "Could not auto-open browser. Open http://localhost:4200 manually."
}
Write-Host "Wait about 60-90 seconds for Angular to finish compiling."
