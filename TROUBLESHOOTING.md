# 🔧 RPS Web Application - Troubleshooting Guide

## ❌ Error: "Invalid response format" saat Generate RPS

### Root Cause
Masalah ini terjadi karena:

1. **Frontend tidak bisa parse JSON response** dari backend (response bukan JSON valid)
2. **Python API server tidak accessible** dari mesin yang menjalankan Next.js
3. **Environment variable `PYTHON_API_URL` tidak set** dengan benar di server production

### Skenario 1: Berjalan di Laptop Lokal ✅
**Kenapa bisa work:**
- Next.js dan Python API server sama-sama di `localhost`
- `PYTHON_API_URL` default `http://127.0.0.1:5000` langsung bisa diakses
- Network communication lewat loopback interface

### Skenario 2: Berjalan di Server Production ❌
**Kenapa error "Invalid response format":**
```
Next.js Server (otomasi.app)
    ↓
Coba akses PYTHON_API_URL = http://127.0.0.1:5000
    ↓
127.0.0.1 = localhost DARI SUDUT PANDANG SERVER
    ↓
Server mencoba akses dirinya sendiri, BUKAN lokasi Python API
    ↓
Response ERROR atau BUKAN JSON
    ↓
Frontend: "Invalid response format"
```

### ✅ Solusi

#### Step 1: Pastikan Python API Server Accessible

**Option A: Python API berjalan di mesin yang sama (port berbeda)**
```bash
# Di server production, jalankan Python API
cd /root/rps-web/python
python3 api_server.py --port 5000

# Python API akan listen di 0.0.0.0:5000 (bisa diakses dari mana saja)
```

**Option B: Python API berjalan di container/mesin terpisah**
- Pastikan Python API accessible dari Next.js server
- Misalnya via networking: `http://python-api-container:5000`

#### Step 2: Set Environment Variable di Next.js

**Untuk Production Server:**

Buat file `.env.local` (atau update environment di deployment):
```env
# Jika Python API di mesin yang sama
PYTHON_API_URL=http://localhost:5000

# Jika Python API di container/mesin lain
PYTHON_API_URL=http://python-api-internal:5000
```

**Deployment Platforms:**

- **Vercel**: Set di Project Settings → Environment Variables
- **Railway**: Set di Variables tab
- **Docker/Docker Compose**: Set di docker-compose.yml atau dockerfile
- **Systemd service**: Set di .env file atau service file

#### Step 3: Verify Connectivity

Test dari mesin Next.js:
```bash
# Dari server yang menjalankan Next.js
curl http://localhost:5000/health

# Response yang benar:
# {"status": "ok", "model": "gpt-5-mini-2025-08-07"}
```

### 📊 Debug Checklist

- [ ] Python API server sedang running (`python3 api_server.py`)
- [ ] Python API accessible dari mesin Next.js (test dengan `curl`)
- [ ] `PYTHON_API_URL` environment variable di-set benar
- [ ] Buka browser DevTools → Console dan cek log error dengan detail
- [ ] Cek server logs untuk pesan error lebih detail

### 🔍 Melihat Error Detail

**Di Browser Console (DevTools):**
```
=== API Response Debug ===
Status: 200
Content-Type: application/json
Response Text (first 500 chars): [lihat response sebenarnya]
Response Length: 1234
```

Kalo response bukan JSON, akan terlihat disini.

### 📝 Recent Changes (2025-01-14)

Kami sudah improve logging di:
- `src/components/RPSEditor.tsx` - Enhanced error logging untuk show response detail
- `src/app/api/generate/route.ts` - Better error handling dan debug logging
- `src/app/api/export/route.ts` - Better error handling dan debug logging
- `python/api_server.py` - Python API sekarang listen ke `0.0.0.0` (semua interface), bukan hanya localhost

### 🚀 Quick Start untuk Production

```bash
# 1. Jalankan Python API
cd /root/rps-web/python
python3 api_server.py &

# 2. Set environment variable
export PYTHON_API_URL=http://localhost:5000

# 3. Jalankan Next.js
cd /root/rps-web
npm run start

# 4. Test via domain otomasi.app
# Generate RPS → seharusnya berjalan
```

### ❓ Pertanyaan Lanjut?

- Cek logs di console tab aplikasi
- Cek server terminal output (Next.js + Python API)
- Ensure firewall tidak blocking port 5000
