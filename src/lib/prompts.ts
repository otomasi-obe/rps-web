/**
 * OpenAI Prompt Templates for RPS Generation
 * 
 * Prompts yang digunakan untuk menggenerate konten RPS menggunakan OpenAI API.
 */

import { CourseIdentity, Institution } from '@/types/rps';

export const SYSTEM_PROMPT = `Kamu adalah asisten akademik ahli dalam pembuatan Rencana Pembelajaran Semester (RPS) untuk perguruan tinggi di Indonesia. 

Kamu memahami:
- Struktur kurikulum OBE (Outcome-Based Education)
- CPL (Capaian Pembelajaran Lulusan)
- CPMK (Capaian Pembelajaran Mata Kuliah)
- Metode pembelajaran SCL (Student-Centered Learning)
- Taksonomi Bloom untuk merumuskan capaian pembelajaran

Berikan respons dalam format JSON yang valid sesuai dengan struktur yang diminta.
Gunakan bahasa Indonesia yang formal dan akademis.`;

export function generateCourseDescriptionPrompt(
  identity: CourseIdentity,
  institution: Institution,
  additionalContext?: string
): string {
  return `Buatkan deskripsi singkat mata kuliah dengan informasi berikut:

Nama Mata Kuliah: ${identity.nama}
Kode: ${identity.kode}
SKS: ${identity.sks}
Semester: ${identity.semester}
Program Studi: ${institution.programStudi}
${additionalContext ? `Konteks tambahan: ${additionalContext}` : ''}

Berikan respons dalam format JSON:
{
  "deskripsiSingkat": "... (2-4 kalimat yang menjelaskan tujuan, cakupan, dan output utama mata kuliah)"
}`;
}

export function generateCPLPrompt(
  identity: CourseIdentity,
  institution: Institution,
  jenisMK: 'teori' | 'praktikum' | 'campuran'
): string {
  return `Buatkan 3 CPL (Capaian Pembelajaran Lulusan) yang relevan untuk mata kuliah:

Nama Mata Kuliah: ${identity.nama}
Jenis: ${jenisMK}
Program Studi: ${institution.programStudi}

CPL harus mencakup aspek:
1. Kemampuan kognitif/pengetahuan
2. Kemampuan keterampilan/praktis
3. Sikap/etika profesional

Berikan respons dalam format JSON:
{
  "cplList": [
    { "kode": "CPL1", "pernyataan": "..." },
    { "kode": "CPL2", "pernyataan": "..." },
    { "kode": "CPL3", "pernyataan": "..." }
  ]
}`;
}

export function generateCPMKPrompt(
  identity: CourseIdentity,
  cplList: { kode: string; pernyataan: string }[],
  deskripsiSingkat: string
): string {
  const cplText = cplList.map(c => `- ${c.kode}: ${c.pernyataan}`).join('\n');
  
  return `Buatkan 4 CPMK (Capaian Pembelajaran Mata Kuliah) untuk:

Mata Kuliah: ${identity.nama}
Deskripsi: ${deskripsiSingkat}

CPL yang dibebankan:
${cplText}

CPMK harus:
- Menggunakan kata kerja operasional yang terukur (mampu, menerapkan, menganalisis, dll.)
- Spesifik dan dapat diukur
- Mendukung pencapaian CPL

Berikan respons dalam format JSON:
{
  "cpmkList": [
    { "kode": "CPMK 1", "pernyataan": "..." },
    { "kode": "CPMK 2", "pernyataan": "..." },
    { "kode": "CPMK 3", "pernyataan": "..." },
    { "kode": "CPMK 4", "pernyataan": "..." }
  ]
}`;
}

export function generateWeeklyPlanPrompt(
  identity: CourseIdentity,
  deskripsiSingkat: string,
  cpmkList: { kode: string; pernyataan: string }[],
  jenisMK: 'teori' | 'praktikum' | 'campuran'
): string {
  const cpmkText = cpmkList.map(c => `- ${c.kode}: ${c.pernyataan}`).join('\n');
  
  return `Buatkan rencana pembelajaran 16 minggu untuk:

Mata Kuliah: ${identity.nama}
SKS: ${identity.sks}
Jenis: ${jenisMK}
Deskripsi: ${deskripsiSingkat}

CPMK:
${cpmkText}

Ketentuan:
- Minggu 8: UTS (Ujian Tengah Semester)
- Minggu 16: UAS (Ujian Akhir Semester)
- Total bobot penilaian = 100%
- Gunakan metode pembelajaran yang bervariasi (ceramah, diskusi, hands-on, project, dll.)

Berikan respons dalam format JSON:
{
  "weeklyPlan": [
    {
      "mingguKe": 1,
      "kemampuanAkhir": "CPMK X",
      "bahanKajian": "...",
      "metodePembelajaran": "...",
      "waktu": "3x50\\"",
      "pengalamanBelajar": "...",
      "kriteriaPenilaian": "...",
      "bobot": 5
    },
    ... (untuk 16 minggu)
  ]
}`;
}

