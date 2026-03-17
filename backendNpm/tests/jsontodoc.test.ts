import { JSONToDocx, RPSData, Metadata } from '../src/jsontodoc/index';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('JSONToDocx', () => {
  let converter: JSONToDocx;
  let tempDir: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rps-test-'));
    converter = new JSONToDocx();
  });

  afterAll(() => {
    // Cleanup temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  test('should instantiate JSONToDocx', () => {
    expect(converter).toBeDefined();
  });

  test('should create DOCX from RPS data', async () => {
    const rpsData: RPSData = {
      deskripsi: 'Test course description',
      cpl: [
        { kode: 'CPL1', pernyataan: 'Test CPL' },
      ],
      cpmk: [
        { kode: 'CPMK 1-1', pernyataan: 'Test CPMK', N1: 5, N2: 5, N3: 0, N4: 0, N5: 0, N_cpmk: 10 },
      ],
      minggu: [
        {
          mingguKe: 1,
          kemampuanAkhir: 'CPMK 1-1',
          bahanKajian: 'Introduction',
          metodePembelajaran: { metode: 'TM SCL', deskripsi: 'Teaching lecture', aktivitas: 'Student learning' },
          waktu: 'TM Ceramah 3x50\', Kuis, Tugas Mandiri',
          pengalamanBelajar: 'Students understand basics',
          penilaian: { kriteria: 'Understanding level', bobotMateri: 7 },
        },
      ],
      referensi: [
        'Reference 1',
        'Reference 2',
      ],
    };

    const meta: Metadata = {
      nama: 'Test Course',
      kode: 'TIF101',
      sks: 3,
      semester: 1,
      status: 'Mata Kuliah Wajib',
      prasyarat: '-',
    };

    const outputPath = path.join(tempDir, 'test_output.docx');
    const result = await converter.exportToDocx(rpsData, meta, outputPath);

    expect(result).toBe(true);
    expect(fs.existsSync(outputPath)).toBe(true);

    // Check file size
    const stats = fs.statSync(outputPath);
    expect(stats.size).toBeGreaterThan(0);
  });

  test('should handle missing metadata gracefully', async () => {
    const rpsData: RPSData = {
      deskripsi: 'Test description',
      cpl: [],
      cpmk: [],
      minggu: [],
      referensi: [],
    };

    const meta: Metadata = {}; // Empty metadata

    const outputPath = path.join(tempDir, 'test_empty_meta.docx');
    const result = await converter.exportToDocx(rpsData, meta, outputPath);

    expect(result).toBe(true);
    expect(fs.existsSync(outputPath)).toBe(true);
  });

  test('should create weekly plan table', async () => {
    const rpsData: RPSData = {
      deskripsi: 'Test with weekly plan',
      cpl: [],
      cpmk: [],
      minggu: [
        { mingguKe: 1, kemampuanAkhir: 'CPMK 1', bahanKajian: 'Topic 1', metodePembelajaran: { metode: 'TM' }, waktu: '3x50\'', pengalamanBelajar: 'Learn basics', penilaian: { kriteria: 'Test', bobotMateri: 5 } },
        { mingguKe: 2, kemampuanAkhir: 'CPMK 2', bahanKajian: 'Topic 2', metodePembelajaran: { metode: 'PBL' }, waktu: '3x50\'', pengalamanBelajar: 'Practice', penilaian: { kriteria: 'Quiz', bobotMateri: 5 } },
      ],
      referensi: [],
    };

    const meta: Metadata = {
      nama: 'Test',
      kode: 'TEST',
      sks: 3,
      semester: 1,
    };

    const outputPath = path.join(tempDir, 'test_weekly_plan.docx');
    const result = await converter.exportToDocx(rpsData, meta, outputPath);

    expect(result).toBe(true);
    expect(fs.existsSync(outputPath)).toBe(true);
  });
});
