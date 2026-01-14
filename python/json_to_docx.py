#!/usr/bin/env python3
"""
JSON to DOCX Exporter
====================
Convert RPS JSON data to formatted DOCX document.
Handles template filling and format preservation.
"""

import json
from pathlib import Path
from typing import Optional


def _set_cell_text_preserve_format(cell, text: str) -> None:
    """Replace cell text while FULLY preserving formatting (font size, name, bold, etc.)."""
    from docx.shared import Pt
    
    text = str(text) if text is not None else ""
    
    if not cell.paragraphs:
        cell.text = text
        return
    
    # Find the first paragraph with runs to preserve formatting from
    target_paragraph = None
    target_run = None
    
    for para in cell.paragraphs:
        if para.runs:
            target_paragraph = para
            target_run = para.runs[0]
            break
    
    # If no run found anywhere, use first paragraph
    if not target_paragraph:
        target_paragraph = cell.paragraphs[0]
    
    # Save formatting from target run
    if target_run:
        saved_font_size = target_run.font.size or Pt(9)  # Default to 9pt
        saved_font_name = target_run.font.name
        saved_bold = target_run.font.bold
        saved_italic = target_run.font.italic
        saved_underline = target_run.font.underline
    else:
        saved_font_size = Pt(9)  # Default to 9pt
        saved_font_name = None
        saved_bold = None
        saved_italic = None
        saved_underline = None
    
    # Clear all paragraphs except target
    for para in cell.paragraphs:
        if para != target_paragraph:
            for run in para.runs:
                run.text = ""
    
    # Clear all runs in target paragraph
    for run in target_paragraph.runs:
        run.text = ""
    
    # Handle multiline text - split and create runs for each line
    lines = text.split('\n')
    
    for line_idx, line in enumerate(lines):
        if line_idx == 0:
            # Use existing run for first line
            if not target_paragraph.runs:
                run = target_paragraph.add_run(line)
            else:
                run = target_paragraph.runs[0]
                run.text = line
        else:
            # Add line break and new run for subsequent lines
            target_paragraph.add_run('\n')
            run = target_paragraph.add_run(line)
        
        # Apply formatting to this run
        run.font.size = saved_font_size
        if saved_font_name:
            run.font.name = saved_font_name
        if saved_bold is not None:
            run.font.bold = saved_bold
        if saved_italic is not None:
            run.font.italic = saved_italic
        if saved_underline is not None:
            run.font.underline = saved_underline