export function generateAssessmentPrompt(
  identity: CourseIdentity,
  cpmkList: { kode: string; pernyataan: string }[],
  jenisMK: 'teori' | 'praktikum' | 'campuran'
): string {
  return `Buatkan metode penilaian untuk mata kuliah:

Nama: ${identity.nama}
Jenis: ${jenisMK}
Jumlah CPMK: ${cpmkList.length}

Ketentuan:
- Total persentase = 100%
- Setiap CPMK harus dinilai
- Sertakan berbagai teknik penilaian (partisipasi, tugas, quiz, UTS, UAS, proyek)

Berikan respons dalam format JSON:
{
  "assessmentMethods": [
    {
      "teknik": "...",
      "persentase": 10,
      "kriteria": "...",
      "distribusiCPMK": { "cpmk1": 5, "cpmk2": 5, "cpmk3": 0, "cpmk4": 0 }
    },
    ...
  ]
}`;
}

export function generateFullRPSPrompt(
  identity: CourseIdentity,
  institution: Institution,
  jenisMK: 'teori' | 'praktikum' | 'campuran',
  additionalContext?: string
): string {
  return `Buatkan RPS (Rencana Pembelajaran Semester) lengkap untuk:

=== IDENTITAS MATA KULIAH ===
Nama: ${identity.nama}
Kode: ${identity.kode}
SKS: ${identity.sks}
Semester: ${identity.semester}
Status: ${identity.status}
Prasyarat: ${identity.prasyarat}
Jenis MK: ${jenisMK}

=== INSTITUSI ===
Program Studi: ${institution.programStudi}
Fakultas: ${institution.fakultas}
Universitas: ${institution.universitas}

${additionalContext ? `=== KONTEKS TAMBAHAN ===\n${additionalContext}` : ''}

Berikan respons dalam format JSON lengkap dengan struktur:
{
  "deskripsiSingkat": "...",
  "cplList": [
    { "kode": "CPL1", "pernyataan": "..." },
    { "kode": "CPL2", "pernyataan": "..." },
    { "kode": "CPL3", "pernyataan": "..." }
  ],
  "cpmkList": [
    { "kode": "CPMK 1", "pernyataan": "..." },
    { "kode": "CPMK 2", "pernyataan": "..." },
    { "kode": "CPMK 3", "pernyataan": "..." },
    { "kode": "CPMK 4", "pernyataan": "..." }
  ],
  "indikatorKinerjaList": [
    { "kode": "IK 1-1", "kodeCPL": "CPL1", "pernyataan": "..." }
  ],
  "weeklyPlan": [
    {
      "mingguKe": 1,
      "kemampuanAkhir": "CPMK X: pernyataan singkat",
      "bahanKajian": "...",
      "metodePembelajaran": "...",
      "waktu": "3x50\\"",
      "pengalamanBelajar": "...",
      "kriteriaPenilaian": "...",
      "bobot": 5
    }
    // ... 16 minggu total, minggu 8 = UTS, minggu 16 = UAS
  ],
  "assessmentMethods": [
    {
      "teknik": "Aktivitas Partisipatif",
      "persentase": 10,
      "kriteria": "...",
      "distribusiCPMK": { "cpmk1": 2, "cpmk2": 3, "cpmk3": 2, "cpmk4": 3 }
    }
  ],
  "references": [
    { "judul": "...", "penulis": "...", "jenis": "buku" }
  ]
}

PENTING:
- Total bobot weeklyPlan = 100%
- Total persentase assessmentMethods = 100%
- Minggu 8 adalah UTS, Minggu 16 adalah UAS
- Gunakan bahasa Indonesia formal akademis
- Kata kerja operasional harus terukur`;
}
