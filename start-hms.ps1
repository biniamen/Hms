param(
    [switch]$NoBrowser,
    [switch]$WaitForFrontend,
    [int]$FrontendWaitSeconds = 30,
    [switch]$Build
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "newfrontend"
$logDir = Join-Path $root ".runtime-logs"
$tempDir = Join-Path $root ".runtime-tmp"
$localConfig = Join-Path $root "hms.local.ps1"
$smtpLocalConfig = Join-Path $root "smtp.local.ps1"
$dotnetHome = Join-Path $backend ".dotnet-home"
$dotnetAppData = Join-Path $backend ".appdata"
$npmCache = Join-Path $frontend ".npm-cache"
$npmCmd = "C:\Program Files\nodejs\npm.cmd"
$ngCmd = Join-Path $frontend "node_modules\.bin\ng.cmd"

if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}
if (-not (Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir | Out-Null
}
if (-not (Test-Path $npmCache)) {
    New-Item -ItemType Directory -Path $npmCache | Out-Null
}

$env:DOTNET_CLI_HOME = $dotnetHome
$env:APPDATA = $dotnetAppData
$env:DOTNET_NOLOGO = "true"
$env:DOTNET_SKIP_FIRST_TIME_EXPERIENCE = "1"
$env:DOTNET_CLI_TELEMETRY_OPTOUT = "1"
$env:DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE = "1"
$env:TEMP = $tempDir
$env:TMP = $tempDir
$env:npm_config_cache = $npmCache
$env:NPM_CONFIG_CACHE = $npmCache
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

function Get-HmsListeningProcessIds {
    param([int[]]$TargetPorts)

    $processIds = @()

    try {
        $processIds += Get-NetTCPConnection -State Listen -ErrorAction Stop |
            Where-Object { $TargetPorts -contains $_.LocalPort } |
            Select-Object -ExpandProperty OwningProcess -Unique
    } catch {
    }

    if ($processIds.Count -eq 0) {
        try {
            $netstatLines = netstat -ano
            foreach ($line in $netstatLines) {
                if ($line -match '^\s*TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)\s*$') {
                    $port = [int]$Matches[1]
                    $processId = [int]$Matches[2]
                    if ($TargetPorts -contains $port) {
                        $processIds += $processId
                    }
                }
            }
        } catch {
        }
    }

    $processIds | Sort-Object -Unique
}

foreach ($processId in Get-HmsListeningProcessIds -TargetPorts $ports) {
    try {
        $process = Get-Process -Id $processId -ErrorAction Stop
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

$requiredBackendArtifacts = @(
    (Join-Path -Path $backend -ChildPath "src\Services\Identity\HMS.Identity.Api\bin\Debug\net9.0\HMS.Identity.Api.dll"),
    (Join-Path -Path $backend -ChildPath "src\Services\Patients\HMS.Patients.Api\bin\Debug\net9.0\HMS.Patients.Api.dll"),
    (Join-Path -Path $backend -ChildPath "src\Services\Clinical\HMS.Clinical.Api\bin\Debug\net9.0\HMS.Clinical.Api.dll"),
    (Join-Path -Path $backend -ChildPath "src\Services\Billing\HMS.Billing.Api\bin\Debug\net9.0\HMS.Billing.Api.dll"),
    (Join-Path -Path $backend -ChildPath "src\ApiGateway\HMS.ApiGateway\bin\Debug\net9.0\HMS.ApiGateway.dll")
)

$missingBackendArtifacts = @($requiredBackendArtifacts | Where-Object { -not (Test-Path $_) })
if ($missingBackendArtifacts.Count -gt 0) {
    $Build = $true
    Write-Warning "Compiled backend files are missing. Running backend build once."
}

if ($Build) {
    Push-Location $backend
    dotnet restore .\HMS.sln --configfile .\NuGet.Config -p:NuGetAudit=false
    dotnet build .\HMS.sln --no-restore -p:NuGetAudit=false
    Pop-Location
} else {
    Write-Host "Skipping backend build. Use -Build after source code changes or after pulling updates."
}

if (-not (Test-Path (Join-Path $frontend "node_modules"))) {
    Write-Host "Installing frontend packages..."
    Push-Location $frontend
    & $npmCmd install --legacy-peer-deps --cache .\.npm-cache
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

    $command = @(
        '"dotnet"',
        "`"$dllPath`"",
        '"--urls"',
        "`"http://localhost:$Port`"",
        '"--contentRoot"',
        "`"$workDir`""
    ) -join " "
    $command = "$command > `"$stdout`" 2> `"$stderr`""

    $psi = [System.Diagnostics.ProcessStartInfo]::new()
    $psi.FileName = $env:ComSpec
    $psi.WorkingDirectory = $root
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.Arguments = "/d /s /c `"$command`""

    [System.Diagnostics.Process]::Start($psi) | Out-Null
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
if (-not (Test-Path $ngCmd)) {
    Write-Host "Angular CLI was not found in node_modules. Installing frontend packages..."
    Push-Location $frontend
    & $npmCmd install --legacy-peer-deps --cache .\.npm-cache
    Pop-Location
}

$frontendCommand = "`"$ngCmd`" serve --host localhost --port 4200 > `"$frontendOut`" 2> `"$frontendErr`""
$frontendPsi = [System.Diagnostics.ProcessStartInfo]::new()
$frontendPsi.FileName = $env:ComSpec
$frontendPsi.WorkingDirectory = $frontend
$frontendPsi.UseShellExecute = $false
$frontendPsi.CreateNoWindow = $true
$frontendPsi.Arguments = "/d /s /c `"$frontendCommand`""
[System.Diagnostics.Process]::Start($frontendPsi) | Out-Null

Write-Host "HMS services are starting..."
Write-Host "Frontend: http://localhost:4200"
Write-Host "API Gateway: http://localhost:5200"
Write-Host "Logs: $logDir"
Write-Host ""

if ($NoBrowser -and -not $WaitForFrontend) {
    Write-Host "Startup command finished. Angular may still compile for a few seconds."
    Write-Host "Open http://localhost:4200 when ready, or check $frontendOut"
} else {
    Write-Host "Waiting for Angular frontend to finish compiling..."
    $frontendReady = $false
    $attemptCount = [Math]::Max(1, [Math]::Ceiling($FrontendWaitSeconds / 3))
    for ($attempt = 1; $attempt -le $attemptCount; $attempt++) {
        Start-Sleep -Seconds 3
        $frontendReady = @((Get-HmsListeningProcessIds -TargetPorts @(4200))).Count -gt 0
        if ($frontendReady) {
            break
        }
    }

    if ($frontendReady -and -not $NoBrowser) {
        Write-Host "Opening frontend in browser..."
        try {
            Start-Process "http://localhost:4200"
        } catch {
            Write-Host "Could not auto-open browser. Open http://localhost:4200 manually."
        }
    } elseif ($frontendReady) {
        Write-Host "Frontend is ready. Open http://localhost:4200"
    } else {
        Write-Warning "Angular is still compiling or failed to start. Check $frontendErr, then open http://localhost:4200 when it is ready."
    }
}
