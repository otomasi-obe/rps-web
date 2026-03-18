import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { JSONToDocx } from './converter.js';

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface RPSData {
  deskripsi?: string;
  cpl?: any[];
  cpmk?: any[];
  ik?: any[];
  minggu?: any[];
  referensi?: any[];
  penilaian?: any[];
  cpmkList?: any[];
  deskripsiSingkat?: string;
  weeklyPlan?: any[];
  [key: string]: any;
}

export interface Metadata {
  nama?: string;
  kode?: string;
  sks?: number;
  semester?: number;
  status?: string;
  prasyarat?: string;
  koordinatorMK?: { nama: string; nip: string };
  koordinatorGPM?: { nama: string; nip: string };
  ketuaProdi?: { nama: string; nip: string };
  dekan?: { nama: string; nip: string };
  [key: string]: any;
}

/**
 * Wrapper class untuk JSON to DOCX conversion.
 * Uses pure npm libraries (no Python dependency).
 */
export class JSONToDocxWrapper {
  private templatePath: string;

  constructor(templatePath?: string) {
    dotenv.config();

    if (templatePath) {
      this.templatePath = templatePath;
    } else {
      // Default: look for RPS.docx in public directory
      const scriptDir = __dirname;
      const projectRoot = path.join(scriptDir, '../../..');
      this.templatePath = path.join(projectRoot, 'public', 'RPS.docx');
    }
  }

  public async exportToDocx(
    rpsData: RPSData,
    meta: Metadata,
    outputPath: string
  ): Promise<boolean> {
    try {
      console.log('[CONVERT] Validating template...');
      if (!fs.existsSync(this.templatePath)) {
        console.log(`[ERROR] Template not found: ${this.templatePath}`);
        return false;
      }
      console.log(`[OK] Template found: ${this.templatePath}`);

      console.log(
        '[CONVERT] Converting JSON to DOCX via pure npm implementation (no Python)...'
      );
      console.log(`   Template: ${this.templatePath}`);
      console.log(`   Output: ${outputPath}`);

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

      // Use the pure npm converter
      const converter = new JSONToDocx(this.templatePath);
      const result = await converter.exportToDocx(rpsData, finalMeta, outputPath);

      if (result) {
        console.log(`✅ DOCX export completed successfully via npm pipeline.`);
      } else {
        console.error(`❌ DOCX generation failed.`);
      }

      return result;

    } catch (error) {
      console.error('[ERROR] Export failed in Node.js wrapper:', error);
      return false;
    }
  }
}

// Export converter class for direct use
export { JSONToDocx };

