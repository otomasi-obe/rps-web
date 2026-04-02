import { OpenAI } from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as dotenv from 'dotenv';

export interface RPSData {
  deskripsi?: string;
  cpl?: any[];
  cpmk?: any[];
  ik?: any[];
  minggu?: any[];
  referensi?: any[];
  penilaian?: any[];
}

export interface RequestMetadata {
  courseName: string;
  courseCode: string;
  sks: number;
  semester: number;
  status?: string;
  prereq?: string;
  additionalContext?: string;
}

export class AIToJSON {
  private apiKey: string | null = null;
  private client: OpenAI | null = null;
  private model: string;

  public hasClient(): boolean {
    return this.client !== null;
  }

  constructor(apiKey?: string) {
    // Load environment variables from .env files
    dotenv.config();
    dotenv.config({ path: '.env.local' });

    // Load model from environment or use default
    this.model = (process.env.MODEL || 'gpt-5-mini-2025-08-07').trim();

    if (apiKey) {
      this.apiKey = apiKey;
    } else {
      this.loadApiKey();
    }

    if (this.apiKey) {
      this.initClient();
    }
  }

  private loadApiKey(): boolean {
    try {
      // 1. Environment variable
      this.apiKey = (process.env.OPENAI_API_KEY || '').trim();
      if (this.apiKey) {
        console.log('✅ OpenAI API key loaded from environment variable');
        return true;
      }

      const scriptDir = __dirname;
      const parentDir = path.dirname(scriptDir);

      // 2. Try .env or .env.local
      for (const envName of ['.env', '.env.local']) {
        const envFile = path.join(parentDir, envName);
        if (fs.existsSync(envFile)) {
          const content = fs.readFileSync(envFile, 'utf-8');
          const lines = content.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('OPENAI_API_KEY=') && !trimmed.startsWith('#')) {
              const keyValue = trimmed.split('=').slice(1).join('=');
              this.apiKey = keyValue.trim().replace(/^["']|["']$/g, '');
              if (this.apiKey) {
                console.log(`✅ OpenAI API key loaded from ${envName}`);
                return true;
              }
            }
          }
        }
      }

      // 3. Fallback to api_openai.txt
      const apiFile = path.join(scriptDir, 'api_openai.txt');
      if (fs.existsSync(apiFile)) {
        this.apiKey = fs.readFileSync(apiFile, 'utf-8').trim();
        if (this.apiKey) {
          console.log('✅ OpenAI API key loaded from api_openai.txt');
          return true;
        }
      }

      console.log('❌ API key not found in env var, .env, .env.local, or api_openai.txt');
      return false;
    } catch (error) {
      console.log(`❌ Error loading API key: ${error}`);
      return false;
    }
  }

  private initClient(): boolean {
    try {
      if (!this.apiKey) {
        console.log('❌ API key is not set');
        return false;
      }

      this.client = new OpenAI({
        apiKey: this.apiKey,
        timeout: 600000, // 10 minutes
      });
      console.log('✅ OpenAI client initialized with 10-minute timeout');
      return true;
    } catch (error) {
      console.log(`❌ Error initializing OpenAI client: ${error}`);
      return false;
    }
  }

