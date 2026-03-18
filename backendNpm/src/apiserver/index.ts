import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as os from 'os';
import { AIToJSON, RPSData } from '../aitojson/index.js';
import { JSONToDocx, Metadata } from '../jsontodoc/index.js';

dotenv.config();
dotenv.config({ path: '.env.local' });

// Types
export interface GenerateRequest extends Request {
  body: {
    type?: 'full' | 'cpl' | 'cpmk' | 'weeklyPlan' | 'references';
    courseName: string;
    courseCode: string;
    sks: number;
    semester: number;
    status?: string;
    prereq?: string;
    additionalContext?: string;
    deskripsi?: string;
    cpl?: any[];
    cplList?: any[];
    cpmk?: any[];
    cpmkList?: any[];
  };
}

export interface ExportRequest extends Request {
  body: {
    rpsData: RPSData;
    meta: Metadata;
  };
}

// Logger utility
class Logger {
  private logsDir: string;

  constructor() {
    this.logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    console.log(logMessage);

    // Write to daily log file
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logsDir, `npm_api_${today}.log`);
    fs.appendFileSync(logFile, logMessage + '\n', 'utf-8');
  }

  info(message: string): void {
    this.log(message, 'info');
  }

  warn(message: string): void {
    this.log(message, 'warn');
  }

  error(message: string): void {
    this.log(message, 'error');
  }
}

// Global instances
const logger = new Logger();
let aiGenerator: AIToJSON | null = null;

function getGenerator(): AIToJSON {
  if (!aiGenerator) {
    aiGenerator = new AIToJSON();
    if (!aiGenerator) {
      throw new Error('Failed to initialize AI generator: No OpenAI client available');
    }
    console.log('✅ AI generator initialized successfully');
  }
  return aiGenerator;
}

// Request/Response handlers
export class RPSAPIServer {
  private app: express.Application;
  private port: number;
  private host: string;

