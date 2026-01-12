# Setup Public Access untuk RPS-WEB
# Script untuk konfigurasi akses dari internet

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  RPS-WEB Public Access Configuration" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Get network information
Write-Host "[1/5] Collecting network information..." -ForegroundColor Yellow
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.*' } | Select-Object -First 1).IPAddress
$gateway = (Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Select-Object -First 1).NextHop
$publicIP = (curl.exe -s ifconfig.me)

Write-Host "   Local IP:  $localIP" -ForegroundColor Green
Write-Host "   Gateway:   $gateway" -ForegroundColor Green
Write-Host "   Public IP: $publicIP" -ForegroundColor Green
Write-Host ""

# Configure Windows Firewall
Write-Host "[2/5] Configuring Windows Firewall..." -ForegroundColor Yellow

try {
    # Remove old rules
    Remove-NetFirewallRule -DisplayName "*RPS*" -ErrorAction SilentlyContinue | Out-Null
    
    # Add new rules for all profiles
    New-NetFirewallRule `
        -DisplayName "RPS Next.js Public Access" `
        -Direction Inbound `
        -Protocol TCP `
        -LocalPort 3000 `
        -Action Allow `
        -Profile Any `
        -RemoteAddress Any | Out-Null
    
    New-NetFirewallRule `
        -DisplayName "RPS Python API Public Access" `
        -Direction Inbound `
        -Protocol TCP `
        -LocalPort 5001 `
        -Action Allow `
        -Profile Any `
        -RemoteAddress Any | Out-Null
    
    Write-Host "   OK - Firewall rules created" -ForegroundColor Green
} catch {
    Write-Host "   ERROR - Failed to configure firewall!" -ForegroundColor Red
    Write-Host "   Please run as Administrator" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Check network profile
Write-Host "[3/5] Checking network profile..." -ForegroundColor Yellow
$networkProfile = Get-NetConnectionProfile | Select-Object -First 1
if ($networkProfile.NetworkCategory -eq "Public") {
    Write-Host "   WARNING - Network is set to 'Public'" -ForegroundColor Yellow
    Write-Host "   Changing to 'Private' for better local access..." -ForegroundColor Yellow
    try {
        Set-NetConnectionProfile -InterfaceIndex $networkProfile.InterfaceIndex -NetworkCategory Private
        Write-Host "   OK - Network changed to 'Private'" -ForegroundColor Green
    } catch {
        Write-Host "   SKIP - Could not change network profile" -ForegroundColor Yellow
    }
} else {
    Write-Host "   OK - Network profile: $($networkProfile.NetworkCategory)" -ForegroundColor Green
}
Write-Host ""

# Test local access
Write-Host "[4/5] Testing local network access..." -ForegroundColor Yellow
Write-Host "   Starting services for testing..." -ForegroundColor Gray
& "$PSScriptRoot\rps-manager.ps1" start
Start-Sleep -Seconds 5

if (Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue) {
    Write-Host "   OK - Port 3000 is accessible" -ForegroundColor Green
} else {
    Write-Host "   ERROR - Port 3000 not accessible" -ForegroundColor Red
}

if (Test-NetConnection -ComputerName localhost -Port 5001 -InformationLevel Quiet -WarningAction SilentlyContinue) {
    Write-Host "   OK - Port 5001 is accessible" -ForegroundColor Green
} else {
    Write-Host "   ERROR - Port 5001 not accessible" -ForegroundColor Red
}
Write-Host ""

# Router configuration instructions
Write-Host "[5/5] Router Configuration Required" -ForegroundColor Yellow
Write-Host ""
Write-Host "To access from internet, configure port forwarding on your router:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Router Login:" -ForegroundColor White
Write-Host "  1. Open browser: http://$gateway"
Write-Host "  2. Login with router credentials"
Write-Host ""
Write-Host "Port Forwarding Configuration:" -ForegroundColor White
Write-Host "  Service Name: RPS-WEB-Next"
Write-Host "  External Port: 3000"
Write-Host "  Internal IP: $localIP"
Write-Host "  Internal Port: 3000"
Write-Host "  Protocol: TCP"
Write-Host ""
Write-Host "  Service Name: RPS-WEB-Python"
Write-Host "  External Port: 5001"
Write-Host "  Internal IP: $localIP"
Write-Host "  Internal Port: 5001"
Write-Host "  Protocol: TCP"
Write-Host ""

# Access URLs
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Access URLs After Router Configuration" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Local Network:" -ForegroundColor White
Write-Host "  http://localhost:3000" -ForegroundColor Green
Write-Host "  http://$localIP:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Public Internet:" -ForegroundColor White
Write-Host "  http://$publicIP:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Test public access after router configuration:" -ForegroundColor Cyan
Write-Host "  curl http://$publicIP:3000" -ForegroundColor Gray
Write-Host ""

# Save configuration
$config = @{
    LocalIP = $localIP
    Gateway = $gateway
    PublicIP = $publicIP
    ConfigDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
}
$config | ConvertTo-Json | Out-File "$PSScriptRoot\network-config.json"
Write-Host "Configuration saved to: network-config.json" -ForegroundColor Gray
Write-Host ""
