# Integration Guide - RPS Backend Node.js

## Frontend Integration

Panduan lengkap untuk mengintegrasikan RPS Backend Node.js dengan frontend aplikasi Anda.

## 1. Server Configuration

### Start Server in Development
```bash
cd /home/ubuntu/VIOLA/VIOLA-RPS/backendNpm
npm install
npm run dev
```

Server akan berjalan di `http://localhost:5000`

### Start Server in Production
```bash
npm run build
npm start
```

Atau menggunakan PM2:
```bash
npm install -g pm2
pm2 start dist/index.js --name "rps-backend"
pm2 save
```

## 2. API Endpoints

### 2.1 Health Check
**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "ok",
  "backend": "nodejs",
  "model": "gpt-4-mini-2025-08-07",
  "timestamp": "2026-03-18T10:30:00.000Z"
}
```

**Usage**:
```javascript
fetch('http://localhost:5000/health')
  .then(response => response.json())
  .then(data => console.log('Server Status:', data));
```

### 2.2 Generate RPS
**Endpoint**: `POST /generate`

**Request Body**:
```json
{
  "type": "full",
  "courseName": "Pemrograman Web",
  "courseCode": "TIF101",
  "sks": 3,
  "semester": 1,
  "status": "Mata Kuliah Wajib",
  "prereq": "-",
  "additionalContext": "Fokus pada full-stack web development dengan React dan Node.js"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "deskripsi": "Mata kuliah ini membahas...",
    "cpl": [
      {
        "kode": "CPL3",
        "pernyataan": "Mampu menerapkan prinsip-prinsip pemrograman..."
      }
    ],
    "cpmk": [
      {
        "kode": "CPMK 3-1",
        "pernyataan": "Mahasiswa mampu...",
        "mapping_cpl": "CPL3",
        "N1": 5,
        "N2": 5,
        "N3": 0,
        "N4": 5,
        "N5": 15,
        "N_cpmk": 30
      }
    ],
    "minggu": [
      {
        "mingguKe": 1,
        "kemampuanAkhir": "CPMK 3-1",
        "bahanKajian": "Pengenalan Web Development",
        "metodePembelajaran": {
          "metode": "TM SCL",
          "deskripsi": "Dosen menjelaskan konsep dasar...",
          "aktivitas": "Mahasiswa mendengarkan dan mencatat..."
        },
        "waktu": "TM Ceramah 3x50', Kuis, Tugas Mandiri",
        "pengalamanBelajar": "Mahasiswa memahami dasar web development...",
        "penilaian": {
          "kriteria": "Pemahaman konsep dasar",
          "bobotMateri": 7
        }
      },
      ...more weeks...
    ],
    "referensi": [
      "Jon Duckett, 2011, HTML and CSS Design and Build Websites, John Wiley & Sons",
      ...more references...
    ]
  }
}
```

**JavaScript Example**:
```javascript
async function generateRPS(courseData) {
  const response = await fetch('http://localhost:5000/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'full',
      courseName: courseData.nama,
      courseCode: courseData.kode,
      sks: courseData.sks,
      semester: courseData.semester,
      status: courseData.status,
      prereq: courseData.prasyarat,
      additionalContext: courseData.konteks,
    }),
  });

  if (!response.ok) {
    throw new Error(`Generate RPS failed: ${response.statusText}`);
  }

  return await response.json();
}
```

### 2.3 Export to DOCX
**Endpoint**: `POST /export`

**Request Body**:
```json
{
  "rpsData": {
    "deskripsi": "...",
    "cpl": [...],
    "cpmk": [...],
    "minggu": [...],
    "referensi": [...]
  },
  "meta": {
    "nama": "Pemrograman Web",
    "kode": "TIF101",
    "sks": 3,
    "semester": 1,
    "status": "Mata Kuliah Wajib",
    "prasyarat": "-",
    "koordinatorMK": {
      "nama": "Dr. Budi Santoso",
      "nip": "123456789"
    },
    "koordinatorGPM": {
      "nama": "Dr. Andi Wijaya",
      "nip": "987654321"
    },
    "ketuaProdi": {
      "nama": "Prof. Siti Nurhaliza",
      "nip": "111222333"
    },
    "dekan": {
      "nama": "Prof. Ahmad Dahlan",
      "nip": "444555666"
    }
  }
}
```

**Response**:
```json
{
  "success": true,
  "docx": "UEsDBBQABgAIAAAAIQDw...[base64 encoded DOCX content]...==",
  "filename": "RPS_TIF101.docx"
}
```

**JavaScript Example**:
```javascript
async function exportToDocx(rpsData, metadata) {
  const response = await fetch('http://localhost:5000/export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      rpsData: rpsData,
      meta: metadata,
    }),
  });

  if (!response.ok) {
    throw new Error(`Export failed: ${response.statusText}`);
  }

  const result = await response.json();
  
  // Convert base64 to Blob and download
  const binaryString = atob(result.docx);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

