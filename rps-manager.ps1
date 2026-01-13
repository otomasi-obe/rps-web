# RPS-WEB Manager for Windows
# PowerShell script untuk mengelola RPS-WEB Server

param([string]$Command = "")

# Configuration
$AppDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PythonDir = Join-Path $AppDir "python"
$VenvDir = Join-Path $AppDir "venv"
$PythonExe = "python.exe"

function Write-Header {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Blue
    Write-Host "       RPS-WEB Server Manager" -ForegroundColor Blue
    Write-Host "     Next.js + Python API (Windows)" -ForegroundColor Blue
    Write-Host "============================================" -ForegroundColor Blue
    Write-Host ""
}

function Get-ProcessByPort {
    param([int]$Port)
    try {
        $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($conn) {
            return Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        }
    } catch {}
    return $null
}

function Check-Status {
    Write-Host "Checking Server Status..." -ForegroundColor Yellow
    Write-Host ""
    
    # Check Next.js
    $nextProcess = Get-ProcessByPort 3000
    if ($nextProcess) {
        Write-Host "   OK - Next.js: RUNNING (PID: $($nextProcess.Id))" -ForegroundColor Green
    } else {
        Write-Host "   NO - Next.js: STOPPED" -ForegroundColor Red
    }
    
    # Check Python API
    $pythonProcess = Get-ProcessByPort 5000
    if ($pythonProcess) {
        Write-Host "   OK - Python API: RUNNING (PID: $($pythonProcess.Id))" -ForegroundColor Green
    } else {
        Write-Host "   NO - Python API: STOPPED" -ForegroundColor Red
    }
    
    # Check Ports
    Write-Host ""
    Write-Host "Port Status:" -ForegroundColor Yellow
    
    if (Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue) {
        Write-Host "   OK - Port 3000: LISTENING" -ForegroundColor Green
    } else {
        Write-Host "   NO - Port 3000: NOT LISTENING" -ForegroundColor Red
    }
    
    if (Test-NetConnection -ComputerName localhost -Port 5000 -InformationLevel Quiet -WarningAction SilentlyContinue) {
        Write-Host "   OK - Port 5000:      LISTENING" -ForegroundColor Green
    } else {
        Write-Host "   NO - Port 5000:      NOT LISTENING" -ForegroundColor Red
    }
    
    # Dependencies
    Write-Host ""
    Write-Host "Dependencies:" -ForegroundColor Yellow
    if (Get-Command node -ErrorAction SilentlyContinue) {
        Write-Host "   OK - Node.js: $(node -v)" -ForegroundColor Green
    } else {
        Write-Host "   NO - Node.js: Not installed" -ForegroundColor Red
    }
    
    if (Get-Command python -ErrorAction SilentlyContinue) {
        $pythonVersion = & python --version 2>&1
        Write-Host "   OK - Python: $pythonVersion" -ForegroundColor Green
    } else {
        Write-Host "   NO - Python: Not installed" -ForegroundColor Red
    }
    
    # Access URLs
    Write-Host ""
    Write-Host "Access URLs:" -ForegroundColor Cyan
    Write-Host "   http://localhost:3000"
    
    $localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.*" } | Select-Object -First 1).IPAddress
    if ($localIP) {
        Write-Host "   http://$localIP:3000 (local network)"
    }
    
    Write-Host ""
}

function Start-Services {
    Write-Host "Starting Services..." -ForegroundColor Yellow
    Write-Host ""
    
    $nextjsStarted = $false
    $pythonStarted = $false
    
    # Start Next.js
    if (!(Get-ProcessByPort 3000)) {
        Write-Host "   Starting Next.js..." -ForegroundColor Gray
        $nextCmd = "Set-Location '$AppDir'; npm run dev"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", $nextCmd
        $nextjsStarted = $true
    } else {
        Write-Host "   SKIP - Next.js already running" -ForegroundColor Yellow
    }
    
    # Start Python API
    if (!(Get-ProcessByPort 5000)) {
        Write-Host "   Starting Python API..." -ForegroundColor Gray
        $pythonCmd = "Set-Location '$PythonDir'; & python api_server.py"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", $pythonCmd
        $pythonStarted = $true
    } else {
        Write-Host "   SKIP - Python API already running" -ForegroundColor Yellow
    }
    
    # Wait for services to be ready (check ports)
    if ($nextjsStarted -or $pythonStarted) {
        Write-Host "   Waiting for services to start..." -ForegroundColor Gray
        $timeout = 0
        while ($timeout -lt 30) {
            $nextOk = Get-ProcessByPort 3000
            $pythonOk = Get-ProcessByPort 5000
            
            if (($nextjsStarted -and $nextOk) -or !$nextjsStarted) {
                Write-Host "   OK - Next.js started" -ForegroundColor Green
            }
            if (($pythonStarted -and $pythonOk) -or !$pythonStarted) {
                Write-Host "   OK - Python API started" -ForegroundColor Green
            }
            
            if ((!$nextjsStarted -or $nextOk) -and (!$pythonStarted -or $pythonOk)) {
                break
            }
            
            Start-Sleep -Seconds 1
            $timeout++
        }
    }
    
    Write-Host ""
    Write-Host "Services started!" -ForegroundColor Green
    Write-Host ""
}

