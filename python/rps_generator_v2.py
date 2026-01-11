#!/usr/bin/env python3
"""
RPS Generator dengan OpenAI Integration - Fixed Version
=========================================================
- Fix: Preserve font size, name, and all formatting
- Fix: Complete content generation with all required fields
- Feature: HTTP API for website integration
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Optional
from copy import deepcopy

# Try to import OpenAI bot
try:
    from openai_bot import OpenAIBot
except ImportError:
    OpenAIBot = None


def get_rps_generation_prompt(course_name: str, course_code: str, sks: int, semester: int, 
                               status: str = "Mata Kuliah Wajib", prereq: str = "-") -> str:
    """Generate prompt untuk OpenAI untuk membuat konten RPS lengkap."""
    
    return f"""Anda adalah ahli kurikulum pendidikan tinggi Indonesia. Buatkan Rencana Pembelajaran Semester (RPS) lengkap untuk mata kuliah berikut:

## Informasi Mata Kuliah:
- Nama: {course_name}
- Kode: {course_code}
- SKS: {sks}
- Semester: {semester}
- Status: {status}
- Prasyarat: {prereq}

## Instruksi:
Buatkan RPS dalam format JSON dengan struktur PERSIS seperti berikut. PENTING: Hanya output JSON murni tanpa markdown code block.

