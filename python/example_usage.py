#!/usr/bin/env python3
"""
RPS Template Generator - Example Usage
======================================
Contoh menggunakan rps_template_data.json untuk generate RPS baru
"""

import json
from pathlib import Path

# Load template
with open('rps_template_data.json', 'r', encoding='utf-8') as f:
    template = json.load(f)

# EXAMPLE 1: Customize existing template
# ========================================
print("=" * 70)
print("EXAMPLE 1: Customize Existing Template")
print("=" * 70)

# Copy the template
custom_rps = template.copy()

# Change metadata for a new course
custom_rps['metadata'] = {
    'kode': 'MK002',
    'nama': 'Praktikum Mekatronika dan Robotika',
    'sks': 2,
    'semester': 4,
    'status': 'Mata Kuliah Wajib',
    'prasyarat': 'Dasar Elektronika & Pemrograman'
}

# Update deskripsi
custom_rps['deskripsi_singkat'] = 'Mata kuliah ini memberikan pengalaman praktis dalam mekatronika dan robotika...'

# Update koordinator
custom_rps['koordinator']['koordinator_mk']['nama'] = 'Dr. Budi Santoso, S.T., M.T.'
custom_rps['koordinator']['koordinator_mk']['nppu'] = 'H.7.199901012022101001'

print("\n✅ Metadata berhasil diupdate:")
print(f"   Kode: {custom_rps['metadata']['kode']}")
print(f"   Nama: {custom_rps['metadata']['nama']}")
print(f"   SKS: {custom_rps['metadata']['sks']}")
print(f"   Semester: {custom_rps['metadata']['semester']}")

# EXAMPLE 2: Generate from scratch
# ==================================
print("\n" + "=" * 70)
print("EXAMPLE 2: Generate RPS from Scratch (Template Structure)")
print("=" * 70)

