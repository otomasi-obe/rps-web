import { NextRequest, NextResponse } from 'next/server';
import { Identitas, Institusi } from '@/types/rps';

// Backend API URL - get from environment, use localhost as fallback for dev
const PYTHON_API_URL = process.env.BACKEND_API_URL || process.env.PYTHON_API_URL || 'http://127.0.0.1:2001';

// Function to get API URL with debugging
function getAPIUrl() {
  const url = PYTHON_API_URL;
  console.log('[API Route] Using PYTHON_API_URL:', url);
  return url;
}

// Set maxDuration untuk API route (dalam detik)
export const maxDuration = 300; // 5 minutes

interface GenerateRequest {
  type: 'full' | 'description' | 'cpl' | 'cpmk' | 'weeklyPlan' | 'references';
  identitas: Identitas;
  institusi: Institusi;
  jenisMK?: 'teori' | 'praktikum' | 'campuran';
  additionalContext?: string;
  deskripsi?: string;
  cpl?: { kode: string; pernyataan: string }[];
  cpmk?: { kode: string; pernyataan: string }[];
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { identitas, jenisMK = 'campuran', additionalContext, type = 'full', deskripsi, cpl, cpmk } = body;

    // Validate required fields
    if (!identitas?.nama) {
      return NextResponse.json(
        { error: 'Nama mata kuliah harus diisi' },
        { status: 400 }
      );
    }

    // Call Python API for full generation with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 280000); // 280 seconds (4min 40s)
    
    const pythonApiUrl = getAPIUrl();
    
