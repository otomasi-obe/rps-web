/**
 * RPS (Rencana Pembelajaran Semester) Data Types
 * 
 * Struktur JSON untuk menyimpan semua data RPS yang bisa diedit
 * dan digenerate melalui OpenAI API.
 */

// ============ IDENTITAS MATA KULIAH ============
export interface CourseIdentity {
  kode: string;           // Kode Mata Kuliah (e.g., "TRAO6251")
  nama: string;           // Nama Mata Kuliah
  sks: number;            // Bobot SKS
  semester: number;       // Semester
  status: string;         // Status MK (e.g., "Mata Kuliah Wajib")
  prasyarat: string;      // Mata Kuliah Prasyarat
}

// ============ PROGRAM STUDI & INSTITUSI ============
export interface Institution {
  programStudi: string;   // e.g., "Sarjana Terapan Teknologi Rekayasa Otomasi"
  fakultas: string;       // e.g., "Sekolah Vokasi"
  universitas: string;    // e.g., "Universitas Diponegoro"
}

// ============ PERSONIL / OTORITAS ============
export interface Person {
  nama: string;
  nip: string;            // NIP atau NPPU
  jabatan: string;        // e.g., "Koordinator Mata Kuliah"
}

export interface Authority {
  koordinatorMK: Person;
  koordinatorGPM: Person;
  ketuaProdi: Person;
  dekan: Person;
}

// ============ CPL (Capaian Pembelajaran Lulusan) ============
export interface CPL {
  kode: string;           // e.g., "CPL3"
  pernyataan: string;     // Deskripsi CPL
}

// ============ CPMK (Capaian Pembelajaran Mata Kuliah) ============
export interface CPMK {
  kode: string;           // e.g., "CPMK 1"
  pernyataan: string;     // Deskripsi CPMK
}

// ============ INDIKATOR KINERJA ============
export interface IndikatorKinerja {
  kode: string;           // e.g., "IK 3-1"
  kodeCPL: string;        // Referensi ke CPL
  pernyataan: string;
}

// ============ RENCANA PEMBELAJARAN MINGGUAN ============
export interface WeeklyPlan {
  mingguKe: number;
  kemampuanAkhir: string;         // CPMK yang dicapai
  bahanKajian: string;            // Pokok Bahasan
  metodePembelajaran: {
    metode: string;               // Metode pembelajaran: Ceramah/Diskusi/Kuis/Praktikum/Project/Presentasi
    deskripsi: string;            // Deskripsi metode (WAJIB 20 kata)
    aktivitas: string;            // Penjelasan aktivitas pembelajaran
  };
  waktu: string;                  // e.g., "3x50""
  pengalamanBelajar: string;
  penilaian: {
    kriteria: string;
    bobot: number;                // Persentase
  };
}

// ============ METODE PENILAIAN ============
export interface AssessmentMethod {
  teknik: string;                 // e.g., "Aktivitas Partisipatif"
  persentase: number;
  kriteria: string;
  distribusiCPMK: Array<{
    cpmkId: string;               // e.g., "CPMK 1" or "CPMK 2"
    nilai: number;                // Persentase untuk CPMK ini
  }>;
}

// ============ PEMETAAN CPL-IK-CPMK ============
export interface CPLMapping {
  kodeCPL: string;
  kodeIK: string;
  pernyataanIK: string;
  kodeCPMK: string;
  pernyataanCPMK: string;
  bobotCPMK: string;
  mediaAsesmen: string;
  distribusi: {
    kuis: number;
    presentasi: number;
    proyek: number;
    uts: number;
    uas: number;
  };
}

// ============ REFERENSI ============
export interface Reference {
  judul: string;
  penulis: string;
  tahun?: number;
  jenis: 'buku' | 'jurnal' | 'website' | 'regulasi' | 'lainnya';
}

// ============ COMPLETE RPS DATA ============
export interface RPSData {
  // Metadata
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  
  // Content
  identity: CourseIdentity;
  institution: Institution;
  authority: Authority;
  deskripsiSingkat: string;
  cplList: CPL[];
  cpmkList: CPMK[];
  indikatorKinerjaList: IndikatorKinerja[];
  weeklyPlan: WeeklyPlan[];
  assessmentMethods: AssessmentMethod[];
  cplMappings: CPLMapping[];
  references: Reference[];
}

