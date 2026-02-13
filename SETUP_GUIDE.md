# RPS-WEB Setup Guide

## Quick Start

Setup otomatis lengkap dari awal dengan satu perintah:

```bash
sudo ./setup.sh
```

## Apa yang di-install

Script `setup.sh` akan menginstall dan mengkonfigurasi:

### System Packages
- Node.js (latest LTS) via NVM
- npm (latest)
- Python 3 & pip
- Nginx web server
- Certbot (SSL/TLS)
- Git, curl, wget, build-essential

### Application Setup
- Clone repository dari GitHub
- Install npm dependencies
- Install Python dependencies
- Create environment config (.env.local)
- Build Next.js application

### Services Configuration
- Systemd service untuk Next.js
- Systemd service untuk Python API
- Nginx web server configuration
- SSL/TLS certificate setup
- Auto-renewal cron job untuk SSL

## Prerequisites

1. **Server**: Linux (Ubuntu/Debian recommended)
2. **Access**: Root atau sudo access
3. **Domain**: Sudah pointing ke server IP (untuk SSL)
4. **OpenAI API Key**: Siapkan sebelum menjalankan script

## Cara Penggunaan

### 1. Run Setup Script

```bash
cd /home/ubuntu/rps-web
sudo ./setup.sh
```

Script akan:
- ✓ Update system packages
- ✓ Install semua dependencies
- ✓ Clone/setup repository
- ✓ Install Node.js & npm packages
- ✓ Install Python packages
- ✓ Setup .env.local file
- ✓ Build Next.js app
- ✓ Create systemd services
- ✓ Configure Nginx
- ✓ Setup SSL certificate
- ✓ Start semua services
- ✓ Verify installation

### 2. Provide OpenAI API Key

Saat script berjalan, akan diminta API key:
```
Enter OpenAI API Key: sk-proj-...
```

### 3. Setup SSL Certificate

Script akan menampilkan prompt untuk setup SSL:
```
Certbot will now configure SSL certificate for otomasi.app
Make sure domain is pointing to this server IP (43.134.63.240)
Continue with SSL setup? (y/n):
```

Jawab `y` untuk melanjutkan.

## Konfigurasi Script

Untuk mengubah konfigurasi, edit bagian ini di `setup.sh`:

```bash
# Configuration
DOMAIN="otomasi.app"
APP_DIR="/root/otomasi/rps-web"
PYTHON_DIR="$APP_DIR/python"
EMAIL="admin@otomasi.app"
GITHUB_REPO="https://github.com/otomasi-obe/rps-web.git"
```

## Post Installation

### Check Status
```bash
./rps-manager.sh status
```

### View Logs
```bash
# Next.js logs
sudo journalctl -u rps-nextjs -f

# Python API logs
sudo journalctl -u rps-python -f

# Nginx logs
sudo tail -f /var/log/nginx/otomasi.app.error.log
```

### Manage Services
```bash
# Restart services
./rps-manager.sh restart

# Start services
./rps-manager.sh start

# Stop services
./rps-manager.sh stop

# Show logs
./rps-manager.sh logs

# Rebuild app
./rps-manager.sh rebuild

# Renew SSL
./rps-manager.sh renew-ssl
```

## Services

### rps-nextjs.service
- Next.js application server
- Port: 3000
- User: root
- Auto-restart: enabled
- Auto-start: enabled

### rps-python.service
- Python API server
- Port: 5000
- User: root
- Auto-restart: enabled
- Auto-start: enabled

### nginx
- Web server & reverse proxy
- HTTP: port 80
- HTTPS: port 443
- Auto-start: enabled

## SSL Certificate

### Automatic Setup
Script akan automatically setup SSL via Certbot jika domain sudah pointing.

### Manual Renewal
```bash
sudo certbot renew --nginx
```

### Check Expiry
```bash
sudo certbot certificates
```

## Environment Variables

File `.env.local` harus berisi:

```env
OPENAI_API_KEY=sk-proj-...
PYTHON_API_URL=http://127.0.0.1:5000
```

### Untuk server berbeda:
Jika Python API di server lain, ubah:
```env
PYTHON_API_URL=http://192.168.1.100:5000
```

## Troubleshooting

### Services failed to start
```bash
# Check systemd logs
sudo journalctl -u rps-nextjs -n 50
sudo journalctl -u rps-python -n 50
```

### Port already in use
```bash
# Find process using port
sudo lsof -i :3000
sudo lsof -i :5000

# Kill process
sudo kill -9 <PID>
```

### Nginx permission denied
```bash
sudo systemctl restart nginx
```

### SSL certificate not found
```bash
sudo certbot certonly --nginx -d otomasi.app -d www.otomasi.app
```

### Python dependencies error
```bash
source /root/otomasi/rps-web/python/venv/bin/activate
pip install -r /root/otomasi/rps-web/python/requirements.txt
```

## Logs Directory

```
/var/log/nginx/
  - access.log
  - error.log
  - otomasi.app.access.log
  - otomasi.app.error.log

Systemd journals:
  - sudo journalctl -u rps-nextjs
  - sudo journalctl -u rps-python
```

## Security Notes

1. **API Key**: Jangan commit .env.local ke git
2. **SSL**: Certificate auto-renew via cron, cek status secara berkala
3. **Firewall**: Buka port 80, 443, dan optional 22 (SSH)
4. **Updates**: Lakukan `sudo apt update && sudo apt upgrade` secara berkala

## Uninstall

Untuk remove services:
```bash
sudo systemctl stop rps-nextjs rps-python nginx
sudo systemctl disable rps-nextjs rps-python
sudo rm /etc/systemd/system/rps-nextjs.service
sudo rm /etc/systemd/system/rps-python.service
sudo systemctl daemon-reload
```

## Support

Jika ada error, cek:
1. Systemd logs: `sudo journalctl -u rps-nextjs -n 50`
2. Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Python logs: `sudo journalctl -u rps-python -n 50`
4. Environment: `cat .env.local`
5. Ports: `sudo ss -tlnp | grep -E ':(3000|5000|80|443)'`
