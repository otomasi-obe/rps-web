# RPS-WEB Server Manager for Windows (PowerShell)
# ─────────────────────────────────────────────
# 1 - Start Backend Python + Frontend
# 2 - Start Backend Java   + Frontend
# 3 - Stop Kill All
# 4 - Stop Graceful
#
# Frontend  → port 1000
# Backend   → port 1001 (Java atau Python)

param([string]$Command = "")

$AppDir      = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendDir = Join-Path $AppDir "frontend"
$PythonDir   = Join-Path $AppDir "backendPython"
$JavaDir     = Join-Path $AppDir "backendJava"
$JavaJar     = Join-Path $JavaDir "target\java-1.jar"

$FrontendPort = 2000
$BackendPort  = 2001

$FrontendLog = "$env:TEMP\rps_frontend.log"
$PythonLog   = "$env:TEMP\rps_python.log"
$JavaLog     = "$env:TEMP\rps_java.log"

# ─────────────────────────────────────────────
function Write-Header {
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Blue
    Write-Host "          RPS-WEB Server Manager               " -ForegroundColor Blue
    Write-Host "   Frontend :2000  |  Backend :2001       " -ForegroundColor Blue
    Write-Host "================================================" -ForegroundColor Blue
    Write-Host ""
}

function Get-PortProcess {
    param([int]$Port)
    try {
        $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($conn) { return Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue }
    } catch {}
    return $null
}

function Wait-ForPort {
    param([int]$Port, [string]$Service)
    $max = 40; $i = 0
    Write-Host -NoNewline "   Menunggu $Service pada :$Port" -ForegroundColor Yellow
    while (-not (Get-PortProcess $Port)) {
        Start-Sleep -Seconds 1
        Write-Host -NoNewline "."
        $i++
        if ($i -ge $max) { Write-Host " TIMEOUT" -ForegroundColor Red; return $false }
    }
    Write-Host " OK" -ForegroundColor Green
    return $true
}

function Check-HealthUrl {
    param([string]$Url)
    try {
        $r = Invoke-WebRequest -Uri $Url -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        return $r.StatusCode -eq 200
    } catch { return $false }
}

# ─────────────────────────────────────────────
function Start-Frontend {
    if (Get-PortProcess $FrontendPort) {
        Write-Host "   INFO - Frontend sudah running di :$FrontendPort" -ForegroundColor Yellow
        return
    }
    Write-Host "   > Starting Frontend Next.js (port $FrontendPort)..." -ForegroundColor Cyan

    if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
        Write-Host "   Installing npm dependencies..." -ForegroundColor Yellow
        Push-Location $FrontendDir; npm install --silent; Pop-Location
    }

    if (-not (Test-Path (Join-Path $FrontendDir ".next"))) {
        Write-Host "   Building Next.js..." -ForegroundColor Yellow
        Push-Location $FrontendDir
        $env:BACKEND_API_URL = "http://127.0.0.1:$BackendPort"
        $env:PORT = $FrontendPort
        npm run build
        Pop-Location
    }

    $cmd = "Set-Location '$FrontendDir'; `$env:BACKEND_API_URL='http://127.0.0.1:$BackendPort'; `$env:PYTHON_API_URL='http://127.0.0.1:$BackendPort'; `$env:PORT='$FrontendPort'; npm start -- --port $FrontendPort *> '$FrontendLog'"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $cmd

    Wait-ForPort $FrontendPort "Frontend"
}

function Start-PythonBackend {
    if (Get-PortProcess $BackendPort) {
        Write-Host "   INFO - Backend sudah running di :$BackendPort" -ForegroundColor Yellow
        return
    }
    Write-Host "   > Starting Python Backend (port $BackendPort)..." -ForegroundColor Cyan

    $cmd = "Set-Location '$PythonDir'; python api_server.py --port $BackendPort *> '$PythonLog'"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $cmd

    Wait-ForPort $BackendPort "Python Backend"
}

function Start-JavaBackend {
    if (Get-PortProcess $BackendPort) {
        Write-Host "   INFO - Backend sudah running di :$BackendPort" -ForegroundColor Yellow
        return
    }
    if (-not (Test-Path $JavaJar)) {
        Write-Host "   ERROR - Java JAR tidak ditemukan: $JavaJar" -ForegroundColor Red
        Write-Host "   Build dulu: cd $JavaDir && mvn package -DskipTests" -ForegroundColor Red
        return
    }
    Write-Host "   > Starting Java Backend (port $BackendPort)..." -ForegroundColor Cyan

    $cmd = "Set-Location '$JavaDir'; java -jar '$JavaJar' --server.port=$BackendPort *> '$JavaLog'"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $cmd

    Wait-ForPort $BackendPort "Java Backend"
}

# ─────────────────────────────────────────────
function Check-Health {
    Write-Host ""
    Write-Host "Health Check:" -ForegroundColor Yellow

    if (Check-HealthUrl "http://localhost:$FrontendPort") {
        Write-Host "   OK - Frontend   http://localhost:$FrontendPort" -ForegroundColor Green
    } else {
        Write-Host "   NO - Frontend   http://localhost:$FrontendPort  (not responding)" -ForegroundColor Red
    }

    if (Check-HealthUrl "http://localhost:$BackendPort/health") {
        $resp = (Invoke-WebRequest -Uri "http://localhost:$BackendPort/health" -UseBasicParsing -TimeoutSec 3).Content
        Write-Host "   OK - Backend    http://localhost:$BackendPort/health  -> $resp" -ForegroundColor Green
    } else {
        Write-Host "   NO - Backend    http://localhost:$BackendPort/health  (not responding)" -ForegroundColor Red
    }
    Write-Host ""
}

