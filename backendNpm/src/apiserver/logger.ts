import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(MODULE_DIR, '..', '..');
const LOGS_DIR = path.join(PROJECT_ROOT, 'logs');
const EXPORTS_DIR = path.join(LOGS_DIR, 'exports');

function ensureDirectories(): void {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
  if (!fs.existsSync(EXPORTS_DIR)) {
    fs.mkdirSync(EXPORTS_DIR, { recursive: true });
  }
}

function dailyLogFilePath(): string {
  const today = new Date().toISOString().split('T')[0];
  return path.join(LOGS_DIR, `npm_api_${today}.log`);
}

function writeLine(level: 'INFO' | 'WARN' | 'ERROR', message: string): void {
  ensureDirectories();
  const timestamp = new Date().toISOString().replace('T', ' ').replace('Z', '');
  const line = `${timestamp} | ${level.padEnd(8, ' ')} | ${message}`;

  // Keep stdout behavior similar to Python logger_util.py.
  console.log(line);

  fs.appendFileSync(dailyLogFilePath(), `${line}\n`, 'utf-8');
}

export const logger = {
  info(message: string): void {
    writeLine('INFO', message);
  },

  warn(message: string): void {
    writeLine('WARN', message);
  },

  error(message: string): void {
    writeLine('ERROR', message);
  },
};

export function logRequest(endpoint: string, data: unknown, clientIp = 'unknown'): void {
  logger.info(`📥 REQUEST | ${endpoint} | IP: ${clientIp}`);
  if (data && typeof data === 'object') {
    logger.info(`Request data keys: ${Object.keys(data as Record<string, unknown>).join(', ')}`);
  } else {
    logger.info(`Request data type: ${typeof data}`);
  }
}

export function logResponse(
  endpoint: string,
  status: number,
  durationMs: number,
  error?: string
): void {
  if (error) {
    logger.error(`❌ RESPONSE | ${endpoint} | ${status} | ${Math.round(durationMs)}ms | Error: ${error}`);
    return;
  }

  logger.info(`✅ RESPONSE | ${endpoint} | ${status} | ${Math.round(durationMs)}ms`);
}

export function logTiming(label: string, durationMs: number): void {
  logger.info(`⏱️ TIMING | ${label}: ${durationMs.toFixed(2)}ms`);
}

export function saveExportJson(
  rpsData: unknown,
  meta: Record<string, unknown>,
  filenamePrefix = 'docx_export'
): string | null {
  ensureDirectories();

  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
  const courseCode = String(meta.kode || 'unknown').replace(/\//g, '_');
  const filename = `${filenamePrefix}_${courseCode}_${timestamp}.json`;
  const outputPath = path.join(EXPORTS_DIR, filename);

  const payload = {
    timestamp: now.toISOString(),
    meta,
    rpsData,
  };

  try {
    fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf-8');
    logger.info(`💾 SAVED | Export JSON: ${filename}`);
    return outputPath;
  } catch (error) {
    logger.error(`❌ SAVE ERROR | Failed to save export JSON: ${String(error)}`);
    return null;
  }
}

export function logPerformanceMetrics(metrics: Record<string, unknown>): void {
  logger.info('📊 PERFORMANCE METRICS:');
  for (const [key, value] of Object.entries(metrics)) {
    if (typeof value === 'number') {
      logger.info(`   ${key}: ${value.toFixed(2)}`);
    } else {
      logger.info(`   ${key}: ${String(value)}`);
    }
  }
}

export function cleanupOldLogs(daysToKeep = 7): void {
  ensureDirectories();
  const cutoff = Date.now() - daysToKeep * 86400 * 1000;

  let deletedCount = 0;
  for (const fileName of fs.readdirSync(LOGS_DIR)) {
    if (!fileName.endsWith('.log')) {
      continue;
    }

    const filePath = path.join(LOGS_DIR, fileName);
    const stat = fs.statSync(filePath);
    if (stat.mtimeMs < cutoff) {
      try {
        fs.unlinkSync(filePath);
        deletedCount++;
      } catch {
        // Ignore single-file cleanup failures.
      }
    }
  }

  if (deletedCount > 0) {
    logger.info(`🧹 CLEANUP | Deleted ${deletedCount} old log files`);
  }
}

cleanupOldLogs();
