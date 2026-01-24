#!/usr/bin/env python3
"""
JSON to DOCX Exporter
====================
Convert RPS JSON data to formatted DOCX document.
Handles template filling and format preservation.
"""

import json
import re
import time
from pathlib import Path
from typing import Optional


def clean_key(text):
    """Membersihkan text untuk pencarian key yang akurat."""
    if not text: return ""
    return text.replace('"', '').replace('"', '').replace('"', '').strip()


def get_cpmk_index_from_header(text):
    """
    Mendeteksi index CPMK dari header kolom.
    Mendukung format: "CPMK 1", "CPMK 1-1", "CPMK 1-3", "CPMK 3 (%)"
    """
    match = re.search(r'CPMK\s*(?:1-)?(\d+)', text, re.IGNORECASE)
    if match:
        return int(match.group(1))
    return None


def delete_column_safe(table, col_idx):
    """
    Menghapus kolom tabel dengan aman (Update XML tblGrid).
    Mencegah file Word menjadi corrupt.
    """
    tbl = table._tbl
    
    # 1. Hapus Definisi Kolom di Grid (tblGrid)
    if tbl.tblGrid is not None:
        grid_cols = tbl.tblGrid.gridCol_lst
        if col_idx < len(grid_cols):
            tbl.tblGrid.remove(grid_cols[col_idx])

    # 2. Hapus Sel (tc) di setiap Baris (tr)
    for tr in tbl.tr_lst:
        tc_list = tr.tc_lst
        if col_idx < len(tc_list):
            tc = tc_list[col_idx]
            tr.remove(tc)


def prune_unused_cpmk_columns(table, total_cpmk_json):
    """
    Mendeteksi kolom CPMK berlebih dan menghapusnya dari kanan ke kiri.
    """
    cols_to_delete = set()
    
    # Cek Header (2 baris pertama)
    header_rows = table.rows[:2]
    
    for row in header_rows:
        for c_idx, cell in enumerate(row.cells):
            c_idx_num = get_cpmk_index_from_header(cell.text)
            
            # Jika angka CPMK di header > jumlah CPMK di JSON -> HAPUS
            if c_idx_num and c_idx_num > total_cpmk_json:
                cols_to_delete.add(c_idx)
            
            # Cek juga placeholder
            for i in range(total_cpmk_json + 1, 10):
                if f"cpmk{i}" in cell.text or f"cpmk {i}" in cell.text.lower():
                    cols_to_delete.add(c_idx)

    # Hapus dari index TERBESAR ke terkecil
    sorted_cols = sorted(list(cols_to_delete), reverse=True)
    for col_idx in sorted_cols:
        try:
            delete_column_safe(table, col_idx)
        except Exception as e:
            print(f"   [WARN] Gagal hapus kolom {col_idx}: {e}")


def duplicate_table_row(table, row_idx):
    """Duplikasi baris tabel dengan mempertahankan formatting."""
    row = table.rows[row_idx]
    new_row = table.add_row()
    row._tr.addnext(new_row._tr)
    
    for i, cell in enumerate(row.cells):
        new_cell = new_row.cells[i]
        # Clear default
        for p in new_cell.paragraphs:
            p._element.getparent().remove(p._element)
        # Copy content
        for p in cell.paragraphs:
            new_p = new_cell.add_paragraph()
            new_p.style = p.style
            new_p.alignment = p.alignment
            for r in p.runs:
                new_r = new_p.add_run(r.text)
                new_r.bold = r.bold
                new_r.italic = r.italic
                new_r.underline = r.underline
                new_r.font.name = r.font.name
                new_r.font.size = r.font.size
                if r.font.color and r.font.color.rgb:
                    new_r.font.color.rgb = r.font.color.rgb
    return new_row


def remove_row_xml(table, row_obj):
    """Hapus baris dari tabel."""
    tbl = table._tbl
    tr = row_obj._tr
    tbl.remove(tr)


