import { NextRequest, NextResponse } from 'next/server';
import { RPSData } from '@/types/rps';

// Python API URL
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:5000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rpsData, meta } = body as { rpsData: RPSData; meta: Record<string, unknown> };

    // Validate required data
    if (!rpsData) {
      return NextResponse.json(
        { error: 'RPS data is required' },
        { status: 400 }
      );
    }

    // Prepare meta from rpsData if not provided
    const exportMeta = meta || {
      nama: rpsData.identity.nama,
      kode: rpsData.identity.kode,
      sks: rpsData.identity.sks,
      semester: rpsData.identity.semester,
      status: rpsData.identity.status || 'Mata Kuliah Wajib',
      prasyarat: rpsData.identity.prasyarat || '-',
    };

    // Convert rpsData to Python format
    const pythonRPSData = {
      deskripsi: rpsData.deskripsiSingkat,
      cpl: rpsData.cplList.map(c => ({
        kode: c.kode,
        pernyataan: c.pernyataan,
      })),
      cpmk: rpsData.cpmkList.map(c => ({
        kode: c.kode,
        pernyataan: c.pernyataan,
        mapping_cpl: '',
      })),
      minggu: rpsData.weeklyPlan.map(w => ({
        minggu: w.mingguKe,
        cpmk: w.kemampuanAkhir,
        topik: w.bahanKajian,
        metode: w.metodePembelajaran.tmScl || w.metodePembelajaran.pbl || w.metodePembelajaran.cbl || w.metodePembelajaran.pjbl,
        waktu: w.waktu,
        pengalaman: w.pengalamanBelajar,
        indikator: w.penilaian.kriteria,
        bobot: String(w.penilaian.bobot),
      })),
      penilaian: rpsData.assessmentMethods.map(a => ({
        komponen: a.teknik,
        bobot: `${a.persentase}%`,
        kriteria: a.kriteria,
        cpmk1: a.distribusiCPMK?.cpmk1 ? `${a.distribusiCPMK.cpmk1}%` : '',
        cpmk2: a.distribusiCPMK?.cpmk2 ? `${a.distribusiCPMK.cpmk2}%` : '',
        cpmk3: a.distribusiCPMK?.cpmk3 ? `${a.distribusiCPMK.cpmk3}%` : '',
        cpmk4: a.distribusiCPMK?.cpmk4 ? `${a.distribusiCPMK.cpmk4}%` : '',
      })),
      referensi: rpsData.references.map(r => 
        `${r.penulis}. ${r.judul}. ${r.tahun || ''}`
      ),
    };

    // Call Python API
    const response = await fetch(`${PYTHON_API_URL}/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rpsData: pythonRPSData,
        meta: exportMeta,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Python API error: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success || !result.docx) {
      throw new Error('Invalid response from Python API');
    }

    // Decode base64 to buffer
    const docxBuffer = Buffer.from(result.docx, 'base64');

    // Return the DOCX file
    return new NextResponse(new Uint8Array(docxBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${result.filename || 'RPS.docx'}"`,
      },
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export document' },
      { status: 500 }
    );
  }
}
