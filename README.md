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

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key untuk generate konten |

## License

MIT
