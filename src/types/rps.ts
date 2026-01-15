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
  distribusi: Record<string, number>;
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

// ============ SAMPLE RPS FOR AGAMA ============
export const sampleAgama: RPSData = {
  identity: {
    kode: 'UUW00011',
    nama: 'Agama',
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
    koordinatorMK: {
      nama: 'Dr. H. Muchamad Syaiful Bahri, M.Ag.',
      nip: '196503051990121001',
      jabatan: 'Koordinator Mata Kuliah Agama',
    },
    koordinatorGPM: {
      nama: 'Prof. Budi Santoso',
      nip: '197502021998121001',
      jabatan: 'Koordinator GPM',
    },
    ketuaProdi: {
      nama: 'Dr. Cecep Rahmat',
      nip: '198601011992031001',
      jabatan: 'Ketua Prodi',
    },
    dekan: {
      nama: 'Prof. Dr. Ir. Budiyono, M.Si.',
      nip: '196602201991021001',
      jabatan: 'Dekan Sekolah Vokasi',
    },
  },
  deskripsiSingkat: 'Mata kuliah ini memperkenalkan nilai-nilai keagamaan dan etika yang didasarkan pada prinsip Ketuhanan Yang Maha Esa sebagai fondasi Pancasila. Mahasiswa akan mempelajari cara mengintegrasikan nilai-nilai spiritual dalam pelaksanaan rekayasa otomasi secara profesional dan berintegritas. Mata kuliah ini bertujuan untuk membangun karakter mahasiswa yang berkomitmen pada nilai-nilai kemanusiaan dan tanggung jawab sosial dalam praktik teknis.',
  cplList: [
    {
      kode: 'CPL1',
      pernyataan: 'Mampu melaksanakan rekayasa otomasi baik secara mandiri maupun kerja sama tim yang profesional dan berintegritas berdasarkan nilai-nilai Pancasila',
    },
  ],
  cpmkList: [
    {
      kode: 'CPMK 1',
      pernyataan: 'Mampu memahami dan menginternalisasi nilai-nilai agama yang melandasi Pancasila terutama Sila Pertama Ketuhanan Yang Maha Esa',
    },
    {
      kode: 'CPMK 2',
      pernyataan: 'Mampu menerapkan nilai-nilai keagamaan dan etika dalam konteks pekerjaan dan kolaborasi tim rekayasa otomasi',
    },
    {
      kode: 'CPMK 3',
      pernyataan: 'Mampu mengamalkan tanggung jawab sosial dan profesionalisme berdasarkan nilai-nilai agama dalam kehidupan bermasyarakat dan bernegara',
    },
  ],
  indikatorKinerjaList: [
    {
      kode: 'IK 1-1',
      kodeCPL: 'CPL1',
      pernyataan: 'Mampu memahami rekayasa otomasi secara mandiri maupun kerja sama tim yang profesional dan berintegritas berdasarkan nilai-nilai Pancasila terutama sila pertama yaitu Ketuhanan yang Maha Esa',
    },
    {
      kode: 'IK 1-2',
      kodeCPL: 'CPL1',
      pernyataan: 'Mampu menginternalisasi nilai-nilai Pancasila terutama sila pertama yaitu Ketuhanan yang Maha Esa dalam pelaksanaan rekayasa otomasi',
    },
    {
      kode: 'IK 1-3',
      kodeCPL: 'CPL1',
      pernyataan: 'Mampu mengamalkan nilai-nilai luhur Pancasila dalam pelaksanaan rekayasa otomasi secara mandiri maupun kerja sama tim yang profesional',
    },
  ],
  weeklyPlan: [
    {
      mingguKe: 1,
      kemampuanAkhir: 'CPMK 1',
      bahanKajian: 'Pengantar Agama dan Ketuhanan dalam Konteks Rekayasa Otomasi',
      metodePembelajaran: {
        metode: 'Ceramah',
        deskripsi: 'Pemaparan konsep dasar agama dan peran spiritualitas dalam pelaksanaan rekayasa. Mahasiswa mendengarkan presentasi tentang nilai Ketuhanan dalam konteks profesional kerja teknis.',
        aktivitas: 'Mendengarkan presentasi, membuat catatan penting, dan mengajukan pertanyaan mengenai relevansi nilai agama dalam teknologi',
      },
      waktu: "2x50'",
      pengalamanBelajar: 'Memahami hubungan antara nilai-nilai agama dan pelaksanaan tugas profesional teknis. Mengenali pentingnya fondasi spiritual dalam kehidupan bermasyarakat.',
      penilaian: {
        kriteria: 'Ketepatan pemahaman konsep ketuhanan; kemampuan menghubungkan nilai agama dengan pekerjaan teknis; keaktifan dalam diskusi.',
        bobot: 5,
      },
    },
    {
      mingguKe: 2,
      kemampuanAkhir: 'CPMK 1',
      bahanKajian: 'Pancasila dan Sila Pertama: Ketuhanan Yang Maha Esa',
      metodePembelajaran: {
        metode: 'Diskusi',
        deskripsi: 'Diskusi kelompok untuk menganalisis makna Sila Pertama Pancasila. Mahasiswa membentuk kelompok kecil untuk mendiskusikan implementasi nilai ketuhanan dalam kehidupan sehari-hari.',
        aktivitas: 'Bekerja dalam kelompok diskusi, mengidentifikasi nilai-nilai keagamaan, menyiapkan hasil diskusi, dan mempresentasikan temuan di kelas',
      },
      waktu: "2x50'",
      pengalamanBelajar: 'Memahami esensi Sila Pertama Pancasila melalui diskusi kolaboratif. Belajar menghargai perspektif berbeda tentang nilai ketuhanan dari teman diskusi.',
      penilaian: {
        kriteria: 'Partisipasi aktif dalam diskusi; kedalaman analisis tentang Sila Pertama; kualitas presentasi hasil diskusi kelompok.',
        bobot: 5,
      },
    },
    {
      mingguKe: 3,
      kemampuanAkhir: 'CPMK 1',
      bahanKajian: 'Etos Kerja dan Profesionalisme dari Perspektif Agama',
      metodePembelajaran: {
        metode: 'Studi Kasus',
        deskripsi: 'Menganalisis studi kasus profesional yang menerapkan nilai-nilai agama. Mahasiswa mempelajari contoh nyata implementasi etika agama dalam dunia kerja dan industri teknis.',
        aktivitas: 'Membaca dan menganalisis studi kasus, mendiskusikan bagaimana nilai agama diterapkan, mengidentifikasi pembelajaran yang dapat diterapkan dalam karir',
      },
      waktu: "2x50'",
      pengalamanBelajar: 'Memahami cara praktis menerapkan nilai-nilai agama dalam lingkungan kerja profesional. Belajar dari pengalaman praktisi yang mengintegrasikan spiritualitas dalam pekerjaan.',
      penilaian: {
        kriteria: 'Kemampuan menganalisis studi kasus; pemahaman tentang integrasi nilai agama dalam pekerjaan; relevansi analisis dengan konteks kerja.',
        bobot: 5,
      },
    },
    {
      mingguKe: 4,
      kemampuanAkhir: 'CPMK 2',
      bahanKajian: 'Etika Kolaborasi Tim Berbasis Nilai-Nilai Agama',
      metodePembelajaran: {
        metode: 'Praktikum',
        deskripsi: 'Simulasi kerja tim dengan penekanan pada nilai-nilai agama dan etika. Mahasiswa bekerja dalam kelompok untuk menyelesaikan proyek sederhana dengan menerapkan prinsip kolaborasi berbasis nilai agama.',
        aktivitas: 'Membentuk tim kerja, menjalankan proyek kolaboratif kecil, menerapkan prinsip saling menghormati dan gotong royong, refleksi tentang pengalaman kerja tim',
      },
      waktu: "2x50'",
      pengalamanBelajar: 'Mengalami langsung bagaimana nilai-nilai agama meningkatkan kualitas kolaborasi tim. Belajar pentingnya saling menghormati dan kepercayaan dalam kerja profesional.',
      penilaian: {
        kriteria: 'Kualitas kolaborasi tim; penerapan nilai-nilai agama dalam interaksi; hasil kerja dan kontribusi individu dalam kelompok.',
        bobot: 5,
      },
    },
    {
      mingguKe: 5,
      kemampuanAkhir: 'CPMK 2',
      bahanKajian: 'Tanggung Jawab Sosial dalam Perspektif Agama dan Rekayasa',
      metodePembelajaran: {
        metode: 'Ceramah',
        deskripsi: 'Pemaparan tentang tanggung jawab sosial sebagai konsekuensi dari nilai-nilai agama. Dosen menjelaskan bagaimana teknologi dan rekayasa harus membawa manfaat bagi masyarakat luas.',
        aktivitas: 'Mendengarkan presentasi tentang tanggung jawab sosial perekayasa, diskusi singkat, mengidentifikasi cara teknologi dapat memberikan manfaat sosial',
      },
      waktu: "2x50'",
      pengalamanBelajar: 'Memahami bahwa profesi rekayasa memiliki dimensi sosial yang penting. Menyadari pentingnya menggunakan teknologi untuk kebaikan bersama sesuai nilai agama.',
      penilaian: {
        kriteria: 'Pemahaman tentang tanggung jawab sosial perekayasa; kesadaran tentang dampak teknologi pada masyarakat; kemampuan menghubungkan nilai agama dengan tanggung jawab sosial.',
        bobot: 5,
      },
    },
    {
      mingguKe: 6,
      kemampuanAkhir: 'CPMK 3',
      bahanKajian: 'Integritas dan Kejujuran dalam Praktik Teknis',
      metodePembelajaran: {
        metode: 'Diskusi',
        deskripsi: 'Diskusi mendalam tentang integritas dan kejujuran sebagai nilai agama. Mahasiswa berdiskusi tentang dilema etika dalam pekerjaan teknis dan bagaimana menjaga integritas.',
        aktivitas: 'Diskusi kelompok tentang skenario etika, analisis bagaimana nilai agama memandu pengambilan keputusan, presentasi solusi etis untuk kasus-kasus teknis',
      },
      waktu: "2x50'",
      pengalamanBelajar: 'Belajar mengidentifikasi dilema etika dalam pekerjaan. Memahami bahwa integritas adalah prinsip fundamental yang didukung oleh nilai-nilai agama dan profesional.',
      penilaian: {
        kriteria: 'Kualitas analisis dilema etika; pemahaman tentang integritas; kemampuan mengambil keputusan etis berdasarkan nilai agama dan profesionalisme.',
        bobot: 5,
      },
    },
    {
      mingguKe: 7,
      kemampuanAkhir: 'CPMK 3',
      bahanKajian: 'Pengembangan Karakter dan Kepemimpinan Berbasis Nilai-Nilai Agama',
      metodePembelajaran: {
        metode: 'Presentasi',
        deskripsi: 'Mahasiswa mempresentasikan refleksi personal tentang pengembangan karakter berbasis nilai agama. Setiap mahasiswa berbagi pemahaman tentang bagaimana nilai agama membentuk karakter profesional.',
        aktivitas: 'Menyiapkan presentasi personal, mempresentasikan refleksi tentang karakter dan kepemimpinan, mendengarkan presentasi teman, memberikan umpan balik konstruktif',
      },
      waktu: "2x50'",
      pengalamanBelajar: 'Melakukan refleksi diri tentang pengembangan karakter. Belajar dari pengalaman dan perspektif teman tentang integrasi nilai agama dalam kepemimpinan.',
      penilaian: {
        kriteria: 'Kualitas refleksi personal; kedalaman pemahaman tentang pengembangan karakter; kemampuan mengartikulasikan nilai-nilai agama dalam kepemimpinan.',
        bobot: 5,
      },
    },
    {
      mingguKe: 8,
      kemampuanAkhir: 'UTS',
      bahanKajian: 'UTS - Ujian Tengah Semester',
      metodePembelajaran: {
        metode: 'Ujian',
        deskripsi: 'Penilaian komprehensif tertulis dan reflektif mencakup materi minggu 1-7. Evaluasi pemahaman mahasiswa tentang nilai-nilai agama dan penerapannya dalam konteks rekayasa otomasi.',
        aktivitas: 'Pelaksanaan ujian tulis dan esai reflektif sesuai jadwal akademik yang telah ditetapkan oleh institusi',
      },
      waktu: "3x50'",
      pengalamanBelajar: 'UTS',
      penilaian: {
        kriteria: 'UTS',
        bobot: 15,
      },
    },
    {
      mingguKe: 9,
      kemampuanAkhir: 'CPMK 1',
      bahanKajian: 'Spiritualitas dan Kesejahteraan Mental dalam Dunia Kerja Teknis',
      metodePembelajaran: {
        metode: 'Ceramah',
        deskripsi: 'Pemaparan tentang peran spiritualitas dalam menjaga kesehatan mental dan kesejahteraan pekerja teknis. Dosen menjelaskan bagaimana praktik spiritual dapat mengurangi stres dan meningkatkan produktivitas.',
        aktivitas: 'Mendengarkan presentasi tentang kesejahteraan mental dari perspektif spiritual, diskusi tentang praktik spiritual yang dapat mendukung kesehatan mental',
      },
      waktu: "2x50'",
      pengalamanBelajar: 'Memahami peran spiritualitas dalam kesejahteraan mental dan produktivitas kerja. Belajar teknik-teknik spiritual untuk mengelola stres dan tantangan pekerjaan.',
      penilaian: {
        kriteria: 'Pemahaman tentang hubungan spiritualitas dan kesejahteraan mental; pengetahuan tentang praktik spiritual; relevansi dengan konteks kerja teknis.',
        bobot: 5,
      },
    },
    {
      mingguKe: 10,
      kemampuanAkhir: 'CPMK 2',
      bahanKajian: 'Inovasi Berkelanjutan dengan Kesadaran Lingkungan dan Agama',
      metodePembelajaran: {
        metode: 'Studi Kasus',
        deskripsi: 'Analisis studi kasus tentang inovasi teknologi yang mempertimbangkan kelestarian lingkungan dari perspektif tanggung jawab agama. Mahasiswa mengkaji contoh proyek rekayasa yang berkelanjutan.',
        aktivitas: 'Membaca dan menganalisis studi kasus inovasi berkelanjutan, mendiskusikan peran tanggung jawab agama dalam kelestarian lingkungan, presentasi temuan',
      },
      waktu: "2x50'",
      pengalamanBelajar: 'Memahami bahwa inovasi teknis harus memperhitungkan dampak lingkungan sebagai bentuk tanggung jawab agama. Belajar tentang konsep pembangunan berkelanjutan dari perspektif nilai agama.',
      penilaian: {
        kriteria: 'Analisis mendalam tentang inovasi berkelanjutan; pemahaman tentang tanggung jawab lingkungan dari perspektif agama; relevansi dengan rekayasa otomasi.',
        bobot: 5,
      },
    },
    {
      mingguKe: 11,
      kemampuanAkhir: 'CPMK 2',
      bahanKajian: 'Etika Bisnis dan Wirausaha Berbasis Nilai-Nilai Agama',
      metodePembelajaran: {
        metode: 'Diskusi',
        deskripsi: 'Diskusi tentang prinsip-prinsip etika bisnis yang didasarkan pada nilai-nilai agama. Mahasiswa mendiskusikan bagaimana menjalankan usaha teknis dengan integritas dan kejujuran.',
        aktivitas: 'Diskusi kelompok tentang studi kasus etika bisnis, analisis tentang bagaimana nilai agama memandu keputusan bisnis, presentasi prinsip-prinsip etika bisnis',
      },
      waktu: "2x50'",
      pengalamanBelajar: 'Memahami prinsip-prinsip etika bisnis yang sejalan dengan nilai-nilai agama. Belajar tentang tanggung jawab perusahaan kepada stakeholder dan masyarakat.',
      penilaian: {
        kriteria: 'Pemahaman etika bisnis dari perspektif agama; analisis tentang tanggung jawab perusahaan; kemampuan menerapkan prinsip-prinsip etika dalam konteks bisnis.',
        bobot: 5,
      },
    },
    {
      mingguKe: 12,
      kemampuanAkhir: 'CPMK 3',
      bahanKajian: 'Kepemimpinan Spiritual dan Pengaruhnya pada Organisasi',
      metodePembelajaran: {
        metode: 'Praktikum',
        deskripsi: 'Simulasi kepemimpinan yang menerapkan nilai-nilai spiritual. Mahasiswa bermain peran sebagai pemimpin tim yang mengintegrasikan nilai-nilai agama dalam memimpin organisasi.',
        aktivitas: 'Simulasi kepemimpinan, refleksi tentang pengalaman memimpin dengan nilai-nilai spiritual, diskusi tentang dampak kepemimpinan berbasis nilai pada efektivitas organisasi',
      },
      waktu: "2x50'",
      pengalamanBelajar: 'Mengalami langsung bagaimana kepemimpinan yang berbasis nilai-nilai spiritual dapat meningkatkan motivasi dan efektivitas organisasi. Belajar tentang pengaruh positif pemimpin yang berintegritas.',
      penilaian: {
        kriteria: 'Kualitas kepemimpinan dalam simulasi; penerapan nilai-nilai spiritual; dampak positif pada anggota tim; refleksi tentang pengalaman memimpin.',
        bobot: 5,
      },
    },
    {
      mingguKe: 13,
      kemampuanAkhir: 'CPMK 3',
      bahanKajian: 'Kontribusi Profesional untuk Kemajuan Bangsa dan Agama',
      metodePembelajaran: {
        metode: 'Presentasi',
        deskripsi: 'Mahasiswa mempresentasikan visi mereka tentang kontribusi profesional untuk kemajuan bangsa berdasarkan nilai-nilai agama. Setiap mahasiswa mengartikulasikan komitmen mereka terhadap tanggung jawab sosial.',
        aktivitas: 'Menyiapkan presentasi tentang visi profesional, mempresentasikan komitmen terhadap tanggung jawab sosial, mendengarkan visi teman, memberikan dukungan dan masukan',
      },
      waktu: "2x50'",
      pengalamanBelajar: 'Merefleksikan visi profesional dan peran mereka dalam kemajuan bangsa. Memahami bahwa pekerjaan teknis memiliki makna yang lebih besar dalam konteks kehidupan bermasyarakat.',
      penilaian: {
        kriteria: 'Kedalaman refleksi tentang visi profesional; keterkaitan dengan nilai-nilai agama; articulasi tentang tanggung jawab sosial; inspirasi untuk teman-teman.',
        bobot: 5,
      },
    },
    {
      mingguKe: 14,
      kemampuanAkhir: 'CPMK 2',
      bahanKajian: 'Studi Lapangan: Implementasi Nilai-Nilai Agama di Industri Teknis',
      metodePembelajaran: {
        metode: 'Kunjungan Industri',
        deskripsi: 'Kunjungan ke industri rekayasa otomasi untuk mengamati implementasi nilai-nilai agama dan etika profesional. Mahasiswa melihat langsung bagaimana perusahaan menerapkan prinsip-prinsip ini.',
        aktivitas: 'Kunjungan industri, interview dengan profesional, observasi tentang budaya kerja yang menerapkan nilai agama, dokumentasi dan refleksi pengalaman',
      },
      waktu: "4x50'",
      pengalamanBelajar: 'Melihat langsung bagaimana nilai-nilai agama dan etika diterapkan dalam industri nyata. Belajar dari pengalaman profesional tentang integrasi nilai dalam pekerjaan sehari-hari.',
      penilaian: {
        kriteria: 'Kualitas observasi di lapangan; kedalaman interview dengan profesional; refleksi tentang penerapan nilai agama di industri; relevansi dengan pembelajaran.',
        bobot: 10,
      },
    },
    {
      mingguKe: 15,
      kemampuanAkhir: 'CPMK 1,2,3',
      bahanKajian: 'Integrasi dan Refleksi: Dari Teori ke Praktik Kehidupan Profesional',
      metodePembelajaran: {
        metode: 'Diskusi Kelompok',
        deskripsi: 'Diskusi komprehensif untuk mengintegrasikan semua materi dan refleksi personal. Mahasiswa secara kolektif merangkum pembelajaran mereka tentang nilai agama dalam praktik profesional.',
        aktivitas: 'Diskusi kelompok tentang seluruh pembelajaran, refleksi personal, sharing pengalaman dan insight, perumusan komitmen pribadi untuk menerapkan nilai agama',
      },
      waktu: "2x50'",
      pengalamanBelajar: 'Mengintegrasikan semua pembelajaran menjadi pemahaman holistik. Merumuskan komitmen personal untuk menerapkan nilai-nilai agama dalam kehidupan profesional.',
      penilaian: {
        kriteria: 'Kualitas integrasi pembelajaran; kedalaman refleksi; pemahaman holistik tentang nilai agama dan profesi; komitmen untuk penerapan nilai.',
        bobot: 5,
      },
    },
    {
      mingguKe: 16,
      kemampuanAkhir: 'UAS',
      bahanKajian: 'UAS - Ujian Akhir Semester',
      metodePembelajaran: {
        metode: 'Ujian',
        deskripsi: 'Penilaian akhir semester melalui esai reflektif mendalam dan presentasi portfolio pembelajaran. Evaluasi komprehenif tentang pemahaman dan penerapan nilai-nilai agama dalam konteks profesi.',
        aktivitas: 'Pelaksanaan ujian esai reflektif dan presentasi portfolio pembelajaran sesuai jadwal akademik yang telah ditetapkan',
      },
      waktu: "3x50'",
      pengalamanBelajar: 'UAS',
      penilaian: {
        kriteria: 'UAS',
        bobot: 20,
      },
    },
  ],
  assessmentMethods: [
    {
      teknik: 'Partisipasi dan Diskusi',
      persentase: 20,
      kriteria: 'Kehadiran, keaktifan dalam diskusi, kontribusi ide, serta kesadaran diri dalam pembelajaran',
      distribusiCPMK: [
        { cpmkId: 'CPMK 1', nilai: 7 },
        { cpmkId: 'CPMK 2', nilai: 7 },
        { cpmkId: 'CPMK 3', nilai: 6 },
      ],
    },
    {
      teknik: 'Tugas dan Presentasi',
      persentase: 25,
      kriteria: 'Kualitas analisis, presentasi, pemahaman mendalam tentang nilai-nilai agama dalam konteks profesional',
      distribusiCPMK: [
        { cpmkId: 'CPMK 1', nilai: 8 },
        { cpmkId: 'CPMK 2', nilai: 9 },
        { cpmkId: 'CPMK 3', nilai: 8 },
      ],
    },
    {
      teknik: 'UTS',
      persentase: 15,
      kriteria: 'Ujian Tengah Semester mencakup materi minggu 1-7',
      distribusiCPMK: [
        { cpmkId: 'CPMK 1', nilai: 10 },
        { cpmkId: 'CPMK 2', nilai: 5 },
        { cpmkId: 'CPMK 3', nilai: 0 },
      ],
    },
    {
      teknik: 'UAS',
      persentase: 20,
      kriteria: 'Ujian Akhir Semester dalam bentuk esai reflektif dan portfolio pembelajaran',
      distribusiCPMK: [
        { cpmkId: 'CPMK 1', nilai: 5 },
        { cpmkId: 'CPMK 2', nilai: 4 },
        { cpmkId: 'CPMK 3', nilai: 11 },
      ],
    },
    {
      teknik: 'Kunjungan Industri dan Refleksi',
      persentase: 20,
      kriteria: 'Observasi, dokumentasi, refleksi lapangan tentang penerapan nilai agama di industri nyata',
      distribusiCPMK: [
        { cpmkId: 'CPMK 1', nilai: 0 },
        { cpmkId: 'CPMK 2', nilai: 20 },
        { cpmkId: 'CPMK 3', nilai: 0 },
      ],
    },
  ],
  cplMappings: [
    {
      kodeCPL: 'CPL1',
      kodeIK: 'IK 1-1',
      pernyataanIK: 'Mampu memahami rekayasa otomasi secara mandiri maupun kerja sama tim yang profesional dan berintegritas berdasarkan nilai-nilai Pancasila terutama sila pertama yaitu Ketuhanan yang Maha Esa',
      kodeCPMK: 'CPMK 1',
      pernyataanCPMK: 'Mampu memahami dan menginternalisasi nilai-nilai agama yang melandasi Pancasila terutama Sila Pertama Ketuhanan Yang Maha Esa',
      bobotCPMK: '33%',
      mediaAsesmen: 'Diskusi, Presentasi, UTS, Refleksi Diri',
      distribusi: { diskusi: 10, presentasi: 5, studi_kasus: 5, uts: 10, uas: 5 },
    },
    {
      kodeCPL: 'CPL1',
      kodeIK: 'IK 1-2',
      pernyataanIK: 'Mampu menginternalisasi nilai-nilai Pancasila terutama sila pertama yaitu Ketuhanan yang Maha Esa dalam pelaksanaan rekayasa otomasi',
      kodeCPMK: 'CPMK 2',
      pernyataanCPMK: 'Mampu menerapkan nilai-nilai keagamaan dan etika dalam konteks pekerjaan dan kolaborasi tim rekayasa otomasi',
      bobotCPMK: '33%',
      mediaAsesmen: 'Studi Kasus, Praktikum, Kunjungan Industri, Diskusi',
      distribusi: { studi_kasus: 5, praktikum: 10, kunjungan_industri: 20, diskusi: 10, uas: 4 },
    },
    {
      kodeCPL: 'CPL1',
      kodeIK: 'IK 1-3',
      pernyataanIK: 'Mampu mengamalkan nilai-nilai luhur Pancasila dalam pelaksanaan rekayasa otomasi secara mandiri maupun kerja sama tim yang profesional',
      kodeCPMK: 'CPMK 3',
      pernyataanCPMK: 'Mampu mengamalkan tanggung jawab sosial dan profesionalisme berdasarkan nilai-nilai agama dalam kehidupan bermasyarakat dan bernegara',
      bobotCPMK: '34%',
      mediaAsesmen: 'Presentasi, Praktikum, Refleksi Personal, UAS',
      distribusi: { presentasi: 5, praktikum: 5, refleksi_personal: 10, uas: 11 },
    },
  ],
  references: [
    {
      judul: 'Nilai-Nilai Pancasila: Suatu Kajian Filosofis',
      penulis: 'Kaelan',
      jenis: 'buku',
    },
    {
      judul: 'Etika Profesional untuk Insinyur',
      penulis: 'Sonny Keraf',
      jenis: 'buku',
    },
    {
      judul: 'Spiritualitas dalam Dunia Kerja Modern',
      penulis: 'Muhammad Syafii Antonio',
      jenis: 'buku',
    },
    {
      judul: 'Agama dan Teknologi: Perspektif Teologis',
      penulis: 'Tim Pengembang Kurikulum Universitas Diponegoro',
      jenis: 'buku',
    },
    {
      judul: 'Standar Etika Profesional Rekayasa',
      penulis: 'IEEE Standards Association',
      jenis: 'website',
    },
  ],
};
