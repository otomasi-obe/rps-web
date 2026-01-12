#!/usr/bin/env python3
"""
AI to JSON Generator
====================
Generate RPS content from AI (OpenAI GPT) and convert to JSON format.
Handles communication with OpenAI API and parsing responses.
"""

import json
import time
from typing import Optional
from openai import OpenAI


class AIToJSON:
    """Generate RPS JSON content using OpenAI API."""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize AI to JSON generator.
        
        Args:
            api_key: Optional API key. If not provided, will load from api_openai.txt
        """
        self.api_key = api_key
        self.client = None
        self.model = "gpt-5-mini-2025-08-07"
        
        if not api_key:
            self._load_api_key()
        
        if self.api_key:
            self._init_client()
    
    def _load_api_key(self) -> bool:
        """Load OpenAI API key from .env.local or api_openai.txt file."""
        try:
            import os
            
            # Try loading from .env.local first (parent directory)
            script_dir = os.path.dirname(os.path.abspath(__file__))
            parent_dir = os.path.dirname(script_dir)
            env_file = os.path.join(parent_dir, '.env.local')
            
            if os.path.exists(env_file):
                with open(env_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        if line.startswith('OPENAI_API_KEY='):
                            self.api_key = line.split('=', 1)[1].strip()
                            if self.api_key:
                                print("✅ OpenAI API key loaded from .env.local")
                                return True
            
            # Fallback to api_openai.txt
            api_file_path = os.path.join(script_dir, 'api_openai.txt')
            if os.path.exists(api_file_path):
                with open(api_file_path, 'r', encoding='utf-8') as f:
                    self.api_key = f.read().strip()
                
                if self.api_key:
                    print("✅ OpenAI API key loaded from api_openai.txt")
                    return True
            
            print("❌ API key not found in .env.local or api_openai.txt")
            return False
        except FileNotFoundError:
            print("❌ api_openai.txt file not found")
            return False
        except Exception as e:
            print(f"❌ Error loading API key: {e}")
            return False
    
    def _init_client(self) -> bool:
        """Initialize OpenAI client."""
        try:
            self.client = OpenAI(api_key=self.api_key)
            print("✅ OpenAI client initialized")
            return True
        except Exception as e:
            print(f"❌ Error initializing OpenAI client: {e}")
            return False
    
    def generate_prompt(self, course_name: str, course_code: str, sks: int, 
                       semester: int, status: str = "Mata Kuliah Wajib", 
                       prereq: str = "-", additional_context: str = "") -> str:
        """Generate prompt for OpenAI to create complete RPS content."""
        
        return f"""Anda adalah ahli kurikulum pendidikan tinggi Indonesia. Buatkan Rencana Pembelajaran Semester (RPS) lengkap untuk mata kuliah berikut:

## Informasi Mata Kuliah:
- Nama: {course_name}
- Kode: {course_code}
- SKS: {sks}
- Semester: {semester}
- Status: {status}
- Prasyarat: {prereq}

