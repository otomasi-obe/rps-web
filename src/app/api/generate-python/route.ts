import { NextRequest, NextResponse } from 'next/server';
import { CourseIdentity, Institution } from '@/types/rps';

// Python API URL
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:5000';

interface GenerateRequest {
  type: 'full' | 'description' | 'cpl' | 'cpmk' | 'weeklyPlan';
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
    const { identity, jenisMK = 'campuran' } = body;

    // Validate required fields
    if (!identity?.nama) {
      return NextResponse.json(
        { error: 'Nama mata kuliah harus diisi' },
        { status: 400 }
      );
    }

    // Call Python API for full generation
    const response = await fetch(`${PYTHON_API_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        courseName: identity.nama,
        courseCode: identity.kode || 'MK001',
        sks: identity.sks || 3,
        semester: identity.semester || 1,
        status: identity.status || 'Mata Kuliah Wajib',
        prereq: identity.prasyarat || '-',
        jenisMK,
      }),
    });

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

  } catch (error) {
    console.error('Generate error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate content' },
      { status: 500 }
    );
  }
}