# Struktur lengkap untuk RPS baru
new_rps = {
    "template_info": {
        "nama": "RENCANA PEMBELAJARAN SEMESTER (RPS)",
        "program_studi": "[GANTI DENGAN NAMA PROGRAM STUDI]",
        "sekolah": "[GANTI DENGAN NAMA SEKOLAH/INSTITUSI]"
    },
    "metadata": {
        "kode": "[GANTI KODE MK]",
        "nama": "[GANTI NAMA MATA KULIAH]",
        "sks": 3,
        "semester": 1,
        "status": "Mata Kuliah Wajib",  # atau "Mata Kuliah Pilihan"
        "prasyarat": "-"
    },
    "koordinator": {
        "koordinator_mk": {
            "nama": "[GANTI NAMA DOSEN]",
            "nppu": "[GANTI NOMOR PEGAWAI]"
        },
        "koordinator_gpm": {
            "nama": "[GANTI NAMA]",
            "nppu": "[GANTI NOMOR PEGAWAI]"
        },
        "ketua_prodi": {
            "nama": "[GANTI NAMA]",
            "nip": "[GANTI NIP]"
        },
        "dekan_sekolah_vokasi": {
            "nama": "[GANTI NAMA]",
            "nip": "[GANTI NIP]"
        }
    },
    "deskripsi_singkat": "[GANTI DENGAN DESKRIPSI SINGKAT 3-5 KALIMAT]",
    "cpl": [
        {
            "kode": "CPL3",
            "pernyataan": "[GANTI DENGAN CAPAIAN PEMBELAJARAN LULUSAN 1]",
            "ik_kode": "IK 3-1",
            "ik_pernyataan": "[GANTI DENGAN INDIKATOR KINERJA]"
        },
        {
            "kode": "CPL4",
            "pernyataan": "[GANTI DENGAN CAPAIAN PEMBELAJARAN LULUSAN 2]",
            "ik_kode": "IK 3-2",
            "ik_pernyataan": "[GANTI DENGAN INDIKATOR KINERJA]"
        },
        {
            "kode": "CPL10",
            "pernyataan": "[GANTI DENGAN CAPAIAN PEMBELAJARAN LULUSAN 3]",
            "ik_kode": "IK 4-1",
            "ik_pernyataan": "[GANTI DENGAN INDIKATOR KINERJA]"
        }
    ],
    "cpmk": [
        {
            "kode": "CPMK 1",
            "pernyataan": "[GANTI DENGAN CAPAIAN PEMBELAJARAN MATA KULIAH 1]",
            "mapping_cpl": "CPL3"
        },
        {
            "kode": "CPMK 2",
            "pernyataan": "[GANTI DENGAN CAPAIAN PEMBELAJARAN MATA KULIAH 2]",
            "mapping_cpl": "CPL4"
        },
        {
            "kode": "CPMK 3",
            "pernyataan": "[GANTI DENGAN CAPAIAN PEMBELAJARAN MATA KULIAH 3]",
            "mapping_cpl": "CPL4"
        },
        {
            "kode": "CPMK 4",
            "pernyataan": "[GANTI DENGAN CAPAIAN PEMBELAJARAN MATA KULIAH 4]",
            "mapping_cpl": "CPL10"
        }
    ],
    "minggu": [
        {
            "minggu": 1,
            "cpmk": "CPMK 1",
            "topik": "[GANTI TOPIK MINGGU 1]",
            "metode": ["TM SCL"],  # atau ["PBL"], ["CBL"], dll
            "waktu": "3x50'",
            "pengalaman": "[GANTI PENGALAMAN BELAJAR]",
            "indikator": "[GANTI INDIKATOR PENCAPAIAN]",
            "bobot": 5
        },
        # ... minggu 2-7
        {
            "minggu": 8,
            "cpmk": "UTS",
            "topik": "Ujian Tengah Semester",
            "metode": ["UTS"],
            "waktu": "3x50'",
            "pengalaman": "Ujian Tengah Semester",
            "indikator": "Ujian Tengah Semester",
            "bobot": 0
        },
        # ... minggu 9-15
        {
            "minggu": 16,
            "cpmk": "UAS",
            "topik": "Ujian Akhir Semester",
            "metode": ["UAS"],
            "waktu": "3x50'",
            "pengalaman": "Ujian Akhir Semester",
            "indikator": "Ujian Akhir Semester",
            "bobot": 0
        }
    ],
    "penilaian": [
        {
            "komponen": "Aktivitas Partisipatif",
            "bobot": "20%",
            "kriteria": "[GANTI KRITERIA]",
            "cpmk1": "5%",
            "cpmk2": "5%",
            "cpmk3": "5%",
            "cpmk4": "5%"
        },
        {
            "komponen": "Project/Problem/Case Based Learning",
            "bobot": "30%",
            "kriteria": "[GANTI KRITERIA]",
            "cpmk1": "",
            "cpmk2": "10%",
            "cpmk3": "10%",
            "cpmk4": "10%"
        },
        {
            "komponen": "Kuis",
            "bobot": "10%",
            "kriteria": "[GANTI KRITERIA]",
            "cpmk1": "5%",
            "cpmk2": "",
            "cpmk3": "",
            "cpmk4": "5%"
        },
        {
            "komponen": "UTS",
            "bobot": "20%",
            "kriteria": "Ujian Tengah Semester",
            "cpmk1": "10%",
            "cpmk2": "10%",
            "cpmk3": "",
            "cpmk4": ""
        },
        {
            "komponen": "UAS",
            "bobot": "20%",
            "kriteria": "Ujian Akhir Semester",
            "cpmk1": "",
            "cpmk2": "",
            "cpmk3": "10%",
            "cpmk4": "10%"
        }
    ],
    "assessment_summary": {
        "total_bobot": "100%",
        "cpmk1_total": "20%",
        "cpmk2_total": "25%",
        "cpmk3_total": "25%",
        "cpmk4_total": "30%"
    },
    "media_assessment": {
        "qui": "10%",
        "prs": "20%",
        "pro": "30%",
        "uts": "20%",
        "uas": "20%"
    },
    "cpl_cpmk_mapping": [
        {
            "cpl": "CPL3",
            "ik": "IK 3-1",
            "ik_pernyataan": "[GANTI INDIKATOR KINERJA]",
            "cpmk": "CPMK 1",
            "cpmk_pernyataan": "[GANTI PERNYATAAN CPMK]",
            "bobot": "20%",
            "media": "[GANTI MEDIA ASESMEN]",
            "qui": "5",
            "prs": "5",
            "pro": "",
            "uts": "10",
            "uas": ""
        },
        {
            "cpl": "CPL4",
            "ik": "IK 3-2",
            "ik_pernyataan": "[GANTI INDIKATOR KINERJA]",
            "cpmk": "CPMK 2",
            "cpmk_pernyataan": "[GANTI PERNYATAAN CPMK]",
            "bobot": "25%",
            "media": "[GANTI MEDIA ASESMEN]",
            "qui": "",
            "prs": "5",
            "pro": "10",
            "uts": "10",
            "uas": ""
        },
        {
            "cpl": "CPL4",
            "ik": "IK 4-1",
            "ik_pernyataan": "[GANTI INDIKATOR KINERJA]",
            "cpmk": "CPMK 3",
            "cpmk_pernyataan": "[GANTI PERNYATAAN CPMK]",
            "bobot": "25%",
            "media": "[GANTI MEDIA ASESMEN]",
            "qui": "",
            "prs": "5",
            "pro": "10",
            "uts": "",
            "uas": "10"
        },
        {
            "cpl": "CPL10",
            "ik": "IK 10-1",
            "ik_pernyataan": "[GANTI INDIKATOR KINERJA]",
            "cpmk": "CPMK 4",
            "cpmk_pernyataan": "[GANTI PERNYATAAN CPMK]",
            "bobot": "30%",
            "media": "[GANTI MEDIA ASESMEN]",
            "qui": "5",
            "prs": "5",
            "pro": "10",
            "uts": "",
            "uas": "10"
        }
    ],
    "referensi": [
        "[GANTI REFERENSI BUKU 1]",
        "[GANTI REFERENSI BUKU 2]",
        "[GANTI REFERENSI BUKU 3]",
        "[GANTI REFERENSI ONLINE 4]",
        "[GANTI REFERENSI JURNAL 5]"
    ],
    "metode_pembelajaran": [
        "TM SCL (Teaching Method with Student Centered Learning)",
        "PBL (Problem Based Learning)",
        "CBL (Case Based Learning)",
        "PjBL (Project Based Learning)",
        "Think-Pair-Share (TPS)",
        "Small Group Discussion",
        "Ceramah",
        "Tugas Mandiri",
        "Kuis"
    ],
    "learning_experience_keywords": [
        "Memahami",
        "Menjelaskan",
        "Menghitung",
        "Menganalisis",
        "Melakukan",
        "Mengerjakan",
        "Mempresentasikan",
        "Mendiskusikan",
        "Membuat laporan",
        "Mengisi formulir",
        "Memproses",
        "Melaporkan",
        "Menyediakan informasi",
        "Memecahkan masalah"
    ]
}

