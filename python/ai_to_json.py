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
        """Initialize OpenAI client with extended timeout."""
        try:
            # Set longer timeout for large RPS generation requests (10 minutes)
            self.client = OpenAI(api_key=self.api_key, timeout=600.0)
            print("✅ OpenAI client initialized with 10-minute timeout")
            return True
        except Exception as e:
            print(f"❌ Error initializing OpenAI client: {e}")
            return False
    
    def generate_prompt(self, course_name: str, course_code: str, sks: int, 
                       semester: int, status: str = "Mata Kuliah Wajib", 
                       prereq: str = "-", additional_context: str = "") -> str:
        """Generate prompt for OpenAI to create complete RPS content matching template structure."""
        
        # Use string formatting to avoid f-string issues
        context_section = ""
        if additional_context.strip():
            context_section = f"## Konteks Tambahan:\n{additional_context}\n"
        
        prompt_template = """Anda adalah ahli kurikulum pendidikan tinggi Indonesia. Buatkan Rencana Pembelajaran Semester (RPS) lengkap untuk mata kuliah berikut:

## Informasi Mata Kuliah:
- Nama: {course_name}
- Kode: {course_code}
- SKS: {sks}
- Semester: {semester}
- Status: {status}
- Prasyarat: {prereq}

{context_section}

## Instruksi:
Buatkan RPS dalam format JSON dengan struktur PERSIS seperti berikut. PENTING: Hanya output JSON murni tanpa markdown code block.

{{
  "deskripsi": "Deskripsi mata kuliah 3-5 kalimat yang menjelaskan tujuan, cakupan, dan manfaat mata kuliah ini bagi mahasiswa",
  
  "cpl": [
    {{"kode": "CPL3", "pernyataan": "Capaian Pembelajaran Lulusan yang relevan dengan mata kuliah", "ik_kode": "IK 3-1", "ik_pernyataan": "Indikator kinerja spesifik untuk CPL3"}},
    {{"kode": "CPL4", "pernyataan": "Capaian Pembelajaran Lulusan yang relevan dengan mata kuliah", "ik_kode": "IK 4-1", "ik_pernyataan": "Indikator kinerja spesifik untuk CPL4"}},
    {{"kode": "CPL10", "pernyataan": "Capaian Pembelajaran Lulusan yang relevan dengan mata kuliah", "ik_kode": "IK 10-1", "ik_pernyataan": "Indikator kinerja spesifik untuk CPL10"}}
  ],
  
  "cpmk": [
    {{"kode": "CPMK 1", "pernyataan": "Mahasiswa mampu [capaian spesifik 1]", "mapping_cpl": "CPL3"}},
    {{"kode": "CPMK 2", "pernyataan": "Mahasiswa mampu [capaian spesifik 2]", "mapping_cpl": "CPL3"}},
    {{"kode": "CPMK 3", "pernyataan": "Mahasiswa mampu [capaian spesifik 3]", "mapping_cpl": "CPL4"}}
  ],
  
  "minggu": [
    {{"mingguKe": 1, "kemampuanAkhir": "CPMK 1", "bahanKajian": "Topik minggu 1", "metodePembelajaran": {{"metode": "Ceramah", "deskripsi": "penjelasan metode pembelajaran", "aktivitas": "Penjelasan aktivitas pembelajaran mahasiswa"}}, "waktu": "1x50'", "pengalamanBelajar": "pengalaman belajar mahasiswa", "penilaian": {{"kriteria": "kriteria indikator pencapaian", "bobot": 5}}}},
    {{"mingguKe": 8, "kemampuanAkhir": "UTS", "bahanKajian": "UTS - Ujian Tengah Semester", "metodePembelajaran": {{"metode": "Ujian", "deskripsi": "Penilaian tertulis atau praktik komprehensif mencakup seluruh materi evaluasi penguasaan kompetensi", "aktivitas": "Pelaksanaan ujian tulis atau praktik sesuai jadwal akademik"}}, "waktu": "3x50'", "pengalamanBelajar": "UTS", "penilaian": {{"kriteria": "UTS", "bobot": 15}}}},
    {{"mingguKe": 16, "kemampuanAkhir": "UAS", "bahanKajian": "UAS - Ujian Akhir Semester", "metodePembelajaran": {{"metode": "Ujian", "deskripsi": "Penilaian akhir semester melalui demo proyek integrasi presentasi hasil pembelajaran keseluruhan", "aktivitas": "Pelaksanaan ujian tulis atau praktik sesuai jadwal akademik"}}, "waktu": "3x50'", "pengalamanBelajar": "UAS", "penilaian": {{"kriteria": "UAS", "bobot": 20}}}}
  ],
  
  "penilaian": [
    {{"komponen": "Aktivitas Partisipatif", "bobot": "20%", "kriteria": "Kehadiran, partisipasi aktif, disiplin, dan kontribusi dalam diskusi", "cpmk1": "5%", "cpmk2": "5%", "cpmk3": "5%"}},
    {{"komponen": "Project/ Problem/ Case Based Learning", "bobot": "30%", "kriteria": "Analisis kasus, kualitas laporan, dan presentasi", "cpmk1": "", "cpmk2": "10%", "cpmk3": "10%"}},
    {{"komponen": "Kuis", "bobot": "10%", "kriteria": "Pemahaman materi dan pengembangan konsep", "cpmk1": "5%", "cpmk2": "", "cpmk3": ""}},
    {{"komponen": "UTS", "bobot": "20%", "kriteria": "Ujian Tengah Semester", "cpmk1": "10%", "cpmk2": "10%", "cpmk3": ""}},
    {{"komponen": "UAS", "bobot": "20%", "kriteria": "Ujian Akhir Semester", "cpmk1": "", "cpmk2": "", "cpmk3": "10%"}}
  ],
  
  "assessment_summary": {{"total_bobot": "100%", "cpmk1_total": "20%", "cpmk2_total": "25%", "cpmk3_total": "25%"}},
  
  "media_assessment": {{"qui": "10%", "prs": "20%", "pro": "30%", "uts": "20%", "uas": "20%"}},
  
  "cpl_cpmk_mapping": [
    {{"cpl": "CPL3", "ik": "IK 3-1", "ik_pernyataan": "Indikator kinerja untuk CPL3", "cpmk": "CPMK 1", "cpmk_pernyataan": "Pernyataan CPMK 1", "bobot": "20%", "media": "Kuis, Tugas Kasus, Project Kelompok, UTS, UAS", "qui": "5", "prs": "5", "pro": "", "uts": "10", "uas": ""}},
    {{"cpl": "CPL3", "ik": "IK 3-2", "ik_pernyataan": "Indikator kinerja untuk CPL3", "cpmk": "CPMK 2", "cpmk_pernyataan": "Pernyataan CPMK 2", "bobot": "25%", "media": "Tugas Makalah, Aktivitas Partisipatif, UTS", "qui": "", "prs": "5", "pro": "10", "uts": "10", "uas": ""}},
    {{"cpl": "CPL4", "ik": "IK 4-1", "ik_pernyataan": "Indikator kinerja untuk CPL4", "cpmk": "CPMK 3", "cpmk_pernyataan": "Pernyataan CPMK 3", "bobot": "25%", "media": "Aktivitas Partisipatif, Final Project, UAS", "qui": "", "prs": "5", "pro": "10", "uts": "", "uas": "10"}},
    {{"cpl": "CPL10", "ik": "IK 10-1", "ik_pernyataan": "Indikator kinerja untuk CPL10", "cpmk": "CPMK 4", "cpmk_pernyataan": "Pernyataan CPMK 4", "bobot": "30%", "media": "Kuis, Tugas Esai, UAS", "qui": "5", "prs": "5", "pro": "10", "uts": "", "uas": "10"}}
  ],
  
  "referensi": [
    "Buku referensi utama 1 dengan penulis dan penerbit",
    "Buku referensi utama 2 dengan penulis dan penerbit", 
    "Buku referensi pendukung 3",
    "Dokumentasi atau sumber online relevan",
    "Jurnal atau publikasi terkait"
  ],
  
  "metode_pembelajaran": [
    "Ceramah",
    "Diskusi",
    "Kuis",
    "Tugas",
    "Presentasi",
    "Praktikum"
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
}}

## Catatan Penting:
1. Minggu 8 = UTS, Minggu 16 = UAS
2. Total bobot penilaian = 100%
3. Setiap CPMK memetakan ke CPL
4. Konten harus relevan dengan "{course_name}"
5. Gunakan bahasa Indonesia yang baik dan akademis
6. Pastikan semua 16 minggu terisi lengkap
7. WAJIB untuk setiap minggu (selain UTS/UAS):
   - "metodePembelajaran.metode": pilih 1 dari: Ceramah, Diskusi, Kuis, Tugas, Presentasi, Praktikum
    - "metodePembelajaran.deskripsi": HARUS 20 kata penjelasan metode pembelajaran
    - "metodePembelajaran.aktivitas": HARUS 20 kata penjelasan aktivitas pembelajaran
    - "pengalamanBelajar": HARUS 20 kata pengalaman belajar mahasiswa
    - "penilaian.kriteria": HARUS 20 kata kriteria indikator pencapaian
8. Struktur minggu harus mengikuti format EXACT (gunakan mingguKe, bukan minggu):
   {{
     "mingguKe": nomor,
     "kemampuanAkhir": "CPMK X",
     "bahanKajian": "topik pembelajaran",
      "metodePembelajaran": {{"metode": "Metode", "deskripsi": "deskripsi 20 kata", "aktivitas": "aktivitas pembelajaran 20 kata"}},
     "waktu": "3x50'",
      "pengalamanBelajar": "pengalaman 20 kata",
      "penilaian": {{"kriteria": "kriteria 20 kata", "bobot": nilai}}
   }}
9. Berikan referensi buku yang nyata dan relevan

Output JSON saja, tanpa markdown formatting atau penjelasan."""
        
        return prompt_template.format(
            course_name=course_name,
            course_code=course_code,
            sks=sks,
            semester=semester,
            status=status,
            prereq=prereq,
            context_section=context_section
        )
    
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
                print(f"   Prompt length: {len(prompt)} chars")
                print(f"   Model: {self.model}")
                print(f"   Waiting for response...")
                
                # Don't use temperature parameter with gpt-5-mini model - it only supports default (1)
                # Use default parameters for maximum compatibility
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
                error_str = str(e)
                print(f"❌ Error on attempt {attempt + 1}: {error_str}")
                
                # Check if it's a timeout or rate limit error
                if 'timeout' in error_str.lower() or 'timed out' in error_str.lower():
                    print(f"   ⏱️ Timeout detected, retrying with exponential backoff...")
                elif 'rate_limit' in error_str.lower() or '429' in error_str:
                    print(f"   🔄 Rate limit detected, waiting longer before retry...")
                
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt) * 3  # Exponential backoff with longer base wait
                    print(f"⏳ Waiting {wait_time} seconds before retry...")
                    time.sleep(wait_time)
                else:
                    print("❌ All retry attempts failed")
                    import traceback
                    traceback.print_exc()
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