def replace_paragraph_text(paragraph, placeholder_map):
    """Replace text di paragraf dengan exact dan partial matching (case-insensitive, normalized)."""
    if not paragraph.text:
        return

    def norm(s: str) -> str:
        # Lowercase, strip quotes/spaces, collapse whitespace
        s = s or ""
        s = s.replace('"', '').replace("'", '')
        s = re.sub(r"\s+", " ", s.strip().lower())
        return s

    p_text_raw = paragraph.text
    p_text_norm = norm(p_text_raw)

    # 1. Exact Match Check (Prioritas)
    for key, val in placeholder_map.items():
        if norm(key) == p_text_norm:
            if paragraph.runs:
                paragraph.runs[0].text = str(val)
                for r in paragraph.runs[1:]:
                    r.text = ''
            else:
                paragraph.text = str(val)
            return

    # 2. Partial Match Check (case-insensitive)
    for key, val in placeholder_map.items():
        full_text = paragraph.text
        key_variants = [key, f'"{key}"', f"'{key}'"]

        matched = False
        for var in key_variants:
            # Case-insensitive replace
            pattern = re.compile(re.escape(var), re.IGNORECASE)
            if pattern.search(full_text):
                matched = True
                new_text = pattern.sub(str(val), full_text)
                if paragraph.runs:
                    paragraph.runs[0].text = new_text
                    for r in paragraph.runs[1:]:
                        r.text = ''
                else:
                    paragraph.text = new_text
                break
        if matched:
            break


def generate_media_asesmen_string(cpmk_item):
    """Generate string media asesmen dari bobot CPMK."""
    components = []
    if cpmk_item.get('N1', 0) > 0: components.append("PRS")
    if cpmk_item.get('N2', 0) > 0: components.append("PRO")
    if cpmk_item.get('N3', 0) > 0: components.append("QUIZ")
    if cpmk_item.get('N4', 0) > 0: components.append("UTS")
    if cpmk_item.get('N5', 0) > 0: components.append("UAS")
    return ", ".join(components)


def process_smart_list_table(table, data_list, mapping_config):
    """Process tabel dengan duplikasi baris dinamis berdasarkan jumlah data."""
    if not data_list:  # Skip if no data
        return
        
    template_rows = []
    
    is_integration_table = 'IK 1-' in str(mapping_config.keys()) or 'CPL 1' in str(mapping_config.keys())
    
    for i, row in enumerate(table.rows):
        row_text = " ".join([c.text for c in row.cells])
        is_template = False
        
        if is_integration_table:
            if ('CPL' in row_text and 'IK' in row_text and 'CPMK' in row_text):
                has_placeholder_pattern = False
                for ph in mapping_config.keys():
                    if clean_key(ph) in clean_key(row_text):
                        has_placeholder_pattern = True
                        break
                
                if not has_placeholder_pattern:
                    if re.search(r'IK\s+\d+-\d+', row_text) or re.search(r'CPL\s+\d+', row_text):
                        has_placeholder_pattern = True
                
                if has_placeholder_pattern:
                    is_template = True
        else:
            for ph in mapping_config.keys():
                if clean_key(ph) in clean_key(row_text):
                    is_template = True
                    break
        
        if is_template:
            template_rows.append(i)

    if not template_rows: return

    start_idx = template_rows[0]
    available = len(template_rows)
    needed = len(data_list)
    
    col_mapping = None
    if is_integration_table:
        col_mapping = {
            'cpl_kode': 0,
            'ik_kode': 1,
            'pernyataan': 2,
            'cpmk_kode': 3,
            'cpmk_pernyataan': 4,
            'N_total': 5,
            'MA_val': 6,
            'N1': 7,
            'N2': 8,
            'N3': 9,
            'N4': 10,
            'N5': 11
        }

    # Resize Table
    if needed > available:
        diff = needed - available
        insert_pos = template_rows[-1]
        curr = insert_pos
        for _ in range(diff):
            duplicate_table_row(table, curr)
            curr += 1
            
    elif needed < available:
        diff = available - needed
        indices_to_remove = template_rows[needed:]
        for r_idx in reversed(indices_to_remove):
            remove_row_xml(table, table.rows[r_idx])

    # Fill Data
    for i, item in enumerate(data_list):
        row_idx = start_idx + i
        if row_idx >= len(table.rows): break
        
        row = table.rows[row_idx]
        
        if is_integration_table and col_mapping:
            if len(row.cells) >= 12:
                _set_cell_text_preserve_format(row.cells[col_mapping['cpl_kode']], str(item.get('cpl_kode', '')))
                _set_cell_text_preserve_format(row.cells[col_mapping['ik_kode']], str(item.get('ik_kode', '')))
                _set_cell_text_preserve_format(row.cells[col_mapping['pernyataan']], str(item.get('pernyataan', '')))
                _set_cell_text_preserve_format(row.cells[col_mapping['cpmk_kode']], str(item.get('cpmk_kode', '')))
                _set_cell_text_preserve_format(row.cells[col_mapping['cpmk_pernyataan']], str(item.get('cpmk_pernyataan', '')))
                _set_cell_text_preserve_format(row.cells[col_mapping['N_total']], str(item.get('N_total', '')))
                _set_cell_text_preserve_format(row.cells[col_mapping['MA_val']], str(item.get('MA_val', '')))
                _set_cell_text_preserve_format(row.cells[col_mapping['N1']], str(item.get('N1', '')))
                _set_cell_text_preserve_format(row.cells[col_mapping['N2']], str(item.get('N2', '')))
                _set_cell_text_preserve_format(row.cells[col_mapping['N3']], str(item.get('N3', '')))
                _set_cell_text_preserve_format(row.cells[col_mapping['N4']], str(item.get('N4', '')))
                _set_cell_text_preserve_format(row.cells[col_mapping['N5']], str(item.get('N5', '')))
        else:
            row_map = {ph: item.get(key, "") for ph, key in mapping_config.items()}
            
            for cell in row.cells:
                for p in cell.paragraphs:
                    replace_paragraph_text(p, row_map)