  private generatePrompt(
    courseName: string,
    courseCode: string,
    sks: number,
    semester: number,
    status: string = 'Mata Kuliah Wajib',
    prereq: string = '-',
    additionalContext: string = ''
  ): string {
    const contextSection =
      additionalContext.trim() ? `## Konteks Tambahan:\n${additionalContext}\n` : '';

    return `Anda adalah ahli kurikulum pendidikan tinggi Indonesia. Buatkan Rencana Pembelajaran Semester (RPS) lengkap untuk mata kuliah berikut:

## Informasi Mata Kuliah:
- Nama: ${courseName}
- Kode: ${courseCode}
- SKS: ${sks}
- Semester: ${semester}
- Status: ${status}
- Prasyarat: ${prereq}
- konteks tambahan:
${contextSection}

## Instruksi:
Buatkan RPS dalam format JSON dengan struktur PERSIS seperti berikut. PENTING: Hanya output JSON murni tanpa markdown code block.

{
  "deskripsi": "Deskripsi mata kuliah 3-5 kalimat yang menjelaskan tujuan, cakupan, dan manfaat mata kuliah ini bagi mahasiswa",
  
  "cpl": [
    {"kode": "CPL 1", "pernyataan": "Capaian Pembelajaran Lulusan yang relevan dengan mata kuliah"}
  ],
  
  "ik": [
    {"kode": "IK 1-1", "pernyataan": "Indikator kinerja spesifik untuk CPL 1 dan CPMK 1-1", "mapping_cpl": "CPL 1", "mapping_cpmk": "CPMK 1-1"}
  ],

  "cpmk": [
    {"kode": "CPMK 1-1", "pernyataan": "Mahasiswa mampu [capaian spesifik 1-1]", "mapping_cpl": "CPL 1", "N1": 5, "N2": 5, "N3": 5, "N4": 5, "N5": 0, "N_cpmk": 30}
  ],

  "minggu": [
    {"mingguKe": 1, "kemampuanAkhir": "CPMK 1-1", "bahanKajian": "Topik minggu 1", "metodePembelajaran": {"metode": "TM SCL", "deskripsi": "peran dosen dalam metode pembelajaran", "aktivitas": "aktivitas mahasiswa dalam metode pembelajaran"}, "waktu": "TM Ceramah 1x50', Kuis, Tugas Mandiri", "pengalamanBelajar": "pengalaman belajar mahasiswa", "penilaian": {"kriteria": "kriteria indikator pencapaian", "bobotMateri": 5}},
    {"mingguKe": 8, "kemampuanAkhir": "UTS"},
    {"mingguKe": 16, "kemampuanAkhir": "UAS"}
  ],
    
  "referensi": [
    "Buku/Jurnal/Proceding/Website"
  ]
}

## Catatan Penting:
. Gunakan bahasa Indonesia yang baik dan akademis
. Konten harus relevan dengan "${courseName}"
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
       - TM SCL: "TM Ceramah ${sks}x50', Kuis, Tugas Mandiri"
       - CBL: "CBL ${sks}x50', Diskusi Kelompok, Studi Kasus"
       - PBL: "PBL ${sks}x50', Diskusi Kelompok, Tugas Mandiri"
       - PjBL: "PjBL ${sks}x50', Proyek Mini, Presentasi"
     * Untuk mata kuliah Praktikum (nama dimulai "Praktikum"):
       - PjBL: "Praktikum ${sks}x170', Praktikum Hands-on, Laporan Praktikum"
. Untuk mata kuliah Praktikum, gunakan metode PjBL dengan deskripsi tentang praktikum
. Variasikan metode pembelajaran di berbagai minggu (TM SCL, CBL, PBL, PjBL)
. bahanKajian harus spesifik dan bervariasi setiap minggu, tidak generik
. Referensi harus mengikuti format (Penulis,Tahun,Judul,Penerbit):
  1. Buku internasional 
  2-3. Buku nasional 
  4-5. Jurnal internasional 
  6-7. Jurnal nasional 
  8. Website/Dokumentasi resmi (Penulis,Tahun,Judul,alamat URL)
Output JSON saja, tanpa markdown formatting atau penjelasan.`;
  }

