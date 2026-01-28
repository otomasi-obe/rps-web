/**
 * RPS (Rencana Pembelajaran Semester) Data Types
 * Struktur sesuai format.json dengan nama variabel Bahasa Indonesia
 */

// ============ IDENTITAS MATA KULIAH ============
export interface Identitas {
  kode: string;           // Kode Mata Kuliah (e.g., "MK001")
  nama: string;           // Nama Mata Kuliah
  sks: number;            // Bobot SKS
  semester: number;       // Semester
  status: string;         // Status MK (e.g., "Mata Kuliah Wajib")
  prasyarat: string;      // Mata Kuliah Prasyarat
}

// ============ INSTITUSI ============
export interface Institusi {
  programStudi: string;   // e.g., "Sarjana Terapan Teknologi Rekayasa Otomasi"
  fakultas: string;       // e.g., "Sekolah Vokasi"
  universitas: string;    // e.g., "Universitas Diponegoro"
}

// ============ PERSONIL / OTORITAS ============
export interface Personil {
  nama: string;
  nip: string;            // NIP atau NPPU
  jabatan: string;        // e.g., "Koordinator Mata Kuliah"
}

export interface Otoritas {
  koordinatorMK: Personil;
  koordinatorGPM: Personil;
  ketuaProdi: Personil;
  dekan: Personil;
}

// ============ CPL (Capaian Pembelajaran Lulusan) ============
export interface CPL {
  kode: string;           // e.g., "CPL3"
  pernyataan: string;     // Deskripsi CPL
}

// ============ IK (Indikator Kinerja) ============
export interface IK {
  kode: string;           // e.g., "IK 3-2"
  pernyataan: string;     // Deskripsi indikator kinerja
  mapping_cpl: string;    // Referensi ke CPL (e.g., "CPL3")
  mapping_cpmk?: string;  // Referensi ke CPMK (e.g., "CPMK 3-2")
}

// Alias untuk backward compatibility
export interface IndikatorKinerja extends IK { }

// ============ CPMK (Capaian Pembelajaran Mata Kuliah) ============
export interface CPMK {
  kode: string;           // e.g., "CPMK 3-2"
  pernyataan: string;     // Deskripsi CPMK
  mapping_cpl: string;    // Referensi ke CPL (e.g., "CPL3")
  N1: number;             // Partisipatif (20% total)
  N2: number;             // Project/Problem/Case Based Learning (30% total)
  N3: number;             // Kuis (10% total)
  N4: number;             // UTS (20% total)
  N5: number;             // UAS (20% total)
  N_cpmk: number;         // Total bobot CPMK
}

// ============ RENCANA PEMBELAJARAN MINGGUAN ============
export interface Minggu {
  mingguKe: number;
  kemampuanAkhir: string;         // CPMK yang dicapai atau "UTS" / "UAS"
  bahanKajian?: string;           // Pokok Bahasan (tidak ada untuk UTS/UAS)
  metodePembelajaran?: {
    metode: string;               // TM SCL, CBL, PBL, PjBL
    deskripsi: string;            // Deskripsi metode (WAJIB 20 kata)
    aktivitas: string;            // Penjelasan aktivitas pembelajaran (WAJIB 20 kata)
  };
  waktu?: string;                 // e.g., "TM Ceramah 1x50', Kuis" atau "PjBL/Praktikum 2x170'"
  pengalamanBelajar?: string;     // Pengalaman belajar (WAJIB 30 kata)
  penilaian?: {
    kriteria: string;             // Kriteria indikator pencapaian (WAJIB 20 kata)
    bobotMateri: number;          // Bobot untuk minggu ini
  };
}

// ============ REFERENSI ============
// Referensi berupa string array sederhana
export type Referensi = string;

// ============ COMPLETE RPS DATA ============
export interface RPSData {
  // Metadata
  id?: string;
  createdAt?: string;
  updatedAt?: string;

  // Content - sesuai format.json
  identitas: Identitas;
  institusi: Institusi;
  otoritas: Otoritas;
  deskripsi: string;                // Deskripsi mata kuliah
  deskripsiSingkat?: string;        // Optional deskripsi singkat
  cpl: CPL[];                       // Array CPL
  ik: IK[];                         // Array Indikator Kinerja
  cpmk: CPMK[];                     // Array CPMK
  minggu: Minggu[];                 // Array 16 minggu
  referensi: Referensi[];           // Array referensi (string)
}

// ============ DEFAULT / EMPTY RPS ============
export const createEmptyRPS = (): RPSData => ({
  identitas: {
    kode: '',
    nama: '',
    sks: 2,
    semester: 1,
    status: 'Mata Kuliah Wajib',
    prasyarat: '-',
  },
  institusi: {
    programStudi: 'Sarjana Terapan Teknologi Rekayasa Otomasi',
    fakultas: 'Sekolah Vokasi',
    universitas: 'Universitas Diponegoro',
  },
  otoritas: {
    koordinatorMK: { nama: '', nip: '', jabatan: 'Koordinator Mata Kuliah' },
    koordinatorGPM: { nama: '', nip: '', jabatan: 'Koordinator GPM' },
    ketuaProdi: { nama: '', nip: '', jabatan: 'Ketua Prodi' },
    dekan: { nama: '', nip: '', jabatan: 'Dekan' },
  },
  deskripsi: '',
  cpl: [],
  ik: [],
  cpmk: [],
  minggu: Array.from({ length: 16 }, (_, i) => ({
    mingguKe: i + 1,
    kemampuanAkhir: i + 1 === 8 ? 'UTS' : i + 1 === 16 ? 'UAS' : '',
    ...(i + 1 !== 8 && i + 1 !== 16 ? {
      bahanKajian: '',
      metodePembelajaran: { metode: '', deskripsi: '', aktivitas: '' },
      waktu: '3x50"',
      pengalamanBelajar: '',
      penilaian: { kriteria: '', bobotMateri: 0 },
    } : {})
  })),
  referensi: [],
});

// Backward compatibility exports (deprecated - use Indonesian names)
export type CourseIdentity = Identitas;
export type Institution = Institusi;
export type Person = Personil;
export type Authority = Otoritas;
export type WeeklyPlan = Minggu;
export type Reference = Referensi;