{f"## Konteks Tambahan:{chr(10)}{additional_context}{chr(10)}" if additional_context.strip() else ""}

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
    
    def parse_json_response(self, response: str) -> dict:
        """Parse JSON from OpenAI response, handle markdown code blocks."""
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
    
    def send_message(self, prompt: str, max_retries: int = 3) -> Optional[str]:
        """
        Send message to OpenAI and get response.
        
        Args:
            prompt: The prompt to send
            max_retries: Maximum number of retries on failure
            
        Returns:
            Response text or None if failed
        """
        if not self.client:
            print("❌ OpenAI client not initialized")
            return None
        
        for attempt in range(max_retries):
            try:
                print(f"🤖 Sending message to OpenAI (attempt {attempt + 1}/{max_retries})...")
                
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "You are an expert in Indonesian higher education curriculum design."},
                        {"role": "user", "content": prompt}
                    ]
                )
                
                if response.choices and len(response.choices) > 0:
                    content = response.choices[0].message.content
                    if content:
                        print(f"✅ Received response from OpenAI ({len(content)} chars)")
                        return content
                
                print("⚠️ Empty response from OpenAI")
                return None
                
            except Exception as e:
                print(f"❌ Error on attempt {attempt + 1}: {e}")
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt  # Exponential backoff
                    print(f"⏳ Waiting {wait_time} seconds before retry...")
                    time.sleep(wait_time)
                else:
                    print("❌ All retry attempts failed")
                    return None
        
        return None
    
    def generate_rps_json(self, course_name: str, course_code: str, sks: int, 
                         semester: int, status: str = "Mata Kuliah Wajib", 
                         prereq: str = "-", additional_context: str = "") -> Optional[dict]:
        """
        Generate complete RPS content as JSON.
        
        Args:
            course_name: Name of the course
            course_code: Course code
            sks: Number of credits
            semester: Semester number
            status: Course status (Wajib/Pilihan)
            prereq: Prerequisites
            additional_context: Additional context for AI generation
            
        Returns:
            Dictionary with RPS data or None if failed
        """
        print(f"\n📝 Generating RPS for: {course_name}")
        print("=" * 60)
        
        prompt = self.generate_prompt(course_name, course_code, sks, semester, status, prereq, additional_context)
        response = self.send_message(prompt)
        
        if not response:
            print("❌ Failed to get response from OpenAI")
            return None
        
        try:
            rps_data = self.parse_json_response(response)
            print("✅ RPS JSON generated successfully!")
            print(f"   - CPL: {len(rps_data.get('cpl', []))} items")
            print(f"   - CPMK: {len(rps_data.get('cpmk', []))} items")
            print(f"   - Minggu: {len(rps_data.get('minggu', []))} weeks")
            print(f"   - Penilaian: {len(rps_data.get('penilaian', []))} components")
            print(f"   - Referensi: {len(rps_data.get('referensi', []))} items")
            return rps_data
        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse JSON: {e}")
            print(f"Response preview: {response[:500]}...")
            return None
    
    def generate_cpl_json(self, course_name: str, course_code: str, sks: int,
                         semester: int, deskripsi: str = "", additional_context: str = "") -> Optional[list]:
        """Generate CPL (Capaian Pembelajaran Lulusan) only."""
        print(f"\n🎯 Generating CPL for: {course_name}")
        
        prompt = f"""Anda adalah ahli kurikulum pendidikan tinggi Indonesia. 

## Mata Kuliah:
- Nama: {course_name}
- Kode: {course_code}
- SKS: {sks}
- Semester: {semester}
{f"- Deskripsi: {deskripsi}" if deskripsi else ""}

{f"## Konteks Tambahan:{chr(10)}{additional_context}{chr(10)}" if additional_context.strip() else ""}

Buatkan daftar CPL (Capaian Pembelajaran Lulusan) yang relevan untuk mata kuliah ini. CPL adalah kompetensi yang diharapkan dimiliki mahasiswa setelah lulus dari program studi.

Format output JSON murni tanpa markdown:
[
    {{"kode": "CPL3", "pernyataan": "Mampu menerapkan pengetahuan..."}},
    {{"kode": "CPL4", "pernyataan": "Mampu merancang solusi..."}},
    {{"kode": "CPL10", "pernyataan": "Mampu bekerja sama dalam tim..."}}
]

Buatkan 3-5 CPL yang spesifik dan relevan. Output JSON saja."""
        
        response = self.send_message(prompt)
        if not response:
            return None
        
        try:
            cpl_data = self.parse_json_response(response)
            print(f"✅ Generated {len(cpl_data)} CPL items")
            return cpl_data
        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse JSON: {e}")
            return None
    
    def generate_cpmk_json(self, course_name: str, course_code: str, sks: int,
                          semester: int, deskripsi: str = "", cpl_list: list = None,
                          additional_context: str = "") -> Optional[list]:
        """Generate CPMK (Capaian Pembelajaran Mata Kuliah) only."""
        print(f"\n📊 Generating CPMK for: {course_name}")
        
        cpl_info = ""
        if cpl_list:
            cpl_info = "\n## CPL yang sudah ada:\n" + "\n".join([f"- {c.get('kode', '')}: {c.get('pernyataan', '')}" for c in cpl_list])
        
        prompt = f"""Anda adalah ahli kurikulum pendidikan tinggi Indonesia.

## Mata Kuliah:
- Nama: {course_name}
- Kode: {course_code}
- SKS: {sks}
- Semester: {semester}
{f"- Deskripsi: {deskripsi}" if deskripsi else ""}

{cpl_info}

{f"## Konteks Tambahan:{chr(10)}{additional_context}{chr(10)}" if additional_context.strip() else ""}

Buatkan daftar CPMK (Capaian Pembelajaran Mata Kuliah) yang spesifik untuk mata kuliah ini. CPMK adalah kompetensi yang diharapkan dikuasai mahasiswa setelah menyelesaikan mata kuliah ini.

Format output JSON murni tanpa markdown:
[
    {{"kode": "CPMK 1", "pernyataan": "Mahasiswa mampu menjelaskan...", "mapping_cpl": "CPL3"}},
    {{"kode": "CPMK 2", "pernyataan": "Mahasiswa mampu menerapkan...", "mapping_cpl": "CPL4"}},
    {{"kode": "CPMK 3", "pernyataan": "Mahasiswa mampu menganalisis...", "mapping_cpl": "CPL4"}},
    {{"kode": "CPMK 4", "pernyataan": "Mahasiswa mampu merancang...", "mapping_cpl": "CPL10"}}
]

Buatkan 4-6 CPMK yang terukur dan spesifik. Pastikan mapping_cpl sesuai dengan CPL yang ada. Output JSON saja."""
        
        response = self.send_message(prompt)
        if not response:
            return None
        
        try:
            cpmk_data = self.parse_json_response(response)
            print(f"✅ Generated {len(cpmk_data)} CPMK items")
            return cpmk_data
        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse JSON: {e}")
            return None
    
    def generate_weekly_plan_json(self, course_name: str, course_code: str, sks: int,
                                  semester: int, deskripsi: str = "", cpmk_list: list = None,
                                  additional_context: str = "") -> Optional[list]:
        """Generate rencana pembelajaran mingguan (16 minggu) only."""
        print(f"\n📅 Generating Weekly Plan for: {course_name}")
        
        cpmk_info = ""
        if cpmk_list:
            cpmk_info = "\n## CPMK yang sudah ada:\n" + "\n".join([f"- {c.get('kode', '')}: {c.get('pernyataan', '')}" for c in cpmk_list])
        
        prompt = f"""Anda adalah ahli kurikulum pendidikan tinggi Indonesia.

## Mata Kuliah:
- Nama: {course_name}
- Kode: {course_code}
- SKS: {sks}
- Semester: {semester}
{f"- Deskripsi: {deskripsi}" if deskripsi else ""}

{cpmk_info}

{f"## Konteks Tambahan:{chr(10)}{additional_context}{chr(10)}" if additional_context.strip() else ""}

Buatkan rencana pembelajaran mingguan untuk 16 minggu. Minggu 8 adalah UTS dan Minggu 16 adalah UAS.

Format output JSON murni tanpa markdown:
[
    {{"minggu": 1, "cpmk": "CPMK 1", "topik": "Pengenalan dan konsep dasar", "metode": "TM SCL / Demo", "waktu": "3x50'", "pengalaman": "Menyimak penjelasan dan mengamati demo", "indikator": "Mampu menjelaskan konsep", "bobot": "5"}},
    {{"minggu": 2, "cpmk": "CPMK 1", "topik": "Praktik hands-on topik 1", "metode": "Hands-on", "waktu": "3x50'", "pengalaman": "Praktik langsung", "indikator": "Implementasi dasar berhasil", "bobot": "5"}},
    ...
    {{"minggu": 8, "cpmk": "UTS", "topik": "Ujian Tengah Semester: evaluasi materi minggu 1-7", "metode": "Uji praktik / Tertulis", "waktu": "3x50'", "pengalaman": "Mengerjakan soal ujian", "indikator": "Fungsi sesuai spesifikasi", "bobot": "15"}},
    ...
    {{"minggu": 16, "cpmk": "UAS", "topik": "Ujian Akhir Semester: demo proyek dan evaluasi keseluruhan", "metode": "Demo / Presentasi", "waktu": "3x50'", "pengalaman": "Demo proyek dan Q&A", "indikator": "Sistem bekerja, argumentasi baik", "bobot": "15"}}
]

Total bobot harus 100%. Pastikan konten relevan dengan "{course_name}". Output JSON saja."""
        
        response = self.send_message(prompt)
        if not response:
            return None
        
        try:
            weekly_data = self.parse_json_response(response)
            print(f"✅ Generated {len(weekly_data)} weeks of content")
            return weekly_data
        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse JSON: {e}")
            return None
    
    def generate_references_json(self, course_name: str, course_code: str,
                                additional_context: str = "") -> Optional[list]:
        """Generate daftar referensi only."""
        print(f"\n📚 Generating References for: {course_name}")
        
        prompt = f"""Anda adalah ahli kurikulum pendidikan tinggi Indonesia.

## Mata Kuliah:
- Nama: {course_name}
- Kode: {course_code}

{f"## Konteks Tambahan:{chr(10)}{additional_context}{chr(10)}" if additional_context.strip() else ""}

Buatkan daftar referensi (buku, jurnal, dokumentasi) yang relevan untuk mata kuliah ini. Berikan referensi yang nyata dan dapat diakses.

Format output JSON murni tanpa markdown:
[
    "Judul Buku 1, Penulis, Penerbit, Tahun",
    "Judul Buku 2, Penulis, Penerbit, Tahun",
    "Judul Jurnal/Paper, Penulis, Journal Name, Tahun",
    "Dokumentasi/Website: URL atau nama resource",
    "Referensi tambahan yang relevan"
]

Buatkan 5-8 referensi yang berkualitas dan relevan dengan "{course_name}". Output JSON saja."""
        
        response = self.send_message(prompt)
        if not response:
            return None
        
        try:
            references_data = self.parse_json_response(response)
            print(f"✅ Generated {len(references_data)} references")
            return references_data
        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse JSON: {e}")
            return None


# Standalone usage
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate RPS JSON using OpenAI")
    parser.add_argument("--course", default="Praktikum Mekatronika dan Robotika", help="Course name")
    parser.add_argument("--code", default="MK001", help="Course code")
    parser.add_argument("--sks", type=int, default=2, help="SKS")
    parser.add_argument("--semester", type=int, default=4, help="Semester")
    parser.add_argument("--status", default="Mata Kuliah Wajib", help="Course status")
    parser.add_argument("--prereq", default="Dasar Elektronika & Pemrograman", help="Prerequisites")
    parser.add_argument("--output", default="rps_generated.json", help="Output JSON file")
    
    args = parser.parse_args()
    
    print("🚀 AI to JSON Generator")
    print("=" * 60)
    
    generator = AIToJSON()
    rps_data = generator.generate_rps_json(
        course_name=args.course,
        course_code=args.code,
        sks=args.sks,
        semester=args.semester,
        status=args.status,
        prereq=args.prereq
    )
    
    if rps_data:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(rps_data, f, ensure_ascii=False, indent=2)
        print(f"\n✅ JSON saved to: {args.output}")
    else:
        print("\n❌ Failed to generate RPS JSON")
