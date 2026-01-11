import { NextRequest, NextResponse } from 'next/server';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  AlignmentType,
  BorderStyle,
  VerticalAlign,
  HeadingLevel,
  PageOrientation,
} from 'docx';
import { RPSData } from '@/types/rps';

// Helper to create a bordered table cell
function createCell(
  text: string,
  options: {
    bold?: boolean;
    width?: number;
    rowSpan?: number;
    columnSpan?: number;
    shading?: string;
    alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
    fontSize?: number;
  } = {}
): TableCell {
  const { bold = false, width, rowSpan, columnSpan, shading, alignment = AlignmentType.LEFT, fontSize = 20 } = options;
  
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold,
            size: fontSize,
          }),
        ],
        alignment,
      }),
    ],
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    rowSpan,
    columnSpan,
    shading: shading ? { fill: shading } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
    },
  });
}

// Create header row
function createHeaderRow(texts: string[], widths?: number[]): TableRow {
  return new TableRow({
    children: texts.map((text, i) =>
      createCell(text, {
        bold: true,
        width: widths?.[i],
        shading: 'E8E8E8',
        alignment: AlignmentType.CENTER,
        fontSize: 18,
      })
    ),
  });
}

// Generate DOCX from RPS data
function generateRPSDocument(data: RPSData): Document {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
            },
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: [
          // Title
          new Paragraph({
            children: [
              new TextRun({
                text: 'RENCANA PEMBELAJARAN SEMESTER (RPS)',
                bold: true,
                size: 28,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `PROGRAM STUDI ${data.institution.programStudi.toUpperCase()}`,
                bold: true,
                size: 24,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: data.institution.fakultas.toUpperCase(),
                bold: true,
                size: 24,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: data.institution.universitas.toUpperCase(),
                bold: true,
                size: 24,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          // Table 1: Course Identity
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createHeaderRow([
                'Kode Mata Kuliah',
                'Nama Mata Kuliah',
                'Bobot SKS',
                'Semester',
                'Status Mata Kuliah',
                'Mata Kuliah Prasyarat',
              ]),
              new TableRow({
                children: [
                  createCell(data.identity.kode, { alignment: AlignmentType.CENTER }),
                  createCell(data.identity.nama),
                  createCell(String(data.identity.sks), { alignment: AlignmentType.CENTER }),
                  createCell(String(data.identity.semester), { alignment: AlignmentType.CENTER }),
                  createCell(data.identity.status),
                  createCell(data.identity.prasyarat),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { after: 200 } }),

          // Authority Section
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createHeaderRow(['Otoritas', 'Nama', 'NIP/NPPU']),
              new TableRow({
                children: [
                  createCell('Koordinator Mata Kuliah'),
                  createCell(data.authority.koordinatorMK.nama),
                  createCell(data.authority.koordinatorMK.nip),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Koordinator GPM'),
                  createCell(data.authority.koordinatorGPM.nama),
                  createCell(data.authority.koordinatorGPM.nip),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Ketua Prodi'),
                  createCell(data.authority.ketuaProdi.nama),
                  createCell(data.authority.ketuaProdi.nip),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Dekan'),
                  createCell(data.authority.dekan.nama),
                  createCell(data.authority.dekan.nip),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { after: 200 } }),

          // Description
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createCell('Deskripsi Singkat Mata Kuliah', { bold: true, shading: 'E8E8E8', width: 3000 }),
                  createCell(data.deskripsiSingkat),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { after: 200 } }),

          // CPL Table
          new Paragraph({
            children: [new TextRun({ text: 'Capaian Pembelajaran Lulusan (CPL) yang Dibebankan pada MK', bold: true, size: 22 })],
            spacing: { before: 200, after: 100 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createHeaderRow(['Kode CPL', 'Pernyataan CPL']),
              ...data.cplList.map(
                (cpl) =>
                  new TableRow({
                    children: [
                      createCell(cpl.kode, { bold: true, width: 1500, alignment: AlignmentType.CENTER }),
                      createCell(cpl.pernyataan),
                    ],
                  })
              ),
            ],
          }),

          new Paragraph({ spacing: { after: 200 } }),

          // CPMK Table
          new Paragraph({
            children: [new TextRun({ text: 'Capaian Pembelajaran Mata Kuliah (CPMK)', bold: true, size: 22 })],
            spacing: { before: 200, after: 100 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createCell('Setelah menyelesaikan pembelajaran mata kuliah ini, mahasiswa diharapkan mampu:', {
                    columnSpan: 2,
                    shading: 'E8E8E8',
                  }),
                ],
              }),
              createHeaderRow(['Kode CPMK', 'Pernyataan CPMK']),
              ...data.cpmkList.map(
                (cpmk) =>
                  new TableRow({
                    children: [
                      createCell(cpmk.kode, { bold: true, width: 1500, alignment: AlignmentType.CENTER }),
                      createCell(cpmk.pernyataan),
                    ],
                  })
              ),
            ],
          }),

          new Paragraph({ spacing: { after: 200 } }),

          // Weekly Plan Table
          new Paragraph({
            children: [new TextRun({ text: 'Rencana Pembelajaran Mingguan', bold: true, size: 22 })],
            spacing: { before: 200, after: 100 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createHeaderRow([
                'Minggu',
                'Kemampuan Akhir',
                'Bahan Kajian',
                'Metode Pembelajaran',
                'Waktu',
                'Pengalaman Belajar',
                'Kriteria Penilaian',
                'Bobot (%)',
              ]),
              ...data.weeklyPlan.map(
                (week) =>
                  new TableRow({
                    children: [
                      createCell(String(week.mingguKe), { alignment: AlignmentType.CENTER, width: 800 }),
                      createCell(week.kemampuanAkhir, { fontSize: 18 }),
                      createCell(week.bahanKajian, { fontSize: 18 }),
                      createCell(
                        week.metodePembelajaran.tmScl ||
                          week.metodePembelajaran.pbl ||
                          week.metodePembelajaran.cbl ||
                          week.metodePembelajaran.pjbl ||
                          '-',
                        { fontSize: 18 }
                      ),
                      createCell(week.waktu, { alignment: AlignmentType.CENTER, width: 900 }),
                      createCell(week.pengalamanBelajar, { fontSize: 18 }),
                      createCell(week.penilaian.kriteria, { fontSize: 18 }),
                      createCell(String(week.penilaian.bobot), { alignment: AlignmentType.CENTER, width: 800 }),
                    ],
                  })
              ),
            ],
          }),

          new Paragraph({ spacing: { after: 200 } }),

          // Assessment Methods
          new Paragraph({
            children: [new TextRun({ text: 'Metode Penilaian', bold: true, size: 22 })],
            spacing: { before: 200, after: 100 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createHeaderRow(['Teknik Penilaian', 'Persentase', 'Kriteria', 'CPMK 1', 'CPMK 2', 'CPMK 3', 'CPMK 4']),
              ...data.assessmentMethods.map(
                (method) =>
                  new TableRow({
                    children: [
                      createCell(method.teknik),
                      createCell(`${method.persentase}%`, { alignment: AlignmentType.CENTER }),
                      createCell(method.kriteria),
                      createCell(method.distribusiCPMK.cpmk1 ? `${method.distribusiCPMK.cpmk1}%` : '-', {
                        alignment: AlignmentType.CENTER,
                      }),
                      createCell(method.distribusiCPMK.cpmk2 ? `${method.distribusiCPMK.cpmk2}%` : '-', {
                        alignment: AlignmentType.CENTER,
                      }),
                      createCell(method.distribusiCPMK.cpmk3 ? `${method.distribusiCPMK.cpmk3}%` : '-', {
                        alignment: AlignmentType.CENTER,
                      }),
                      createCell(method.distribusiCPMK.cpmk4 ? `${method.distribusiCPMK.cpmk4}%` : '-', {
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                  })
              ),
            ],
          }),

          new Paragraph({ spacing: { after: 200 } }),

          // References
          new Paragraph({
            children: [new TextRun({ text: 'Daftar Referensi', bold: true, size: 22 })],
            spacing: { before: 200, after: 100 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createHeaderRow(['No', 'Judul', 'Penulis', 'Jenis']),
              ...data.references.map(
                (ref, i) =>
                  new TableRow({
                    children: [
                      createCell(String(i + 1), { alignment: AlignmentType.CENTER, width: 600 }),
                      createCell(ref.judul),
                      createCell(ref.penulis),
                      createCell(ref.jenis, { alignment: AlignmentType.CENTER }),
                    ],
                  })
              ),
            ],
          }),
        ],
      },
    ],
  });

  return doc;
}

export async function POST(request: NextRequest) {
  try {
    const rpsData: RPSData = await request.json();

    // Validate required data
    if (!rpsData.identity?.nama) {
      return NextResponse.json(
        { error: 'Data RPS tidak lengkap' },
        { status: 400 }
      );
    }

    // Generate document
    const doc = generateRPSDocument(rpsData);

    // Convert to buffer
    const buffer = await Packer.toBuffer(doc);

    // Return as downloadable file
    const filename = `RPS_${rpsData.identity.kode || 'draft'}_${rpsData.identity.nama.replace(/\s+/g, '_')}.docx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('DOCX Generation Error:', error);
    return NextResponse.json(
      { error: 'Gagal membuat dokumen DOCX' },
      { status: 500 }
    );
  }
}