def _set_cell_text_preserve_format(cell, text: str) -> None:
    """
    Replace cell text while preserving formatting.
    Safe version that doesn't corrupt document structure.
    """
    from docx.shared import Pt
    from docx.oxml import OxmlElement
    
    text = str(text) if text is not None else ""
    
    if not cell.paragraphs:
        cell.text = text
        return
    
    try:
        # Find a paragraph with existing formatting to copy from
        source_para = None
        source_run = None
        
        for para in cell.paragraphs:
            if para.runs:
                source_para = para
                source_run = para.runs[0]
                break
        
        if not source_para:
            source_para = cell.paragraphs[0]
        
        # Save formatting from first run if it exists
        saved_font_size = None
        saved_font_name = None
        saved_bold = None
        saved_italic = None
        
        if source_run:
            try:
                saved_font_size = source_run.font.size
                saved_font_name = source_run.font.name
                saved_bold = source_run.font.bold
                saved_italic = source_run.font.italic
            except:
                pass  # Use existing formatting if error
        
        # Safely clear all runs from source paragraph
        try:
            for run in list(source_para.runs):
                # Remove the run from XML
                r = run._element
                r.getparent().remove(r)
        except Exception as e:
            print(f"⚠️ Could not clear runs: {e}")
            # Fallback: just set text directly
            cell.text = text
            return
        
        # Add new text content with formatting preserved
        if text:
            lines = text.split('\n')
            for line_idx, line in enumerate(lines):
                if line_idx > 0:
                    # Add line break between lines
                    source_para.add_run('\n')
                
                new_run = source_para.add_run(line)
                try:
                    if saved_font_size is not None:
                        new_run.font.size = saved_font_size
                    if saved_font_name is not None:
                        new_run.font.name = saved_font_name
                    if saved_bold is not None:
                        new_run.font.bold = saved_bold
                    if saved_italic is not None:
                        new_run.font.italic = saved_italic
                except:
                    pass  # If formatting fails, continue with plain text
        
        # Remove extra empty paragraphs from cell (keep only first one)
        try:
            extra_paras = list(cell.paragraphs[1:])
            for para in extra_paras:
                p = para._element
                if p.getparent() is not None:
                    p.getparent().remove(p)
        except Exception as e:
            print(f"⚠️ Could not remove extra paragraphs: {e}")
            pass  # Not critical, continue
    
    except Exception as e:
        # Fallback: simple text replacement
        print(f"⚠️ Fallback text replacement due to error: {e}")
        try:
            cell.text = text
        except:
            print(f"❌ Failed to set cell text: {e}")


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
        except ImportError as e:
            print(f"[ERROR] Missing dependency 'python-docx'. Install with: pip install python-docx")
            print(f"[ERROR] Details: {e}")
            return False
        
        print(f"\n[CONVERT] Validating template...")
        if not self.validate_template():
            print(f"[ERROR] Template validation failed")
            return False
        
        print(f"\n[CONVERT] Converting JSON to DOCX...")
        print(f"   Template: {self.template_path}")
        print(f"   Output: {output_path}")
        
        try:
            import time
            start_time = time.time()
            
            print(f"[CONVERT] Loading Document from {self.template_path}...")
            doc = Document(str(self.template_path))
            load_time = time.time() - start_time
            print(f"[CONVERT] Document loaded in {load_time:.2f}s. Total tables: {len(doc.tables)}")
            
            # ---------------------------------------------------------
            # 1. PERSIAPAN DATA MAPPING GLOBAL & OTORITAS
            # ---------------------------------------------------------
            
            # Lookup CPMK Code -> Description
            cpmk_list = rps_data.get("cpmkList", []) or rps_data.get("cpmk", [])
            cpmk_desc_lookup = {item['kode']: item['pernyataan'] for item in cpmk_list}
            total_cpmk = len(cpmk_list)
            
            # Dapatkan deskripsi dari data
            deskripsi = rps_data.get("deskripsiSingkat") or rps_data.get("deskripsi", "")
            
            # Global Map
            global_map = {
                'identitas.kode': meta.get('kode', ''),
                'identitas.nama': meta.get('nama', ''),
                'identitas.sks': str(meta.get('sks', '')),
                'identitas.semester': str(meta.get('semester', '')),
                'identitas.status': meta.get('status', ''),
                'identitas.prasyarat': meta.get('prasyarat', ''),
                'identitas.prasayarat': meta.get('prasyarat', ''),
                'Deskripsi mata kuliah': deskripsi,
                
                # --- OTORITAS (NAMA & NIP) ---
                'Otoritas.koordinatormk.nama': meta.get('koordinatorMK', {}).get('nama', ''),
                'Otoritas.koordinatormk.nip': meta.get('koordinatorMK', {}).get('nip', ''),
                
                'Otoritas.koordinatorGPM.nama': meta.get('koordinatorGPM', {}).get('nama', ''),
                'Otoritas.koordinatorGPM.nip': meta.get('koordinatorGPM', {}).get('nip', ''),
                
                'Otoritas.ketuaProdi.nama': meta.get('ketuaProdi', {}).get('nama', ''),
                'Otoritas.ketuaProdi.nip': meta.get('ketuaProdi', {}).get('nip', ''),
                
                'Otoritas.dekan.nama': meta.get('dekan', {}).get('nama', ''),
                'Otoritas.dekan.nip': meta.get('dekan', {}).get('nip', ''),
            }
            
            # CPMK Weights & Media for Global Use
            for i, cpmk in enumerate(cpmk_list):
                idx = i + 1
                ma_str = generate_media_asesmen_string(cpmk)
                global_map[f'MA_cpmk{idx}'] = ma_str
                global_map[f'N1_cpmk{idx}'] = cpmk.get('N1', 0)
                global_map[f'N2_cpmk{idx}'] = cpmk.get('N2', 0)
                global_map[f'N3_cpmk{idx}'] = cpmk.get('N3', 0)
                global_map[f'N4_cpmk{idx}'] = cpmk.get('N4', 0)
                global_map[f'N5_cpmk{idx}'] = cpmk.get('N5', 0)
                global_map[f'Ntotal_cpmk{idx}'] = cpmk.get('N_cpmk', 0)
                global_map[f'CPMK 1-{idx}'] = cpmk.get('kode', '')
                global_map[f'Deskripsi cpmk 1-{idx}'] = cpmk.get('pernyataan', '')
            
            # ---------------------------------------------------------
            # 2. PREPARE DATA CPL
            # ---------------------------------------------------------
            cpl_list = rps_data.get("cplList", []) or rps_data.get("cpl", [])
            
            # ---------------------------------------------------------
            # 3. PREPARE DATA INTEGRASI (TABEL TERAKHIR)
            # ---------------------------------------------------------
            integration_rows = []
            ik_list = rps_data.get("ik", [])
            if ik_list:
                cpmk_obj_lookup = {item['kode']: item for item in cpmk_list}
                cpl_obj_lookup = {item['kode']: item for item in cpl_list}
                
                for ik_item in ik_list:
                    # IK mapping ke CPMK
                    cpmk_code = ik_item.get('mapping_cpmk', '')  # CPMK code
                    cpmk_data = cpmk_obj_lookup.get(cpmk_code, {})
                    
                    # CPMK mapping ke CPL
                    cpl_code = cpmk_data.get('mapping_cpl', '')
                    cpl_data = cpl_obj_lookup.get(cpl_code, {})
                    
                    ma_val = generate_media_asesmen_string(cpmk_data)
                    
                    integration_rows.append({
                        'ik_kode': ik_item.get('kode', ''),
                        'pernyataan': ik_item.get('pernyataan', ''),
                        'cpmk_kode': cpmk_code,
                        'cpmk_pernyataan': cpmk_data.get('pernyataan', ''),
                        'cpl_kode': cpl_code,
                        'cpl_pernyataan': cpl_data.get('pernyataan', ''),
                        'N1': cpmk_data.get('N1', ''),
                        'N2': cpmk_data.get('N2', ''),
                        'N3': cpmk_data.get('N3', ''),
                        'N4': cpmk_data.get('N4', ''),
                        'N5': cpmk_data.get('N5', ''),
                        'N_total': cpmk_data.get('N_cpmk', ''),
                        'MA_val': ma_val
                    })
            
            # ---------------------------------------------------------
            # 4. EKSEKUSI PADA SETIAP TABEL
            # ---------------------------------------------------------
            
            process_start = time.time()
            print(f"[PROCESS] Starting table processing...")
            
            for table_idx, table in enumerate(doc.tables):
                table_start = time.time()

                # Build full table text for reliable detection (no early skip)
                if not table.rows:
                    continue
                try:
                    all_text = " ".join([c.text for r in table.rows for c in r.cells])
                except Exception as e:
                    print(f"[WARN] Failed to read table {table_idx} text: {e}")
                    continue
                
                # A. DELETE KOLOM CPMK BERLEBIH (Pruning)
                if 'CPMK 1-' in all_text or 'CPMK 1 (' in all_text:
                    prune_unused_cpmk_columns(table, total_cpmk)
                
                # B. GLOBAL REPLACE (Identitas, Otoritas, Bobot CPMK)
                for row in table.rows:
                    for cell in row.cells:
                        for p in cell.paragraphs:
                            replace_paragraph_text(p, global_map)
                
                # C. CPL LIST
                if 'cpl.kode' in all_text:
                    process_smart_list_table(table, cpl_list, {
                        'cpl.kode': 'kode',
                        'cpl.pernyataan': 'pernyataan'
                    })
                
                # D. CPMK LIST
                if 'cpmk.kode' in all_text:
                    process_smart_list_table(table, cpmk_list, {
                        'cpmk.kode': 'kode',
                        'cpmk.pernyataan': 'pernyataan'
                    })
                
                # E. TABEL INTEGRASI (IK - CPL)
                if 'IK - CPL' in all_text and integration_rows:
                    process_smart_list_table(table, integration_rows, {
                        'IK 1-1': 'ik_kode',
                        'Deskripsi Ik 1-1': 'pernyataan',
                        'CPMK 1-1': 'cpmk_kode',
                        'Deskripsi cpmk 1-1': 'cpmk_pernyataan',
                        'CPL 1': 'cpl_kode',
                        'MA_cpmk1': 'MA_val',
                        'N1_cpmk1': 'N1',
                        'N2_cpmk1': 'N2',
                        'N3_cpmk1': 'N3',
                        'N4_cpmk1': 'N4',
                        'N5_cpmk1': 'N5',
                        'Ntotal_cpmk1': 'N_total'
                    })
                
                # F. JADWAL MINGGUAN (Weekly)
                if 'Minggu ke' in all_text and 'Kemampuan Akhir' in all_text:
                    minggu_list = rps_data.get("minggu", []) or rps_data.get("weeklyPlan", [])
                    minggu_map_data = {m.get('mingguKe') or m.get('minggu'): m for m in minggu_list}
                    
                    for row in table.rows:
                        if not row.cells: continue
                        txt = clean_key(row.cells[0].text)
                        if txt.isdigit():
                            m_ke = int(txt)
                            if m_ke in minggu_map_data:
                                item = minggu_map_data[m_ke]
                                wm = {}
                                
                                # Handle Deskripsi Kemampuan Akhir
                                raw_ka = item.get('kemampuanAkhir') or item.get('cpmk', '')
                                wm['kemampuanAkhir'] = raw_ka
                                clean_ka = clean_key(raw_ka)
                                if clean_ka in cpmk_desc_lookup:
                                    wm['pernyataan_kemampuanAkhir'] = cpmk_desc_lookup[clean_ka]
                                else:
                                    wm['pernyataan_kemampuanAkhir'] = raw_ka
                                
                                wm['bahan kajian'] = item.get('bahanKajian') or item.get('topik', '')
                                
                                metode = item.get('metodePembelajaran', {})
                                if isinstance(metode, dict):
                                    metode_val = metode.get('metode', '')
                                    wm['metode'] = metode_val
                                    wm['Metode :'] = metode_val
                                    wm['deskripsi metode'] = metode.get('deskripsi', '')
                                    wm['deskripsi aktivitas'] = metode.get('aktivitas', '')
                                else:
                                    wm['metode'] = str(metode)
                                    wm['Metode :'] = str(metode)
                                
                                wm['waktu'] = item.get('waktu', '3x50\'')
                                wm['pengalamanBelajar'] = item.get('pengalamanBelajar') or item.get('pengalaman', '')
                                
                                pen = item.get('penilaian', {})
                                if isinstance(pen, dict):
                                    wm['penilaian.kriteria'] = pen.get('kriteria', '')
                                    wm['penilaian.bobot'] = pen.get('bobotMateri') or pen.get('bobot', '')
                                
                                for cell in row.cells:
                                    for p in cell.paragraphs:
                                        replace_paragraph_text(p, wm)
                
                table_time = time.time() - table_start
                if table_time > 0.5:  # Log only slow tables
                    print(f"   Table {table_idx}: {table_time:.2f}s")
                
                # G. Referensi (flexible placeholder detection)
                ref_placeholder_regex = re.compile(r"paste[_\s]?referensi(nya)?[_\s]?disini", re.IGNORECASE)
                if ref_placeholder_regex.search(all_text):
                    references_list = rps_data.get("references", [])
                    referensi_list = rps_data.get("referensi", [])

                    formatted_refs: list[str] = []
                    if references_list:
                        for i, ref in enumerate(references_list, 1):
                            if isinstance(ref, dict):
                                judul = ref.get("judul", "").strip()
                                if judul:
                                    formatted_refs.append(f"{i}. {judul}")
                            elif isinstance(ref, str):
                                s = ref.strip()
                                if s:
                                    formatted_refs.append(f"{i}. {s}")
                    elif referensi_list:
                        for i, r in enumerate(referensi_list, 1):
                            s = (r or "").strip()
                            if s:
                                formatted_refs.append(f"{i}. {s}")

                    ref_str = "\n".join(formatted_refs) if formatted_refs else ""

                    for row in table.rows:
                        for cell in row.cells:
                            for p in list(cell.paragraphs):
                                if ref_placeholder_regex.search(p.text):
                                    new_text = ref_placeholder_regex.sub(ref_str, p.text)
                                    _set_cell_text_preserve_format(cell, new_text)
            
            process_time = time.time() - process_start
            print(f"[PROCESS] Table processing completed in {process_time:.2f}s")
            
            # Validate document before saving
            print(f"\n[VALIDATE] Checking document integrity before save...")
            try:
                for table_idx, table in enumerate(doc.tables):
                    if not table or len(table.rows) == 0:
                        print(f"   ⚠️ Table {table_idx} is empty or invalid")
                    else:
                        print(f"   ✅ Table {table_idx}: {len(table.rows)} rows x {len(table.columns)} cols")
            except Exception as e:
                print(f"   ⚠️ Could not validate tables: {e}")
            
            # Save with proper error handling
            try:
                save_start = time.time()
                doc.save(str(output_path))
                save_time = time.time() - save_start
                total_time = time.time() - start_time
                print(f"✅ DOCX saved in {save_time:.2f}s (total: {total_time:.2f}s) to: {output_path}")
                
                # Verify file was created and has content
                from pathlib import Path as PathlibPath
                saved_file = PathlibPath(output_path)
                if saved_file.exists():
                    file_size = saved_file.stat().st_size
                    print(f"✅ File size: {file_size} bytes")
                    if file_size < 10000:
                        print(f"   ⚠️ Warning: File seems small (< 10KB), might be corrupted")
                    return True
                else:
                    print(f"❌ File was not created at: {output_path}")
                    return False
                    
            except Exception as save_error:
                print(f"❌ Failed to save DOCX: {save_error}")
                import traceback
                traceback.print_exc()
                return False
            
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
        "koordinatorMK": rps_data.get('otoritas', {}).get('koordinatorMK', {}) or rps_data.get('authority', {}).get('koordinatorMK', {}),
        "koordinatorGPM": rps_data.get('otoritas', {}).get('koordinatorGPM', {}) or rps_data.get('authority', {}).get('koordinatorGPM', {}),
        "ketuaProdi": rps_data.get('otoritas', {}).get('ketuaProdi', {}) or rps_data.get('authority', {}).get('ketuaProdi', {}),
        "dekan": rps_data.get('otoritas', {}).get('dekan', {}) or rps_data.get('authority', {}).get('dekan', {}),
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