PENTING: Jumlah CPMK harus FLEKSIBEL antara 1-4 items berdasarkan kompleksitas mata kuliah dan CPL yang ada:
- Mata kuliah sederhana: 1-2 CPMK
- Mata kuliah standar: 2-3 CPMK  
- Mata kuliah kompleks: 3-4 CPMK

Format output JSON murni tanpa markdown:
[
    {{"kode": "CPMK 1", "pernyataan": "Mahasiswa mampu menjelaskan...", "mapping_cpl": "CPL3"}},
    {{"kode": "CPMK 2", "pernyataan": "Mahasiswa mampu menerapkan...", "mapping_cpl": "CPL4"}},
    {{"kode": "CPMK 3", "pernyataan": "Mahasiswa mampu menganalisis...", "mapping_cpl": "CPL4"}}
]

Buatkan CPMK yang terukur dan spesifik. Pastikan mapping_cpl sesuai dengan CPL yang ada. Output JSON saja."""
        
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

WAJIB (selain UTS/UAS):
- "metodePembelajaran.metode": pilih 1 dari: Ceramah, Diskusi, Kuis, Tugas, Presentasi, Praktikum
- "metodePembelajaran.deskripsi": HARUS 20 kata penjelasan metode pembelajaran
- "metodePembelajaran.aktivitas": HARUS 20 kata penjelasan aktivitas pembelajaran
- "pengalamanBelajar": HARUS 20 kata pengalaman belajar mahasiswa
- "penilaian.kriteria": HARUS 20 kata kriteria indikator pencapaian

Format JSON murni (EXACT field names: mingguKe, kemampuanAkhir, bahanKajian):
[{{"mingguKe": 1, "kemampuanAkhir": "CPMK 1", "bahanKajian": "Pengenalan dan konsep dasar", "metodePembelajaran": {{"metode": "Ceramah", "deskripsi": "Penyampaian konsep fundamental melalui presentasi interaktif dengan melibatkan mahasiswa dalam diskusi materi", "aktivitas": "Mendengarkan penjelasan konsep dasar dan diskusi mendalam tentang prinsip fundamental mata kuliah"}}, "waktu": "3x50'", "pengalamanBelajar": "Memahami terminologi dasar mengingat definisi konsep fundamental mengikuti presentasi diskusi kelas", "penilaian": {{"kriteria": "Pemahaman konsep dasar ketepatan definisi keterlibatan dalam diskusi kelas penerimaan nilai", "bobot": 5}}}},{{"mingguKe": 2, "kemampuanAkhir": "CPMK 1", "bahanKajian": "Praktik hands-on topik 1", "metodePembelajaran": {{"metode": "Praktikum", "deskripsi": "Kegiatan praktik langsung di laboratorium untuk mengaplikasikan teori dan mengembangkan keterampilan hands-on", "aktivitas": "Melaksanakan praktikum hands-on mengaplikasikan teori mengerjakan tugas praktis melakukan observasi mencatat hasil"}}, "waktu": "3x50'", "pengalamanBelajar": "Mengerjakan praktikum melakukan observasi mencatat data menganalisis hasil eksperimen melaporkan temuan", "penilaian": {{"kriteria": "Ketepatan praktikum kualitas data kualitas laporan kedalaman analisis ketepatan kesimpulan hasil", "bobot": 5}}}},{{"mingguKe": 8, "kemampuanAkhir": "UTS", "bahanKajian": "Ujian Tengah Semester: evaluasi materi minggu 1-7", "metodePembelajaran": {{"metode": "Ujian", "deskripsi": "Penilaian tertulis atau praktik komprehensif mencakup seluruh materi semester untuk mengukur kompetensi", "aktivitas": "Pelaksanaan ujian tulis atau praktik sesuai jadwal akademik evaluasi penguasaan materi"}}, "waktu": "3x50'", "pengalamanBelajar": "UTS", "penilaian": {{"kriteria": "UTS", "bobot": 15}}}},{{"mingguKe": 16, "kemampuanAkhir": "UAS", "bahanKajian": "Ujian Akhir Semester: demo proyek dan evaluasi keseluruhan", "metodePembelajaran": {{"metode": "Ujian", "deskripsi": "Penilaian akhir semester melalui demo proyek integrasi dan presentasi hasil pembelajaran keseluruhan", "aktivitas": "Pelaksanaan ujian akhir semester termasuk demo proyek dan presentasi hasil pembelajaran akhir"}}, "waktu": "3x50'", "pengalamanBelajar": "UAS", "penilaian": {{"kriteria": "UAS", "bobot": 20}}}}]

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
