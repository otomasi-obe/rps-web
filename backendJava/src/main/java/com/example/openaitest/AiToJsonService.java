package com.example.openaitest;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.theokanning.openai.completion.chat.ChatCompletionRequest;
import com.theokanning.openai.completion.chat.ChatMessage;
import com.theokanning.openai.service.OpenAiService;
import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;

/**
 * Java port of ai_to_json.py AIToJSON class.
 * Generates RPS (Rencana Pembelajaran Semester) JSON via OpenAI API.
 */
@Service
public class AiToJsonService {

    public static final String MODEL = "gpt-5-mini-2025-08-07";
    private static final int MAX_RETRIES = 3;
    private static final Duration TIMEOUT = Duration.ofSeconds(600);

    private final String apiKey;
    private final OpenAiService openAiService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AiToJsonService() {
        this.apiKey = loadApiKey();
        this.openAiService = new OpenAiService(this.apiKey, TIMEOUT);
        System.out.println("✅ OpenAI client initialized with 10-minute timeout");
    }

    // ------------------------------------------------------------------ //
    //  API Key loading (mirrors _load_api_key in Python)
    // ------------------------------------------------------------------ //
    private String loadApiKey() {
        // 1. Try environment variable
        String fromEnv = System.getenv("OPENAI_API_KEY");
        if (fromEnv != null && !fromEnv.isBlank()) {
            System.out.println("✅ OpenAI API key loaded from environment variable");
            return fromEnv;
        }

        // 2. Try .env file in current working directory (e.g. /root/AI/openai/)
        try {
            Dotenv dotenv = Dotenv.configure()
                    .directory(System.getProperty("user.dir"))
                    .filename(".env")
                    .ignoreIfMissing()
                    .load();
            String key = dotenv.get("OPENAI_API_KEY");
            if (key != null && !key.isBlank()) {
                System.out.println("✅ OpenAI API key loaded from " + System.getProperty("user.dir") + "/.env");
                return key;
            }
        } catch (Exception ignored) {}

        // 3. Try api_openai.txt in current directory
        try {
            Path txtFile = Path.of("api_openai.txt");
            if (Files.exists(txtFile)) {
                String key = Files.readString(txtFile).strip();
                if (!key.isBlank()) {
                    System.out.println("✅ OpenAI API key loaded from api_openai.txt");
                    return key;
                }
            }
        } catch (IOException ignored) {}

        throw new IllegalStateException("❌ API key not found in env var, .env, or api_openai.txt");
    }