function Stop-Services {
    Write-Host "Stopping Services..." -ForegroundColor Yellow
    Write-Host ""
    
    # Stop both services concurrently
    $nextProcess = Get-ProcessByPort 3000
    $pythonProcess = Get-ProcessByPort 5000
    
    if ($nextProcess) {
        Stop-Process -Id $nextProcess.Id -Force -ErrorAction SilentlyContinue
        Write-Host "   OK - Next.js stopped" -ForegroundColor Green
    } else {
        Write-Host "   SKIP - Next.js not running" -ForegroundColor Yellow
    }
    
    if ($pythonProcess) {
        Stop-Process -Id $pythonProcess.Id -Force -ErrorAction SilentlyContinue
        Write-Host "   OK - Python API stopped" -ForegroundColor Green
    } else {
        Write-Host "   SKIP - Python API not running" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Services stopped!" -ForegroundColor Green
    Write-Host ""
}

function Restart-Services {
    Write-Host "Restarting Services..." -ForegroundColor Yellow
    Write-Host ""
    Stop-Services
    Start-Sleep -Seconds 1
    Start-Services
}

function Show-Logs {
    Write-Host "Process Information:" -ForegroundColor Yellow
    Write-Host ""
    
    $nextProcess = Get-ProcessByPort 3000
    if ($nextProcess) {
        Write-Host "Next.js (PID: $($nextProcess.Id))" -ForegroundColor Green
        Write-Host "  Started: $($nextProcess.StartTime)" -ForegroundColor Gray
        Write-Host "  Memory:  $([math]::Round($nextProcess.WorkingSet64/1MB, 2)) MB" -ForegroundColor Gray
    }
    
    Write-Host ""
    $pythonProcess = Get-ProcessByPort 5000
    if ($pythonProcess) {
        Write-Host "Python API (PID: $($pythonProcess.Id))" -ForegroundColor Green
        Write-Host "  Started: $($pythonProcess.StartTime)" -ForegroundColor Gray
        Write-Host "  Memory:  $([math]::Round($pythonProcess.WorkingSet64/1MB, 2)) MB" -ForegroundColor Gray
    }
    
    Write-Host ""
}

function Rebuild-App {
    Write-Host "Rebuilding..." -ForegroundColor Yellow
    Write-Host ""
    
    Stop-Services
    Set-Location $AppDir
    
    Write-Host "   Building Next.js..." -ForegroundColor Gray
    npm run build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   OK - Build successful" -ForegroundColor Green
        Start-Services
    } else {
        Write-Host "   ERROR - Build failed" -ForegroundColor Red
    }
    Write-Host ""
}

function Setup-Firewall {
    Write-Host "Setting Up Firewall..." -ForegroundColor Yellow
    Write-Host ""
    
    try {
        Remove-NetFirewallRule -DisplayName "RPS Next.js*" -ErrorAction SilentlyContinue
        Remove-NetFirewallRule -DisplayName "RPS Python*" -ErrorAction SilentlyContinue
        
        New-NetFirewallRule -DisplayName "RPS Next.js" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Any | Out-Null
        Write-Host "   OK - Port 3000 opened" -ForegroundColor Green
        
        New-NetFirewallRule -DisplayName "RPS Python API" -Direction Inbound -Protocol TCP -LocalPort 5001 -Action Allow -Profile Any | Out-Null
        Write-Host "   OK - Port 5001 opened" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "Firewall configured!" -ForegroundColor Green
    } catch {
        Write-Host "   ERROR - Run as Administrator!" -ForegroundColor Red
    }
    Write-Host ""
}

function Show-Help {
    Write-Host "Usage: .\rps-manager.ps1 <command>"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  start    - Start all services"
    Write-Host "  stop     - Stop all services"
    Write-Host "  restart  - Restart all services"
    Write-Host "  status   - Check status"
    Write-Host "  logs     - Show process info"
    Write-Host "  rebuild  - Rebuild application"
    Write-Host "  firewall - Setup firewall (admin)"
    Write-Host "  help     - Show this help"
    Write-Host ""
}

function Show-Menu {
    Write-Host "Select an option:" -ForegroundColor Cyan
    Write-Host "  1 - Start services"
    Write-Host "  2 - Stop services"
    Write-Host "  3 - Restart services"
    Write-Host "  4 - Check status"
    Write-Host "  5 - Show logs"
    Write-Host "  6 - Rebuild"
    Write-Host "  7 - Setup firewall"
    Write-Host "  8 - Exit"
    Write-Host ""
    
    $choice = Read-Host "Enter choice (1-8)"
    
    switch ($choice) {
        "1" { Start-Services }
        "2" { Stop-Services }
        "3" { Restart-Services }
        "4" { Check-Status }
        "5" { Show-Logs }
        "6" { Rebuild-App }
        "7" { Setup-Firewall }
        "8" { exit 0 }
        default { Write-Host "Invalid choice" -ForegroundColor Red }
    }
}

# Main
Write-Header

switch ($Command) {
    "start" { Start-Services }
    "stop" { Stop-Services }
    "restart" { Restart-Services }
    "status" { Check-Status }
    "logs" { Show-Logs }
    "rebuild" { Rebuild-App }
    "firewall" { Setup-Firewall }
    { $_ -in @("help", "-h", "--help") } { Show-Help }
    default {
        if ([string]::IsNullOrEmpty($Command)) {
            Show-Menu
        } else {
            Write-Host "Unknown command: $Command" -ForegroundColor Red
            Write-Host ""
            Show-Help
        }
    }
}
