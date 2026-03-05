# RPS Generator Web Application

Sistem web untuk membuat **Rencana Pembelajaran Semester (RPS)** dengan bantuan AI (OpenAI).

- **Frontend**: Next.js 15 (React) - port 2000
- **Backend**: Python HTTP Server ATAU Java Spring Boot - port 2001 atau 2002
- **Process Manager**: PM2
- **Public**: Nginx reverse proxy → `https://otomasi.app`

## Fitur

✅ **Form Editor Lengkap** - Edit semua komponen RPS:
- Identitas Mata Kuliah
- CPL (Capaian Pembelajaran Lulusan)
- CPMK (Capaian Pembelajaran Mata Kuliah)
- Rencana Pembelajaran Mingguan (16 minggu)
- Metode Penilaian
- Referensi

✅ **AI-Powered Generation** - Generate konten RPS menggunakan OpenAI:
- Generate deskripsi mata kuliah
- Generate CPL/CPMK
- Generate rencana pembelajaran mingguan
- Generate RPS lengkap dalam satu klik

✅ **Export DOCX** - Download dokumen Word dengan format standar RPS

✅ **Save/Load JSON** - Simpan progress dan lanjutkan nanti

## Instalasi & Setup

### Development

1. **Install dependencies:**
   ```bash
   cd /home/ubuntu/rps-web
   # Frontend
   cd frontend && npm install
   # Backend Python
   cd ../backendPython && pip install -r requirements.txt
   # Backend Java
   cd ../backendJava && mvn clean package -DskipTests
   ```

2. **Setup OpenAI API Key:**
   ```bash
   # Create .env in root directory
   echo 'OPENAI_API_KEY=sk-your-actual-api-key' > /home/ubuntu/rps-web/.env
   chmod 600 /home/ubuntu/rps-web/.env
   ```

### Jalankan Server (Production)

**PM2-based server manager dengan 5 opsi:**

```bash
cd /home/ubuntu/rps-web
bash server.sh         # Menampilkan menu

# Atau gunakan opsi langsung:
bash server.sh 1      # Python Backend + Frontend (:2000 / :2001)
bash server.sh 2      # Java Backend + Frontend   (:2000 / :2002)
bash server.sh 3      # Kill All (Force)
bash server.sh 4      # Stop Graceful
bash server.sh 5      # Status & Health Check
```

**Port Mapping:**
- Frontend: `http://localhost:2000`
- Python Backend: `http://localhost:2001`
- Java Backend: `http://localhost:2002`
- Public HTTPS: `https://otomasi.app` (via Nginx)

**Windows/PowerShell:**
```powershell
cd C:\path\to\rps-web
.\server.ps1
```

## Cara Penggunaan

### 1. Muat Data Contoh (Optional)
- Klik "📥 Muat Contoh" untuk memuat `sample_rps.json`
- Atau buat RPS baru dari kosong

### 2. Isi Identitas Mata Kuliah
- Masukkan nama, kode, SKS, semester, dll.
- Pilih jenis mata kuliah (teori/praktikum/campuran)

### 3. Generate dengan AI
- Klik "🤖 Generate RPS Lengkap" untuk generate seluruh konten
- Backend akan menggunakan OpenAI untuk generate CPL, CPMK, rencana mingguan, referensi
- Status generasi ditampilkan real-time

### 4. Edit Manual
- Sesuaikan konten yang digenerate sesuai kebutuhan
- Navigasi antar tab untuk edit setiap bagian

### 5. Download DOCX
- Klik "📄 Download DOCX" untuk export dokumen Word
- Template: `/home/ubuntu/rps-web/public/RPS.docx`

### 6. Save/Load JSON
- "💾 Simpan JSON" - simpan progress ke file JSON
- "📂 Muat JSON" - load data dari file JSON yang disimpan sebelumnya

## Struktur Direktori

```
rps-web/
├── frontend/                 # Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── api/          # Frontend API routes (next backend)
│   │   │       ├── generate/
│   │   │       └── export/
│   │   ├── components/       # React components
│   │   └── lib/
│   ├── package.json
│   ├── next.config.js        # Proxy: /api-backend/ → :2001 or :2002
│   ├── tsconfig.json
│   └── .next/                # Next.js build output (NOT ignored)
│
├── backendPython/            # Python HTTP server (Option 1)
│   ├── api_server.py         # Main server
│   ├── ai_to_json.py         # OpenAI integration
│   ├── json_to_docx.py       # DOCX export
│   └── requirements.txt
│
├── backendJava/              # Java Spring Boot backend (Option 2)
│   ├── src/main/java/com/example/openaitest/
│   │   ├── OpenAiTestApplication.java
│   │   ├── RpsController.java
│   │   ├── AiToJsonService.java
│   │   └── JsonToDocxService.java
│   ├── pom.xml
│   └── target/
│       └── java-1.jar        # Built JAR
│
├── public/                   # Shared public assets
│   ├── RPS.docx              # Template untuk export
│   ├── sample_rps.json       # Sample data
│   ├── robots.txt
│   └── sitemap.xml
│
├── server.sh                 # PM2 server manager (Linux/macOS)
├── server.ps1                # PM2 server manager (Windows PowerShell)
├── .env                      # Environment: OPENAI_API_KEY
└── README.md
```