{{
    "deskripsi": "Deskripsi mata kuliah 3-5 kalimat yang menjelaskan tujuan, cakupan, dan manfaat mata kuliah ini bagi mahasiswa",
    
    "cpl": [
        {{"kode": "CPL3", "pernyataan": "Capaian Pembelajaran Lulusan yang relevan dengan mata kuliah"}},
        {{"kode": "CPL4", "pernyataan": "Capaian Pembelajaran Lulusan yang relevan dengan mata kuliah"}},
        {{"kode": "CPL10", "pernyataan": "Capaian Pembelajaran Lulusan yang relevan dengan mata kuliah"}}
    ],
    
    "cpmk": [
        {{"kode": "CPMK 1", "pernyataan": "Capaian Pembelajaran Mata Kuliah ke-1 yang spesifik dan terukur", "mapping_cpl": "CPL3"}},
        {{"kode": "CPMK 2", "pernyataan": "Capaian Pembelajaran Mata Kuliah ke-2 yang spesifik dan terukur", "mapping_cpl": "CPL4"}},
        {{"kode": "CPMK 3", "pernyataan": "Capaian Pembelajaran Mata Kuliah ke-3 yang spesifik dan terukur", "mapping_cpl": "CPL4"}},
        {{"kode": "CPMK 4", "pernyataan": "Capaian Pembelajaran Mata Kuliah ke-4 yang spesifik dan terukur", "mapping_cpl": "CPL10"}}
    ],
    
    "minggu": [
        {{"minggu": 1, "cpmk": "CPMK 1", "topik": "Topik minggu 1", "metode": "TM SCL / Demo", "waktu": "3x50'", "pengalaman": "Pengalaman belajar", "indikator": "Indikator pencapaian", "bobot": "5"}},
        {{"minggu": 2, "cpmk": "CPMK 1", "topik": "Topik minggu 2", "metode": "Hands-on", "waktu": "3x50'", "pengalaman": "Pengalaman belajar", "indikator": "Indikator pencapaian", "bobot": "5"}},
        {{"minggu": 3, "cpmk": "CPMK 2", "topik": "Topik minggu 3", "metode": "Hands-on / Demo", "waktu": "3x50'", "pengalaman": "Pengalaman belajar", "indikator": "Indikator pencapaian", "bobot": "5"}},
        {{"minggu": 4, "cpmk": "CPMK 2", "topik": "Topik minggu 4", "metode": "PBL", "waktu": "3x50'", "pengalaman": "Pengalaman belajar", "indikator": "Indikator pencapaian", "bobot": "5"}},
        {{"minggu": 5, "cpmk": "CPMK 2", "topik": "Topik minggu 5", "metode": "PBL / Demo", "waktu": "3x50'", "pengalaman": "Pengalaman belajar", "indikator": "Indikator pencapaian", "bobot": "10"}},
        {{"minggu": 6, "cpmk": "CPMK 3", "topik": "Topik minggu 6", "metode": "Hands-on", "waktu": "3x50'", "pengalaman": "Pengalaman belajar", "indikator": "Indikator pencapaian", "bobot": "5"}},
        {{"minggu": 7, "cpmk": "CPMK 3", "topik": "Topik minggu 7", "metode": "Hands-on / Studi Kasus", "waktu": "3x50'", "pengalaman": "Pengalaman belajar", "indikator": "Indikator pencapaian", "bobot": "10"}},
        {{"minggu": 8, "cpmk": "UTS", "topik": "Ujian Tengah Semester: evaluasi materi minggu 1-7", "metode": "Uji praktik / Tertulis", "waktu": "3x50'", "pengalaman": "Mengerjakan soal ujian", "indikator": "Fungsi sesuai spesifikasi", "bobot": "15"}},
        {{"minggu": 9, "cpmk": "CPMK 2", "topik": "Topik minggu 9", "metode": "Hands-on", "waktu": "3x50'", "pengalaman": "Pengalaman belajar", "indikator": "Indikator pencapaian", "bobot": "5"}},
        {{"minggu": 10, "cpmk": "CPMK 3", "topik": "Topik minggu 10", "metode": "Hands-on", "waktu": "3x50'", "pengalaman": "Pengalaman belajar", "indikator": "Indikator pencapaian", "bobot": "10"}},
        {{"minggu": 11, "cpmk": "CPMK 2", "topik": "Topik minggu 11", "metode": "Hands-on / Tugas", "waktu": "3x50'", "pengalaman": "Pengalaman belajar", "indikator": "Indikator pencapaian", "bobot": "5"}},
        {{"minggu": 12, "cpmk": "CPMK 1", "topik": "Topik minggu 12", "metode": "Demo / Hands-on", "waktu": "3x50'", "pengalaman": "Pengalaman belajar", "indikator": "Indikator pencapaian", "bobot": "5"}},
        {{"minggu": 13, "cpmk": "CPMK 4", "topik": "Proyek: perencanaan dan desain", "metode": "PjBL", "waktu": "3x50'", "pengalaman": "Menyusun proposal proyek", "indikator": "Proposal feasible", "bobot": "5"}},
        {{"minggu": 14, "cpmk": "CPMK 4", "topik": "Proyek: implementasi", "metode": "PjBL", "waktu": "3x50'", "pengalaman": "Build dan integrasi", "indikator": "Milestone tercapai", "bobot": "5"}},
        {{"minggu": 15, "cpmk": "CPMK 4", "topik": "Proyek: pengujian dan dokumentasi", "metode": "PjBL", "waktu": "3x50'", "pengalaman": "Menyusun laporan", "indikator": "Laporan lengkap", "bobot": "5"}},
        {{"minggu": 16, "cpmk": "UAS", "topik": "Ujian Akhir Semester: demo proyek dan evaluasi keseluruhan", "metode": "Demo / Presentasi", "waktu": "3x50'", "pengalaman": "Demo proyek dan Q&A", "indikator": "Sistem bekerja, argumentasi baik", "bobot": "15"}}
    ],
    
    "penilaian": [
        {{"komponen": "Aktivitas Partisipatif", "bobot": "10%", "kriteria": "Kehadiran, partisipasi aktif, disiplin, dan kontribusi dalam diskusi", "cpmk1": "2%", "cpmk2": "2%", "cpmk3": "3%", "cpmk4": "3%"}},
        {{"komponen": "Tugas/Laporan", "bobot": "30%", "kriteria": "Kualitas laporan, ketepatan waktu, pemahaman analisis, dan dokumentasi", "cpmk1": "10%", "cpmk2": "10%", "cpmk3": "10%", "cpmk4": ""}},
        {{"komponen": "UTS", "bobot": "15%", "kriteria": "Pemahaman materi setengah semester pertama", "cpmk1": "5%", "cpmk2": "5%", "cpmk3": "5%", "cpmk4": ""}},
        {{"komponen": "Proyek", "bobot": "30%", "kriteria": "Kualitas prototipe, implementasi, integrasi, kerja tim, dan demonstrasi", "cpmk1": "", "cpmk2": "10%", "cpmk3": "10%", "cpmk4": "10%"}},
        {{"komponen": "UAS", "bobot": "15%", "kriteria": "Pemahaman materi keseluruhan dan presentasi proyek akhir", "cpmk1": "", "cpmk2": "", "cpmk3": "5%", "cpmk4": "10%"}}
    ],
    
    "referensi": [
        "Buku referensi utama 1 dengan penulis dan penerbit",
        "Buku referensi utama 2 dengan penulis dan penerbit",
        "Buku referensi pendukung 3",
        "Dokumentasi atau sumber online relevan",
        "Jurnal atau publikasi terkait"
    ],
    
    "cpl_cpmk_mapping": [
        {{"cpl": "CPL3", "ik": "IK 3-1", "ik_pernyataan": "Indikator kinerja untuk CPL3", "cpmk": "CPMK 1", "cpmk_pernyataan": "Pernyataan CPMK 1", "bobot": "20%", "media": "Kuis, Laporan, UTS", "kuis": "5", "prs": "5", "pro": "", "uts": "10", "uas": ""}},
        {{"cpl": "", "ik": "IK 3-2", "ik_pernyataan": "Indikator kinerja untuk CPL3", "cpmk": "CPMK 2", "cpmk_pernyataan": "Pernyataan CPMK 2", "bobot": "25%", "media": "Tugas, Laporan, UTS", "kuis": "", "prs": "5", "pro": "10", "uts": "10", "uas": ""}},
        {{"cpl": "CPL4", "ik": "IK 4-1", "ik_pernyataan": "Indikator kinerja untuk CPL4", "cpmk": "CPMK 3", "cpmk_pernyataan": "Pernyataan CPMK 3", "bobot": "25%", "media": "Laporan, Proyek", "kuis": "", "prs": "", "pro": "15", "uts": "", "uas": "10"}},
        {{"cpl": "CPL10", "ik": "IK 10-1", "ik_pernyataan": "Indikator kinerja untuk CPL10", "cpmk": "CPMK 4", "cpmk_pernyataan": "Pernyataan CPMK 4", "bobot": "30%", "media": "Partisipasi, Proyek, UAS", "kuis": "", "prs": "5", "pro": "", "uts": "", "uas": "15"}}
    ]
}}