  constructor(port: number = 5000, host: string = '0.0.0.0') {
    this.app = express();
    this.port = port;
    this.host = host;
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // CORS
    this.app.use(
      cors({
        origin: '*',
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type'],
      })
    );

    // Body parser
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ limit: '50mb', extended: true }));

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      console.log(`📨 ${req.method} ${req.path}`);

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        console.log(`✅ ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
      });

      next();
    });

    // Error handling middleware
    this.app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      console.error('❌ Error:', err);
      res.status(500).json({ error: err.message || 'Internal Server Error' });
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      const response = {
        status: 'ok',
        backend: 'nodejs',
        model: process.env.MODEL || 'gpt-5-mini-2025-08-07',
        timestamp: new Date().toISOString(),
      };
      res.json(response);
    });

    // Generate RPS
    this.app.post('/generate', async (req: GenerateRequest, res: Response) => {
      try {
        const startTime = Date.now();
        const generateType = req.body.type || 'full';
        const courseName = req.body.courseName || 'Mata Kuliah';
        const courseCode = req.body.courseCode || 'MK001';
        const sks = req.body.sks || 3;
        const semester = req.body.semester || 1;
        const status = req.body.status || 'Mata Kuliah Wajib';
        const prereq = req.body.prereq || '-';
        const additionalContext = req.body.additionalContext || '';
        
        // Additional data for partial generation
        const deskripsi = req.body.deskripsi || '';
        const cplList = req.body.cpl || req.body.cplList || [];
        const cpmkList = req.body.cpmk || req.body.cpmkList || [];

        console.log(`\n📝 Generating ${generateType.toUpperCase()} for: ${courseName}`);

        const generator = getGenerator();
        let result: any;

        if (generateType === 'full') {
          result = await generator.generateRpsJson(
            courseName,
            courseCode,
            sks,
            semester,
            status,
            prereq,
            additionalContext
          );
          if (!result) {
            throw new Error('Failed to generate RPS content');
          }
          res.json({ success: true, data: result });
        } 
        else if (generateType === 'cpl') {
          result = await generator.generateCplJson(
            courseName,
            courseCode,
            sks,
            semester,
            deskripsi,
            additionalContext
          );
          if (!result) {
            throw new Error('Failed to generate CPL');
          }
          res.json({ success: true, data: { cpl: result } });
        } 
        else if (generateType === 'cpmk') {
          result = await generator.generateCpmkJson(
            courseName,
            courseCode,
            sks,
            semester,
            deskripsi,
            cplList.length > 0 ? cplList : null,
            additionalContext
          );
          if (!result) {
            throw new Error('Failed to generate CPMK');
          }
          res.json({ success: true, data: { cpmk: result } });
        } 
        else if (generateType === 'weeklyPlan') {
          result = await generator.generateWeeklyPlanJson(
            courseName,
            courseCode,
            sks,
            semester,
            deskripsi,
            cpmkList.length > 0 ? cpmkList : null,
            additionalContext
          );
          if (!result) {
            throw new Error('Failed to generate Weekly Plan');
          }
          res.json({ success: true, data: { minggu: result } });
        } 
        else if (generateType === 'references') {
          result = await generator.generateReferencesJson(
            courseName,
            courseCode,
            additionalContext
          );
          if (!result) {
            throw new Error('Failed to generate References');
          }
          res.json({ success: true, data: { referensi: result } });
        } 
        else {
          throw new Error(`Unknown generation type: ${generateType}. Supported types: full, cpl, cpmk, weeklyPlan, references`);
        }

        const duration = Date.now() - startTime;
        logger.info(`✅ Generated ${generateType} in ${duration}ms for ${courseName}`);
      } catch (error: any) {
        logger.error(`❌ Generate error: ${error.message}`);
        res.status(500).json({ error: error.message || 'Generation failed' });
      }
    });

    // Export to DOCX (supports both nested and flat data structures)
    this.app.post('/export', async (req: ExportRequest, res: Response) => {
      try {
        const startTime = Date.now();
        console.log('\n📄 Starting DOCX export...');

        const body = req.body as any;
        console.log(`📋 Received data keys: ${Object.keys(body).join(', ')}`);

        // Support both nested (rpsData/meta) and flat structures
        let rpsData: any = {};
        let meta: any = {};

        if (body.rpsData && Object.keys(body.rpsData).length > 0) {
          // Nested structure: {rpsData: {...}, meta: {...}}
          rpsData = body.rpsData || {};
          meta = body.meta || {};
        } else if (body.identitas) {
          // Flat structure: {identitas: {...}, cpl: [...], cpmk: [...], ...}
          // Map flat fields to rpsData structure
          meta = {
            kode: body.identitas?.kode,
            nama: body.identitas?.nama,
            sks: body.identitas?.sks,
            semester: body.identitas?.semester,
            status: body.identitas?.status,
            prasyarat: body.identitas?.prasyarat,
            ...(body.otoritas || {}),
            ...body,
          };

          rpsData = {
            cpl: body.cpl,
            cpmk: body.cpmk,
            minggu: body.minggu,
            referensi: body.referensi,
            ...body,
          };
        } else {
          // Default: treat entire body as rpsData
          rpsData = body || {};
        }

        console.log(`📋 rpsData keys: ${Object.keys(rpsData).join(', ')}`);
        console.log(`📋 meta keys: ${Object.keys(meta).join(', ')}`);

        // Prepare metadata with defaults
        const finalMeta: Metadata = {
          nama: meta.nama || 'Mata Kuliah',
          kode: meta.kode || 'MK001',
          sks: meta.sks || 3,
          semester: meta.semester || 1,
          status: meta.status || 'Mata Kuliah Wajib',
          prasyarat: meta.prasyarat || '-',
          ...meta,
        };

        // Get template path
        const templatePath = process.env.TEMPLATE_PATH || path.join(process.cwd(), '../../public/RPS.docx');

        // Create temp file for output
        const tempFilePath = path.join(
          os.tmpdir(),
          `rps_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.docx`
        );

        const converter = new JSONToDocx(templatePath);
        const success = await converter.exportToDocx(rpsData, finalMeta, tempFilePath);

        if (!success) {
          throw new Error('JSONToDocx.exportToDocx() returned False');
        }

        // Read file and encode as base64
        const docxBytes = fs.readFileSync(tempFilePath);
        const docxBase64 = docxBytes.toString('base64');

        console.log(`✅ DOCX file created: ${docxBytes.length} bytes`);
        console.log(`✅ Base64 encoded: ${docxBase64.length} chars`);

        const response = {
          success: true,
          docx: docxBase64,
          filename: `RPS_${finalMeta.kode}.docx`,
        };

        const duration = Date.now() - startTime;
        logger.info(`✅ Exported DOCX in ${duration}ms for ${finalMeta.nama}`);

        // Cleanup temp file
        fs.unlink(tempFilePath, (err) => {
          if (err) console.warn(`⚠️ Failed to cleanup temp file: ${err}`);
        });

        res.json(response);
      } catch (error: any) {
        logger.error(`❌ Export error: ${error.message}`);
        res.status(500).json({ error: error.message || 'Export failed' });
      }
    });

    // Default 404
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({ error: 'Not Found' });
    });
  }

  public start(): void {
    this.app.listen(this.port, this.host, () => {
      logger.info(`🚀 RPS API Server running on http://${this.host}:${this.port}`);
      logger.info(`   Accessible at: http://localhost:${this.port}`);
      logger.info('='.repeat(50));
      logger.info('Endpoints:');
      logger.info(`  GET  http://localhost:${this.port}/health`);
      logger.info(`  POST http://localhost:${this.port}/generate`);
      logger.info(`  POST http://localhost:${this.port}/export`);
      logger.info('='.repeat(50));
      logger.info('📊 Logging enabled - check ./logs/');
    });
  }
}

// Export for use in main.ts or tests
export { logger };
export default RPSAPIServer;
