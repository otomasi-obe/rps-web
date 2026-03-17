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
        """Load OpenAI API key from environment, .env, .env.local, or api_openai.txt."""
        try:
            import os

            # 1. Environment variable (injected by PM2/systemd/shell)
            self.api_key = os.environ.get('OPENAI_API_KEY', '').strip()
            if self.api_key:
                print("✅ OpenAI API key loaded from environment variable")
                return True

            script_dir = os.path.dirname(os.path.abspath(__file__))
            parent_dir = os.path.dirname(script_dir)

            # 2. Try .env (root project file)
            for env_name in ['.env', '.env.local']:
                env_file = os.path.join(parent_dir, env_name)
                if os.path.exists(env_file):
                    with open(env_file, 'r', encoding='utf-8') as f:
                        for line in f:
                            line = line.strip()
                            if line.startswith('OPENAI_API_KEY=') and not line.startswith('#'):
                                self.api_key = line.split('=', 1)[1].strip().strip('"').strip("'")
                                if self.api_key:
                                    print(f"✅ OpenAI API key loaded from {env_name}")
                                    return True

            # 3. Fallback to api_openai.txt
            api_file_path = os.path.join(script_dir, 'api_openai.txt')
            if os.path.exists(api_file_path):
                with open(api_file_path, 'r', encoding='utf-8') as f:
                    self.api_key = f.read().strip()
                if self.api_key:
                    print("✅ OpenAI API key loaded from api_openai.txt")
                    return True

            print("❌ API key not found in env var, .env, .env.local, or api_openai.txt")
            return False
        except Exception as e:
            print(f"❌ Error loading API key: {e}")
            return False
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
- konteks tambahan:
{context_section}

## Instruksi:
Buatkan RPS dalam format JSON dengan struktur PERSIS seperti berikut. PENTING: Hanya output JSON murni tanpa markdown code block.

{{
  "deskripsi": "Deskripsi mata kuliah 3-5 kalimat yang menjelaskan tujuan, cakupan, dan manfaat mata kuliah ini bagi mahasiswa",
  
  "cpl": [
	{{"kode": "CPL 1", "pernyataan": "Capaian Pembelajaran Lulusan yang relevan dengan mata kuliah"}},
  ],
  
  "ik": [
	{{"kode": "IK 1-1", 
		"pernyataan": "Indikator kinerja spesifik untuk CPL 1 dan CPMK 1-1", 
		"mapping_cpl": "CPL 1",
		"mapping_cpmk": "CPMK 1-1"
    }}
  ],

  "cpmk": [
	{{"kode": "CPMK 1-1", "pernyataan": "Mahasiswa mampu [capaian spesifik 1-1]", 
		"mapping_cpl": "CPL 1", "N1": 5,"N2": 5,"N3": 5,"N4": 5,"N5": 0,"N_cpmk": 30}},
  ],

  "minggu": [
	{{"mingguKe": 1, 
		"kemampuanAkhir": "CPMK 1-1", 
		"bahanKajian": "Topik minggu 1", 
		"metodePembelajaran": {{"metode": "TM SCL", 
		"deskripsi": "peran dosen dalam metode pembelajaran", 
		"aktivitas": "aktivitas mahasiswa dalam metode pembelajaran"}}, 
		"waktu": "TM Ceramah 1x50', Kuis, Tugas Mandiri", 
		"pengalamanBelajar": "pengalaman belajar mahasiswa", 
		"penilaian": {{"kriteria": "kriteria indikator pencapaian", 
		"bobotMateri": 5}}}},
	{{"mingguKe": 8, "kemampuanAkhir": "UTS"}},
	{{"mingguKe": 16, "kemampuanAkhir": "UAS"}},   
	],
    
  "referensi": [
	"Buku/Jurnal/Proceding/Website"
  ],

}}