print("\n✅ Template baru siap!")
print("   Struktur lengkap dengan placeholder untuk diisi")

# EXAMPLE 3: Validation
# ====================
print("\n" + "=" * 70)
print("EXAMPLE 3: Validation Checklist")
print("=" * 70)

def validate_rps(rps_data):
    """Simple validation"""
    checks = {
        'metadata': rps_data.get('metadata') is not None,
        'cpl_count': len(rps_data.get('cpl', [])) >= 3,
        'cpmk_count': len(rps_data.get('cpmk', [])) >= 3,
        'minggu_count': len(rps_data.get('minggu', [])) == 16,
        'penilaian_count': len(rps_data.get('penilaian', [])) >= 5,
        'referensi_count': len(rps_data.get('referensi', [])) >= 5,
        'mapping_count': len(rps_data.get('cpl_cpmk_mapping', [])) >= 3,
    }
    return checks

# Validate template
checks = validate_rps(template)
print("\nValidasi Template:")
for check, result in checks.items():
    status = "✅" if result else "❌"
    print(f"  {status} {check}: {result}")

# EXAMPLE 4: Save custom RPS
# ===========================
print("\n" + "=" * 70)
print("EXAMPLE 4: Save Custom RPS")
print("=" * 70)

# Save example
output_file = Path('rps_custom_example.json')
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(custom_rps, f, indent=2, ensure_ascii=False)

print(f"\n✅ Custom RPS saved to: {output_file}")

print("\n" + "=" * 70)
print("SELESAI - Lihat rps_template_data.json untuk template lengkap")
print("=" * 70)
