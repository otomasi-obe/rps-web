# RPS Backend - Node.js/TypeScript Version

Conversion of Python backend RPS system to Node.js with TypeScript. This is a comprehensive Rencana Pembelajaran Semester (RPS - Course Learning Plan) generation and export system using OpenAI API and Express.js.

## Project Structure

```
backendNpm/
├── src/
│   ├── aitojson/          # AI to JSON conversion module
│   │   └── index.ts
│   ├── jsontodoc/         # JSON to DOCX export module
│   │   └── index.ts
│   ├── apiserver/         # Express.js API server
│   │   └── index.ts
│   └── index.ts           # Entry point
├── tests/                 # Jest test files
│   ├── aitojson.test.ts
│   ├── jsontodoc.test.ts
│   └── apiserver.test.ts
├── dist/                  # Compiled JavaScript output
├── package.json
├── tsconfig.json
├── jest.config.js
├── .env.example
└── README.md
```

## Features

### 1. AIToJSON Module (`src/aitojson/`)
- Generate RPS content using OpenAI GPT API
- Load API keys from environment variables, .env files, or api_openai.txt
- Robust JSON parsing with automatic error recovery
- Support for truncated JSON repair
- Generates complete RPS structure with:
  - Course description
  - Learning outcomes (CPL)
  - Course learning outcomes (CPMK)
  - Weekly learning plan
  - References

### 2. JSONToDocx Module (`src/jsontodoc/`)
- Convert RPS JSON data to DOCX document
- Support for DOCX template loading (if available)
- Generate structured document with proper formatting
- Create weekly plan tables
- Handle course identity, descriptions, and references

### 3. API Server (`src/apiserver/`)
- Express.js HTTP API server
- CORS support for frontend integration
- Endpoints:
  - `GET /health` - Server health check
  - `POST /generate` - Generate RPS from course details
  - `POST /export` - Export RPS to DOCX format
- Comprehensive logging system
- Error handling and validation

## Installation

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Setup

1. Clone or navigate to the project:
```bash
cd /home/ubuntu/VIOLA/VIOLA-RPS/backendNpm
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

4. Set your OpenAI API key in `.env`:
```bash
OPENAI_API_KEY=your_api_key_here
API_PORT=5000
API_HOST=0.0.0.0
```

## Development

### Run in development mode:
```bash
npm run dev
```

The server will start at `http://localhost:5000`

### Build TypeScript:
```bash
npm run build
```

### Start production server:
```bash
npm start
```

## Testing

### Run all tests:
```bash
npm test
```

### Run specific test file:
```bash
npm run test:aitojson
npm run test:jsontodoc
npm run test:apiserver
```

### Run tests in watch mode:
```bash
npm run test:watch
```

## API Usage

### Health Check
```bash
curl http://localhost:5000/health
```

Response:
```json
{
  "status": "ok",
  "backend": "nodejs",
  "model": "gpt-4-mini-2025-08-07",
  "timestamp": "2026-03-18T10:30:00.000Z"
}
```

### Generate RPS
```bash
curl -X POST http://localhost:5000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "full",
    "courseName": "Pemrograman Web",
    "courseCode": "TIF101",
    "sks": 3,
    "semester": 1,
    "status": "Mata Kuliah Wajib",
    "prereq": "-",
    "additionalContext": "Optional additional info"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "deskripsi": "...",
    "cpl": [...],
    "cpmk": [...],
    "minggu": [...],
    "referensi": [...]
  }
}
```

### Export to DOCX
```bash
curl -X POST http://localhost:5000/export \
  -H "Content-Type: application/json" \
  -d '{
    "rpsData": { ... },
    "meta": {
      "nama": "Pemrograman Web",
      "kode": "TIF101",
      "sks": 3,
      "semester": 1,
      "status": "Mata Kuliah Wajib"
    }
  }'
```

Response:
```json
{
  "success": true,
  "docx": "base64_encoded_file",
  "filename": "RPS_TIF101.docx"
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | Required |
| `API_PORT` | Server port | 5000 |
| `API_HOST` | Server host | 0.0.0.0 |
| `LOG_LEVEL` | Logging level | info |
| `LOG_DIR` | Logs directory | ./logs |
| `TEMPLATE_PATH` | DOCX template path | ../public/RPS.docx |

## Logging

Logs are saved to the `logs/` directory with daily log files:
- `npm_api_YYYY-MM-DD.log` - API server logs

## Dependencies

### Core
- **openai** - OpenAI API client
- **express** - Web framework
- **docx** - DOCX file manipulation
- **dotenv** - Environment variable management
- **cors** - CORS middleware

### Development
- **typescript** - TypeScript compiler
- **@types/node** - Node.js type definitions
- **@types/express** - Express type definitions
- **ts-node** - TypeScript execution
- **jest** - Testing framework
- **ts-jest** - Jest TypeScript support

## Troubleshooting

### API Key not found
1. Check `.env` file exists in project root
2. Verify `OPENAI_API_KEY` is set
3. Check environment variable is accessible

### Module not found errors
```bash
npm install
npm run build
```

### Tests failing
```bash
npm run lint
npm test -- --verbose
```

## Conversion Notes

This Node.js/TypeScript implementation is converted from the original Python version with the following changes:

1. **AIToJSON**: Direct port with improved error handling
2. **JSONToDocx**: Uses `docx` npm library (more limited than python-docx)
3. **API Server**: Express.js instead of Python's built-in HTTPServer
4. **Configuration**: Uses .env files with dotenv instead of environment-only

## Performance Considerations

- OpenAI API calls can take 30-60+ seconds for full RPS generation
- Large DOCX exports may take several seconds
- Node.js implementation should have similar or better performance than Python
- Concurrent requests are supported via Express.js threading

## License

Same as parent VIOLA project

## Support

For issues or questions, refer to the parent Python implementation in `/backendPython/`