    try {
      const response = await fetch(`${pythonApiUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          courseName: identitas.nama,
          courseCode: identitas.kode || 'MK001',
          sks: identitas.sks || 3,
          semester: identitas.semester || 1,
          status: identitas.status || 'Mata Kuliah Wajib',
          prereq: identitas.prasyarat || '-',
          jenisMK,
          additionalContext: additionalContext || '',
          deskripsi: deskripsi || '',
          cpl: cpl || [],
          cpmk: cpmk || [],
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      // Debug logging
      console.log('[API Route] Python API Response Status:', response.status);
      console.log('[API Route] Content-Type:', response.headers.get('content-type'));

      if (!response.ok) {
        const responseText = await response.text();
        console.error('[API Route] Error response:', responseText.substring(0, 500));
        
        let errorData: any = {};
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          // Response is not JSON, might be HTML error page
          errorData = { error: `Python API error (${response.status}): ${responseText.substring(0, 200)}` };
        }
        throw new Error(errorData.error || `Python API error: ${response.status}`);
      }

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[API Route] JSON Parse error:', parseError);
        console.error('[API Route] Response text:', responseText.substring(0, 1000));
        throw new Error(`Invalid JSON from Python API: ${responseText.substring(0, 200)}`);
      }

      if (!result.success || !result.data) {
        throw new Error('Invalid response from Python API');
      }

      // Convert Python format to our TypeScript format
      const data = result.data;
      
      // DEBUG: Log raw Python response
      console.log('=== RAW Python API Response ===');
      console.log('Full data:', JSON.stringify(data, null, 2).substring(0, 2000));
      if (data.minggu && data.minggu[0]) {
        console.log('Sample minggu[0]:', JSON.stringify(data.minggu[0], null, 2));
      }
      
      // Handle partial generation
      if (type === 'cpl') {
        if (!data.cpl || !Array.isArray(data.cpl)) {
          throw new Error('Invalid CPL data from Python API');
        }
        
        // Extract Indikator Kinerja from CPL data if available
        const ik = data.cpl
          .filter((c: any) => c.ik_kode && c.ik_pernyataan)
          .map((c: any) => ({
            kode: c.ik_kode,
            mapping_cpl: c.kode,
            mapping_cpmk: c.ik_mapping_cpmk || '',
            pernyataan: c.ik_pernyataan,
          }));
        
        return NextResponse.json({ 
          success: true, 
          data: {
            cpl: data.cpl.map((c: { kode: string; pernyataan: string }) => ({
              kode: c.kode,
              pernyataan: c.pernyataan,
            })),
            ik,
          }
        });
      }
      
      if (type === 'cpmk') {
        // Extract IK from CPMK if available
        const ik = data.cpmk.map((c: any, index: number) => ({
          kode: c.ik_kode || `IK ${index + 1}`,
          mapping_cpl: c.mapping_cpl || '',
          mapping_cpmk: c.kode || '',
          pernyataan: c.ik_pernyataan || '',
        }));
        
        return NextResponse.json({ 
          success: true, 
          data: {
            cpmk: data.cpmk.map((c: any) => ({
              kode: c.kode,
              pernyataan: c.pernyataan,
              mapping_cpl: c.mapping_cpl || '',
              N1: c.N1 || 0,
              N2: c.N2 || 0,
              N3: c.N3 || 0,
              N4: c.N4 || 0,
              N5: c.N5 || 0,
              N_cpmk: c.N_cpmk || 0,
            })),
            ik,
          }
        });
      }
      
      if (type === 'weeklyPlan') {
        return NextResponse.json({ 
          success: true, 
          data: {
            minggu: data.minggu.map((w: any) => ({
              mingguKe: w.mingguKe || w.minggu || 0,
              kemampuanAkhir: w.kemampuanAkhir || w.cpmk || '',
              bahanKajian: w.bahanKajian || w.topik || '',
              metodePembelajaran: {
                metode: w.metodePembelajaran?.metode || w.metode || '',
                deskripsi: w.metodePembelajaran?.deskripsi || w.deskripsi_metode || '',
                aktivitas: w.metodePembelajaran?.aktivitas || w.aktivitas || '',
              },
              waktu: w.waktu || 'PjBL/Praktikum 2x170\'',
              pengalamanBelajar: w.pengalamanBelajar || w.pengalaman || '',
              penilaian: {
                kriteria: w.penilaian?.kriteria || w.indikator || '',
                bobotMateri: typeof w.penilaian?.bobotMateri === 'number' 
                  ? w.penilaian.bobotMateri
                  : typeof w.penilaian?.bobot === 'number'
                  ? w.penilaian.bobot
                  : parseInt(String(w.penilaian?.bobot || w.bobot || '0').replace('%', '')) || 0,
              },
            })),
          }
        });
      }
      
      if (type === 'references') {
        return NextResponse.json({ 
          success: true, 
          data: {
            referensi: Array.isArray(data.referensi) ? data.referensi : [],
          }
        });
      }
      
      // Full generation
      // Extract Indikator Kinerja from CPL OR CPMK data
      let ik: any[] = [];
      
      // Try to extract from CPL first (if IK data embedded)
      if (data.cpl && data.ik) {
        ik = data.ik.map((i: any) => ({
          kode: i.kode,
          mapping_cpl: i.mapping_cpl || '',
          mapping_cpmk: i.mapping_cpmk || '',
          pernyataan: i.pernyataan || '',
        }));
      } else if (data.cpl) {
        const ikFromCPL = data.cpl
          .filter((c: any) => c.ik_kode && c.ik_pernyataan)
          .map((c: any) => ({
            kode: c.ik_kode,
            mapping_cpl: c.kode,
            mapping_cpmk: c.ik_mapping_cpmk || '',
            pernyataan: c.ik_pernyataan,
          }));
        if (ikFromCPL.length > 0) {
          ik = ikFromCPL;
        }
      }
      
      // If not found in CPL, try CPMK
      if (ik.length === 0 && data.cpmk) {
        ik = data.cpmk.map((c: any, index: number) => ({
          kode: c.ik_kode || `IK ${index + 1}`,
          mapping_cpl: c.mapping_cpl || '',
          mapping_cpmk: c.kode || '',
          pernyataan: c.ik_pernyataan || '',
        }));
      }
      
      return NextResponse.json({
        success: true,
        data: {
          deskripsi: data.deskripsi,
          cpl: data.cpl.map((c: { kode: string; pernyataan: string }) => ({
            kode: c.kode,
            pernyataan: c.pernyataan,
          })),
          ik,
          cpmk: data.cpmk.map((c: any) => ({
            kode: c.kode,
            pernyataan: c.pernyataan,
            mapping_cpl: c.mapping_cpl || '',
            N1: c.N1 || 0,
            N2: c.N2 || 0,
            N3: c.N3 || 0,
            N4: c.N4 || 0,
            N5: c.N5 || 0,
            N_cpmk: c.N_cpmk || 0,
          })),
          minggu: data.minggu.map((w: any) => {
            // Handle UTS/UAS (no optional fields)
            if (w.kemampuanAkhir === 'UTS' || w.kemampuanAkhir === 'UAS' || w.cpmk === 'UTS' || w.cpmk === 'UAS') {
              return {
                mingguKe: w.mingguKe || w.minggu || 0,
                kemampuanAkhir: w.kemampuanAkhir || w.cpmk || 'UTS',
              };
            }
            // Regular week
            return {
              mingguKe: w.mingguKe || w.minggu || 0,
              kemampuanAkhir: w.kemampuanAkhir || w.cpmk || '',
              bahanKajian: w.bahanKajian || w.topik || '',
              metodePembelajaran: {
                metode: w.metodePembelajaran?.metode || w.metode || '',
                deskripsi: w.metodePembelajaran?.deskripsi || w.deskripsi_metode || '',
                aktivitas: w.metodePembelajaran?.aktivitas || w.aktivitas || '',
              },
              waktu: w.waktu || "PjBL/Praktikum 2x170'",
              pengalamanBelajar: w.pengalamanBelajar || w.pengalaman || '',
              penilaian: {
                kriteria: w.penilaian?.kriteria || w.indikator || '',
                bobotMateri: typeof w.penilaian?.bobotMateri === 'number' 
                  ? w.penilaian.bobotMateri
                  : typeof w.penilaian?.bobot === 'number'
                  ? w.penilaian.bobot
                  : parseInt(String(w.penilaian?.bobot || w.bobot || '0').replace('%', '')) || 0,
              },
            };
          }),
          referensi: Array.isArray(data.referensi) ? data.referensi : [],
        },
      });
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timeout. AI generation took too long. Please try again.' },
          { status: 504 }
        );
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Generate error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate content' },
      { status: 500 }
    );
  }
}
