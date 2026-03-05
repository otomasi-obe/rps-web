package com.example.openaitest;

/**
 * Builds the RPS (Rencana Pembelajaran Semester) prompt for OpenAI.
 * Ported from Python aitojson.py generate_prompt()
 */
public class RpsPromptBuilder {

    public static String build(String courseName, String courseCode, int sks,
                               int semester, String status, String prereq,
                               String additionalContext) {

        String contextSection = "";
        if (additionalContext != null && !additionalContext.isBlank()) {
            contextSection = "## Konteks Tambahan:\n" + additionalContext + "\n";
        }

        return """
Anda adalah ahli kurikulum pendidikan tinggi Indonesia. Buatkan Rencana Pembelajaran Semester (RPS) lengkap untuk mata kuliah berikut:

## Informasi Mata Kuliah:
- Nama: %s
- Kode: %s
- SKS: %d
- Semester: %d
- Status: %s
- Prasyarat: %s
- konteks tambahan:
%s

## Instruksi:
Buatkan RPS dalam format JSON dengan struktur PERSIS seperti berikut. PENTING: Hanya output JSON murni tanpa markdown code block.

{
  "deskripsi": "Deskripsi mata kuliah 3-5 kalimat yang menjelaskan tujuan, cakupan, dan manfaat mata kuliah ini bagi mahasiswa",

  "cpl": [
    {"kode": "CPL 1", "pernyataan": "Capaian Pembelajaran Lulusan yang relevan dengan mata kuliah"}
  ],

  "ik": [
    {"kode": "IK 1-1",
     "pernyataan": "Indikator kinerja spesifik untuk CPL 1 dan CPMK 1-1",
     "mapping_cpl": "CPL 1",
     "mapping_cpmk": "CPMK 1-1"}
  ],

  "cpmk": [
    {"kode": "CPMK 1-1", "pernyataan": "Mahasiswa mampu [capaian spesifik 1-1]",
     "mapping_cpl": "CPL 1", "N1": 5,"N2": 5,"N3": 5,"N4": 5,"N5": 0,"N_cpmk": 30}
  ],

  "minggu": [
    {"mingguKe": 1,
     "kemampuanAkhir": "CPMK 1-1",
     "bahanKajian": "Topik minggu 1",
     "metodePembelajaran": {"metode": "TM SCL",
       "deskripsi": "peran dosen dalam metode pembelajaran",
       "aktivitas": "aktivitas mahasiswa dalam metode pembelajaran"},
     "waktu": "TM Ceramah 1x50', Kuis, Tugas Mandiri",
     "pengalamanBelajar": "pengalaman belajar mahasiswa",
     "penilaian": {"kriteria": "kriteria indikator pencapaian", "bobotMateri": 5}},
    {"mingguKe": 8, "kemampuanAkhir": "UTS"},
    {"mingguKe": 16, "kemampuanAkhir": "UAS"}
  ],

  "referensi": [
    "Buku/Jurnal/Proceding/Website"
  ]
}

## Catatan Penting:
. Gunakan bahasa Indonesia yang baik dan akademis
. Konten harus relevan dengan "%s"
. Pastikan semua 16 minggu terisi lengkap (14 pertemuan + UTS minggu 8 + UAS minggu 16)
. Minggu 8 = UTS, Minggu 16 = UAS (hanya ada field mingguKe dan kemampuanAkhir)
. N1(Partisipatif 20%%),N2(Project/Problem/Case Based Learning 30%%),N3(Kuis 10%%),N4(UTS 20%%),N5(UAS 20%%)
. Total N1 dari semua CPMK harus 20%%, N2-N5 juga sama sesuai proporsi di atas
. Total bobot penilaian = 100%% dari N_cpmk semua CPMK
. Sesuaikan jumlah CPL,CPMK,IK sesuai konteks tambahan
. Format kode CPL (CPL 3, CPL 8), CPMK (CPMK 3-1, CPMK 8-1), IK (IK 3-1, IK 8-1)
. Mapping: CPMK memetakan ke CPL (CPMK 3-1 → CPL 3), IK memetakan ke CPMK (IK 3-1 → CPMK 3-1)
. Setiap minggu (selain UTS/UAS) harus ada semua field lengkap
. Total bobotMateri dari semua minggu (14 pertemuan) harus 100%%
. WAJIB untuk setiap minggu (selain UTS/UAS):
   - "metodePembelajaran.metode": pilih 1 dari:
     * TM SCL (untuk mata kuliah teori)
     * CBL (Case Based Learning)
     * PBL (Problem Based Learning)
     * PjBL (untuk mata kuliah Praktikum)
   - "metodePembelajaran.deskripsi": minimal 5 kata menjelaskan peran dosen dalam metode pembelajaran
   - "metodePembelajaran.aktivitas": minimal 5 kata menjelaskan aktivitas mahasiswa
   - "pengalamanBelajar": minimal 5 kata pengalaman belajar yang didapat mahasiswa
   - "penilaian.kriteria": minimal 5 kata kriteria penilaian yang jelas
   - "penilaian.bobotMateri": setiap bobotMateri dari beberapa minggu untuk satu CPMK dijumlahkan harus sesuai N_cpmk
   - "bahanKajian": sesuai dengan course_name dan relevan dengan CPMK yang dituju
   - "waktu":
     * Untuk mata kuliah teori (non-Praktikum):
       - TM SCL: "TM Ceramah %dx50', Kuis, Tugas Mandiri"
       - CBL: "CBL %dx50', Diskusi Kelompok, Studi Kasus"
       - PBL: "PBL %dx50', Diskusi Kelompok, Tugas Mandiri"
       - PjBL: "PjBL %dx50', Proyek Mini, Presentasi"
     * Untuk mata kuliah Praktikum (nama dimulai "Praktikum"):
       - PjBL: "Praktikum %dx170', Praktikum Hands-on, Laporan Praktikum"
. Untuk mata kuliah Praktikum, gunakan metode PjBL dengan deskripsi tentang praktikum
. Variasikan metode pembelajaran di berbagai minggu (TM SCL, CBL, PBL, PjBL)
. bahanKajian harus spesifik dan bervariasi setiap minggu, tidak generik
. Referensi harus mengikuti format (Penulis,Tahun,Judul,Penerbit):
  1. Buku internasional
  2-3. Buku nasional
  4-5. Jurnal internasional
  6-7. Jurnal nasional
  8. Website/Dokumentasi resmi (Penulis,Tahun,Judul,alamat URL)
Output JSON saja, tanpa markdown formatting atau penjelasan."""
                .formatted(
                    courseName, courseCode, sks, semester, status, prereq,
                    contextSection, courseName,
                    sks, sks, sks, sks, sks  // for waktu format %d
                );
    }
}
