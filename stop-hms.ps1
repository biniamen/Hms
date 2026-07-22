param(
    [int[]]$Ports = @(5101, 5102, 5104, 5105, 5200, 4200),
    [switch]$SkipPortStop
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$targetNames = @("dotnet.exe", "node.exe", "npm.cmd", "npm.exe")
$stopped = New-Object System.Collections.Generic.List[int]

function Stop-HmsProcess {
    param(
        [int]$ProcessId,
        [string]$Reason
    )

    if ($ProcessId -eq $PID -or $stopped.Contains($ProcessId)) {
        return
    }

    try {
        $process = Get-Process -Id $ProcessId -ErrorAction Stop
        Stop-Process -Id $ProcessId -Force -ErrorAction Stop
        $stopped.Add($ProcessId) | Out-Null
        Write-Host "Stopped $($process.ProcessName) [$ProcessId] - $Reason"
    } catch {
        Write-Warning "Could not stop process [$ProcessId]: $($_.Exception.Message)"
    }
}

Write-Host "Stopping HMS services from: $root"

try {
    Get-CimInstance Win32_Process -ErrorAction Stop |
        Where-Object {
            $_.CommandLine -and
            $_.CommandLine -like "*$root*" -and
            $_.ProcessId -ne $PID -and
            $_.Name -in $targetNames
        } |
        ForEach-Object {
            Stop-HmsProcess -ProcessId $_.ProcessId -Reason "HMS project process"
        }
} catch {
    Write-Warning "Could not inspect project processes: $($_.Exception.Message)"
}

if (-not $SkipPortStop) {
    try {
        Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
            Where-Object { $Ports -contains $_.LocalPort } |
            Select-Object -ExpandProperty OwningProcess -Unique |
            ForEach-Object {
                Stop-HmsProcess -ProcessId $_ -Reason "listening on HMS port"
            }
    } catch {
        Write-Warning "Could not inspect listening ports: $($_.Exception.Message)"
    }
}

Start-Sleep -Seconds 1

$remaining = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $Ports -contains $_.LocalPort } |
    Select-Object LocalAddress, LocalPort, OwningProcess

if ($remaining) {
    Write-Warning "Some HMS ports are still in use:"
    $remaining | Format-Table -AutoSize
    exit 1
}

Write-Host "All HMS services are stopped."
