$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend\hms-web"
$logDir = Join-Path $root ".runtime-logs"
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

$env:Email__FromName = "HMS Platform"
$env:Email__Smtp__Host = "smtp.gmail.com"
$env:Email__Smtp__Port = "587"
$env:Email__Smtp__EnableSsl = "true"
$env:Email__ExposeLocalSetupLinks = "false"

if (Test-Path $smtpLocalConfig) {
    . $smtpLocalConfig
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
        if ($process.ProcessName -in @("dotnet", "node")) {
            Stop-Process -Id $process.Id -Force
        }
    } catch {
    }
}

Push-Location $backend
dotnet restore .\HMS.sln --configfile .\NuGet.Config
dotnet build .\HMS.sln --no-restore
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

    if (Test-Path $stdout) { Remove-Item -LiteralPath $stdout -Force }
    if (Test-Path $stderr) { Remove-Item -LiteralPath $stderr -Force }

    $arguments = '"' + $dllPath + '" --urls http://localhost:' + $Port
    Start-Process -FilePath "dotnet" -ArgumentList $arguments -WorkingDirectory $workDir -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr | Out-Null
}

Start-HmsApi "identity" "backend\src\Services\Identity\HMS.Identity.Api" "bin\Debug\net9.0\HMS.Identity.Api.dll" 5101
Start-HmsApi "patients" "backend\src\Services\Patients\HMS.Patients.Api" "bin\Debug\net9.0\HMS.Patients.Api.dll" 5102
Start-HmsApi "clinical" "backend\src\Services\Clinical\HMS.Clinical.Api" "bin\Debug\net9.0\HMS.Clinical.Api.dll" 5104
Start-HmsApi "billing" "backend\src\Services\Billing\HMS.Billing.Api" "bin\Debug\net9.0\HMS.Billing.Api.dll" 5105
Start-HmsApi "gateway" "backend\src\ApiGateway\HMS.ApiGateway" "bin\Debug\net9.0\HMS.ApiGateway.dll" 5200

$frontendOut = Join-Path $logDir "frontend.out.log"
$frontendErr = Join-Path $logDir "frontend.err.log"
if (Test-Path $frontendOut) { Remove-Item -LiteralPath $frontendOut -Force }
if (Test-Path $frontendErr) { Remove-Item -LiteralPath $frontendErr -Force }
Start-Process -FilePath "npm.cmd" -ArgumentList @("start") -WorkingDirectory $frontend -WindowStyle Hidden -RedirectStandardOutput $frontendOut -RedirectStandardError $frontendErr | Out-Null

Write-Host "HMS services are starting..."
Write-Host "Frontend: http://localhost:4200"
Write-Host "API Gateway: http://localhost:5200"
Write-Host "Logs: $logDir"
Write-Host ""
Write-Host "Wait about 60-90 seconds for Angular to finish compiling, then open http://localhost:4200"
