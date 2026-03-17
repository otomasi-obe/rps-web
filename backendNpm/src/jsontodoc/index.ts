import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, AlignmentType, UnderlineType } from 'docx';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

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
}

export interface Metadata {
  nama?: string;
  kode?: string;
  sks?: number;
  semester?: number;
  status?: string;
  prasyarat?: string;
  prasayarat?: string;
  koordinatorMK?: { nama: string; nip: string };
  koordinatorGPM?: { nama: string; nip: string };
  ketuaProdi?: { nama: string; nip: string };
  dekan?: { nama: string; nip: string };
}

export class JSONToDocx {
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

  private validateTemplate(): boolean {
    if (!fs.existsSync(this.templatePath)) {
      console.log(`[ERROR] Template not found: ${this.templatePath}`);
      return false;
    }
    console.log(`[OK] Template found: ${this.templatePath}`);
    return true;
  }

  private generateMediaAsesmenString(cpmkItem: any): string {
    const components: string[] = [];
    if (cpmkItem?.N1 > 0) components.push('PRS');
    if (cpmkItem?.N2 > 0) components.push('PRO');
    if (cpmkItem?.N3 > 0) components.push('QUIZ');
    if (cpmkItem?.N4 > 0) components.push('UTS');
    if (cpmkItem?.N5 > 0) components.push('UAS');
    return components.join(', ');
  }

  public async exportToDocx(
    rpsData: RPSData,
    meta: Metadata,
    outputPath: string
  ): Promise<boolean> {
    try {
      console.log('[CONVERT] Validating template...');
      if (!this.validateTemplate()) {
        console.log('[ERROR] Template validation failed');
        return false;
      }

      console.log('[CONVERT] Converting JSON to DOCX...');
      console.log(`   Template: ${this.templatePath}`);
      console.log(`   Output: ${outputPath}`);

      console.log('[CONVERT] Creating document structure...');

      // Get CPMK list for lookups
      const cpmkList = (rpsData.cpmkList || rpsData.cpmk || []) as any[];

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

      const deskripsi = rpsData.deskripsiSingkat || rpsData.deskripsi || '';

      // Create document sections
      const documentChildren: any[] = [
        // Title
        new Paragraph({
          text: 'RENCANA PEMBELAJARAN SEMESTER (RPS)',
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          thematicBreak: false,
        }),

        // Course Identity
        new Paragraph({
          text: `Mata Kuliah: ${finalMeta.nama}`,
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: `Kode: ${finalMeta.kode}`,
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: `SKS: ${finalMeta.sks} (${finalMeta.status})`,
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: `Semester: ${finalMeta.semester}`,
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: `Prasyarat: ${finalMeta.prasyarat}`,
          spacing: { after: 300 },
        }),

        // Description
        new Paragraph({
          text: 'Deskripsi:',
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: deskripsi,
          spacing: { after: 300 },
        }),
      ];

      // CPL Section
      if (rpsData.cpl && rpsData.cpl.length > 0) {
        documentChildren.push(
          new Paragraph({
            text: 'Capaian Pembelajaran Lulusan (CPL):',
            spacing: { after: 200 },
          })
        );

        for (const item of rpsData.cpl) {
          documentChildren.push(
            new Paragraph({
              text: `${item.kode}: ${item.pernyataan}`,
              spacing: { after: 100 },
            })
          );
        }

        documentChildren.push(new Paragraph({ text: '', spacing: { after: 200 } }));
      }

      // CPMK Section
      if (cpmkList.length > 0) {
        documentChildren.push(
          new Paragraph({
            text: 'Capaian Pembelajaran Mata Kuliah (CPMK):',
            spacing: { after: 200 },
          })
        );

        for (const item of cpmkList) {
          documentChildren.push(
            new Paragraph({
              text: `${item.kode}: ${item.pernyataan}`,
              spacing: { after: 100 },
            })
          );
        }

        documentChildren.push(new Paragraph({ text: '', spacing: { after: 200 } }));
      }

      // Weekly Plan Table
      if (rpsData.minggu && rpsData.minggu.length > 0) {
        documentChildren.push(
          new Paragraph({
            text: 'Rencana Pembelajaran Mingguan:',
            spacing: { after: 200 },
          })
        );

        documentChildren.push(this.createWeeklyPlanTable(rpsData.minggu));
        documentChildren.push(new Paragraph({ text: '', spacing: { after: 200 } }));
      }

      // References
      if (rpsData.referensi && rpsData.referensi.length > 0) {
        documentChildren.push(
          new Paragraph({
            text: 'Referensi:',
            spacing: { after: 200 },
          })
        );

        for (const ref of rpsData.referensi) {
          documentChildren.push(
            new Paragraph({
              text: String(ref),
              spacing: { after: 100 },
            })
          );
        }
      }

      // Create document
      const doc = new Document({
        sections: [
          {
            children: documentChildren,
          },
        ],
      });

      // Save document
      const buffer = await Packer.toBuffer(doc);
      fs.writeFileSync(outputPath, buffer);

      const fileSize = fs.statSync(outputPath).size;
      console.log(`✅ DOCX file created: ${fileSize} bytes`);

      return true;
    } catch (error) {
      console.error('[ERROR] Export failed:', error);
      return false;
    }
  }

  private createWeeklyPlanTable(mingguList: any[]): Table {
    const rows: any[] = [];

    // Header row
    rows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('Minggu ke')] }),
          new TableCell({ children: [new Paragraph('Kemampuan Akhir')] }),
          new TableCell({ children: [new Paragraph('Bahan Kajian')] }),
          new TableCell({ children: [new Paragraph('Metode Pembelajaran')] }),
          new TableCell({ children: [new Paragraph('Waktu')] }),
          new TableCell({ children: [new Paragraph('Penilaian')] }),
        ],
      })
    );

    // Data rows
    for (const minggu of mingguList) {
      const mingguKe = String(minggu.mingguKe || minggu.minggu || '');
      const kemampuanAkhir = minggu.kemampuanAkhir || '';
      const bahanKajian = minggu.bahanKajian || '';
      const metodePembelajaran = minggu.metodePembelajaran || {};
      const waktu = minggu.waktu || '';
      const penilaian = minggu.penilaian || {};

      const metodeText = Array.isArray(metodePembelajaran)
        ? metodePembelajaran.map((m: any) => m.metode || '').join(', ')
        : (metodePembelajaran as any).metode || '';

      const penilaianText = Array.isArray(penilaian)
        ? penilaian.map((p: any) => `${p.kriteria} (${p.bobotMateri}%)`).join('; ')
        : (penilaian as any).kriteria || '';

      rows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(mingguKe)] }),
            new TableCell({ children: [new Paragraph(kemampuanAkhir)] }),
            new TableCell({ children: [new Paragraph(bahanKajian)] }),
            new TableCell({ children: [new Paragraph(metodeText)] }),
            new TableCell({ children: [new Paragraph(waktu)] }),
            new TableCell({ children: [new Paragraph(penilaianText)] }),
          ],
        })
      );
    }

    return new Table({
      rows: rows,
      width: { size: 100, type: WidthType.PERCENTAGE },
    });
  }
}
