# RPS Generator Web Application

Sistem web untuk membuat **Rencana Pembelajaran Semester (RPS)** dengan bantuan AI (OpenAI).

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

## Instalasi

1. **Install dependencies:**
   ```bash
   cd rps-web
   npm install
   ```

2. **Setup OpenAI API Key:**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` dan masukkan API key Anda:
   ```
   OPENAI_API_KEY=sk-your-actual-api-key
   ```

3. **Jalankan development server:**
   ```bash
   npm run dev
   ```

4. **Buka browser:**
   ```
   http://localhost:3000
   ```

## Cara Penggunaan

### 1. Isi Identitas Mata Kuliah
- Masukkan nama, kode, SKS, semester, dll.
- Pilih jenis mata kuliah (teori/praktikum/campuran)

### 2. Generate dengan AI (Opsional)
- Klik tombol "🤖 Generate RPS dengan AI" untuk generate seluruh konten
- Atau generate per bagian (CPL, CPMK, Rencana Mingguan)

### 3. Edit Manual
- Sesuaikan konten yang digenerate sesuai kebutuhan
- Navigasi antar tab untuk edit setiap bagian

### 4. Download DOCX
- Klik "📄 Download DOCX" untuk export dokumen Word

### 5. Save/Load JSON
- "💾 Simpan JSON" - simpan progress ke file JSON
- "📂 Muat JSON" - load data dari file JSON yang disimpan sebelumnya

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
    ...
  },
  "deskripsiSingkat": "...",
  "cplList": [...],
  "cpmkList": [...],
  "weeklyPlan": [...],
  "assessmentMethods": [...],
  "references": [...]
}
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