## 3. CORS Configuration

Server sudah dikonfigurasi dengan CORS support untuk akses dari frontend:

```javascript
// Allow requests from any origin
cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
});
```

Jika ingin membatasi origin dalam production:

Edit `src/apiserver/index.ts`:
```typescript
this.app.use(
  cors({
    origin: ['http://localhost:3000', 'https://yourdomain.com'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  })
);
```

## 4. Error Handling

Semua endpoint dapat mengembalikan error dengan status code 400-500:

```json
{
  "error": "Description of what went wrong"
}
```

**Handling Errors in JavaScript**:
```javascript
async function handleRPSRequest(endpoint, body) {
  try {
    const response = await fetch(`http://localhost:5000${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Unknown error occurred');
    }

    return await response.json();
  } catch (error) {
    console.error('RPS API Error:', error.message);
    throw error;
  }
}
```

## 5. Complete Integration Example (React)

```typescript
// api/rpsClient.ts
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const rpsAPI = {
  async checkHealth() {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) throw new Error('Server not available');
    return response.json();
  },

  async generateRPS(courseData: CourseData) {
    const response = await fetch(`${API_BASE_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'full',
        courseName: courseData.nama,
        courseCode: courseData.kode,
        sks: courseData.sks,
        semester: courseData.semester,
        status: courseData.status || 'Mata Kuliah Wajib',
        prereq: courseData.prasyarat || '-',
        additionalContext: courseData.konteks || '',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    return response.json();
  },

  async exportToDocx(rpsData: RPSData, metadata: Metadata) {
    const response = await fetch(`${API_BASE_URL}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rpsData, meta: metadata }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const result = await response.json();

    // Download DOCX file
    const binaryString = atob(result.docx);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};

// Component usage
import { rpsAPI } from './api/rpsClient';

function RPSForm() {
  const [loading, setLoading] = useState(false);
  const [rpsData, setRpsData] = useState(null);

  const handleGenerate = async (formData) => {
    setLoading(true);
    try {
      const result = await rpsAPI.generateRPS(formData);
      setRpsData(result.data);
      alert('RPS generated successfully!');
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!rpsData) return;
    try {
      await rpsAPI.exportToDocx(rpsData, {
        nama: 'My Course',
        kode: 'MK001',
        // ... other metadata
      });
    } catch (error) {
      alert(`Export failed: ${error.message}`);
    }
  };

  return (
    <div>
      <form onSubmit={(e) => {
        e.preventDefault();
        handleGenerate(/* form data */);
      }}>
        {/* Form fields */}
        <button type="submit" disabled={loading}>
          {loading ? 'Generating...' : 'Generate RPS'}
        </button>
      </form>

      {rpsData && (
        <button onClick={handleExport}>
          Download as DOCX
        </button>
      )}
    </div>
  );
}
```

## 6. Environment Variables

Create `.env` file untuk development:

```bash
OPENAI_API_KEY=your_api_key_here
API_PORT=5000
API_HOST=0.0.0.0
LOG_LEVEL=info
TEMPLATE_PATH=../public/RPS.docx
```

Frontend `.env`:
```bash
REACT_APP_API_URL=http://localhost:5000
```

## 7. Troubleshooting

### Server not responding
```bash
# Check if server is running
curl http://localhost:5000/health

# Check logs
tail -f logs/npm_api_*.log
```

### CORS errors
Ensure backend CORS is configured correctly, or add header to requests:
```javascript
headers: {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}
```

### OpenAI API errors
1. Verify API key is correct
2. Check OpenAI account has credits
3. Check API key isn't rate-limited

### Memory/Performance issues
- Increase Node.js heap:
  ```bash
  node --max-old-space-size=4096 dist/index.js
  ```

## 8. Deployment

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
ENV API_PORT=5000
EXPOSE 5000
CMD ["node", "dist/index.js"]
```

### PM2
```bash
npm run build
pm2 start "node dist/index.js" --name rps-backend --env production
pm2 save
pm2 startup
```

### Nginx Reverse Proxy
```nginx
server {
  listen 80;
  server_name api.yourdomain.com;

  location / {
    proxy_pass http://localhost:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

---

Untuk questions atau issues, lihat README.md di project root.
