# RPS-WEB Auto-Start Configuration

## Overview
Sistem telah dikonfigurasi untuk auto-start semua services ketika OS restart. Ini mencakup:
- **Nginx** - Web server & reverse proxy
- **Next.js** - Frontend application (via PM2)
- **Python API** - Backend API server (running in Python venv)

---

## 1. PM2 Auto-Start (Next.js)

### Configuration Files
- Service: `/etc/systemd/system/pm2-root.service`
- Process List: `/root/.pm2/dump.pm2`

### How It Works
```
Boot → systemd (pm2-root.service) → PM2 → npm run start (port 3000)
```

### Key Settings
- **Auto-start enabled**: YES
- **User**: root
- **Start method**: `pm2 resurrect`
- **Auto-restart on failure**: YES

### Commands
```bash
# Check PM2 status
pm2 list

# Update saved process list after changes
pm2 save

# View PM2 logs
pm2 logs rps-web

# Manual start/restart
pm2 start rps-web
pm2 restart rps-web
```

---

## 2. Python API Auto-Start (systemd Service)

### Configuration Files
- Service: `/etc/systemd/system/rps-python-api.service`

### How It Works
```
Boot → systemd (rps-python-api) → /root/rps-web/.venv/bin/python api_server.py (port 5000)
```

### Key Settings
- **Service name**: rps-python-api
- **Auto-start enabled**: YES
- **Python environment**: `/root/rps-web/.venv` (virtual environment)
- **Working directory**: `/root/rps-web/python`
- **Auto-restart on failure**: YES (restart after 10 seconds)
- **User**: root

### Environment Variables
```
PATH=/root/rps-web/.venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
VIRTUAL_ENV=/root/rps-web/.venv
```

### Commands
```bash
# Check service status
systemctl status rps-python-api

# View recent logs
journalctl -u rps-python-api -n 20 --follow

# Manual start/restart/stop
systemctl start rps-python-api
systemctl restart rps-python-api
systemctl stop rps-python-api
```

---

## 3. Nginx (System Service)

### Configuration
- Service: `/etc/nginx/sites-available/otomasi.conf`
- Upstream: Next.js (port 3000)
- Reverse proxy for both web and API requests

---

## 4. RPS-Manager Script

The script `/root/rps-web/rps-manager.sh` has been updated to use systemd for Python API.

### Updated Commands
```bash
# Start all services
./rps-manager.sh start

# Stop all services
./rps-manager.sh stop

# Restart all services
./rps-manager.sh restart

# Check status
./rps-manager.sh status

# View logs
./rps-manager.sh logs

# Rebuild application
./rps-manager.sh rebuild
```

---

## 5. Boot Sequence

When system restarts:

1. **Systemd initialization** (multi-user.target)
2. **Nginx starts** (port 80)
3. **PM2 starts** → Next.js running (port 3000)
4. **Python API service starts** → API running (port 5000)

### Expected Timeline
- Boot → 30-45 seconds → All services online

### Verification After Boot
```bash
systemctl status pm2-root
systemctl status rps-python-api
systemctl status nginx
ps aux | grep -E "nginx|npm|api_server|PM2"
curl http://localhost:80        # Check Nginx
curl http://localhost:5000/health  # Check Python API
```

---

## 6. Important Notes

### Python Virtual Environment
- ✅ Python API runs in venv: `/root/rps-web/.venv`
- ✅ All dependencies installed in venv (openai, python-docx)
- ✅ Venv automatically activated via systemd service

### Automatic Restart on Failure
- **PM2**: Restarts Next.js if it crashes
- **systemd**: Restarts Python API if it fails (10 second delay)

### Service Dependencies
```
Boot
├── pm2-root.service (After network.target)
│   └── npm run start (Next.js)
├── rps-python-api.service (After network.target, nginx.service)
│   └── Python API server
└── nginx.service
    └── Reverse proxy & web server
```

---

## 7. Troubleshooting

### Services Not Starting After Boot
```bash
# Check if services are enabled
systemctl is-enabled pm2-root
systemctl is-enabled rps-python-api
systemctl is-enabled nginx

# Check service status
systemctl status pm2-root
systemctl status rps-python-api
journalctl -u rps-python-api -n 50  # Python API logs
pm2 logs rps-web  # Next.js logs
```

### Python API Not Running Properly
```bash
# Check venv is active
ps aux | grep api_server | grep -v grep

# Check environment
cat /proc/$(pgrep -f api_server.py)/environ | tr '\0' '\n' | grep -E "VIRTUAL_ENV|PATH"

# Manually test
/root/rps-web/.venv/bin/python /root/rps-web/python/api_server.py
```

### Reset PM2 Auto-Start
```bash
# Remove existing auto-start
pm2 unstartup systemd

# Rebuild auto-start
pm2 startup systemd -u root --hp /root
pm2 save
```

---

## 8. Verification Checklist

After system reboot, verify:

- [ ] Nginx running on port 80
- [ ] Next.js running on port 3000
- [ ] Python API running on port 5000 (using venv)
- [ ] Website accessible at http://170.64.166.119
- [ ] API responding at http://localhost:5000/health
- [ ] All processes in PM2 list: `pm2 list`
- [ ] Python venv active: `ps aux | grep api_server`

---

## Last Updated
January 12, 2026 - Auto-start configuration completed and tested
