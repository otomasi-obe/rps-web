#!/usr/bin/env python3
"""Verify RPS DOCX format - check font sizes and structure."""

from docx import Document
from docx.shared import Pt
import os

def check_font_preservation(template_path, generated_path):
    """Compare font sizes between template and generated DOCX."""
    
    template = Document(template_path)
    generated = Document(generated_path)
    
    print("=" * 70)
    print("FONT SIZE COMPARISON: Template vs Generated")
    print("=" * 70)
    
    # Check a few cells from each table
    tables_to_check = [
        (1, 1, 1, "Kode MK"),
        (1, 1, 3, "SKS"),
        (2, 1, 1, "CPMK 1 Kode"),
        (3, 4, 2, "Week 1 Topik"),
        (4, 2, 1, "Assessment Komponen"),
    ]
    
    issues = []
    
    for table_idx, row_idx, col_idx, label in tables_to_check:
        try:
            t_cell = template.tables[table_idx].cell(row_idx, col_idx)
            g_cell = generated.tables[table_idx].cell(row_idx, col_idx)
            
            t_font_size = None
            g_font_size = None
            
            if t_cell.paragraphs and t_cell.paragraphs[0].runs:
                t_font_size = t_cell.paragraphs[0].runs[0].font.size
            if g_cell.paragraphs and g_cell.paragraphs[0].runs:
                g_font_size = g_cell.paragraphs[0].runs[0].font.size
            
            t_size_pt = t_font_size.pt if t_font_size else "None"
            g_size_pt = g_font_size.pt if g_font_size else "None"
            
            match = "✅" if t_size_pt == g_size_pt else "❌"
            if t_size_pt != g_size_pt:
                issues.append(f"{label}: Template={t_size_pt}pt, Generated={g_size_pt}pt")
            
            print(f"{match} {label}: Template={t_size_pt}pt | Generated={g_size_pt}pt")
            
        except Exception as e:
            print(f"⚠️  {label}: Error - {e}")
    
    print("\n" + "=" * 70)
    print("STRUCTURE COMPARISON")
    print("=" * 70)
    
    print(f"Template Tables: {len(template.tables)}")
    print(f"Generated Tables: {len(generated.tables)}")
    
    for i in range(min(len(template.tables), len(generated.tables))):
        t = template.tables[i]
        g = generated.tables[i]
        match = "✅" if len(t.rows) == len(g.rows) and len(t.columns) == len(g.columns) else "❌"
        print(f"{match} Table {i}: Template {len(t.rows)}x{len(t.columns)} | Generated {len(g.rows)}x{len(g.columns)}")
    
    print("\n" + "=" * 70)
    print("CONTENT SAMPLE FROM GENERATED")
    print("=" * 70)
    
    t1 = generated.tables[1]
    print(f"Kode: {t1.cell(1, 0).text}")
    print(f"Nama: {t1.cell(1, 1).text}")
    print(f"SKS: {t1.cell(1, 3).text}")
    print(f"Semester: {t1.cell(1, 4).text}")
    
    t3 = generated.tables[3]
    print(f"\nMinggu 1 Topik: {t3.cell(4, 2).text[:50]}...")
    print(f"Minggu 8 (UTS): {t3.cell(11, 1).text[:50]}...")
    print(f"Minggu 16 (UAS): {t3.cell(19, 1).text[:50]}...")
    
    print("\n" + "=" * 70)
    if issues:
        print("⚠️  FONT SIZE ISSUES FOUND:")
        for issue in issues:
            print(f"   - {issue}")
    else:
        print("✅ ALL FONT SIZES PRESERVED!")
    print("=" * 70)
    
    print(f"\nFile Sizes:")
    print(f"   Template: {os.path.getsize(template_path) / 1024:.1f} KB")
    print(f"   Generated: {os.path.getsize(generated_path) / 1024:.1f} KB")


if __name__ == "__main__":
    check_font_preservation("RPS.docx", "RPS_OOP_test.docx")