## Catatan Penting:
1. Minggu 8 = UTS, Minggu 16 = UAS
2. Total bobot penilaian = 100%
3. Setiap CPMK memetakan ke CPL
4. Konten harus relevan dengan "{course_name}"
5. Gunakan bahasa Indonesia yang baik dan akademis
6. Pastikan semua 16 minggu terisi lengkap
7. Berikan referensi buku yang nyata dan relevan

Output JSON saja, tanpa markdown formatting atau penjelasan."""


def parse_json_response(response: str) -> dict:
    """Parse JSON dari response OpenAI, handle markdown code blocks."""
    text = response.strip()
    
    # Handle ```json ... ``` format
    if text.startswith("```"):
        lines = text.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines)
    
    return json.loads(text)


def generate_rps_content(bot, course_name: str, course_code: str, 
                         sks: int, semester: int, status: str, prereq: str) -> dict:
    """Generate konten RPS menggunakan OpenAI."""
    
    prompt = get_rps_generation_prompt(course_name, course_code, sks, semester, status, prereq)
    
    print(f"\n📝 Generating RPS content for: {course_name}")
    print("=" * 60)
    
    response = bot.send_message(prompt)
    
    if not response:
        raise Exception("Empty response from OpenAI")
    
    rps_data = parse_json_response(response)
    
    print("✅ RPS content generated successfully!")
    return rps_data


def _set_cell_text_preserve_format(cell, text: str) -> None:
    """Replace cell text while FULLY preserving formatting (font size, name, bold, etc.)."""
    from docx.shared import Pt
    
    text = str(text) if text is not None else ""
    
    if not cell.paragraphs:
        cell.text = text
        return
    
    # Get the first paragraph
    first_paragraph = cell.paragraphs[0]
    runs = list(first_paragraph.runs)
    
    if not runs:
        # No runs exist, add new run with text
        first_paragraph.add_run(text)
    else:
        # Save formatting from first run
        first_run = runs[0]
        saved_font_size = first_run.font.size
        saved_font_name = first_run.font.name
        saved_bold = first_run.font.bold
        saved_italic = first_run.font.italic
        saved_underline = first_run.font.underline
        
        # Set text
        first_run.text = text
        
        # Restore formatting
        if saved_font_size:
            first_run.font.size = saved_font_size
        if saved_font_name:
            first_run.font.name = saved_font_name
        if saved_bold is not None:
            first_run.font.bold = saved_bold
        if saved_italic is not None:
            first_run.font.italic = saved_italic
        if saved_underline is not None:
            first_run.font.underline = saved_underline
        
        # Clear other runs
        for run in runs[1:]:
            run.text = ""
    
    # Clear additional paragraphs
    for paragraph in cell.paragraphs[1:]:
        for run in paragraph.runs:
            run.text = ""


def fill_docx_with_rps(template_path: str, output_path: str, rps_data: dict, meta: dict) -> None:
    """Fill template DOCX dengan data RPS yang di-generate, preserving ALL formatting."""
    
    try:
        from docx import Document
    except ImportError:
        raise RuntimeError("Missing dependency 'python-docx'. Install with: pip install python-docx")
    
    doc = Document(template_path)
    
    if len(doc.tables) < 6:
        raise ValueError("Template structure unexpected: expected at least 6 tables")
    
    # Use the improved function
    set_cell = _set_cell_text_preserve_format
    
    # TABLE 1: course identity (index 1)
    t1 = doc.tables[1]
    set_cell(t1.cell(1, 0), meta["kode"])
    set_cell(t1.cell(1, 1), meta["nama"])
    set_cell(t1.cell(1, 2), meta["nama"])
    set_cell(t1.cell(1, 3), str(meta["sks"]))
    set_cell(t1.cell(1, 4), str(meta["semester"]))
    set_cell(t1.cell(1, 5), meta["status"])
    set_cell(t1.cell(1, 6), meta["prasyarat"])
    
    # Row 3: description
    deskripsi = rps_data.get("deskripsi", "")
    for c in range(1, 7):
        set_cell(t1.cell(3, c), deskripsi)
    
    # Row 4-6: CPL
    cpl_list = rps_data.get("cpl", [])
    for i, cpl in enumerate(cpl_list[:3]):
        row_idx = 4 + i
        set_cell(t1.cell(row_idx, 1), cpl.get("kode", f"CPL{i+1}"))
        for c in range(2, 7):
            set_cell(t1.cell(row_idx, c), cpl.get("pernyataan", ""))
    
    # TABLE 2: CPMK (index 2)
    t2 = doc.tables[2]
    set_cell(t2.cell(0, 1), "Setelah menyelesaikan mata kuliah ini, mahasiswa diharapkan mampu:")
    set_cell(t2.cell(0, 2), "Setelah menyelesaikan mata kuliah ini, mahasiswa diharapkan mampu:")
    
    cpmk_list = rps_data.get("cpmk", [])
    cpmk_dict = {c.get("kode", ""): c.get("pernyataan", "") for c in cpmk_list}
    
    for i, cpmk in enumerate(cpmk_list[:4]):
        row_idx = 1 + i
        set_cell(t2.cell(row_idx, 1), cpmk.get("kode", f"CPMK {i+1}"))
        set_cell(t2.cell(row_idx, 2), cpmk.get("pernyataan", ""))
    
    # TABLE 3: weekly plan (index 3)
    t3 = doc.tables[3]
    minggu_list = rps_data.get("minggu", [])
    
    for i, week_data in enumerate(minggu_list[:16]):
        row_idx = 4 + i  # Rows 4-19 are weeks 1-16
        week_no = str(week_data.get("minggu", i + 1))
        cpmk_code = week_data.get("cpmk", "")
        topik = week_data.get("topik", "")
        metode = week_data.get("metode", "")
        waktu = week_data.get("waktu", "3x50'")
        pengalaman = week_data.get("pengalaman", "")
        indikator = week_data.get("indikator", "")
        bobot = str(week_data.get("bobot", ""))
        
        # Check if it's UTS or UAS (merged row)
        if cpmk_code in ("UTS", "UAS"):
            set_cell(t3.cell(row_idx, 0), week_no)
            merged_text = f"{cpmk_code}\n{topik}\nBobot: {bobot}%"
            set_cell(t3.cell(row_idx, 1), merged_text)
        else:
            kemampuan = f"{cpmk_code}:\n{cpmk_dict.get(cpmk_code, '')}"
            set_cell(t3.cell(row_idx, 0), week_no)
            set_cell(t3.cell(row_idx, 1), kemampuan)
            set_cell(t3.cell(row_idx, 2), topik)
            for c in range(3, 7):
                set_cell(t3.cell(row_idx, c), metode)
            set_cell(t3.cell(row_idx, 7), waktu)
            set_cell(t3.cell(row_idx, 8), pengalaman)
            set_cell(t3.cell(row_idx, 9), indikator)
            set_cell(t3.cell(row_idx, 10), bobot)
    
    # Row 20: references
    referensi_list = rps_data.get("referensi", [])
    referensi_text = "\n".join(referensi_list)
    for c in range(0, 11):
        set_cell(t3.cell(20, c), referensi_text)
    
    # TABLE 4: assessment (index 4)
    t4 = doc.tables[4]
    penilaian_list = rps_data.get("penilaian", [])
    
    for i, penilaian in enumerate(penilaian_list[:5]):
        row_idx = 2 + i
        if row_idx < len(t4.rows):
            set_cell(t4.cell(row_idx, 1), penilaian.get("komponen", ""))
            set_cell(t4.cell(row_idx, 2), penilaian.get("bobot", ""))
            set_cell(t4.cell(row_idx, 3), penilaian.get("kriteria", ""))
            # CPMK distribution columns
            if len(t4.rows[row_idx].cells) >= 8:
                set_cell(t4.cell(row_idx, 4), penilaian.get("cpmk1", ""))
                set_cell(t4.cell(row_idx, 5), penilaian.get("cpmk2", ""))
                set_cell(t4.cell(row_idx, 6), penilaian.get("cpmk3", ""))
                set_cell(t4.cell(row_idx, 7), penilaian.get("cpmk4", ""))
    
    # TABLE 5: CPL-CPMK mapping (index 5)
    t5 = doc.tables[5]
    mapping_list = rps_data.get("cpl_cpmk_mapping", [])
    
    # If no explicit mapping, create from cpmk list
    if not mapping_list:
        for i, cpmk in enumerate(cpmk_list[:4]):
            cpl_code = cpmk.get("mapping_cpl", "")
            cpl_stmt = ""
            for cpl in cpl_list:
                if cpl.get("kode") == cpl_code:
                    cpl_stmt = cpl.get("pernyataan", "")
                    break
            
            mapping_list.append({
                "cpl": cpl_code if i == 0 or cpmk.get("mapping_cpl") != cpmk_list[i-1].get("mapping_cpl") else "",
                "ik": f"IK {cpl_code.replace('CPL', '')}-1",
                "ik_pernyataan": cpl_stmt,
                "cpmk": cpmk.get("kode", ""),
                "cpmk_pernyataan": cpmk.get("pernyataan", ""),
                "bobot": "25%",
                "media": "Laporan, Tugas",
            })
    
    for i, mapping in enumerate(mapping_list[:4]):
        row_idx = 2 + i
        if row_idx < len(t5.rows):
            set_cell(t5.cell(row_idx, 0), mapping.get("cpl", ""))
            set_cell(t5.cell(row_idx, 1), mapping.get("ik", ""))
            set_cell(t5.cell(row_idx, 2), mapping.get("ik_pernyataan", ""))
            set_cell(t5.cell(row_idx, 3), mapping.get("cpmk", ""))
            set_cell(t5.cell(row_idx, 4), mapping.get("cpmk_pernyataan", ""))
            if len(t5.rows[row_idx].cells) >= 12:
                set_cell(t5.cell(row_idx, 5), mapping.get("bobot", ""))
                set_cell(t5.cell(row_idx, 6), mapping.get("media", ""))
                set_cell(t5.cell(row_idx, 7), mapping.get("kuis", ""))
                set_cell(t5.cell(row_idx, 8), mapping.get("prs", ""))
                set_cell(t5.cell(row_idx, 9), mapping.get("pro", ""))
                set_cell(t5.cell(row_idx, 10), mapping.get("uts", ""))
                set_cell(t5.cell(row_idx, 11), mapping.get("uas", ""))
    
    doc.save(output_path)
    print(f"✅ DOCX saved to: {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Generate RPS using OpenAI and fill DOCX template")
    parser.add_argument("--course", default="Praktikum Mekatronika dan Robotika", help="Course name")
    parser.add_argument("--code", default="MK001", help="Course code")
    parser.add_argument("--sks", type=int, default=2, help="SKS")
    parser.add_argument("--semester", type=int, default=4, help="Semester")
    parser.add_argument("--status", default="Mata Kuliah Wajib", help="Course status")
    parser.add_argument("--prereq", default="Dasar Elektronika & Pemrograman", help="Prerequisites")
    parser.add_argument("--template", default="RPS.docx", help="Template DOCX path")
    parser.add_argument("--output", default="RPS_generated.docx", help="Output DOCX path")
    parser.add_argument("--save-json", default="rps_content.json", help="Save generated content to JSON")
    parser.add_argument("--from-json", help="Load RPS content from JSON file instead of generating")
    
    args = parser.parse_args()
    
    print("🚀 RPS Generator with OpenAI GPT-5 Mini")
    print("=" * 60)
    
    # Check template exists
    template_path = Path(args.template)
    if not template_path.exists():
        print(f"❌ Template not found: {template_path}")
        sys.exit(1)
    
    meta = {
        "nama": args.course,
        "kode": args.code,
        "sks": args.sks,
        "semester": args.semester,
        "status": args.status,
        "prasyarat": args.prereq,
    }
    
    # Load from JSON or generate
    if args.from_json:
        print(f"📄 Loading RPS from: {args.from_json}")
        with open(args.from_json, 'r', encoding='utf-8') as f:
            rps_data = json.load(f)
    else:
        # Initialize OpenAI bot
        if OpenAIBot is None:
            print("❌ OpenAI bot not available")
            sys.exit(1)
        
        bot = OpenAIBot()
        
        if not bot.setup_driver():
            print("❌ Failed to setup OpenAI client")
            sys.exit(1)
        
        if not bot.open_openai():
            print("❌ Failed to initialize OpenAI connection")
            sys.exit(1)
        
        try:
            rps_data = generate_rps_content(
                bot=bot,
                course_name=args.course,
                course_code=args.code,
                sks=args.sks,
                semester=args.semester,
                status=args.status,
                prereq=args.prereq
            )
            
            # Save JSON
            if args.save_json:
                with open(args.save_json, 'w', encoding='utf-8') as f:
                    json.dump(rps_data, f, ensure_ascii=False, indent=2)
                print(f"📄 JSON saved to: {args.save_json}")
            
        finally:
            bot.close()
    
    # Print summary
    print("\n📋 Content Summary:")
    print(f"   - CPL: {len(rps_data.get('cpl', []))} items")
    print(f"   - CPMK: {len(rps_data.get('cpmk', []))} items")
    print(f"   - Minggu: {len(rps_data.get('minggu', []))} weeks")
    print(f"   - Penilaian: {len(rps_data.get('penilaian', []))} components")
    print(f"   - Referensi: {len(rps_data.get('referensi', []))} items")
    
    # Fill DOCX template
    fill_docx_with_rps(
        template_path=str(template_path),
        output_path=args.output,
        rps_data=rps_data,
        meta=meta
    )
    
    print("\n✅ RPS Generation Complete!")
    print(f"   Output: {args.output}")


if __name__ == "__main__":
    main()