// ============ DEFAULT / EMPTY RPS ============
export const createEmptyRPS = (): RPSData => ({
  identity: {
    kode: '',
    nama: '',
    sks: 2,
    semester: 1,
    status: 'Mata Kuliah Wajib',
    prasyarat: '-',
  },
  institution: {
    programStudi: 'Sarjana Terapan Teknologi Rekayasa Otomasi',
    fakultas: 'Sekolah Vokasi',
    universitas: 'Universitas Diponegoro',
  },
  authority: {
    koordinatorMK: { nama: '', nip: '', jabatan: 'Koordinator Mata Kuliah' },
    koordinatorGPM: { nama: '', nip: '', jabatan: 'Koordinator GPM' },
    ketuaProdi: { nama: '', nip: '', jabatan: 'Ketua Prodi' },
    dekan: { nama: '', nip: '', jabatan: 'Dekan' },
  },
  deskripsiSingkat: '',
  cplList: [
    { kode: 'CPL3', pernyataan: '' },
    { kode: 'CPL4', pernyataan: '' },
    { kode: 'CPL10', pernyataan: '' },
  ],
  cpmkList: [
    { kode: 'CPMK 1', pernyataan: '' },
    { kode: 'CPMK 2', pernyataan: '' },
    { kode: 'CPMK 3', pernyataan: '' },
    { kode: 'CPMK 4', pernyataan: '' },
  ],
  indikatorKinerjaList: [
    { kode: 'IK 1', kodeCPL: '', pernyataan: '' },
    { kode: 'IK 2', kodeCPL: '', pernyataan: '' },
    { kode: 'IK 3', kodeCPL: '', pernyataan: '' },
    { kode: 'IK 4', kodeCPL: '', pernyataan: '' },
  ],
  weeklyPlan: Array.from({ length: 16 }, (_, i) => ({
    mingguKe: i + 1,
    kemampuanAkhir: '',
    bahanKajian: '',
    metodePembelajaran: { metode: '', deskripsi: '', aktivitas: '' },
    waktu: '3x50"',
    pengalamanBelajar: '',
    penilaian: { kriteria: '', bobot: 0 },
  })),
  assessmentMethods: [
    { teknik: 'Aktivitas Partisipatif', persentase: 10, kriteria: '', distribusiCPMK: [{ cpmkId: 'CPMK 1', nilai: 0 }, { cpmkId: 'CPMK 2', nilai: 0 }, { cpmkId: 'CPMK 3', nilai: 0 }, { cpmkId: 'CPMK 4', nilai: 0 }] },
    { teknik: 'Tugas/Laporan', persentase: 30, kriteria: '', distribusiCPMK: [{ cpmkId: 'CPMK 1', nilai: 0 }, { cpmkId: 'CPMK 2', nilai: 0 }, { cpmkId: 'CPMK 3', nilai: 0 }, { cpmkId: 'CPMK 4', nilai: 0 }] },
    { teknik: 'UTS', persentase: 25, kriteria: '', distribusiCPMK: [{ cpmkId: 'CPMK 1', nilai: 0 }, { cpmkId: 'CPMK 2', nilai: 0 }, { cpmkId: 'CPMK 3', nilai: 0 }, { cpmkId: 'CPMK 4', nilai: 0 }] },
    { teknik: 'UAS', persentase: 35, kriteria: '', distribusiCPMK: [{ cpmkId: 'CPMK 1', nilai: 0 }, { cpmkId: 'CPMK 2', nilai: 0 }, { cpmkId: 'CPMK 3', nilai: 0 }, { cpmkId: 'CPMK 4', nilai: 0 }] },
  ],
  cplMappings: [],
  references: [],
});

