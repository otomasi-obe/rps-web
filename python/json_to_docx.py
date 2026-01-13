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
            print(f"❌ Template not found: {self.template_path}")
            return False
        print(f"✅ Template found: {self.template_path}")
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
            print("❌ Missing dependency 'python-docx'. Install with: pip install python-docx")
            return False
        
        if not self.validate_template():
            return False
        
        print(f"\n📄 Converting JSON to DOCX...")
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
                
                # Debug: Log received authority data
                print(f"📝 Authority data received:")
                print(f"   - Meta keys: {list(meta.keys())}")
                print(f"   - koordinatorMK: {meta.get('koordinatorMK')}")
                print(f"   - koordinatorGPM: {meta.get('koordinatorGPM')}")
                print(f"   - ketuaProdi: {meta.get('ketuaProdi')}")
                print(f"   - dekan: {meta.get('dekan')}")
                
                # Column structure: 0=Otoritas, 1=KoordinatorMK, 2=KoordinatorGPM, 3=KetuaProdi, 4=Dekan
                if 'koordinatorMK' in meta and len(auth_row.cells) > 1:
                    mk = meta['koordinatorMK']
                    mk_nama = mk.get('nama', '') if isinstance(mk, dict) else ''
                    mk_nip = mk.get('nip', '') if isinstance(mk, dict) else ''
                    # Fill column 1 for Koordinator MK
                    set_cell(auth_row.cells[1], f"Koordinator Mata Kuliah\n\n\n\n\n{mk_nama}\nNIPP. {mk_nip}")
                    print(f"   ✅ Koordinator MK filled: {mk_nama}")
                
                if 'koordinatorGPM' in meta and len(auth_row.cells) > 2:
                    gpm = meta['koordinatorGPM']
                    gpm_nama = gpm.get('nama', '') if isinstance(gpm, dict) else ''
                    gpm_nip = gpm.get('nip', '') if isinstance(gpm, dict) else ''
                    # Fill column 2 for Koordinator GPM
                    set_cell(auth_row.cells[2], f"Koordinator GPM\n\n\n\n\n{gpm_nama}\nNIPP. {gpm_nip}")
                    print(f"   ✅ Koordinator GPM filled: {gpm_nama}")
                
                if 'ketuaProdi' in meta and len(auth_row.cells) > 3:
                    prodi = meta['ketuaProdi']
                    prodi_nama = prodi.get('nama', '') if isinstance(prodi, dict) else ''
                    prodi_nip = prodi.get('nip', '') if isinstance(prodi, dict) else ''
                    # Fill column 3 for Ketua Prodi
                    set_cell(auth_row.cells[3], f"Ketua Prodi\n\n\n\n\n{prodi_nama}\nNIP. {prodi_nip}")
                    print(f"   ✅ Ketua Prodi filled: {prodi_nama}")
                
                if 'dekan' in meta and len(auth_row.cells) > 4:
                    dekan = meta['dekan']
                    dekan_nama = dekan.get('nama', '') if isinstance(dekan, dict) else ''
                    dekan_nip = dekan.get('nip', '') if isinstance(dekan, dict) else ''
                    # Fill column 4 for Dekan
                    set_cell(auth_row.cells[4], f"Dekan Sekolah Vokasi\n\n\n\n\n{dekan_nama}\nNIP. {dekan_nip}")
                    print(f"   ✅ Dekan filled: {dekan_nama}")
            
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
                metode_list = week_data.get("metode", [])
                # Handle metode as array or string for backward compatibility
                if isinstance(metode_list, list):
                    metode = ", ".join(metode_list)
                else:
                    metode = str(metode_list)
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
            
            # Row 20: references - only fill column 1 with reference list
            referensi_list = rps_data.get("referensi", [])
            referensi_text = "\n".join(referensi_list)
            set_cell(t3.cell(20, 1), referensi_text)
            
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
                    ik_code = ""
                    ik_stmt = ""
                    # Find the corresponding CPL and get ik_pernyataan from template
                    for cpl in cpl_list:
                        if cpl.get("kode") == cpl_code:
                            cpl_stmt = cpl.get("pernyataan", "")
                            ik_code = cpl.get("ik_kode", f"IK {cpl_code.replace('CPL', '')}-1")
                            ik_stmt = cpl.get("ik_pernyataan", "")
                            break
                    
                    # If ik_pernyataan not found, use cpl statement
                    if not ik_stmt:
                        ik_stmt = cpl_stmt
                    
                    mapping_list.append({
                        "cpl": cpl_code if i == 0 or cpmk.get("mapping_cpl") != cpmk_list[i-1].get("mapping_cpl") else "",
                        "ik": ik_code,
                        "ik_pernyataan": ik_stmt,
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
                        set_cell(t5.cell(row_idx, 7), mapping.get("qui", ""))
                        set_cell(t5.cell(row_idx, 8), mapping.get("prs", ""))
                        set_cell(t5.cell(row_idx, 9), mapping.get("pro", ""))
                        set_cell(t5.cell(row_idx, 10), mapping.get("uts", ""))
                        set_cell(t5.cell(row_idx, 11), mapping.get("uas", ""))
            
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
    
    print("🚀 JSON to DOCX Converter")
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
