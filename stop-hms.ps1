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

function Get-HmsListeningProcessIds {
    param([int[]]$TargetPorts)

    $processIds = @()

    try {
        $processIds += Get-NetTCPConnection -State Listen -ErrorAction Stop |
            Where-Object { $TargetPorts -contains $_.LocalPort } |
            Select-Object -ExpandProperty OwningProcess -Unique
    } catch {
        Write-Warning "Could not inspect listening ports with Get-NetTCPConnection: $($_.Exception.Message)"
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
            Write-Warning "Could not inspect listening ports with netstat: $($_.Exception.Message)"
        }
    }

    $processIds | Sort-Object -Unique
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
    foreach ($processId in Get-HmsListeningProcessIds -TargetPorts $Ports) {
        Stop-HmsProcess -ProcessId $processId -Reason "listening on HMS port"
    }
}

Start-Sleep -Seconds 1

$remainingIds = Get-HmsListeningProcessIds -TargetPorts $Ports

if ($remainingIds) {
    Write-Warning "Some HMS ports are still in use:"
    foreach ($processId in $remainingIds) {
        netstat -ano | Select-String -Pattern $processId
    }
    exit 1
}

Write-Host "All HMS services are stopped."
