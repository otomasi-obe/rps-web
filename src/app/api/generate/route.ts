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
      
      // Debug log
      console.log('Python API response data:', JSON.stringify(data).substring(0, 200));
      console.log('Type:', type);
      
      // Handle partial generation
      if (type === 'cpl') {
        if (!data.cpl || !Array.isArray(data.cpl)) {
          console.error('Invalid CPL data structure:', data);
          throw new Error('Invalid CPL data from Python API');
        }
        const convertedData = {
          cplList: data.cpl.map((c: { kode: string; pernyataan: string }) => ({
            kode: c.kode,
            pernyataan: c.pernyataan,
          })),
        };
        console.log('Converted CPL data:', convertedData);
        return NextResponse.json({ success: true, data: convertedData });
      }
      
      if (type === 'cpmk') {
        const convertedData = {
          cpmkList: data.cpmk.map((c: { kode: string; pernyataan: string; mapping_cpl?: string }) => ({
            kode: c.kode,
            pernyataan: c.pernyataan,
          })),
        };
        return NextResponse.json({ success: true, data: convertedData });
      }
      
      if (type === 'weeklyPlan') {
        const convertedData = {
          weeklyPlan: data.minggu.map((w: { 
            minggu: number; 
            cpmk: string; 
            topik: string; 
            metode: string; 
            waktu: string; 
            pengalaman: string; 
            indikator: string; 
            bobot: string 
          }) => ({
            mingguKe: w.minggu,
            kemampuanAkhir: w.cpmk,
            bahanKajian: w.topik,
            metodePembelajaran: {
              tmScl: w.metode,
              pbl: '',
              cbl: '',
              pjbl: '',
            },
            waktu: w.waktu,
            pengalamanBelajar: w.pengalaman,
            penilaian: {
              kriteria: w.indikator,
              bobot: parseInt(w.bobot) || 0,
            },
          })),
        };
        return NextResponse.json({ success: true, data: convertedData });
      }
      
      if (type === 'references') {
        const convertedData = {
          references: data.referensi.map((r: string) => ({
            judul: r,
            penulis: '',
            tahun: undefined,
            jenis: 'buku' as const,
          })),
        };
        return NextResponse.json({ success: true, data: convertedData });
      }
      
      // Full generation
    const convertedData = {
      deskripsiSingkat: data.deskripsi,
      cplList: data.cpl.map((c: { kode: string; pernyataan: string }) => ({
        kode: c.kode,
        pernyataan: c.pernyataan,
      })),
      cpmkList: data.cpmk.map((c: { kode: string; pernyataan: string }) => ({
        kode: c.kode,
        pernyataan: c.pernyataan,
      })),
      weeklyPlan: data.minggu.map((w: { 
        minggu: number; 
        cpmk: string; 
        topik: string; 
        metode: string; 
        waktu: string; 
        pengalaman: string; 
        indikator: string; 
        bobot: string 
      }) => ({
        mingguKe: w.minggu,
        kemampuanAkhir: w.cpmk,
        bahanKajian: w.topik,
        metodePembelajaran: {
          tmScl: w.metode,
          pbl: '',
          cbl: '',
          pjbl: '',
        },
        waktu: w.waktu,
        pengalamanBelajar: w.pengalaman,
        penilaian: {
          kriteria: w.indikator,
          bobot: parseInt(w.bobot) || 0,
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
      references: data.referensi.map((r: string, i: number) => ({
        judul: r,
        penulis: '',
        tahun: undefined,
        jenis: 'buku' as const,
      })),
    };

    return NextResponse.json({
      success: true,
      data: convertedData,
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
