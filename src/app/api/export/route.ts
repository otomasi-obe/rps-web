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
      nama: rpsData.identity.nama,
      kode: rpsData.identity.kode,
      sks: rpsData.identity.sks,
      semester: rpsData.identity.semester,
      status: rpsData.identity.status || 'Mata Kuliah Wajib',
      prasyarat: rpsData.identity.prasyarat || '-',
      koordinatorMK: rpsData.authority?.koordinatorMK || { nama: '', nip: '', jabatan: 'Koordinator Mata Kuliah' },
      koordinatorGPM: rpsData.authority?.koordinatorGPM || { nama: '', nip: '', jabatan: 'Koordinator GPM' },
      ketuaProdi: rpsData.authority?.ketuaProdi || { nama: '', nip: '', jabatan: 'Ketua Prodi' },
      dekan: rpsData.authority?.dekan || { nama: '', nip: '', jabatan: 'Dekan' },
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
      deskripsi: rpsData.deskripsiSingkat,
      cpl: rpsData.cplList.map(c => {
        // Find matching IK for this CPL
        const matchingIK = rpsData.indikatorKinerjaList.filter(ik => ik.kodeCPL === c.kode);
        return {
          kode: c.kode,
          pernyataan: c.pernyataan,
          ik: matchingIK.map(ik => ({
            kode: ik.kode,
            pernyataan: ik.pernyataan,
          })),
        };
      }),
      cpmk: rpsData.cpmkList.map(c => ({
        kode: c.kode,
        pernyataan: c.pernyataan,
        mapping_cpl: '',
      })),
      minggu: rpsData.weeklyPlan.map(w => ({
        minggu: w.mingguKe,
        cpmk: w.kemampuanAkhir,
        topik: w.bahanKajian,
        metode: w.metodePembelajaran.metode,
        deskripsi_metode: w.metodePembelajaran.deskripsi,
        aktivitas: w.metodePembelajaran.aktivitas,
        waktu: w.waktu,
        pengalaman: w.pengalamanBelajar,
        indikator: w.penilaian.kriteria,
        bobot: String(w.penilaian.bobot),
      })),
      penilaian: rpsData.assessmentMethods.map(a => {
        // Handle both new format (array) and old format (object)
        const distribusiObj: any = {};
        const distribusiFormatted: any = {};
        
        if (Array.isArray(a.distribusiCPMK)) {
          // New format: array of {cpmkId, nilai}
          a.distribusiCPMK.forEach((d: any) => {
            const cpmkNum = d.cpmkId.split(' ')[1] || '1';
            distribusiObj[`cpmk${cpmkNum}`] = d.nilai || 0;
            distribusiFormatted[`cpmk${cpmkNum}`] = d.nilai ? `${d.nilai}%` : '';
          });
          // Fill missing CPMK slots
          for (let i = 1; i <= 4; i++) {
            if (!distribusiObj[`cpmk${i}`]) {
              distribusiObj[`cpmk${i}`] = 0;
              distribusiFormatted[`cpmk${i}`] = '';
            }
          }
        } else {
          // Old format: object with cpmk1-4
          distribusiObj.cpmk1 = (a.distribusiCPMK as any)?.cpmk1 || 0;
          distribusiObj.cpmk2 = (a.distribusiCPMK as any)?.cpmk2 || 0;
          distribusiObj.cpmk3 = (a.distribusiCPMK as any)?.cpmk3 || 0;
          distribusiObj.cpmk4 = (a.distribusiCPMK as any)?.cpmk4 || 0;
          distribusiFormatted.cpmk1 = (a.distribusiCPMK as any)?.cpmk1 ? `${(a.distribusiCPMK as any).cpmk1}%` : '';
          distribusiFormatted.cpmk2 = (a.distribusiCPMK as any)?.cpmk2 ? `${(a.distribusiCPMK as any).cpmk2}%` : '';
          distribusiFormatted.cpmk3 = (a.distribusiCPMK as any)?.cpmk3 ? `${(a.distribusiCPMK as any).cpmk3}%` : '';
          distribusiFormatted.cpmk4 = (a.distribusiCPMK as any)?.cpmk4 ? `${(a.distribusiCPMK as any).cpmk4}%` : '';
        }
        
        return {
          teknik: a.teknik,
          komponen: a.teknik,
          persentase: a.persentase,
          bobot: `${a.persentase}%`,
          kriteria: a.kriteria,
          distribusiCPMK: distribusiObj,
          cpmk1: distribusiFormatted.cpmk1,
          cpmk2: distribusiFormatted.cpmk2,
          cpmk3: distribusiFormatted.cpmk3,
          cpmk4: distribusiFormatted.cpmk4,
        };
      }),
      cplMappings: rpsData.cplMappings && rpsData.cplMappings.length > 0 
        ? rpsData.cplMappings.map(m => ({
            cpl: m.kodeCPL,
            ik: m.kodeIK,
            ik_pernyataan: m.pernyataanIK,
            cpmk: m.kodeCPMK,
            cpmk_pernyataan: m.pernyataanCPMK,
            bobot: m.bobotCPMK,
            media: m.mediaAsesmen,
            qui: m.distribusi?.kuis || 0,
            prs: m.distribusi?.presentasi || 0,
            pro: m.distribusi?.proyek || 0,
            uts: m.distribusi?.uts || 0,
            uas: m.distribusi?.uas || 0,
          }))
        : [],
      references: rpsData.references.map(r => {
        const parts = [];
        if (r.penulis?.trim()) parts.push(r.penulis.trim());
        if (r.judul?.trim()) parts.push(r.judul.trim());
        if (r.tahun) parts.push(String(r.tahun));
        return parts.length ? parts.join('. ') : r.judul || '';
      }),
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
