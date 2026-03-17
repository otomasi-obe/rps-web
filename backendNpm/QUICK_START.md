# ⚡ Quick Start Guide

## 1️⃣ Setup (2 menit)

```bash
cd /home/ubuntu/VIOLA/VIOLA-RPS/backendNpm
npm install
cp .env.example .env
```

Edit `.env` dan tambahkan API key Anda:
```
OPENAI_API_KEY=sk-...your_key_here...
```

## 2️⃣ Start Server (Development)

```bash
npm run dev
```

Server berjalan di: **http://localhost:5000**

## 3️⃣ Test

```bash
npm test
# Output: 13 tests PASSED ✅
```

## 4️⃣ Build (Production)

```bash
npm run build
npm start
```

## 5️⃣ Try the API

### Test Health
```bash
curl http://localhost:5000/health
```

### Generate RPS
```bash
curl -X POST http://localhost:5000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "courseName": "Pemrograman Web",
    "courseCode": "TIF101",
    "sks": 3,
    "semester": 1
  }'
```

---

## 📂 Key Files

| File | Purpose |
|------|---------|
| `src/aitojson/` | Generate RPS with OpenAI |
| `src/jsontodoc/` | Convert JSON to DOCX |
| `src/apiserver/` | HTTP API Server |
| `README.md` | Full documentation |
| `INTEGRATION.md` | Frontend integration |

---

## 🆘 Troubleshooting

**Port already in use?**
```bash
npm run dev -- --port 5001
```

**Tests failing?**
```bash
npm run build
npm test
```

**API key not working?**
Check your `.env` file - ensure `OPENAI_API_KEY` is set correctly

---

✅ **Ready to go!** Check out `README.md` for full documentation.
