import { NextRequest, NextResponse } from 'next/server';
import { RPSData } from '@/types/rps';
import Logger, { saveExportJSON } from '@/lib/logger';

const logger = new Logger('ExportAPI');

// Python API URL - get from environment, use localhost as fallback for dev
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:5000';

// Function to get API URL with debugging
function getAPIUrl() {
  const url = PYTHON_API_URL;
  logger.debug('Using PYTHON_API_URL', { url });
  return url;
}

// Set maxDuration untuk API route (dalam detik)
export const maxDuration = 120; // 2 minutes

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  
  logger.info(`📥 Export request received from IP: ${clientIP}`);
  
  try {
    const body = await request.json();
    const { rpsData, meta } = body as { rpsData: RPSData; meta: Record<string, unknown> };

    logger.info('Request data received', {
      courseName: meta?.nama || rpsData?.identitas?.nama || 'Unknown',
      courseCode: meta?.kode || rpsData?.identitas?.kode || 'Unknown',
      hasCPL: !!rpsData?.cpl,
      hasCPMK: !!rpsData?.cpmk,
      hasMinggu: !!rpsData?.minggu,
    });

    // Validate required data
    if (!rpsData) {
      logger.error('RPS data is missing');
      return NextResponse.json(
        { error: 'RPS data is required' },
        { status: 400 }
      );
    }
    
    // Save JSON for history/debugging
    const saveStart = Date.now();
    await saveExportJSON(rpsData, meta || {}, 'nextjs_export');
    logger.timing('JSON save', Date.now() - saveStart);

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
      deskripsiSingkat: rpsData.deskripsiSingkat || rpsData.deskripsi || '',
      deskripsi: rpsData.deskripsi || rpsData.deskripsiSingkat || '',
      cpl: (rpsData.cpl || []).map(c => ({
        kode: c.kode,
        pernyataan: c.pernyataan,
      })),
      cpmk: (rpsData.cpmk || []).map(c => ({
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
      ik: (rpsData.ik || []).map(ik => ({
        kode: ik.kode,
        pernyataan: ik.pernyataan || '',
        mapping_cpl: ik.mapping_cpl || '',
        mapping_cpmk: ik.mapping_cpmk || '',
      })),
      minggu: (rpsData.minggu || []).map(w => ({
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
    const pythonCallStart = Date.now();
    
    logger.info('🚀 Calling Python API', { url: `${pythonApiUrl}/export` });
        logger.info('📦 Data being sent', {
          cpl: pythonRPSData.cpl?.length || 0,
          cpmk: pythonRPSData.cpmk?.length || 0,
          minggu: pythonRPSData.minggu?.length || 0,
          referensi: pythonRPSData.referensi?.length || 0,
          ik: pythonRPSData.ik?.length || 0,
        });
    
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

    const pythonDuration = Date.now() - pythonCallStart;
    logger.timing('Python API call', pythonDuration);
    logger.info('Python API Response', {
      status: response.status,
      contentType: response.headers.get('content-type'),
    });

    if (!response.ok) {
      const responseText = await response.text();
      logger.error('Python API error', {
        status: response.status,
        response: responseText.substring(0, 500),
      });
      
      let errorData: any = {};
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { error: `Python API error (${response.status}): ${responseText.substring(0, 200)}` };
      }
      throw new Error(errorData.error || `Python API error: ${response.status}`);
    }

    const parseStart = Date.now();
    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      logger.error('JSON parse error', {
        error: parseError,
        responseText: responseText.substring(0, 1000),
      });
      throw new Error(`Invalid JSON from Python API: ${responseText.substring(0, 200)}`);
    }
    logger.timing('JSON parse', Date.now() - parseStart);

    if (!result.success || !result.docx) {
      throw new Error('Invalid response from Python API');
    }

    // Decode base64 to buffer
    const decodeStart = Date.now();
    const docxBuffer = Buffer.from(result.docx, 'base64');
    logger.timing('Base64 decode', Date.now() - decodeStart);

    const totalDuration = Date.now() - startTime;
    logger.info('✅ Export completed successfully', {
      totalDuration: `${totalDuration}ms`,
      fileSize: `${(docxBuffer.length / 1024).toFixed(2)} KB`,
      filename: result.filename || 'RPS.docx',
    });

    // Return the DOCX file
    return new NextResponse(new Uint8Array(docxBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${result.filename || 'RPS.docx'}"`,
      },
    });

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    logger.error('❌ Export failed', {
      duration: `${totalDuration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export document' },
      { status: 500 }
    );
  }
}
