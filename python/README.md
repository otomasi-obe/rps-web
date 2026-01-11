# RPS Generator - Python Version

Generate Rencana Pembelajaran Semester (RPS) menggunakan OpenAI GPT-5 Mini dan template DOCX.

## Fitur

- ✅ Generate konten RPS otomatis dengan AI (GPT-5 Mini)
- ✅ Mengisi template DOCX dengan format yang SAMA PERSIS (font size, style, dll)
- ✅ Support berbagai mata kuliah
- ✅ Export ke JSON untuk backup/editing
- ✅ Mode command-line dan interaktif
- ✅ HTTP API untuk integrasi dengan website

## Instalasi

```bash
pip install python-docx openai
```

## File-file

| File | Deskripsi |
|------|-----------|
| `rps_generator_v2.py` | Script utama (RECOMMENDED) - fixed font preservation |
| `api_server.py` | HTTP API server untuk integrasi website |
| `openai_bot.py` | OpenAI API client wrapper (GPT-5 Mini) |
| `verify_font.py` | Verifikasi format DOCX |
| `RPS.docx` | Template RPS dari universitas |

## Konfigurasi API

Simpan API key OpenAI di file `api_openai.txt`:
```
sk-proj-xxxxx...
```

## Usage

### 1. Command Line (Standalone)

```bash
# Generate RPS Basis Data
python rps_generator_v2.py \
    --course "Basis Data" \
    --code "IF201111" \
    --sks 3 \
    --semester 3 \
    --template RPS.docx \
    --output RPS_BasisData.docx

# Generate dengan simpan JSON
python rps_generator_v2.py \
    --course "Pemrograman Web" \
    --code "IF201234" \
    --sks 3 \
    --semester 3 \
    --save-json rps_web.json
```

### 2. HTTP API Server (Untuk Website)

```bash
# Start server
python api_server.py --port 5000
```

Endpoints:
- `GET /health` - Health check
- `POST /generate` - Generate konten RPS via OpenAI
- `POST /export` - Export ke DOCX

### 3. Integrasi dengan Next.js Website

1. Start Python API server: `python api_server.py --port 5000`
2. Start Next.js: `cd ../; npm run dev`
3. Buka http://localhost:3000
4. Centang "Gunakan Python API"
5. Isi nama mata kuliah dan generate!

## Format Output

### JSON Structure
```json
{
  "deskripsi": "...",
  "cpl": [{"kode": "CPL3", "pernyataan": "..."}],
  "cpmk": [{"kode": "CPMK 1", "pernyataan": "...", "mapping_cpl": "CPL3"}],
  "minggu": [
    {"minggu": 1, "cpmk": "CPMK 1", "topik": "...", "metode": "...", "waktu": "3x50'", "pengalaman": "...", "indikator": "...", "bobot": "5"},
    ...
    {"minggu": 8, "cpmk": "UTS", "topik": "Ujian Tengah Semester", ...},
    ...
    {"minggu": 16, "cpmk": "UAS", "topik": "Ujian Akhir Semester", ...}
  ],
  "penilaian": [
    {"komponen": "UTS", "bobot": "15%", "kriteria": "...", "cpmk1": "5%", ...}
  ],
  "referensi": ["Buku 1", "Buku 2"]
}
```

## Hasil Test

| Test | Font Size | Struktur | Konten |
|------|-----------|----------|--------|
| Praktikum Mekatronika | ✅ 9pt | ✅ 6 tables | ✅ 16 minggu |
| Pemrograman OOP | ✅ 9pt | ✅ 6 tables | ✅ 16 minggu |
| Basis Data | ✅ 9pt | ✅ 6 tables | ✅ 16 minggu |

## Model AI

- **Model**: `gpt-5-mini-2025-08-07`
- **Provider**: OpenAI API
- **Output**: Structured JSON with complete RPS content
