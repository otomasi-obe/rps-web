import { NextRequest, NextResponse } from 'next/server';
import { RPSData } from '@/types/rps';

// Python API URL - get from environment, use localhost as fallback for dev
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:5000';

// Function to get API URL with debugging
function getAPIUrl() {
  const url = PYTHON_API_URL;
  console.log('[Export Route] Using PYTHON_API_URL:', url);
  return url;
}

// Set maxDuration untuk API route (dalam detik)
export const maxDuration = 120; // 2 minutes

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

    // Prepare meta (merge defaults even if meta is an empty object)
    const defaults = {
      nama: rpsData.identitas.nama,
      kode: rpsData.identitas.kode,
      sks: rpsData.identitas.sks,
      semester: rpsData.identitas.semester,
      status: rpsData.identitas.status || 'Mata Kuliah Wajib',
      prasyarat: rpsData.identitas.prasyarat || '-',
      koordinatorMK: rpsData.otoritas?.koordinatorMK || { nama: '', nip: '', jabatan: 'Koordinator Mata Kuliah' },
      koordinatorGPM: rpsData.otoritas?.koordinatorGPM || { nama: '', nip: '', jabatan: 'Koordinator GPM' },
      ketuaProdi: rpsData.otoritas?.ketuaProdi || { nama: '', nip: '', jabatan: 'Ketua Prodi' },
      dekan: rpsData.otoritas?.dekan || { nama: '', nip: '', jabatan: 'Dekan' },
    };

    const incomingMeta = (meta && typeof meta === 'object') ? meta : {};
    const exportMeta = {
      ...defaults,
      ...incomingMeta,
      // Ensure authority blocks don't get wiped by partial meta
      koordinatorMK: (incomingMeta as any).koordinatorMK ?? defaults.koordinatorMK,
      koordinatorGPM: (incomingMeta as any).koordinatorGPM ?? defaults.koordinatorGPM,
      ketuaProdi: (incomingMeta as any).ketuaProdi ?? defaults.ketuaProdi,
      dekan: (incomingMeta as any).dekan ?? defaults.dekan,
    };

    // Convert rpsData to Python format
    const pythonRPSData = {
      identitas: {
        kode: rpsData.identitas.kode,
        nama: rpsData.identitas.nama,
        sks: rpsData.identitas.sks,
        semester: rpsData.identitas.semester,
        status: rpsData.identitas.status,
        prasyarat: rpsData.identitas.prasyarat,
      },
      otoritas: {
        koordinatorMK: rpsData.otoritas?.koordinatorMK || exportMeta.koordinatorMK,
        koordinatorGPM: rpsData.otoritas?.koordinatorGPM || exportMeta.koordinatorGPM,
        ketuaProdi: rpsData.otoritas?.ketuaProdi || exportMeta.ketuaProdi,
        dekan: rpsData.otoritas?.dekan || exportMeta.dekan,
      },
      deskripsi: rpsData.deskripsi,
      cpl: rpsData.cpl.map(c => ({
        kode: c.kode,
        pernyataan: c.pernyataan,
      })),
      cpmk: rpsData.cpmk.map(c => ({
        kode: c.kode,
        pernyataan: c.pernyataan,
        mapping_cpl: c.mapping_cpl || '',
        N1: c.N1 || 0,
        N2: c.N2 || 0,
        N3: c.N3 || 0,
        N4: c.N4 || 0,
        N5: c.N5 || 0,
        N_cpmk: c.N_cpmk || 100,
      })),
      ik: rpsData.ik.map(ik => ({
        kode: ik.kode,
        pernyataan: ik.pernyataan || '',
        mapping_cpl: ik.mapping_cpl || '',
        mapping_cpmk: ik.mapping_cpmk || '',
      })),
      minggu: rpsData.minggu.map(w => ({
        mingguKe: w.mingguKe,
        kemampuanAkhir: w.kemampuanAkhir,
        bahanKajian: w.bahanKajian || '',
        metodePembelajaran: {
          metode: w.metodePembelajaran?.metode || '',
          deskripsi: w.metodePembelajaran?.deskripsi || '',
          aktivitas: w.metodePembelajaran?.aktivitas || '',
        },
        waktu: w.waktu || '',
        pengalamanBelajar: w.pengalamanBelajar || '',
        penilaian: {
          kriteria: w.penilaian?.kriteria || '',
          bobotMateri: w.penilaian?.bobotMateri || 0,
        },
      })),
      referensi: rpsData.referensi || [],
    };

    // Call Python API
    const pythonApiUrl = getAPIUrl();
    const response = await fetch(`${pythonApiUrl}/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rpsData: pythonRPSData,
        meta: exportMeta,
      }),
    });

    console.log('[Export Route] Python API Response Status:', response.status);
    console.log('[Export Route] Content-Type:', response.headers.get('content-type'));

    if (!response.ok) {
      const responseText = await response.text();
      console.error('[Export Route] Error response:', responseText.substring(0, 500));
      
      let errorData: any = {};
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { error: `Python API error (${response.status}): ${responseText.substring(0, 200)}` };
      }
      throw new Error(errorData.error || `Python API error: ${response.status}`);
    }

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[Export Route] JSON Parse error:', parseError);
      console.error('[Export Route] Response text:', responseText.substring(0, 1000));
      throw new Error(`Invalid JSON from Python API: ${responseText.substring(0, 200)}`);
    }

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