  private repairTruncatedJson(text: string): string {
    let inString = false;
    let escapeNext = false;
    const stack: string[] = [];
    let lastCompletePos = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\' && inString) {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        if (!inString) {
          lastCompletePos = i + 1;
        }
        continue;
      }

      if (inString) continue;

      if (char === '{' || char === '[') {
        stack.push(char);
      } else if (char === '}' || char === ']') {
        if (stack.length > 0) {
          stack.pop();
          lastCompletePos = i + 1;
        }
      }
    }

    // If we're in a string, close it and go back to last complete position
    if (inString) {
      // Find the last complete value before the incomplete string
      let result = text.substring(0, lastCompletePos);
      
      // Check if we need to remove trailing comma before the incomplete string
      result = result.replace(/,\s*$/, '');
      
      // Add closing brackets
      const openerToCloser: Record<string, string> = { '{': '}', '[': ']' };
      for (let i = stack.length - 1; i >= 0; i--) {
        const opener = stack[i];
        result = result.replace(/,\s*$/, '').trim();
        result += '\n' + openerToCloser[opener];
      }
      
      return result;
    } else {
      // JSON was properly closed but might be incomplete
      text = text.trim();
      text = text.replace(/,\s*$/, '');

      const openerToCloser: Record<string, string> = { '{': '}', '[': ']' };
      for (let i = stack.length - 1; i >= 0; i--) {
        const opener = stack[i];
        text = text.replace(/,\s*$/, '').trim();
        text += '\n' + openerToCloser[opener];
      }

      return text;
    }
  }

  public parseJsonResponse(response: string): any {
    let text = response.trim();

    // Handle ```json format
    if (text.startsWith('```')) {
      const lines = text.split('\n');
      if (lines[0].startsWith('```')) {
        lines.shift();
      }
      if (lines[lines.length - 1].trim() === '```') {
        lines.pop();
      }
      text = lines.join('\n').trim();
    }

    // Try direct parsing
    try {
      return JSON.parse(text);
    } catch (error: any) {
      console.log(`⚠️ First JSON parse attempt failed: ${error.message}`);
      console.log('   Attempting to fix common JSON issues...');
    }

    const original = text;

    // Fix 1: Remove control characters
    try {
      const clean = text
        .split('')
        .filter((char) => char.charCodeAt(0) >= 32 || '\n\r\t'.includes(char))
        .join('');
      const result = JSON.parse(clean);
      console.log('✅ Fixed JSON by removing control characters');
      return result;
    } catch {
      // Continue to next fix
    }

    // Fix 2: Remove control chars + trailing commas
    try {
      let clean = text
        .split('')
        .filter((char) => char.charCodeAt(0) >= 32 || '\n\r\t'.includes(char))
        .join('');
      clean = clean.replace(/,(\s*[}\]])/g, '$1');
      const result = JSON.parse(clean);
      console.log('✅ Fixed JSON with control char removal + trailing comma removal');
      return result;
    } catch {
      // Continue to next fix
    }

    // Fix 3: Extract valid JSON substring
    try {
      let startIdx = -1;
      let startChar = null;
      for (let i = 0; i < original.length; i++) {
        if (original[i] === '{' || original[i] === '[') {
          startIdx = i;
          startChar = original[i];
          break;
        }
      }

      if (startIdx === -1) {
        throw new Error('No JSON object or array found');
      }

      const endChar = startChar === '{' ? '}' : ']';
      let bracketCount = 0;
      let endIdx = -1;
      let inString = false;
      let escapeNext = false;

      for (let i = startIdx; i < original.length; i++) {
        const char = original[i];
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        if (char === '"') {
          inString = !inString;
          continue;
        }
        if (!inString) {
          if (char === startChar) {
            bracketCount++;
          } else if (char === endChar) {
            bracketCount--;
            if (bracketCount === 0) {
              endIdx = i;
              break;
            }
          }
        }
      }

      if (endIdx !== -1) {
        let jsonStr = original.slice(startIdx, endIdx + 1);
        jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
        const result = JSON.parse(jsonStr);
        console.log('✅ Fixed JSON by extracting valid JSON substring');
        return result;
      }
    } catch {
      // Continue to next fix
    }

    // Fix 4: Repair truncated JSON
    try {
      let startIdx = -1;
      for (let i = 0; i < original.length; i++) {
        if (original[i] === '{' || original[i] === '[') {
          startIdx = i;
          break;
        }
      }
      if (startIdx === -1) {
        throw new Error('No JSON start found');
      }

      let truncated = original.slice(startIdx);
      truncated = truncated
        .split('')
        .filter((char) => char.charCodeAt(0) >= 32 || '\n\r\t'.includes(char))
        .join('');
      const repaired = this.repairTruncatedJson(truncated);
      const result = JSON.parse(repaired);
      console.log('✅ Fixed truncated JSON by repairing unclosed brackets');
      return result;
    } catch {
      // All fixes failed
    }

    const lines = original.split('\n');
    console.log(`❌ All JSON repair attempts failed. Response length: ${original.length} chars`);
    console.log(`   Response preview (first 500 chars): ${original.slice(0, 500)}`);
    throw new Error(`Failed to parse JSON after multiple fix attempts`);
  }

  public async sendMessage(prompt: string, maxRetries: number = 3): Promise<string | null> {
    if (!this.client) {
      console.log('❌ OpenAI client not initialized');
      return null;
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`🤖 Sending message to OpenAI (attempt ${attempt + 1}/${maxRetries})...`);
        console.log(`   Prompt length: ${prompt.length} chars`);
        console.log(`   Model: ${this.model}`);
        console.log('   Waiting for response...');

        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert in Indonesian higher education curriculum design. Always output complete, valid JSON without truncation.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        if (response.choices && response.choices.length > 0) {
          const content = response.choices[0].message.content;
          const finishReason = response.choices[0].finish_reason;

          if (content) {
            console.log(
              `✅ Received response from OpenAI (${content.length} chars, finish_reason=${finishReason})`
            );
            if (finishReason === 'length') {
              console.log('⚠️ Response was truncated by token limit! Will attempt JSON repair.');
            }
            return content;
          }
        }

        console.log('⚠️ Empty response from OpenAI');
        return null;
      } catch (error: any) {
        const errorStr = String(error);
        console.log(`❌ Error on attempt ${attempt + 1}: ${errorStr}`);

        if (
          errorStr.toLowerCase().includes('timeout') ||
          errorStr.toLowerCase().includes('timed out')
        ) {
          console.log('   ⏱️ Timeout detected, retrying with exponential backoff...');
        } else if (
          errorStr.toLowerCase().includes('rate_limit') ||
          errorStr.includes('429')
        ) {
          console.log('   🔄 Rate limit detected, waiting longer before retry...');
        }

        if (attempt < maxRetries - 1) {
          const waitTime = Math.pow(2, attempt) * 3000; // Exponential backoff
          console.log(`⏳ Waiting ${waitTime / 1000} seconds before retry...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    console.log('❌ All retry attempts failed');
    return null;
  }

  public async generateRpsJson(
    courseName: string,
    courseCode: string,
    sks: number,
    semester: number,
    status: string = 'Mata Kuliah Wajib',
    prereq: string = '-',
    additionalContext: string = ''
  ): Promise<RPSData | null> {
    console.log(`\n📝 Generating RPS for: ${courseName}`);
    console.log('='.repeat(60));

    const prompt = this.generatePrompt(
      courseName,
      courseCode,
      sks,
      semester,
      status,
      prereq,
      additionalContext
    );

    const response = await this.sendMessage(prompt);

    if (!response) {
      console.log('❌ Failed to get response from OpenAI');
      return null;
    }

    try {
      const rpsData = this.parseJsonResponse(response) as RPSData;
      console.log('✅ RPS JSON generated successfully!');
      console.log(`   - CPL: ${(rpsData.cpl || []).length} items`);
      console.log(`   - CPMK: ${(rpsData.cpmk || []).length} items`);
      console.log(`   - Minggu: ${(rpsData.minggu || []).length} weeks`);
      console.log(`   - Penilaian: ${(rpsData.penilaian || []).length} components`);
      console.log(`   - Referensi: ${(rpsData.referensi || []).length} items`);
      return rpsData;
    } catch (error) {
      console.log(`❌ Failed to parse JSON: ${error}`);
      return null;
    }
  }

  public async generateCplJson(
    courseName: string,
    courseCode: string,
    sks: number,
    semester: number,
    deskripsi: string = '',
    additionalContext: string = ''
  ): Promise<any[] | null> {
    console.log(`\n🎯 Generating CPL for: ${courseName}`);

    const contextSection =
      additionalContext.trim() ? `## Konteks Tambahan:\n${additionalContext}\n` : '';

    const prompt = `Anda adalah ahli kurikulum pendidikan tinggi Indonesia. 

## Mata Kuliah:
- Nama: ${courseName}
- Kode: ${courseCode}
- SKS: ${sks}
- Semester: ${semester}
${deskripsi ? `- Deskripsi: ${deskripsi}` : ''}

${contextSection}

Buatkan daftar CPL (Capaian Pembelajaran Lulusan) yang relevan untuk mata kuliah ini. CPL adalah kompetensi yang diharapkan dimiliki mahasiswa setelah lulus dari program studi.

Format output JSON murni tanpa markdown:
[
    {"kode": "CPL3", "pernyataan": "Mampu menerapkan pengetahuan..."},
    {"kode": "CPL4", "pernyataan": "Mampu merancang solusi..."},
    {"kode": "CPL10", "pernyataan": "Mampu bekerja sama dalam tim..."}
]

Buatkan 3-10 CPL yang spesifik dan relevan sesuai kompleksitas dan konteks mata kuliah. Output JSON saja.`;

    const response = await this.sendMessage(prompt);
    if (!response) {
      return null;
    }

    try {
      const cplData = this.parseJsonResponse(response);
      console.log(`✅ Generated ${cplData.length} CPL items`);
      return cplData;
    } catch (error) {
      console.log(`❌ Failed to parse JSON: ${error}`);
      return null;
    }
  }

  public async generateCpmkJson(
    courseName: string,
    courseCode: string,
    sks: number,
    semester: number,
    deskripsi: string = '',
    cplList: any[] | null = null,
    additionalContext: string = ''
  ): Promise<any[] | null> {
    console.log(`\n📊 Generating CPMK for: ${courseName}`);

    const cplInfo =
      cplList && cplList.length > 0
        ? '\n## CPL yang sudah ada:\n' +
          cplList.map((c) => `- ${c.kode || ''}: ${c.pernyataan || ''}`).join('\n')
        : '';

    const contextSection =
      additionalContext.trim() ? `## Konteks Tambahan:\n${additionalContext}\n` : '';

    const prompt = `Anda adalah ahli kurikulum pendidikan tinggi Indonesia.

## Mata Kuliah:
- Nama: ${courseName}
- Kode: ${courseCode}
- SKS: ${sks}
- Semester: ${semester}
${deskripsi ? `- Deskripsi: ${deskripsi}` : ''}

${cplInfo}

${contextSection}

Buatkan daftar CPMK (Capaian Pembelajaran Mata Kuliah) yang spesifik untuk mata kuliah ini. CPMK adalah kompetensi yang diharapkan dikuasai mahasiswa setelah menyelesaikan mata kuliah ini.

PENTING: Jumlah CPMK harus FLEKSIBEL antara 1-10 items berdasarkan kompleksitas mata kuliah dan CPL yang ada:
- Mata kuliah sederhana: 2-3 CPMK
- Mata kuliah standar: 3-5 CPMK  
- Mata kuliah kompleks: 5-10 CPMK

Format output JSON murni tanpa markdown:
[
    {"kode": "CPMK 1", "pernyataan": "Mahasiswa mampu menjelaskan...", "mapping_cpl": "CPL3"},
    {"kode": "CPMK 2", "pernyataan": "Mahasiswa mampu menerapkan...", "mapping_cpl": "CPL4"},
    {"kode": "CPMK 3", "pernyataan": "Mahasiswa mampu menganalisis...", "mapping_cpl": "CPL4"}
]

Buatkan CPMK yang terukur dan spesifik. Pastikan mapping_cpl sesuai dengan CPL yang ada. Output JSON saja.`;

    const response = await this.sendMessage(prompt);
    if (!response) {
      return null;
    }

    try {
      const cpmkData = this.parseJsonResponse(response);
      console.log(`✅ Generated ${cpmkData.length} CPMK items`);
      return cpmkData;
    } catch (error) {
      console.log(`❌ Failed to parse JSON: ${error}`);
      return null;
    }
  }

  public async generateWeeklyPlanJson(
    courseName: string,
    courseCode: string,
    sks: number,
    semester: number,
    deskripsi: string = '',
    cpmkList: any[] | null = null,
    additionalContext: string = ''
  ): Promise<any[] | null> {
    console.log(`\n📅 Generating Weekly Plan for: ${courseName}`);

    const cpmkInfo =
      cpmkList && cpmkList.length > 0
        ? '\n## CPMK yang sudah ada:\n' +
          cpmkList.map((c) => `- ${c.kode || ''}: ${c.pernyataan || ''}`).join('\n')
        : '';

    const contextSection =
      additionalContext.trim() ? `## Konteks Tambahan:\n${additionalContext}\n` : '';

    const prompt = `Anda adalah ahli kurikulum pendidikan tinggi Indonesia.

## Mata Kuliah:
- Nama: ${courseName}
- Kode: ${courseCode}
- SKS: ${sks}
- Semester: ${semester}
${deskripsi ? `- Deskripsi: ${deskripsi}` : ''}

${cpmkInfo}

${contextSection}

Buatkan rencana pembelajaran mingguan untuk 16 minggu. Minggu 8 adalah UTS dan Minggu 16 adalah UAS.

WAJIB (selain UTS/UAS):
- "metodePembelajaran.metode": pilih 1 dari: Ceramah, Diskusi, Kuis, Tugas, Presentasi, Praktikum
- "metodePembelajaran.deskripsi": HARUS 20 kata penjelasan metode pembelajaran
- "metodePembelajaran.aktivitas": HARUS 20 kata penjelasan aktivitas pembelajaran
- "pengalamanBelajar": HARUS 20 kata pengalaman belajar mahasiswa
- "penilaian.kriteria": HARUS 20 kata kriteria indikator pencapaian

Format JSON murni (EXACT field names: mingguKe, kemampuanAkhir, bahanKajian):
[{"mingguKe": 1, "kemampuanAkhir": "CPMK 1", "bahanKajian": "Pengenalan dan konsep dasar", "metodePembelajaran": {"metode": "Ceramah", "deskripsi": "Penyampaian konsep fundamental melalui presentasi interaktif dengan melibatkan mahasiswa dalam diskusi materi", "aktivitas": "Mendengarkan penjelasan konsep dasar dan diskusi mendalam tentang prinsip fundamental mata kuliah"}, "waktu": "3x50'", "pengalamanBelajar": "Memahami terminologi dasar mengingat definisi konsep fundamental mengikuti presentasi diskusi kelas", "penilaian": {"kriteria": "Pemahaman konsep dasar ketepatan definisi keterlibatan dalam diskusi kelas penerimaan nilai", "bobot": 5}},{"mingguKe": 2, "kemampuanAkhir": "CPMK 1", "bahanKajian": "Praktik hands-on topik 1", "metodePembelajaran": {"metode": "Praktikum", "deskripsi": "Kegiatan praktik langsung di laboratorium untuk mengaplikasikan teori dan mengembangkan keterampilan hands-on", "aktivitas": "Melaksanakan praktikum hands-on mengaplikasikan teori mengerjakan tugas praktis melakukan observasi mencatat hasil"}, "waktu": "3x50'", "pengalamanBelajar": "Mengerjakan praktikum melakukan observasi mencatat data menganalisis hasil eksperimen melaporkan temuan", "penilaian": {"kriteria": "Ketepatan praktikum kualitas data kualitas laporan kedalaman analisis ketepatan kesimpulan hasil", "bobot": 5}},{"mingguKe": 8, "kemampuanAkhir": "UTS", "bahanKajian": "Ujian Tengah Semester: evaluasi materi minggu 1-7", "metodePembelajaran": {"metode": "Ujian", "deskripsi": "Penilaian tertulis atau praktik komprehensif mencakup seluruh materi semester untuk mengukur kompetensi", "aktivitas": "Pelaksanaan ujian tulis atau praktik sesuai jadwal akademik evaluasi penguasaan materi"}, "waktu": "3x50'", "pengalamanBelajar": "UTS", "penilaian": {"kriteria": "UTS", "bobot": 15}},{"mingguKe": 16, "kemampuanAkhir": "UAS", "bahanKajian": "Ujian Akhir Semester: demo proyek dan evaluasi keseluruhan", "metodePembelajaran": {"metode": "Ujian", "deskripsi": "Penilaian akhir semester melalui demo proyek integrasi dan presentasi hasil pembelajaran keseluruhan", "aktivitas": "Pelaksanaan ujian akhir semester termasuk demo proyek dan presentasi hasil pembelajaran akhir"}, "waktu": "3x50'", "pengalamanBelajar": "UAS", "penilaian": {"kriteria": "UAS", "bobot": 20}}]

Total bobot harus 100%. Pastikan konten relevan dengan "${courseName}". Output JSON saja.`;

    const response = await this.sendMessage(prompt);
    if (!response) {
      return null;
    }

    try {
      const weeklyData = this.parseJsonResponse(response);
      console.log(`✅ Generated ${weeklyData.length} weeks of content`);
      return weeklyData;
    } catch (error) {
      console.log(`❌ Failed to parse JSON: ${error}`);
      return null;
    }
  }

  public async generateReferencesJson(
    courseName: string,
    courseCode: string,
    additionalContext: string = ''
  ): Promise<any[] | null> {
    console.log(`\n📚 Generating References for: ${courseName}`);

    const contextSection =
      additionalContext.trim() ? `## Konteks Tambahan:\n${additionalContext}\n` : '';

    const prompt = `Anda adalah ahli kurikulum pendidikan tinggi Indonesia.

## Mata Kuliah:
- Nama: ${courseName}
- Kode: ${courseCode}

${contextSection}

Buatkan daftar referensi (buku, jurnal, dokumentasi) yang relevan untuk mata kuliah ini. Berikan referensi yang nyata dan dapat diakses.

Format output JSON murni tanpa markdown:
[
    "Judul Buku 1, Penulis, Penerbit, Tahun",
    "Judul Buku 2, Penulis, Penerbit, Tahun",
    "Judul Jurnal/Paper, Penulis, Journal Name, Tahun",
    "Dokumentasi/Website: URL atau nama resource",
    "Referensi tambahan yang relevan"
]

Buatkan 5-8 referensi yang berkualitas dan relevan dengan "${courseName}". Output JSON saja.`;

    const response = await this.sendMessage(prompt);
    if (!response) {
      return null;
    }

    try {
      const referencesData = this.parseJsonResponse(response);
      console.log(`✅ Generated ${referencesData.length} references`);
      return referencesData;
    } catch (error) {
      console.log(`❌ Failed to parse JSON: ${error}`);
      return null;
    }
  }
}