class JSONToDocx:
    """Convert RPS JSON to DOCX document."""
    
    def __init__(self, template_path: Optional[str] = None):
        """
        Initialize JSON to DOCX converter.
        
        Args:
            template_path: Path to template DOCX. If None, looks for RPS.docx in same directory.
        """
        if template_path:
            self.template_path = Path(template_path)
        else:
            # Default: look for RPS.docx in same directory as this script
            script_dir = Path(__file__).parent
            self.template_path = script_dir / 'RPS.docx'
    
    def validate_template(self) -> bool:
        """Check if template exists."""
        if not self.template_path.exists():
            print(f"[ERROR] Template not found: {self.template_path}")
            return False
        print(f"[OK] Template found: {self.template_path}")
        return True
    
    def export_to_docx(self, rps_data: dict, meta: dict, output_path: str) -> bool:
        """
        Export RPS JSON data to DOCX file.
        
        Args:
            rps_data: Dictionary containing RPS data (deskripsi, cpl, cpmk, minggu, etc.)
            meta: Dictionary with course metadata (nama, kode, sks, semester, status, prasyarat)
            output_path: Path where to save the output DOCX
            
        Returns:
            True if successful, False otherwise
        """
        try:
            from docx import Document
        except ImportError:
            print(f"[ERROR] Missing dependency 'python-docx'. Install with: pip install python-docx")
            return False
        
        if not self.validate_template():
            return False
        
        print(f"\n[CONVERT] Converting JSON to DOCX...")
        print(f"   Template: {self.template_path}")
        print(f"   Output: {output_path}")
        
        try:
            doc = Document(str(self.template_path))
            
            if len(doc.tables) < 6:
                raise ValueError("Template structure unexpected: expected at least 6 tables")
            
            # Use the formatting-preserving function
            set_cell = _set_cell_text_preserve_format
            
            # TABLE 1: course identity (index 1) + Authority row
            t1 = doc.tables[1]
            set_cell(t1.cell(1, 0), meta["kode"])
            set_cell(t1.cell(1, 1), meta["nama"])
            set_cell(t1.cell(1, 2), meta["nama"])
            set_cell(t1.cell(1, 3), str(meta["sks"]))
            set_cell(t1.cell(1, 4), str(meta["semester"]))
            set_cell(t1.cell(1, 5), meta["status"])
            set_cell(t1.cell(1, 6), meta["prasyarat"])
            
            # Row 2: Authority/Otoritas (Koordinator MK, Koordinator GPM, Ketua Prodi, Dekan)
            if len(t1.rows) > 2:
                auth_row = t1.rows[2]
                
                # Debug: Log table structure
                print(f"📊 Table 1 structure:")
                print(f"   - Total rows: {len(t1.rows)}")
                print(f"   - Auth row (row 2) cells: {len(auth_row.cells)}")
                
                # Debug: Log received authority data
                print(f"📝 Authority data received:")
                print(f"   - Meta keys: {list(meta.keys())}")
                print(f"   - koordinatorMK: {meta.get('koordinatorMK')}")
                print(f"   - koordinatorGPM: {meta.get('koordinatorGPM')}")
                print(f"   - ketuaProdi: {meta.get('ketuaProdi')}")
                print(f"   - dekan: {meta.get('dekan')}")
                
                # Column structure based on template analysis: 0=Otoritas, 1=KoordinatorMK, 3=KoordinatorGPM, 5=KetuaProdi, 6=Dekan
                if 'koordinatorMK' in meta and len(auth_row.cells) > 1:
                    mk = meta['koordinatorMK']
                    mk_nama = mk.get('nama', '') if isinstance(mk, dict) else ''
                    mk_nip = mk.get('nip', '') if isinstance(mk, dict) else ''
                    mk_jabatan = mk.get('jabatan', 'Koordinator Mata Kuliah') if isinstance(mk, dict) else 'Koordinator Mata Kuliah'
                    # Fill column 1 for Koordinator MK - match template format with line breaks
                    set_cell(auth_row.cells[1], f"{mk_jabatan}\n\n\n\n\n{mk_nama}\nNIP. {mk_nip}")
                    print(f"   ✅ Koordinator MK filled: {mk_nama}")
                
                if 'koordinatorGPM' in meta and len(auth_row.cells) > 3:
                    gpm = meta['koordinatorGPM']
                    gpm_nama = gpm.get('nama', '') if isinstance(gpm, dict) else ''
                    gpm_nip = gpm.get('nip', '') if isinstance(gpm, dict) else ''
                    gpm_jabatan = gpm.get('jabatan', 'Koordinator GPM') if isinstance(gpm, dict) else 'Koordinator GPM'
                    # Fill column 3 for Koordinator GPM - match template format with line breaks
                    set_cell(auth_row.cells[3], f"{gpm_jabatan}\n\n\n\n\n{gpm_nama}\nNIP. {gpm_nip}")
                    print(f"   ✅ Koordinator GPM filled: {gpm_nama}")
                
                if 'ketuaProdi' in meta and len(auth_row.cells) > 5:
                    prodi = meta['ketuaProdi']
                    prodi_nama = prodi.get('nama', '') if isinstance(prodi, dict) else ''
                    prodi_nip = prodi.get('nip', '') if isinstance(prodi, dict) else ''
                    prodi_jabatan = prodi.get('jabatan', 'Ketua Prodi') if isinstance(prodi, dict) else 'Ketua Prodi'
                    # Fill column 5 for Ketua Prodi - match template format with line breaks
                    set_cell(auth_row.cells[5], f"{prodi_jabatan}\n\n\n\n\n{prodi_nama}\nNIP. {prodi_nip}")
                    print(f"   ✅ Ketua Prodi filled: {prodi_nama}")
                
                if 'dekan' in meta and len(auth_row.cells) > 6:
                    dekan = meta['dekan']
                    dekan_nama = dekan.get('nama', '') if isinstance(dekan, dict) else ''
                    dekan_nip = dekan.get('nip', '') if isinstance(dekan, dict) else ''
                    dekan_jabatan = dekan.get('jabatan', 'Dekan Sekolah Vokasi') if isinstance(dekan, dict) else 'Dekan Sekolah Vokasi'
                    # Fill column 6 for Dekan - match template format with line breaks
                    set_cell(auth_row.cells[6], f"{dekan_jabatan}\n\n\n\n\n{dekan_nama}\nNIP. {dekan_nip}")
                    print(f"   ✅ Dekan filled: {dekan_nama}")
            
            # Row 3: description (deskripsiSingkat)
            deskripsi = rps_data.get("deskripsiSingkat") or rps_data.get("deskripsi", "")
            for c in range(1, 7):
                set_cell(t1.cell(3, c), deskripsi)
            
            # Row 4-6: CPL
            cpl_list = rps_data.get("cplList", []) or rps_data.get("cpl", [])
            for i, cpl in enumerate(cpl_list[:3]):
                row_idx = 4 + i
                set_cell(t1.cell(row_idx, 1), cpl.get("kode", f"CPL{i+1}"))
                for c in range(2, 7):
                    set_cell(t1.cell(row_idx, c), cpl.get("pernyataan", ""))
            
            # TABLE 2: CPMK (index 2)
            t2 = doc.tables[2]
            set_cell(t2.cell(0, 1), "Setelah menyelesaikan mata kuliah ini, mahasiswa diharapkan mampu:")
            set_cell(t2.cell(0, 2), "Setelah menyelesaikan mata kuliah ini, mahasiswa diharapkan mampu:")
            
            cpmk_list = rps_data.get("cpmkList", []) or rps_data.get("cpmk", [])
            cpmk_dict = {c.get("kode", ""): c.get("pernyataan", "") for c in cpmk_list}
            
            for i, cpmk in enumerate(cpmk_list[:4]):
                row_idx = 1 + i
                set_cell(t2.cell(row_idx, 1), cpmk.get("kode", f"CPMK {i+1}"))
                set_cell(t2.cell(row_idx, 2), cpmk.get("pernyataan", ""))
            
            # TABLE 3: weekly plan (index 3) - Rencana Pembelajaran Mingguan
            t3 = doc.tables[3]
            minggu_list = rps_data.get("minggu", []) or rps_data.get("weeklyPlan", [])
            
            print(f"📊 TABLE 3 - Weekly Plan:")
            print(f"   - Total weeks: {len(minggu_list)}")
            print(f"   - Table rows: {len(t3.rows)}")
            
            for i, week_data in enumerate(minggu_list[:16]):
                row_idx = 4 + i  # Rows 4-19 are weeks 1-16
                
                # Handle both old flat format and new nested format
                week_no = str(week_data.get("minggu") or week_data.get("mingguKe", i + 1))
                cpmk_code = week_data.get("cpmk") or week_data.get("kemampuanAkhir", "")
                topik = week_data.get("topik") or week_data.get("bahanKajian", "")
                
                # Extract metodePembelajaran - can be nested object or flat fields
                metode_obj = week_data.get("metodePembelajaran", {})
                if isinstance(metode_obj, dict) and metode_obj:  # Check if it's a non-empty dict
                    metode = metode_obj.get("metode", "")
                    deskripsi = metode_obj.get("deskripsi", "")
                    aktivitas = metode_obj.get("aktivitas", "")
                else:
                    # Fallback to flat structure
                    metode = week_data.get("metode", "")
                    deskripsi = week_data.get("deskripsi_metode", "")
                    aktivitas = week_data.get("aktivitas", "")
                
                waktu = week_data.get("waktu", "3x50'")
                pengalaman = week_data.get("pengalaman") or week_data.get("pengalamanBelajar", "")
                
                # Extract penilaian - can be nested object or flat fields
                penilaian_obj = week_data.get("penilaian", {})
                if isinstance(penilaian_obj, dict) and penilaian_obj:  # Check if it's a non-empty dict
                    indikator = penilaian_obj.get("kriteria", "")
                    bobot = str(penilaian_obj.get("bobot", ""))
                else:
                    # Fallback to flat structure
                    indikator = week_data.get("indikator", "")
                    bobot = str(week_data.get("bobot", ""))
                
                print(f"   - Week {week_no}: {cpmk_code} | Metode:{metode} | Kriteria:{indikator[:30] if indikator else 'KOSONG'}")
                
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
                    
                    # Fill metode pembelajaran - columns 3-6 are merged into one cell in the template
                    # Combine all method info into this single merged cell
                    metode_text = f"{metode}"
                    if deskripsi:
                        metode_text += f"\n\n{deskripsi}"
                    if aktivitas:
                        metode_text += f"\n\nAktivitas:\n{aktivitas}"
                    
                    set_cell(t3.cell(row_idx, 3), metode_text)
                    
                    # Column 7: Waktu (total learning time)
                    set_cell(t3.cell(row_idx, 7), waktu)
                    # Column 8: Pengalaman Belajar
                    set_cell(t3.cell(row_idx, 8), pengalaman)
                    # Column 9: Kriteria & Indikator (PENTING!)
                    set_cell(t3.cell(row_idx, 9), indikator)
                    # Column 10: Bobot
                    set_cell(t3.cell(row_idx, 10), bobot)
                    
                    if indikator:
                        print(f"     ✅ Kriteria filled: {indikator[:50]}")
                    else:
                        print(f"     ⚠️ Kriteria KOSONG untuk minggu {week_no}")
            
            # Row 20: references - fix field name and format references properly with numbering
            references_list = rps_data.get("references", [])
            if references_list:
                # Convert array of objects to formatted strings with numbering
                formatted_refs = []
                for i, ref in enumerate(references_list, 1):
                    if isinstance(ref, dict):
                        # Use judul field from reference object
                        judul = ref.get("judul", "")
                        if judul:
                            formatted_refs.append(f"[{i}] {judul}")
                    elif isinstance(ref, str):
                        # Handle if it's already a string
                        formatted_refs.append(f"[{i}] {ref}")
                referensi_text = "\n".join(formatted_refs)
            else:
                # Fallback: try old field name for compatibility
                referensi_list = rps_data.get("referensi", [])
                if referensi_list:
                    numbered_refs = [f"[{i}] {ref}" for i, ref in enumerate(referensi_list, 1)]
                    referensi_text = "\n".join(numbered_refs)
                else:
                    referensi_text = "referensinya"
            
            set_cell(t3.cell(20, 5), referensi_text)
            
            # TABLE 4: assessment (index 4) - Metode Penilaian
            t4 = doc.tables[4]
            penilaian_list = rps_data.get("penilaian", []) or rps_data.get("assessmentMethods", [])
            
            print(f"📊 TABLE 4 - Assessment Methods:")
            print(f"   - Total methods: {len(penilaian_list)}")
            print(f"   - Table rows: {len(t4.rows)}")
            
            for i, penilaian in enumerate(penilaian_list[:5]):
                row_idx = 2 + i
                if row_idx < len(t4.rows):
                    # Handle both old format (komponen field) and new format (teknik field)
                    teknik = penilaian.get("teknik") or penilaian.get("komponen", "")
                    persentase = penilaian.get("persentase") or penilaian.get("bobot", 0)
                    kriteria = penilaian.get("kriteria", "")
                    
                    print(f"   - Method {i+1}: {teknik} ({persentase}%)")
                    
                    set_cell(t4.cell(row_idx, 1), teknik)
                    set_cell(t4.cell(row_idx, 2), str(persentase))
                    set_cell(t4.cell(row_idx, 3), kriteria)
                    
                    # CPMK distribution columns - handle both formats
                    distribusi = penilaian.get("distribusiCPMK", {})
                    if isinstance(distribusi, dict):
                        cpmk1 = str(distribusi.get("cpmk1", 0) or 0)
                        cpmk2 = str(distribusi.get("cpmk2", 0) or 0)
                        cpmk3 = str(distribusi.get("cpmk3", 0) or 0)
                        cpmk4 = str(distribusi.get("cpmk4", 0) or 0)
                    else:
                        cpmk1 = str(penilaian.get("cpmk1", 0) or 0)
                        cpmk2 = str(penilaian.get("cpmk2", 0) or 0)
                        cpmk3 = str(penilaian.get("cpmk3", 0) or 0)
                        cpmk4 = str(penilaian.get("cpmk4", 0) or 0)
                    
                    if len(t4.rows[row_idx].cells) >= 8:
                        set_cell(t4.cell(row_idx, 4), cpmk1)
                        set_cell(t4.cell(row_idx, 5), cpmk2)
                        set_cell(t4.cell(row_idx, 6), cpmk3)
                        set_cell(t4.cell(row_idx, 7), cpmk4)
                        print(f"     ✅ Distribution - CPMK1:{cpmk1}% CPMK2:{cpmk2}% CPMK3:{cpmk3}% CPMK4:{cpmk4}%")
            
            
            # TABLE 5: CPL-CPMK mapping (index 5) - Media Asesmen dan Kontribusinya
            t5 = doc.tables[5]
            mapping_list = rps_data.get("cplMappings", []) or rps_data.get("cpl_cpmk_mapping", [])
            
            print(f"📊 TABLE 5 - CPL-CPMK Mapping:")
            print(f"   - Total mappings from API: {len(mapping_list)}")
            print(f"   - Table rows: {len(t5.rows)}")
            
            # Build mapping list if not provided
            if not mapping_list or len(mapping_list) == 0:
                print(f"   - No explicit mappings, building from IK and CPMK...")
                # Create mapping from indikatorKinerjaList and cpmkList
                for i, ik_item in enumerate(rps_data.get("indikatorKinerjaList", [])[:4]):
                    # Find corresponding CPL
                    cpl_code = ""
                    cpl_item = {}
                    for cpl in rps_data.get("cpl", []):
                        if cpl.get("kode") == ik_item.get("kodeCPL"):
                            cpl_code = cpl.get("kode", "")
                            cpl_item = cpl
                            break
                    
                    # Get corresponding CPMK
                    cpmk_code = ""
                    cpmk_pernyataan = ""
                    if i < len(rps_data.get("cpmk", [])):
                        cpmk_code = rps_data["cpmk"][i].get("kode", "")
                        cpmk_pernyataan = rps_data["cpmk"][i].get("pernyataan", "")
                    
                    # Try to calculate distribution from penilaian
                    qui = 0
                    prs = 0
                    pro = 0
                    uts = 0
                    uas = 0
                    
                    for penilaian in rps_data.get("penilaian", []):
                        cpmk_key = f"cpmk{i+1}"
                        distribusi = penilaian.get("distribusiCPMK", {})
                        if isinstance(distribusi, dict):
                            val = distribusi.get(cpmk_key, 0) or 0
                        else:
                            val = penilaian.get(cpmk_key, 0) or 0
                        
                        teknik = penilaian.get("teknik", "").lower()
                        if "kuis" in teknik or "quiz" in teknik:
                            qui += val
                        elif "presentasi" in teknik or "partisipatif" in teknik or "prs" in teknik:
                            prs += val
                        elif "project" in teknik or "tugas" in teknik or "laporan" in teknik or "pro" in teknik:
                            pro += val
                        elif "uts" in teknik:
                            uts += val
                        elif "uas" in teknik:
                            uas += val
                    
                    mapping_list.append({
                        "cpl": cpl_code,
                        "ik": ik_item.get("kode", ""),
                        "ik_pernyataan": ik_item.get("pernyataan", ""),
                        "cpmk": cpmk_code,
                        "cpmk_pernyataan": cpmk_pernyataan,
                        "bobot": "25%",
                        "media": "Laporan, Tugas, Presentasi",
                        "qui": str(qui) if qui > 0 else "",
                        "prs": str(prs) if prs > 0 else "",
                        "pro": str(pro) if pro > 0 else "",
                        "uts": str(uts) if uts > 0 else "",
                        "uas": str(uas) if uas > 0 else "",
                    })
            else:
                print(f"   - Using explicit mappings from API")
            
            # Fill table with mappings
            for i, mapping in enumerate(mapping_list[:4]):
                row_idx = 2 + i
                if row_idx < len(t5.rows):
                    cpl_val = mapping.get("cpl", "")
                    ik_val = mapping.get("ik", "")
                    ik_pern = mapping.get("ik_pernyataan", "")
                    cpmk_val = mapping.get("cpmk", "")
                    cpmk_pern = mapping.get("cpmk_pernyataan", "")
                    bobot_val = mapping.get("bobot", "")
                    media_val = mapping.get("media", "")
                    qui_val = mapping.get("qui", "")
                    prs_val = mapping.get("prs", "")
                    pro_val = mapping.get("pro", "")
                    uts_val = mapping.get("uts", "")
                    uas_val = mapping.get("uas", "")
                    
                    print(f"   - Row {row_idx}: {cpl_val} | {ik_val} | {cpmk_val} | QUI:{qui_val} PRS:{prs_val} PRO:{pro_val} UTS:{uts_val} UAS:{uas_val}")
                    
                    set_cell(t5.cell(row_idx, 0), cpl_val)
                    set_cell(t5.cell(row_idx, 1), ik_val)
                    set_cell(t5.cell(row_idx, 2), ik_pern)
                    set_cell(t5.cell(row_idx, 3), cpmk_val)
                    set_cell(t5.cell(row_idx, 4), cpmk_pern)
                    
                    # Check available cells
                    if len(t5.rows[row_idx].cells) >= 12:
                        set_cell(t5.cell(row_idx, 5), bobot_val)
                        set_cell(t5.cell(row_idx, 6), media_val)
                        set_cell(t5.cell(row_idx, 7), qui_val)
                        set_cell(t5.cell(row_idx, 8), prs_val)
                        set_cell(t5.cell(row_idx, 9), pro_val)
                        set_cell(t5.cell(row_idx, 10), uts_val)
                        set_cell(t5.cell(row_idx, 11), uas_val)
                    else:
                        print(f"   ⚠️ Warning: Row {row_idx} has only {len(t5.rows[row_idx].cells)} cells, expected 12+")
            
            doc.save(output_path)
            print(f"✅ DOCX saved successfully!")
            return True
            
        except Exception as e:
            print(f"❌ Error converting to DOCX: {e}")
            import traceback
            traceback.print_exc()
            return False