## Catatan Penting:
. Gunakan bahasa Indonesia yang baik dan akademis
. Konten harus relevan dengan "{course_name}"
. Pastikan semua 16 minggu terisi lengkap (14 pertemuan + UTS minggu 8 + UAS minggu 16)
. Minggu 8 = UTS, Minggu 16 = UAS (hanya ada field mingguKe dan kemampuanAkhir)
. N1(Partisipatif 20%),N2(Project/ Problem/ Case Based Learning 30%),N3(Kuis 10%),N4(UTS 20%),N5(UAS 20%)
. Total N1 dari semua CPMK harus 20%, N2-N5 juga sama sesuai proporsi di atas
. Total bobot penilaian = 100% dari N_cpmk semua CPMK
. Sesuaikan jumlah CPL (3-10) dan CPMK (3-10) sesuai kompleksitas mata kuliah dan konteks tambahan
. Format kode CPL (CPL 3, CPL 8), CPMK (CPMK 3-1, CPMK 8-1), IK (IK 3-1, IK 8-1)
. Mapping: CPMK memetakan ke CPL (CPMK 3-1 → CPL 3), IK memetakan ke CPMK (IK 3-1 → CPMK 3-1)
. Setiap minggu (selain UTS/UAS) harus ada semua field lengkap
. Total bobotMateri dari semua minggu (14 pertemuan) harus 100%
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
       - TM SCL: "TM Ceramah {sks}x50', Kuis, Tugas Mandiri"
       - CBL: "CBL {sks}x50', Diskusi Kelompok, Studi Kasus"
       - PBL: "PBL {sks}x50', Diskusi Kelompok, Tugas Mandiri"
       - PjBL: "PjBL {sks}x50', Proyek Mini, Presentasi"
     * Untuk mata kuliah Praktikum (nama dimulai "Praktikum"):
       - PjBL: "Praktikum {sks}x170', Praktikum Hands-on, Laporan Praktikum"
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

        return prompt_template.format(
            course_name=course_name,
            course_code=course_code,
            sks=sks,
            semester=semester,
            status=status,
            prereq=prereq,
            context_section=context_section
        )
    
    def _repair_truncated_json(self, text: str) -> str:
        """
        Repair truncated/incomplete JSON by:
        1. Stripping any incomplete string at the end
        2. Removing trailing commas
        3. Closing unclosed brackets/braces in reverse order
        """
        import re
        # Step 1: Scan char-by-char to build a bracket stack and detect truncation
        in_string = False
        escape_next = False
        stack = []          # stack of '{' or '['
        last_close_pos = 0  # position right after the last properly closed bracket

        for i, char in enumerate(text):
            if escape_next:
                escape_next = False
                continue
            if char == '\\' and in_string:
                escape_next = True
                continue
            if char == '"':
                in_string = not in_string
                if not in_string:
                    last_close_pos = i + 1
                continue
            if in_string:
                continue
            if char in '{[':
                stack.append(char)
            elif char in '}]':
                if stack:
                    stack.pop()
                    last_close_pos = i + 1

        # If we're still inside a string (truncated mid-string), cut back to safe point
        if in_string:
            text = text[:last_close_pos]

        # Step 2: Strip trailing garbage after the last meaningful content
        text = text.rstrip()

        # Step 3: Remove trailing comma (common before truncation)
        text = re.sub(r',\s*$', '', text)

        # Step 4: Close any unclosed brackets/braces
        opener_to_closer = {'{': '}', '[': ']'}
        for opener in reversed(stack):
            # Before closing an object/array, strip trailing comma again
            text = re.sub(r',\s*$', '', text.rstrip())
            text += '\n' + opener_to_closer[opener]

        return text

    def parse_json_response(self, response: str) -> dict:
        """Parse JSON from OpenAI response, handle markdown code blocks and common JSON errors."""
        import re
        text = response.strip()
        
        # Handle ```json ... ``` format
        if text.startswith("```"):
            lines = text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines).strip()
        
        # Try direct parsing first
        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            print(f"⚠️ First JSON parse attempt failed at line {e.lineno}, col {e.colno}: {e.msg}")
            print(f"   Attempting to fix common JSON issues...")
            
            original_text = text
            
            # Fix 1: Remove control characters
            try:
                clean = ''.join(char if ord(char) >= 32 or char in '\n\r\t' else '' for char in text)
                result = json.loads(clean)
                print(f"✅ Fixed JSON by removing control characters")
                return result
            except json.JSONDecodeError:
                pass

            # Fix 2: Remove control chars + trailing commas
            try:
                clean = ''.join(char if ord(char) >= 32 or char in '\n\r\t' else '' for char in text)
                clean = re.sub(r',(\s*[}\]])', r'\1', clean)
                result = json.loads(clean)
                print(f"✅ Fixed JSON with control char removal + trailing comma removal")
                return result
            except json.JSONDecodeError as e2:
                print(f"⚠️ Trailing comma fix failed: {e2}")

            # Fix 3: Find first complete JSON object/array
            try:
                start_idx = -1
                start_char = None
                for i, char in enumerate(original_text):
                    if char in '{[':
                        start_idx = i
                        start_char = char
                        break
                
                if start_idx == -1:
                    raise ValueError("No JSON object or array found in response")
                
                end_char = '}' if start_char == '{' else ']'
                bracket_count = 0
                end_idx = -1
                in_string = False
                escape_next = False
                
                for i in range(start_idx, len(original_text)):
                    char = original_text[i]
                    if escape_next:
                        escape_next = False
                        continue
                    if char == '\\':
                        escape_next = True
                        continue
                    if char == '"':
                        in_string = not in_string
                        continue
                    if not in_string:
                        if char == start_char:
                            bracket_count += 1
                        elif char == end_char:
                            bracket_count -= 1
                            if bracket_count == 0:
                                end_idx = i
                                break
                
                if end_idx != -1:
                    json_str = original_text[start_idx:end_idx+1]
                    json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)
                    result = json.loads(json_str)
                    print(f"✅ Fixed JSON by extracting valid JSON substring")
                    return result
            except (ValueError, json.JSONDecodeError) as e3:
                print(f"⚠️ JSON extraction failed: {e3}")

            # Fix 4: Repair truncated JSON (AI cut off mid-response)
            try:
                # Start from the first { or [
                start_idx = -1
                for i, char in enumerate(original_text):
                    if char in '{[':
                        start_idx = i
                        break
                if start_idx == -1:
                    raise ValueError("No JSON start found")
                
                truncated = original_text[start_idx:]
                # Remove control characters first
                truncated = ''.join(char if ord(char) >= 32 or char in '\n\r\t' else '' for char in truncated)
                repaired = self._repair_truncated_json(truncated)
                result = json.loads(repaired)
                print(f"✅ Fixed truncated JSON by repairing unclosed brackets")
                return result
            except Exception as e4:
                print(f"⚠️ Truncation repair failed: {e4}")

            # All fixes failed
            lines = original_text.split('\n')
            print(f"❌ All JSON repair attempts failed. Response length: {len(original_text)} chars")
            print(f"   Response preview (first 500 chars):")
            print(f"   {original_text[:500]}")
            raise json.JSONDecodeError(
                f"Failed to parse JSON after multiple fix attempts: {e.msg}",
                original_text[:100],
                0
            )
    
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
                        {"role": "system", "content": "You are an expert in Indonesian higher education curriculum design. Always output complete, valid JSON without truncation."},
                        {"role": "user", "content": prompt}
                    ]
                )
                
                if response.choices and len(response.choices) > 0:
                    content = response.choices[0].message.content
                    finish_reason = response.choices[0].finish_reason
                    if content:
                        print(f"✅ Received response from OpenAI ({len(content)} chars, finish_reason={finish_reason})")
                        if finish_reason == 'length':
                            print(f"⚠️ Response was truncated by token limit! Will attempt JSON repair.")
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

Buatkan 3-10 CPL yang spesifik dan relevan sesuai kompleksitas dan konteks mata kuliah. Output JSON saja."""
        
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

PENTING: Jumlah CPMK harus FLEKSIBEL antara 1-10 items berdasarkan kompleksitas mata kuliah dan CPL yang ada:
- Mata kuliah sederhana: 2-3 CPMK
- Mata kuliah standar: 3-5 CPMK  
- Mata kuliah kompleks: 5-10 CPMK

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