// ============ SAMPLE RPS FOR PRAKTIKUM MEKATRONIKA ============
export const samplePraktikumMekatronika: RPSData = {
  identity: {
    kode: 'TRAO6XXX',
    nama: 'Praktikum Mekatronika dan Robotika',
    sks: 2,
    semester: 4,
    status: 'Mata Kuliah Wajib',
    prasyarat: 'Dasar Elektronika & Pemrograman',
  },
  institution: {
    programStudi: 'Sarjana Terapan Teknologi Rekayasa Otomasi',
    fakultas: 'Sekolah Vokasi',
    universitas: 'Universitas Diponegoro',
  },
  authority: {
    koordinatorMK: { nama: '', nip: '', jabatan: 'Koordinator Mata Kuliah' },
    koordinatorGPM: { nama: '', nip: '', jabatan: 'Koordinator GPM' },
    ketuaProdi: { nama: '', nip: '', jabatan: 'Ketua Prodi' },
    dekan: { nama: 'Prof. Dr. Ir. Budiyono, M.Si.', nip: '196602201991021001', jabatan: 'Dekan Sekolah Vokasi' },
  },
  deskripsiSingkat: 'Praktikum Mekatronika dan Robotika membekali mahasiswa dengan keterampilan merancang, merakit, memrogram, dan menguji sistem mekatronika/robotika. Kegiatan meliputi pengenalan keselamatan laboratorium, sensor–aktuator, mikrokontroler, kendali motor, akuisisi data, dan integrasi menjadi prototipe robot.',
  cplList: [
    { kode: 'CPL3', pernyataan: 'Mampu menganalisis dan memecahkan permasalahan rekayasa otomasi melalui pendekatan eksperimen dan data.' },
    { kode: 'CPL4', pernyataan: 'Menguasai konsep sensor, aktuator, sistem kendali, dan robotika untuk membangun solusi mekatronika.' },
    { kode: 'CPL10', pernyataan: 'Memiliki sikap disiplin, amanah, dan etika kerja di laboratorium, serta tanggung jawab terhadap keselamatan dan lingkungan.' },
  ],
  cpmkList: [
    { kode: 'CPMK 1', pernyataan: 'Merakit rangkaian sensor–aktuator dan melakukan pengukuran dasar serta troubleshooting.' },
    { kode: 'CPMK 2', pernyataan: 'Memprogram mikrokontroler/embedded system untuk membaca sensor, mengendalikan aktuator, dan melakukan logging data.' },
    { kode: 'CPMK 3', pernyataan: 'Menerapkan konsep kendali (mis. PID dasar) untuk kendali motor/robot pada skenario praktikum.' },
    { kode: 'CPMK 4', pernyataan: 'Mendemonstrasikan integrasi sistem mekatronika/robotika dalam proyek mini dan menyusun laporan praktikum yang baik serta etis.' },
  ],
  indikatorKinerjaList: [
    { kode: 'IK 3-1', kodeCPL: 'CPL3', pernyataan: 'Mampu merancang dan melakukan pengujian sistem mekatronika berbasis data.' },
    { kode: 'IK 3-2', kodeCPL: 'CPL3', pernyataan: 'Mampu memprogram dan mengintegrasikan modul untuk menyelesaikan tugas robotika.' },
    { kode: 'IK 4-1', kodeCPL: 'CPL4', pernyataan: 'Menerapkan konsep kendali untuk meningkatkan performa sistem.' },
    { kode: 'IK 10-1', kodeCPL: 'CPL10', pernyataan: 'Menunjukkan etika, K3, dan tanggung jawab kerja laboratorium.' },
  ],
  weeklyPlan: [],
  assessmentMethods: [
    { teknik: 'Aktivitas Partisipatif', persentase: 10, kriteria: 'Disiplin K3; aktif saat praktikum; logbook rapi', distribusiCPMK: [{ cpmkId: 'CPMK 1', nilai: 2 }, { cpmkId: 'CPMK 2', nilai: 2 }, { cpmkId: 'CPMK 3', nilai: 3 }, { cpmkId: 'CPMK 4', nilai: 3 }] },
    { teknik: 'Laporan Praktikum & Tugas', persentase: 30, kriteria: 'Laporan sesuai format; hasil uji benar; analisis data', distribusiCPMK: [{ cpmkId: 'CPMK 1', nilai: 10 }, { cpmkId: 'CPMK 2', nilai: 10 }, { cpmkId: 'CPMK 3', nilai: 10 }, { cpmkId: 'CPMK 4', nilai: 0 }] },
    { teknik: 'UTS (Uji Praktik)', persentase: 15, kriteria: 'Rangkaian & program sesuai spesifikasi', distribusiCPMK: [{ cpmkId: 'CPMK 1', nilai: 5 }, { cpmkId: 'CPMK 2', nilai: 5 }, { cpmkId: 'CPMK 3', nilai: 5 }, { cpmkId: 'CPMK 4', nilai: 0 }] },
    { teknik: 'Proyek Akhir', persentase: 30, kriteria: 'Prototipe bekerja; uji performa; dokumentasi', distribusiCPMK: [{ cpmkId: 'CPMK 1', nilai: 0 }, { cpmkId: 'CPMK 2', nilai: 10 }, { cpmkId: 'CPMK 3', nilai: 10 }, { cpmkId: 'CPMK 4', nilai: 10 }] },
    { teknik: 'UAS (Demo Proyek)', persentase: 15, kriteria: 'Fungsi proyek; kualitas integrasi; presentasi', distribusiCPMK: [{ cpmkId: 'CPMK 1', nilai: 0 }, { cpmkId: 'CPMK 2', nilai: 0 }, { cpmkId: 'CPMK 3', nilai: 5 }, { cpmkId: 'CPMK 4', nilai: 10 }] },
  ],
  cplMappings: [
    { kodeCPL: 'CPL3', kodeIK: 'IK 3-1', pernyataanIK: 'Mampu merancang dan melakukan pengujian sistem mekatronika berbasis data.', kodeCPMK: 'CPMK 1', pernyataanCPMK: 'Merakit rangkaian sensor–aktuator dan melakukan pengukuran dasar serta troubleshooting.', bobotCPMK: '20%', mediaAsesmen: 'Kuis, Laporan, UTS', distribusi: { kuis: 5, presentasi: 5, proyek: 0, uts: 10, uas: 0 } },
    { kodeCPL: '', kodeIK: 'IK 3-2', pernyataanIK: 'Mampu memprogram dan mengintegrasikan modul untuk menyelesaikan tugas robotika.', kodeCPMK: 'CPMK 2', pernyataanCPMK: 'Memprogram mikrokontroler/embedded system untuk membaca sensor, mengendalikan aktuator, dan melakukan logging data.', bobotCPMK: '25%', mediaAsesmen: 'Tugas, Laporan, UTS', distribusi: { kuis: 0, presentasi: 5, proyek: 10, uts: 10, uas: 0 } },
    { kodeCPL: 'CPL4', kodeIK: 'IK 4-1', pernyataanIK: 'Menerapkan konsep kendali untuk meningkatkan performa sistem.', kodeCPMK: 'CPMK 3', pernyataanCPMK: 'Menerapkan konsep kendali (mis. PID dasar) untuk kendali motor/robot pada skenario praktikum.', bobotCPMK: '25%', mediaAsesmen: 'Laporan, Proyek', distribusi: { kuis: 0, presentasi: 0, proyek: 15, uts: 0, uas: 10 } },
    { kodeCPL: 'CPL10', kodeIK: 'IK 10-1', pernyataanIK: 'Menunjukkan etika, K3, dan tanggung jawab kerja laboratorium.', kodeCPMK: 'CPMK 4', pernyataanCPMK: 'Mendemonstrasikan integrasi sistem mekatronika/robotika dalam proyek mini dan menyusun laporan praktikum yang baik serta etis.', bobotCPMK: '30%', mediaAsesmen: 'Partisipasi, Proyek, UAS', distribusi: { kuis: 0, presentasi: 5, proyek: 0, uts: 0, uas: 15 } },
  ],
  references: [
    { judul: 'Mechatronics', penulis: 'Bolton, W.', jenis: 'buku' },
    { judul: 'Introduction to Robotics: Mechanics and Control', penulis: 'Craig, J.J.', jenis: 'buku' },
    { judul: 'Modern Control Engineering', penulis: 'Ogata, K.', jenis: 'buku' },
    { judul: 'Dokumentasi Arduino/PlatformIO/STM32', penulis: '-', jenis: 'website' },
  ],
};
