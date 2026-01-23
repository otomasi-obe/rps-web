# SystemD Services untuk RPS

## Services Yang Dibuat

### 1. **rps-nextjs.service**
- **Path**: `/etc/systemd/system/rps-nextjs.service`
- **Description**: Next.js application service
- **Auto-start**: Enabled (starts on boot)
- **Logs**: `/root/rps-web/logs/nextjs.log` & `nextjs-error.log`

### 2. **rps-python.service**
- **Path**: `/etc/systemd/system/rps-python.service`
- **Description**: Python API server service
- **Auto-start**: Enabled (starts on boot)
- **Logs**: `/root/rps-web/logs/python.log` & `python-error.log`

## Perintah SystemCTL

### Start Services
```bash
sudo systemctl start rps-nextjs
sudo systemctl start rps-python
```

### Stop Services
```bash
sudo systemctl stop rps-nextjs
sudo systemctl stop rps-python
```

### Restart Services
```bash
sudo systemctl restart rps-nextjs
sudo systemctl restart rps-python
```

### Check Status
```bash
sudo systemctl status rps-nextjs
sudo systemctl status rps-python
```

### View Logs (Real-time)
```bash
# Next.js
sudo journalctl -u rps-nextjs -f

# Python API
sudo journalctl -u rps-python -f

# Last 50 lines
sudo journalctl -u rps-nextjs -n 50
sudo journalctl -u rps-python -n 50
```

### Enable/Disable Auto-start
```bash
# Enable (auto-start on boot)
sudo systemctl enable rps-nextjs
sudo systemctl enable rps-python

# Disable
sudo systemctl disable rps-nextjs
sudo systemctl disable rps-python
```

## RPS Manager Script

Script `rps-manager.sh` sudah diupdate untuk menggunakan systemctl:

```bash
cd /root/rps-web
./rps-manager.sh
```

### Menu Options:
1. **Start services** - Start Next.js & Python API menggunakan systemctl
2. **Stop services** - Stop kedua services
3. **Restart services** - Restart kedua services
4. **Check status** - Status lengkap semua services
5. **Show logs** - View logs (systemd journalctl)
6. **Rebuild** - Rebuild Next.js
7. **Renew SSL** - Renew SSL certificate
8. **Exit**

## Keuntungan SystemD

✅ **Auto-restart** jika crash
✅ **Auto-start** on server reboot
✅ **Centralized logging** via journalctl
✅ **Better process management**
✅ **Resource limits** control
✅ **Dependency management**

## Manual Commands (Tanpa Script)

### Start All
```bash
sudo systemctl start rps-nextjs rps-python nginx
```

### Stop All
```bash
sudo systemctl stop rps-nextjs rps-python
```

### Restart All
```bash
sudo systemctl restart rps-nextjs rps-python nginx
```

### Status All
```bash
sudo systemctl status rps-nextjs rps-python nginx --no-pager
```

## Troubleshooting

### Service Failed to Start
```bash
# Check status with details
sudo systemctl status rps-nextjs
sudo systemctl status rps-python

# View recent logs
sudo journalctl -u rps-nextjs -n 100
sudo journalctl -u rps-python -n 100

# Check service file
cat /etc/systemd/system/rps-nextjs.service
cat /etc/systemd/system/rps-python.service
```

### Reload Service Configuration
After editing service files:
```bash
sudo systemctl daemon-reload
sudo systemctl restart rps-nextjs rps-python
```

### Check Ports
```bash
# Check if ports are listening
sudo netstat -tulpn | grep -E ':(3000|5000|80|443)'
```

### PM2 No Longer Needed
PM2 tidak lagi digunakan. Semua managed by systemd now:
```bash
# Optional: Remove PM2 processes
pm2 delete all
pm2 save
```

## Service Files Location

- Next.js: `/etc/systemd/system/rps-nextjs.service`
- Python: `/etc/systemd/system/rps-python.service`
- Logs: `/root/rps-web/logs/`
- Script: `/root/rps-web/rps-manager.sh`
