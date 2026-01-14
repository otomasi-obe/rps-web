import { NextRequest, NextResponse } from 'next/server';
import { CourseIdentity, Institution } from '@/types/rps';

// Python API URL - direct connection to avoid proxy issues
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:5000';

// Set maxDuration untuk API route (dalam detik)
export const maxDuration = 300; // 5 minutes

interface GenerateRequest {
  type: 'full' | 'description' | 'cpl' | 'cpmk' | 'weeklyPlan' | 'references';
  identity: CourseIdentity;
  institution: Institution;
  jenisMK?: 'teori' | 'praktikum' | 'campuran';
  additionalContext?: string;
  deskripsiSingkat?: string;
  cplList?: { kode: string; pernyataan: string }[];
  cpmkList?: { kode: string; pernyataan: string }[];
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { identity, jenisMK = 'campuran', additionalContext, type = 'full', deskripsiSingkat, cplList, cpmkList } = body;

    // Validate required fields
    if (!identity?.nama) {
      return NextResponse.json(
        { error: 'Nama mata kuliah harus diisi' },
        { status: 400 }
      );
    }

    // Call Python API for full generation with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 280000); // 280 seconds (4min 40s)
    
    try {
      const response = await fetch(`${PYTHON_API_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          courseName: identity.nama,
          courseCode: identity.kode || 'MK001',
          sks: identity.sks || 3,
          semester: identity.semester || 1,
          status: identity.status || 'Mata Kuliah Wajib',
          prereq: identity.prasyarat || '-',
          jenisMK,
          additionalContext: additionalContext || '',
          deskripsiSingkat: deskripsiSingkat || '',
          cplList: cplList || [],
          cpmkList: cpmkList || [],
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Python API error: ${response.status}`);
      }

      const result = await response.json();

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
        const indikatorKinerjaList = data.cpl
          .filter((c: any) => c.ik_kode && c.ik_pernyataan)
          .map((c: any) => ({
            kode: c.ik_kode,
            kodeCPL: c.kode,
            pernyataan: c.ik_pernyataan,
          }));
        
        return NextResponse.json({ 
          success: true, 
          data: {
            cplList: data.cpl.map((c: { kode: string; pernyataan: string }) => ({
              kode: c.kode,
              pernyataan: c.pernyataan,
            })),
            indikatorKinerjaList,
          }
        });
      }
      
      if (type === 'cpmk') {
        // Extract IK from CPMK if available
        const indikatorKinerjaList = data.cpmk.map((c: any, index: number) => ({
          kode: c.ik_kode || `IK ${index + 1}`,
          kodeCPL: c.mapping_cpl || '',
          pernyataan: c.ik_pernyataan || '',
        }));
        
        return NextResponse.json({ 
          success: true, 
          data: {
            cpmkList: data.cpmk.map((c: { kode: string; pernyataan: string }) => ({
              kode: c.kode,
              pernyataan: c.pernyataan,
            })),
            indikatorKinerjaList,
          }
        });
      }
      
      if (type === 'weeklyPlan') {
        return NextResponse.json({ 
          success: true, 
          data: {
            weeklyPlan: data.minggu.map((w: any) => ({
              mingguKe: w.mingguKe || w.minggu || 0,
              kemampuanAkhir: w.kemampuanAkhir || w.cpmk || '',
              bahanKajian: w.bahanKajian || w.topik || '',
              metodePembelajaran: {
                metode: w.metodePembelajaran?.metode || w.metode || '',
                deskripsi: w.metodePembelajaran?.deskripsi || w.deskripsi_metode || '',
                aktivitas: w.metodePembelajaran?.aktivitas || w.aktivitas || '',
              },
              waktu: w.waktu || '3x50"',
              pengalamanBelajar: w.pengalamanBelajar || w.pengalaman || '',
              penilaian: {
                kriteria: w.penilaian?.kriteria || w.indikator || '',
                bobot: typeof w.penilaian?.bobot === 'number' 
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
            references: data.referensi.map((r: string) => ({
              judul: r,
              penulis: '',
              jenis: 'buku' as const,
            })),
          }
        });
      }
      
      // Full generation
      // Extract Indikator Kinerja from CPL OR CPMK data
      let indikatorKinerjaList: any[] = [];
      
      // Try to extract from CPL first
      if (data.cpl) {
        const ikFromCPL = data.cpl
          .filter((c: any) => c.ik_kode && c.ik_pernyataan)
          .map((c: any) => ({
            kode: c.ik_kode,
            kodeCPL: c.kode,
            pernyataan: c.ik_pernyataan,
          }));
        if (ikFromCPL.length > 0) {
          indikatorKinerjaList = ikFromCPL;
        }
      }
      
      // If not found in CPL, try CPMK
      if (indikatorKinerjaList.length === 0 && data.cpmk) {
        indikatorKinerjaList = data.cpmk.map((c: any, index: number) => ({
          kode: c.ik_kode || `IK ${index + 1}`,
          kodeCPL: c.mapping_cpl || '',
          pernyataan: c.ik_pernyataan || '',
        }));
      }
      
      return NextResponse.json({
        success: true,
        data: {
          deskripsiSingkat: data.deskripsi,
          cplList: data.cpl.map((c: { kode: string; pernyataan: string }) => ({
            kode: c.kode,
            pernyataan: c.pernyataan,
          })),
          indikatorKinerjaList,
          cpmkList: data.cpmk.map((c: { kode: string; pernyataan: string }) => ({
            kode: c.kode,
            pernyataan: c.pernyataan,
          })),
          weeklyPlan: data.minggu.map((w: any) => ({
            mingguKe: w.mingguKe || w.minggu || 0,
            kemampuanAkhir: w.kemampuanAkhir || w.cpmk || '',
            bahanKajian: w.bahanKajian || w.topik || '',
            metodePembelajaran: {
              metode: w.metodePembelajaran?.metode || w.metode || '',
              deskripsi: w.metodePembelajaran?.deskripsi || w.deskripsi_metode || '',
              aktivitas: w.metodePembelajaran?.aktivitas || w.aktivitas || '',
            },
            waktu: w.waktu || '3x50"',
            pengalamanBelajar: w.pengalamanBelajar || w.pengalaman || '',
            penilaian: {
              kriteria: w.penilaian?.kriteria || w.indikator || '',
              bobot: typeof w.penilaian?.bobot === 'number' 
                ? w.penilaian.bobot 
                : parseInt(String(w.penilaian?.bobot || w.bobot || '0').replace('%', '')) || 0,
            },
          })),
          assessmentMethods: data.penilaian.map((p: { 
            komponen: string; 
            bobot: string; 
            kriteria: string;
            cpmk1?: string;
            cpmk2?: string;
            cpmk3?: string;
            cpmk4?: string;
          }) => ({
            teknik: p.komponen,
            persentase: parseInt(p.bobot.replace('%', '')) || 0,
            kriteria: p.kriteria,
            distribusiCPMK: {
              cpmk1: parseInt(p.cpmk1?.replace('%', '') || '0') || 0,
              cpmk2: parseInt(p.cpmk2?.replace('%', '') || '0') || 0,
              cpmk3: parseInt(p.cpmk3?.replace('%', '') || '0') || 0,
              cpmk4: parseInt(p.cpmk4?.replace('%', '') || '0') || 0,
            },
          })),
          references: data.referensi.map((r: string) => ({
            judul: r,
            penulis: '',
            jenis: 'buku' as const,
          })),
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
