/**
 * Client-side and Server-side Logger for RPS System
 * Logs to console and optionally to file (server-side only)
 */

import { promises as fs } from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const isServer = typeof window === 'undefined';

// Ensure logs directory exists (server-side only)
if (isServer) {
  fs.mkdir(LOG_DIR, { recursive: true }).catch(() => {});
}

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'ERROR' | 'WARN' | 'DEBUG';
  message: string;
  data?: any;
}

class Logger {
  private context: string;

  constructor(context: string = 'RPS') {
    this.context = context;
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `${timestamp} | ${level.padEnd(8)} | [${this.context}] ${message}`;
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    if (!isServer) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const logFile = path.join(LOG_DIR, `nextjs_api_${today}.log`);
      
      const logLine = `${entry.timestamp} | ${entry.level.padEnd(8)} | [${this.context}] ${entry.message}\n`;
      
      await fs.appendFile(logFile, logLine, 'utf-8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  info(message: string, data?: any): void {
    const formatted = this.formatMessage('INFO', message);
    console.log(formatted);
    
    if (data) {
      console.log('  Data:', data);
    }

    this.writeToFile({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      data,
    });
  }

  error(message: string, error?: any): void {
    const formatted = this.formatMessage('ERROR', message);
    console.error(formatted);
    
    if (error) {
      console.error('  Error:', error);
    }

    this.writeToFile({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      data: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
      } : error,
    });
  }

  warn(message: string, data?: any): void {
    const formatted = this.formatMessage('WARN', message);
    console.warn(formatted);
    
    if (data) {
      console.warn('  Data:', data);
    }

    this.writeToFile({
      timestamp: new Date().toISOString(),
      level: 'WARN',
      message,
      data,
    });
  }

  debug(message: string, data?: any): void {
    const formatted = this.formatMessage('DEBUG', message);
    console.debug(formatted);
    
    if (data && process.env.NODE_ENV === 'development') {
      console.debug('  Data:', data);
    }

    this.writeToFile({
      timestamp: new Date().toISOString(),
      level: 'DEBUG',
      message,
      data,
    });
  }

  timing(label: string, durationMs: number): void {
    const message = `⏱️  ${label}: ${durationMs.toFixed(2)}ms`;
    this.info(message);
  }
}

// Helper function to save export JSON
export async function saveExportJSON(
  rpsData: any,
  meta: any,
  prefix: string = 'export'
): Promise<string | null> {
  if (!isServer) return null;

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const courseCode = (meta.kode || 'unknown').replace(/\//g, '_');
    
    const exportsDir = path.join(LOG_DIR, 'exports');
    await fs.mkdir(exportsDir, { recursive: true });
    
    const filename = `${prefix}_${courseCode}_${timestamp}.json`;
    const filepath = path.join(exportsDir, filename);
    
    const exportData = {
      timestamp: new Date().toISOString(),
      meta,
      rpsData,
    };
    
    await fs.writeFile(filepath, JSON.stringify(exportData, null, 2), 'utf-8');
    
    const logger = new Logger('Export');
    logger.info(`💾 Saved export JSON: ${filename}`);
    
    return filepath;
  } catch (error) {
    console.error('Failed to save export JSON:', error);
    return null;
  }
}

export default Logger;