## Struktur Data JSON

```json
{
  "identity": {
    "kode": "TRAO6XXX",
    "nama": "Praktikum Mekatronika dan Robotika",
    "sks": 2,
    "semester": 4,
    "status": "Mata Kuliah Wajib",
    "prasyarat": "Dasar Elektronika"
  },
  "institution": {
    "programStudi": "...",
    "fakultas": "...",
    "universitas": "..."
  },
  "authority": {
    "koordinatorMK": { "nama": "...", "nip": "..." },
    "kaprodiPenguji": { "nama": "...", "nip": "..." }
  },
  "deskripsiSingkat": "...",
  "cplList": [...],
  "cpmkList": [...],
  "weeklyPlan": [...],
  "assessmentMethods": [...],
  "references": [...]
}
```

## Health Check

```bash
# Check frontend
curl http://localhost:2000

# Check backend (Python or Java)
curl http://localhost:2001/health  # Python
# {"status":"ok","backend":"python","model":"gpt-5-mini-2025-08-07"}

curl http://localhost:2002/health  # Java
# {"status":"ok","backend":"java","model":"gpt-5-mini-2025-08-07"}

# Public HTTPS
curl https://otomasi.app
```

## PM2 Commands

```bash
# View all processes
pm2 list

# View logs
pm2 logs rps-frontend
pm2 logs rps-backend
pm2 logs rps-frontend --lines 50

# Restart a process
pm2 restart rps-frontend
pm2 restart rps-backend

# Stop monitoring
pm2 monit
```

## Notes

- **Next.js build**: `.next/` is in `frontend/` directory only (production deployment)
- **Backend selection**: Use `server.sh` to switch between Python (port 2001) and Java (port 2002)
- **Template path**: Both backends read DOCX template from `/home/ubuntu/rps-web/public/RPS.docx`
- **OpenAI key**: Stored in `/home/ubuntu/rps-web/.env` (sourced by `server.sh`)
- **Nginx proxy**: Routes `/api/backend/` to backend port (2001 or 2002)
```

## Tech Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **OpenAI API** - AI content generation
- **docx** - DOCX generation

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/generate` | POST | Generate RPS content using OpenAI |
| `/api/export` | POST | Export RPS data to DOCX |

## Environment Variables

### Required
- `OPENAI_API_KEY` - OpenAI API key untuk generate konten

### Production Only
- `PYTHON_API_URL` - URL ke Python API server (default: `http://127.0.0.1:5000`)
  - **⚠️ PENTING**: Jangan gunakan `127.0.0.1` di production!
  - Set ke URL yang accessible dari mesin Next.js
  - Contoh: `http://localhost:5000` atau `http://python-api:5000`

### Complete .env.local Example
```env
OPENAI_API_KEY=sk-your-actual-api-key
PYTHON_API_URL=http://localhost:5000
```

## Running in Production

### Dengan Python API di Mesin Sama

```bash
# Terminal 1: Jalankan Python API server
cd python/
python3 api_server.py --port 5000

# Terminal 2: Jalankan Next.js application
npm run build
npm run start
```

### Dengan Docker Compose

```yaml
version: '3.8'
services:
  python-api:
    build: ./python
    ports:
      - "5000:5000"
    environment:
      - OPENAI_API_KEY=sk-your-key

  nextjs:
    build: .
    ports:
      - "3000:3000"
    environment:
      - PYTHON_API_URL=http://python-api:5000
    depends_on:
      - python-api
```

## Troubleshooting

Jika mendapat error **"Invalid response format"** saat generate:

1. Pastikan Python API server running
2. Verifikasi `PYTHON_API_URL` di environment
3. Lihat [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) untuk detail lengkap

```bash
# Test connectivity ke Python API
curl http://localhost:5000/health
```

Expected response:
```json
{"status": "ok", "model": "gpt-5-mini-2025-08-07"}
```
