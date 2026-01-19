import json
import copy
import re
from docx import Document
from docx.oxml.ns import qn

def load_data(json_path):
    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def clean_key(text):
    """Membersihkan text untuk pencarian key yang akurat."""
    if not text: return ""
    return text.replace('“', '').replace('”', '').replace('"', '').strip()

def get_cpmk_index_from_header(text):
    """
    Mendeteksi index CPMK dari header kolom.
    Mendukung format: "CPMK 1", "CPMK 1-1", "CPMK 1-3", "CPMK 3 (%)"
    """
    # Regex mencari angka di akhir string CPMK (misal CPMK 1-3 -> ambil 3)
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
        # Handle merged cells: pastikan index valid
        if col_idx < len(tc_list):
            tc = tc_list[col_idx]
            tr.remove(tc)

def prune_unused_cpmk_columns(table, total_cpmk_json):
    """
    Mendeteksi kolom CPMK berlebih (misal CPMK 3, CPMK 4 jika data cuma 2)
    dan menghapusnya dari kanan ke kiri.
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
            
            # Cek juga placeholder Ntotal_cpmk3, N1_cpmk3, dst di header/sub-header
            for i in range(total_cpmk_json + 1, 10): # Loop safety sampai 10
                if f"cpmk{i}" in cell.text or f"cpmk {i}" in cell.text.lower():
                    cols_to_delete.add(c_idx)

    # Hapus dari index TERBESAR ke terkecil (Wajib!)
    sorted_cols = sorted(list(cols_to_delete), reverse=True)
    for col_idx in sorted_cols:
        try:
            delete_column_safe(table, col_idx)
        except Exception as e:
            print(f"   [WARN] Gagal hapus kolom {col_idx}: {e}")

def duplicate_table_row(table, row_idx):
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
    tbl = table._tbl
    tr = row_obj._tr
    tbl.remove(tr)

def replace_paragraph_text(paragraph, placeholder_map):
    if not paragraph.text: return
    
    # Cleaning text paragraf untuk matching
    p_text_raw = paragraph.text
    p_text_clean = clean_key(p_text_raw)
    
    # 1. Exact Match Check (Prioritas)
    for key, val in placeholder_map.items():
        if clean_key(key) == p_text_clean:
            # Replace full paragraph content
            if paragraph.runs:
                paragraph.runs[0].text = str(val)
                for r in paragraph.runs[1:]:
                    r.text = ''
            return

    # 2. Partial Match Check (Replacement dalam string)
    for key, val in placeholder_map.items():
        # Variasi quote untuk pencarian
        variations = [key, f'"{key}"', f'“{key}”']
        
        # Cek apakah ada di full text paragraf
        full_text = paragraph.text
        matched = False
        for var in variations:
            if var in full_text:
                matched = True
                # Ganti di level paragraf
                new_text = full_text.replace(var, str(val))
                
                # Set ke run pertama, hapus sisanya
                if paragraph.runs:
                    paragraph.runs[0].text = new_text
                    for r in paragraph.runs[1:]:
                        r.text = ''
                break
        
        if matched:
            break

def generate_media_asesmen_string(cpmk_item):
    components = []
    if cpmk_item.get('N1', 0) > 0: components.append("PRS")
    if cpmk_item.get('N2', 0) > 0: components.append("PRO")
    if cpmk_item.get('N3', 0) > 0: components.append("QUIZ")
    if cpmk_item.get('N4', 0) > 0: components.append("UTS")
    if cpmk_item.get('N5', 0) > 0: components.append("UAS")
    return ", ".join(components)

def process_smart_list_table(table, data_list, mapping_config):
    # Identifikasi baris template - cari dari row yang punya placeholder key dari mapping
    template_rows = []
    
    # Untuk tabel integrasi, kita cari baris yang punya pattern CPL + IK atau CPMK
    is_integration_table = 'IK 1-' in str(mapping_config.keys()) or 'CPL 1' in str(mapping_config.keys())
    
    for i, row in enumerate(table.rows):
        row_text = " ".join([c.text for c in row.cells])
        is_template = False
        
        if is_integration_table:
            # Untuk tabel integrasi: deteksi jika ada "CPL" dan "IK" dalam row
            # dan ada placeholder pattern seperti "IK 1-" atau "CPL "
            if ('CPL' in row_text and 'IK' in row_text and 'CPMK' in row_text):
                # Cek apakah ada placeholder atau sudah ada data real
                # Placeholder biasanya punya format  "CPL 1", "CPL 2", "IK 1-1", dll
                # atau masih ada text placeholder seperti "Deskripsi"
                has_placeholder_pattern = False
                for ph in mapping_config.keys():
                    if clean_key(ph) in clean_key(row_text):
                        has_placeholder_pattern = True
                        break
                
                # Jika tidak ada placeholder pattern, coba deteksi pattern umum
                if not has_placeholder_pattern:
                    # Cek pattern "IK 1-x" atau "CPL x" di mana x adalah digit
                    import re
                    if re.search(r'IK\s+\d+-\d+', row_text) or re.search(r'CPL\s+\d+', row_text):
                        has_placeholder_pattern = True
                
                if has_placeholder_pattern:
                    is_template = True
        else:
            # Logika lama untuk tabel non-integrasi
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
    
    # Untuk tabel integrasi, simpan mapping key ke index kolom
    col_mapping = None
    if is_integration_table:
        # Mapping berdasarkan urutan key di mapping_config
        col_mapping = {
            'cpl_kode': 0,      # Kode CPL
            'ik_kode': 1,       # IK - CPL  
            'ik_pernyataan': 2, # Indikator Kinerja
            'cpmk_kode': 3,     # Kode CPMK
            'cpmk_pernyataan': 4, # CPMK
            'N_total': 5,       # Bobot CPMK
            'MA_val': 6,        # Media Asesmen
            'N1': 7,            # PRS
            'N2': 8,            # PRO
            'N3': 9,            # QUIZ
            'N4': 10,           # UTS
            'N5': 11            # UAS
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
        
        # Untuk tabel integrasi, gunakan direct cell assignment
        if is_integration_table and col_mapping:
            # Direct write ke cell berdasarkan column mapping
            if len(row.cells) >= 12:  # Pastikan ada cukup kolom
                # Set text langsung ke cell
                row.cells[col_mapping['cpl_kode']].text = str(item.get('cpl_kode', ''))
                row.cells[col_mapping['ik_kode']].text = str(item.get('ik_kode', ''))
                row.cells[col_mapping['ik_pernyataan']].text = str(item.get('ik_pernyataan', ''))
                row.cells[col_mapping['cpmk_kode']].text = str(item.get('cpmk_kode', ''))
                row.cells[col_mapping['cpmk_pernyataan']].text = str(item.get('cpmk_pernyataan', ''))
                row.cells[col_mapping['N_total']].text = str(item.get('N_total', ''))
                row.cells[col_mapping['MA_val']].text = str(item.get('MA_val', ''))
                row.cells[col_mapping['N1']].text = str(item.get('N1', ''))
                row.cells[col_mapping['N2']].text = str(item.get('N2', ''))
                row.cells[col_mapping['N3']].text = str(item.get('N3', ''))
                row.cells[col_mapping['N4']].text = str(item.get('N4', ''))
                row.cells[col_mapping['N5']].text = str(item.get('N5', ''))
        else:
            # Untuk tabel non-integrasi, gunakan logika lama dengan replace_paragraph_text
            row_map = {ph: item.get(key, "") for ph, key in mapping_config.items()}
            
            for cell in row.cells:
                for p in cell.paragraphs:
                    replace_paragraph_text(p, row_map)

def main():
    docx_path = 'RPS.docx'
    json_path = 'Praktikum_Algoritma_dan_Pemrograman_VTE2624106.json'
    output_path = 'RPS_Final.docx'

    data = load_data(json_path)
    doc = Document(docx_path)
    
    # ---------------------------------------------------------
    # 1. PERSIAPAN DATA MAPPING GLOBAL & OTORITAS
    # ---------------------------------------------------------
    
    # Lookup CPMK Code -> Description
    cpmk_desc_lookup = {item['kode']: item['pernyataan'] for item in data['cpmk']}
    total_cpmk = len(data['cpmk'])

    # Global Map
    global_map = {
        'identitas.kode': data['identitas']['kode'],
        'identitas.nama': data['identitas']['nama'],
        'identitas.sks': data['identitas']['sks'],
        'identitas.semester': data['identitas']['semester'],
        'identitas.status': data['identitas']['status'],
        'identitas.prasyarat': data['identitas']['prasyarat'],
        'identitas.prasayarat': data['identitas']['prasyarat'],
        'Deskripsi mata kuliah': data['deskripsi'],
        
        # --- OTORITAS (NAMA & NIP) ---
        'Otoritas.koordinatormk.nama': data['otoritas']['koordinatorMK']['nama'],
        'Otoritas.koordinatormk.nip': data['otoritas']['koordinatorMK']['nip'],
        
        'Otoritas.koordinatorGPM.nama': data['otoritas']['koordinatorGPM']['nama'], 
        'Otoritas.koordinatorGPM.nip': data['otoritas']['koordinatorGPM']['nip'], 
        
        'Otoritas.ketuaProdi.nama': data['otoritas']['ketuaProdi']['nama'],
        'Otoritas.ketuaProdi.nip': data['otoritas']['ketuaProdi']['nip'],
        
        'Otoritas.dekan.nama': data['otoritas']['dekan']['nama'],
        'Otoritas.dekan.nip': data['otoritas']['dekan']['nip'],
    }

    # CPMK Weights & Media for Global Use
    for i, cpmk in enumerate(data['cpmk']):
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
    # 2. PREPARE DATA INTEGRASI (TABEL TERAKHIR)
    # ---------------------------------------------------------
    integration_rows = []
    if 'ik' in data:
        cpmk_obj_lookup = {item['kode']: item for item in data['cpmk']}
        cpl_obj_lookup = {item['kode']: item for item in data['cpl']}
        
        for ik_item in data['ik']:
            # IK mapping ke CPMK
            cpmk_code = ik_item.get('mapping_cpl', '')  # Ini sebenarnya CPMK code
            cpmk_data = cpmk_obj_lookup.get(cpmk_code, {})
            
            # CPMK mapping ke CPL
            cpl_code = cpmk_data.get('mapping_cpl', '')
            cpl_data = cpl_obj_lookup.get(cpl_code, {})
            
            ma_val = generate_media_asesmen_string(cpmk_data)
            
            integration_rows.append({
                'ik_kode': ik_item.get('kode', ''),
                'ik_pernyataan': ik_item.get('ik_pernyataan', ''),
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
    # 3. EKSEKUSI PADA SETIAP TABEL
    # ---------------------------------------------------------
    
    for table in doc.tables:
        all_text = " ".join([c.text for r in table.rows for c in r.cells])
        
        # A. DELETE KOLOM CPMK BERLEBIH (Pruning)
        # Deteksi tabel penilaian atau integrasi yg punya header CPMK 1-x
        if 'CPMK 1-' in all_text or 'CPMK 1 (' in all_text:
            prune_unused_cpmk_columns(table, total_cpmk)

        # B. GLOBAL REPLACE (Identitas, Otoritas, Bobot CPMK)
        for row in table.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    replace_paragraph_text(p, global_map)

        # C. CPL LIST
        if 'cpl.kode' in all_text:
            process_smart_list_table(table, data['cpl'], {
                'cpl.kode': 'kode',
                'cpl.pernyataan': 'pernyataan'
            })

        # D. CPMK LIST
        if 'cpmk.kode' in all_text:
            process_smart_list_table(table, data['cpmk'], {
                'cpmk.kode': 'kode',
                'cpmk.pernyataan': 'pernyataan'
            })

        # E. TABEL INTEGRASI (IK - CPL)
        # Mencari placeholder IK
        if 'IK - CPL' in all_text:
            process_smart_list_table(table, integration_rows, {
                'IK 1-1': 'ik_kode',
                'Deskripsi Ik 1-1': 'ik_pernyataan',
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
            minggu_map_data = {m['mingguKe']: m for m in data['minggu']}
            
            for row in table.rows:
                if not row.cells: continue
                txt = clean_key(row.cells[0].text)
                if txt.isdigit():
                    m_ke = int(txt)
                    if m_ke in minggu_map_data:
                        item = minggu_map_data[m_ke]
                        wm = {}
                        
                        # Handle Deskripsi Kemampuan Akhir
                        raw_ka = item.get('kemampuanAkhir', '')
                        wm['kemampuanAkhir'] = raw_ka
                        clean_ka = clean_key(raw_ka)
                        if clean_ka in cpmk_desc_lookup:
                            wm['pernyataan_kemampuanAkhir'] = cpmk_desc_lookup[clean_ka]
                        else:
                            wm['pernyataan_kemampuanAkhir'] = raw_ka
                            
                        wm['bahan kajian'] = item.get('bahanKajian', '')
                        
                        metode = item.get('metodePembelajaran', {})
                        if isinstance(metode, dict):
                            metode_val = metode.get('metode', '')
                            wm['metode'] = metode_val
                            # Tambahkan mapping untuk "Metode :" -> nilai metode
                            wm['Metode :'] = metode_val
                            wm['deskripsi metode'] = metode.get('deskripsi', '')
                            wm['deskripsi aktivitas'] = metode.get('aktivitas', '') 
                        else:
                            wm['metode'] = str(metode)
                            wm['Metode :'] = str(metode)

                        wm['waktu'] = item.get('waktu', '')
                        wm['pengalamanBelajar'] = item.get('pengalamanBelajar', '')
                        
                        pen = item.get('penilaian', {})
                        if isinstance(pen, dict):
                            wm['penilaian.kriteria'] = pen.get('kriteria', '')
                            wm['penilaian.bobot'] = pen.get('bobotMateri', '')

                        for cell in row.cells:
                            for p in cell.paragraphs:
                                replace_paragraph_text(p, wm)

        # G. Referensi
        if 'Paste_referensinya_disini' in all_text:
             ref_str = "\n".join([f"{i+1}. {r}" for i, r in enumerate(data['referensi'])])
             for row in table.rows:
                 for cell in row.cells:
                     for p in cell.paragraphs:
                         if 'Paste_referensinya_disini' in p.text:
                             p.text = p.text.replace('Paste_referensinya_disini', ref_str)

    doc.save(output_path)
    print(f"Selesai! RPS Baru tersimpan di: {output_path}")

if __name__ == "__main__":
    main()