# Standalone usage
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Convert RPS JSON to DOCX")
    parser.add_argument("--json", required=True, help="Input JSON file with RPS data")
    parser.add_argument("--output", default="RPS_output.docx", help="Output DOCX file")
    parser.add_argument("--template", help="Custom template DOCX path (optional)")
    parser.add_argument("--nama", default="Mata Kuliah", help="Course name")
    parser.add_argument("--kode", default="MK001", help="Course code")
    parser.add_argument("--sks", type=int, default=3, help="SKS")
    parser.add_argument("--semester", type=int, default=1, help="Semester")
    parser.add_argument("--status", default="Mata Kuliah Wajib", help="Course status")
    parser.add_argument("--prasyarat", default="-", help="Prerequisites")
    
    args = parser.parse_args()
    
    print("[START] JSON to DOCX Converter")
    print("=" * 60)
    
    # Load JSON
    try:
        with open(args.json, 'r', encoding='utf-8') as f:
            rps_data = json.load(f)
        print(f"✅ Loaded JSON from: {args.json}")
    except Exception as e:
        print(f"❌ Failed to load JSON: {e}")
        exit(1)
    
    # Prepare meta
    meta = {
        "nama": args.nama,
        "kode": args.kode,
        "sks": args.sks,
        "semester": args.semester,
        "status": args.status,
        "prasyarat": args.prasyarat,
        # Extract authority from JSON data
        "koordinatorMK": rps_data.get('authority', {}).get('koordinatorMK', {}),
        "koordinatorGPM": rps_data.get('authority', {}).get('koordinatorGPM', {}),
        "ketuaProdi": rps_data.get('authority', {}).get('ketuaProdi', {}),
        "dekan": rps_data.get('authority', {}).get('dekan', {}),
    }
    
    # Convert
    converter = JSONToDocx(template_path=args.template)
    success = converter.export_to_docx(rps_data, meta, args.output)
    
    if success:
        print(f"\n✅ Conversion complete!")
        print(f"   Output: {args.output}")
    else:
        print(f"\n❌ Conversion failed!")
        exit(1)