    // ------------------------------------------------------------------ //
    //  send_message  (mirrors send_message in Python)
    // ------------------------------------------------------------------ //
    public String sendMessage(String prompt) {
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                System.out.printf("🤖 Sending message to OpenAI (attempt %d/%d)...%n", attempt, MAX_RETRIES);
                System.out.printf("   Prompt length: %d chars%n", prompt.length());
                System.out.printf("   Model: %s%n", MODEL);
                System.out.println("   Waiting for response...");

                ChatCompletionRequest request = ChatCompletionRequest.builder()
                        .model(MODEL)
                        .messages(List.of(
                                new ChatMessage("system",
                                        "You are an expert in Indonesian higher education curriculum design."),
                                new ChatMessage("user", prompt)
                        ))
                        .build();

                var response = openAiService.createChatCompletion(request);
                String content = response.getChoices().get(0).getMessage().getContent();

                if (content != null && !content.isBlank()) {
                    System.out.printf("✅ Received response from OpenAI (%d chars)%n", content.length());
                    return content;
                }

                System.out.println("⚠️ Empty response from OpenAI");
                return null;

            } catch (Exception e) {
                String err = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
                System.out.printf("❌ Error on attempt %d: %s%n", attempt, err);

                if (err.toLowerCase().contains("timeout") || err.toLowerCase().contains("timed out")) {
                    System.out.println("   ⏱️ Timeout detected, retrying with exponential backoff...");
                } else if (err.contains("429") || err.toLowerCase().contains("rate_limit")) {
                    System.out.println("   🔄 Rate limit detected, waiting longer before retry...");
                }

                if (attempt < MAX_RETRIES) {
                    long waitSec = (long) Math.pow(2, attempt - 1) * 3;
                    System.out.printf("⏳ Waiting %d seconds before retry...%n", waitSec);
                    try { Thread.sleep(waitSec * 1000); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
                } else {
                    System.out.println("❌ All retry attempts failed");
                    e.printStackTrace();
                }
            }
        }
        return null;
    }

    // ------------------------------------------------------------------ //
    //  parse_json_response  (mirrors parse_json_response in Python)
    // ------------------------------------------------------------------ //
    public JsonNode parseJsonResponse(String response) throws Exception {
        String text = response.strip();

        // Strip markdown code block if present
        if (text.startsWith("```")) {
            String[] lines = text.split("\n");
            int start = lines[0].startsWith("```") ? 1 : 0;
            int end = (lines[lines.length - 1].strip().equals("```")) ? lines.length - 1 : lines.length;
            StringBuilder sb = new StringBuilder();
            for (int i = start; i < end; i++) sb.append(lines[i]).append("\n");
            text = sb.toString().strip();
        }

        // Attempt 1: direct parse
        try {
            return objectMapper.readTree(text);
        } catch (Exception e) {
            System.out.printf("⚠️ First JSON parse attempt failed: %s%n", e.getMessage());
            System.out.println("   Attempting to fix common JSON issues...");
        }

        // Attempt 2: remove trailing commas
        try {
            String fixed = text.replaceAll(",\\s*([}\\]])", "$1");
            JsonNode result = objectMapper.readTree(fixed);
            System.out.println("✅ Fixed JSON with trailing comma removal");
            return result;
        } catch (Exception ignored) {}

        // Attempt 3: extract JSON substring from first { or [
        try {
            int startIdx = -1;
            char startChar = ' ', endChar = ' ';
            for (int i = 0; i < text.length(); i++) {
                if (text.charAt(i) == '{') { startIdx = i; startChar = '{'; endChar = '}'; break; }
                if (text.charAt(i) == '[') { startIdx = i; startChar = '['; endChar = ']'; break; }
            }
            if (startIdx >= 0) {
                int depth = 0, endIdx = -1;
                boolean inString = false;
                boolean escNext = false;
                for (int i = startIdx; i < text.length(); i++) {
                    char c = text.charAt(i);
                    if (escNext) { escNext = false; continue; }
                    if (c == '\\') { escNext = true; continue; }
                    if (c == '"') { inString = !inString; continue; }
                    if (!inString) {
                        if (c == startChar) depth++;
                        else if (c == endChar) { depth--; if (depth == 0) { endIdx = i; break; } }
                    }
                }
                if (endIdx >= 0) {
                    JsonNode result = objectMapper.readTree(text.substring(startIdx, endIdx + 1));
                    System.out.println("✅ Fixed JSON by extracting valid JSON substring");
                    return result;
                }
            }
        } catch (Exception ignored) {}

        throw new Exception("❌ Failed to parse JSON after multiple fix attempts:\n" + text.substring(0, Math.min(500, text.length())));
    }

    // ------------------------------------------------------------------ //
    //  generate_rps_json  (mirrors generate_rps_json in Python)
    // ------------------------------------------------------------------ //
    public JsonNode generateRpsJson(String courseName, String courseCode, int sks,
                                    int semester, String status, String prereq,
                                    String additionalContext) {

        System.out.printf("%n📝 Generating RPS for: %s%n", courseName);
        System.out.println("=".repeat(60));

        String prompt = RpsPromptBuilder.build(courseName, courseCode, sks, semester, status, prereq, additionalContext);
        String response = sendMessage(prompt);

        if (response == null) {
            System.out.println("❌ Failed to get response from OpenAI");
            return null;
        }

        try {
            JsonNode rpsData = parseJsonResponse(response);
            System.out.println("✅ RPS JSON generated successfully!");
            System.out.printf("   - CPL    : %d items%n", rpsData.path("cpl").size());
            System.out.printf("   - CPMK   : %d items%n", rpsData.path("cpmk").size());
            System.out.printf("   - Minggu : %d weeks%n", rpsData.path("minggu").size());
            System.out.printf("   - Referensi: %d items%n", rpsData.path("referensi").size());
            return rpsData;
        } catch (Exception e) {
            System.out.printf("❌ Failed to parse JSON: %s%n", e.getMessage());
            System.out.printf("Response preview: %s...%n", response.substring(0, Math.min(500, response.length())));
            return null;
        }
    }

    /** Convenience overload with defaults */
    public JsonNode generateRpsJson(String courseName, String courseCode, int sks, int semester) {
        return generateRpsJson(courseName, courseCode, sks, semester,
                "Mata Kuliah Wajib", "-", "");
    }

    // ------------------------------------------------------------------ //
    //  generate_cpl_json  (mirrors generate_cpl_json in Python)
    // ------------------------------------------------------------------ //
    public JsonNode generateCplJson(String courseName, String courseCode, int sks,
                                    int semester, String deskripsi,
                                    String additionalContext) {
        System.out.printf("%n🎯 Generating CPL for: %s%n", courseName);

        String deskripsiLine = (deskripsi != null && !deskripsi.isBlank())
                ? "- Deskripsi: " + deskripsi + "\n" : "";
        String additionalLine = (additionalContext != null && !additionalContext.isBlank())
                ? "\n## Konteks Tambahan:\n" + additionalContext + "\n" : "";

        String prompt = String.format("""
Anda adalah ahli kurikulum pendidikan tinggi Indonesia. 

## Mata Kuliah:
- Nama: %s
- Kode: %s
- SKS: %d
- Semester: %d
%s
%s
Buatkan daftar CPL (Capaian Pembelajaran Lulusan) yang relevan untuk mata kuliah ini. CPL adalah kompetensi yang diharapkan dimiliki mahasiswa setelah lulus dari program studi.

Format output JSON murni tanpa markdown:
[
    {"kode": "CPL3", "pernyataan": "Mampu menerapkan pengetahuan..."},
    {"kode": "CPL4", "pernyataan": "Mampu merancang solusi..."},
    {"kode": "CPL10", "pernyataan": "Mampu bekerja sama dalam tim..."}
]

Buatkan 3-5 CPL yang spesifik dan relevan. Output JSON saja.""",
                courseName, courseCode, sks, semester, deskripsiLine, additionalLine);

        String response = sendMessage(prompt);
        if (response == null) return null;

        try {
            JsonNode data = parseJsonResponse(response);
            System.out.printf("✅ Generated %d CPL items%n", data.size());
            return data;
        } catch (Exception e) {
            System.out.printf("❌ Failed to parse JSON: %s%n", e.getMessage());
            return null;
        }
    }

    // ------------------------------------------------------------------ //
    //  generate_cpmk_json  (mirrors generate_cpmk_json in Python)
    // ------------------------------------------------------------------ //
    public JsonNode generateCpmkJson(String courseName, String courseCode, int sks,
                                     int semester, String deskripsi, JsonNode cplList,
                                     String additionalContext) {
        System.out.printf("%n📊 Generating CPMK for: %s%n", courseName);

        String deskripsiLine = (deskripsi != null && !deskripsi.isBlank())
                ? "- Deskripsi: " + deskripsi + "\n" : "";
        String additionalLine = (additionalContext != null && !additionalContext.isBlank())
                ? "\n## Konteks Tambahan:\n" + additionalContext + "\n" : "";

        StringBuilder cplInfo = new StringBuilder();
        if (cplList != null && cplList.isArray() && cplList.size() > 0) {
            cplInfo.append("\n## CPL yang sudah ada:\n");
            for (JsonNode c : cplList) {
                cplInfo.append("- ").append(c.path("kode").asText("")).append(": ")
                        .append(c.path("pernyataan").asText("")).append("\n");
            }
        }

        String prompt = String.format("""
Anda adalah ahli kurikulum pendidikan tinggi Indonesia.

## Mata Kuliah:
- Nama: %s
- Kode: %s
- SKS: %d
- Semester: %d
%s
%s
%s
Buatkan daftar CPMK (Capaian Pembelajaran Mata Kuliah) yang spesifik untuk mata kuliah ini. CPMK adalah kompetensi yang diharapkan dikuasai mahasiswa setelah menyelesaikan mata kuliah ini.

PENTING: Jumlah CPMK harus FLEKSIBEL antara 1-4 items berdasarkan kompleksitas mata kuliah dan CPL yang ada:
- Mata kuliah sederhana: 1-2 CPMK
- Mata kuliah standar: 2-3 CPMK  
- Mata kuliah kompleks: 3-4 CPMK

Format output JSON murni tanpa markdown:
[
    {"kode": "CPMK 1", "pernyataan": "Mahasiswa mampu menjelaskan...", "mapping_cpl": "CPL3"},
    {"kode": "CPMK 2", "pernyataan": "Mahasiswa mampu menerapkan...", "mapping_cpl": "CPL4"},
    {"kode": "CPMK 3", "pernyataan": "Mahasiswa mampu menganalisis...", "mapping_cpl": "CPL4"}
]

Buatkan CPMK yang terukur dan spesifik. Pastikan mapping_cpl sesuai dengan CPL yang ada. Output JSON saja.""",
                courseName, courseCode, sks, semester, deskripsiLine, cplInfo.toString(), additionalLine);

        String response = sendMessage(prompt);
        if (response == null) return null;

        try {
            JsonNode data = parseJsonResponse(response);
            System.out.printf("✅ Generated %d CPMK items%n", data.size());
            return data;
        } catch (Exception e) {
            System.out.printf("❌ Failed to parse JSON: %s%n", e.getMessage());
            return null;
        }
    }

    // ------------------------------------------------------------------ //
    //  generate_weekly_plan_json  (mirrors generate_weekly_plan_json in Python)
    // ------------------------------------------------------------------ //
    public JsonNode generateWeeklyPlanJson(String courseName, String courseCode, int sks,
                                           int semester, String deskripsi, JsonNode cpmkList,
                                           String additionalContext) {
        System.out.printf("%n📅 Generating Weekly Plan for: %s%n", courseName);

        String deskripsiLine = (deskripsi != null && !deskripsi.isBlank())
                ? "- Deskripsi: " + deskripsi + "\n" : "";
        String additionalLine = (additionalContext != null && !additionalContext.isBlank())
                ? "\n## Konteks Tambahan:\n" + additionalContext + "\n" : "";

        StringBuilder cpmkInfo = new StringBuilder();
        if (cpmkList != null && cpmkList.isArray() && cpmkList.size() > 0) {
            cpmkInfo.append("\n## CPMK yang sudah ada:\n");
            for (JsonNode c : cpmkList) {
                cpmkInfo.append("- ").append(c.path("kode").asText("")).append(": ")
                        .append(c.path("pernyataan").asText("")).append("\n");
            }
        }

        String prompt = String.format("""
Anda adalah ahli kurikulum pendidikan tinggi Indonesia.

## Mata Kuliah:
- Nama: %s
- Kode: %s
- SKS: %d
- Semester: %d
%s
%s
%s
Buatkan rencana pembelajaran mingguan untuk 16 minggu. Minggu 8 adalah UTS dan Minggu 16 adalah UAS.

WAJIB (selain UTS/UAS):
- "metodePembelajaran.metode": pilih 1 dari: Ceramah, Diskusi, Kuis, Tugas, Presentasi, Praktikum
- "metodePembelajaran.deskripsi": HARUS 20 kata penjelasan metode pembelajaran
- "metodePembelajaran.aktivitas": HARUS 20 kata penjelasan aktivitas pembelajaran
- "pengalamanBelajar": HARUS 20 kata pengalaman belajar mahasiswa
- "penilaian.kriteria": HARUS 20 kata kriteria indikator pencapaian

Format JSON murni (EXACT field names: mingguKe, kemampuanAkhir, bahanKajian):
[{"mingguKe": 1, "kemampuanAkhir": "CPMK 1", "bahanKajian": "Pengenalan dan konsep dasar", "metodePembelajaran": {"metode": "Ceramah", "deskripsi": "Penyampaian konsep fundamental melalui presentasi interaktif dengan melibatkan mahasiswa dalam diskusi materi", "aktivitas": "Mendengarkan penjelasan konsep dasar dan diskusi mendalam tentang prinsip fundamental mata kuliah"}, "waktu": "3x50'", "pengalamanBelajar": "Memahami terminologi dasar mengingat definisi konsep fundamental mengikuti presentasi diskusi kelas", "penilaian": {"kriteria": "Pemahaman konsep dasar ketepatan definisi keterlibatan dalam diskusi kelas penerimaan nilai", "bobot": 5}},{"mingguKe": 8, "kemampuanAkhir": "UTS", "bahanKajian": "Ujian Tengah Semester: evaluasi materi minggu 1-7", "metodePembelajaran": {"metode": "Ujian", "deskripsi": "Penilaian tertulis atau praktik komprehensif mencakup seluruh materi semester untuk mengukur kompetensi", "aktivitas": "Pelaksanaan ujian tulis atau praktik sesuai jadwal akademik evaluasi penguasaan materi"}, "waktu": "3x50'", "pengalamanBelajar": "UTS", "penilaian": {"kriteria": "UTS", "bobot": 15}},{"mingguKe": 16, "kemampuanAkhir": "UAS", "bahanKajian": "Ujian Akhir Semester: demo proyek dan evaluasi keseluruhan", "metodePembelajaran": {"metode": "Ujian", "deskripsi": "Penilaian akhir semester melalui demo proyek integrasi dan presentasi hasil pembelajaran keseluruhan", "aktivitas": "Pelaksanaan ujian akhir semester termasuk demo proyek dan presentasi hasil pembelajaran akhir"}, "waktu": "3x50'", "pengalamanBelajar": "UAS", "penilaian": {"kriteria": "UAS", "bobot": 20}}]

Total bobot harus 100%%. Pastikan konten relevan dengan "%s". Output JSON saja.""",
                courseName, courseCode, sks, semester, deskripsiLine, cpmkInfo.toString(), additionalLine, courseName);

        String response = sendMessage(prompt);
        if (response == null) return null;

        try {
            JsonNode data = parseJsonResponse(response);
            System.out.printf("✅ Generated %d weeks of content%n", data.size());
            return data;
        } catch (Exception e) {
            System.out.printf("❌ Failed to parse JSON: %s%n", e.getMessage());
            return null;
        }
    }

    // ------------------------------------------------------------------ //
    //  generate_references_json  (mirrors generate_references_json in Python)
    // ------------------------------------------------------------------ //
    public JsonNode generateReferencesJson(String courseName, String courseCode,
                                           String additionalContext) {
        System.out.printf("%n📚 Generating References for: %s%n", courseName);

        String additionalLine = (additionalContext != null && !additionalContext.isBlank())
                ? "\n## Konteks Tambahan:\n" + additionalContext + "\n" : "";

        String prompt = String.format("""
Anda adalah ahli kurikulum pendidikan tinggi Indonesia.

## Mata Kuliah:
- Nama: %s
- Kode: %s

%s
Buatkan daftar referensi (buku, jurnal, dokumentasi) yang relevan untuk mata kuliah ini. Berikan referensi yang nyata dan dapat diakses.

Format output JSON murni tanpa markdown:
[
    "Judul Buku 1, Penulis, Penerbit, Tahun",
    "Judul Buku 2, Penulis, Penerbit, Tahun",
    "Judul Jurnal/Paper, Penulis, Journal Name, Tahun",
    "Dokumentasi/Website: URL atau nama resource",
    "Referensi tambahan yang relevan"
]

Buatkan 5-8 referensi yang berkualitas dan relevan dengan "%s". Output JSON saja.""",
                courseName, courseCode, additionalLine, courseName);

        String response = sendMessage(prompt);
        if (response == null) return null;

        try {
            JsonNode data = parseJsonResponse(response);
            System.out.printf("✅ Generated %d references%n", data.size());
            return data;
        } catch (Exception e) {
            System.out.printf("❌ Failed to parse JSON: %s%n", e.getMessage());
            return null;
        }
    }
}