function Check-Status {
    Write-Host "Status Server:" -ForegroundColor Yellow
    Write-Host ""

    $fp = Get-PortProcess $FrontendPort
    if ($fp) {
        Write-Host "   OK - Frontend  :$FrontendPort   RUNNING (PID: $($fp.Id))" -ForegroundColor Green
    } else {
        Write-Host "   NO - Frontend  :$FrontendPort   STOPPED" -ForegroundColor Red
    }

    $bp = Get-PortProcess $BackendPort
    if ($bp) {
        $btype = "Backend"
        if (Get-Process java -ErrorAction SilentlyContinue) { $btype = "Java Backend" }
        if (Get-Process python -ErrorAction SilentlyContinue) { $btype = "Python Backend" }
        Write-Host "   OK - $btype  :$BackendPort  RUNNING (PID: $($bp.Id))" -ForegroundColor Green
    } else {
        Write-Host "   NO - Backend   :$BackendPort  STOPPED" -ForegroundColor Red
    }

    Check-Health

    Write-Host "URL Akses:" -ForegroundColor Cyan
    Write-Host "   http://localhost:$FrontendPort"
    Write-Host "   https://otomasi.app"
    Write-Host ""
}

# ─────────────────────────────────────────────
function Do-KillAll {
    Write-Host "Opsi 3: Kill All (Force)" -ForegroundColor Yellow
    Write-Host ""

    foreach ($port in @($FrontendPort, $BackendPort)) {
        $proc = Get-PortProcess $port
        if ($proc) {
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            Write-Host "   OK - Port $port killed (PID: $($proc.Id))" -ForegroundColor Green
        } else {
            Write-Host "   INFO - Port $port tidak ada proses" -ForegroundColor Yellow
        }
    }

    Get-Process node   -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*next*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    Get-Process python -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*api_server*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    Get-Process java   -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*java-1.jar*" } | Stop-Process -Force -ErrorAction SilentlyContinue

    Write-Host ""
    Write-Host "Semua proses dihentikan (Force Kill)." -ForegroundColor Green
    Write-Host ""
}

function Do-Stop {
    Write-Host "Opsi 4: Stop Graceful" -ForegroundColor Yellow
    Write-Host ""

    foreach ($port in @($FrontendPort, $BackendPort)) {
        $proc = Get-PortProcess $port
        if ($proc) {
            Stop-Process -Id $proc.Id -ErrorAction SilentlyContinue
            Write-Host "   OK - Port $port stopped (PID: $($proc.Id))" -ForegroundColor Green
        } else {
            Write-Host "   INFO - Port $port tidak ada proses" -ForegroundColor Yellow
        }
    }

    Write-Host ""
    Write-Host "Selesai." -ForegroundColor Green
    Write-Host ""
}

function Do-StartPython {
    Write-Host "Opsi 1: Python Backend + Frontend" -ForegroundColor Yellow
    Write-Host ""
    Start-PythonBackend
    Start-Frontend
    Check-Status
}

function Do-StartJava {
    Write-Host "Opsi 2: Java Backend + Frontend" -ForegroundColor Yellow
    Write-Host ""
    Start-JavaBackend
    Start-Frontend
    Check-Status
}

# ─────────────────────────────────────────────
function Show-Menu {
    Write-Header
    Write-Host "Pilih opsi:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  1  Start Backend Python + Frontend  [:$FrontendPort / :$BackendPort]" -ForegroundColor Green
    Write-Host "  2  Start Backend Java   + Frontend  [:$FrontendPort / :$BackendPort]" -ForegroundColor Green
    Write-Host "  3  Stop Kill All (Force)"            -ForegroundColor Red
    Write-Host "  4  Stop Graceful"                    -ForegroundColor Yellow
    Write-Host "  5  Status & Health Check"            -ForegroundColor Blue
    Write-Host "  0  Keluar"                           -ForegroundColor Blue
    Write-Host ""

    $choice = Read-Host "Pilihan [0-5]"
    Write-Host ""

    switch ($choice) {
        "1" { Do-StartPython }
        "2" { Do-StartJava }
        "3" { Do-KillAll }
        "4" { Do-Stop }
        "5" { Check-Status }
        "0" { exit 0 }
        default { Write-Host "Pilihan tidak valid." -ForegroundColor Red }
    }
}

# ─────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────
Write-Header

switch ($Command) {
    { $_ -in @("1","python") }  { Do-StartPython }
    { $_ -in @("2","java") }    { Do-StartJava }
    { $_ -in @("3","killall") } { Do-KillAll }
    { $_ -in @("4","stop") }    { Do-Stop }
    { $_ -in @("5","status") }  { Check-Status }
    "" { Show-Menu }
    default {
        Write-Host "Usage: .\server.ps1 [1|2|3|4|5]"
        Write-Host "  1 / python  - Start Python backend + Frontend"
        Write-Host "  2 / java    - Start Java backend   + Frontend"
        Write-Host "  3 / killall - Kill all (Force)"
        Write-Host "  4 / stop    - Stop graceful"
        Write-Host "  5 / status  - Status & health check"
    }
}
