package com.example.openaitest;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.nio.file.Files;
import java.util.*;

/**
 * Java port of api_server.py
 * REST API for RPS generation and DOCX export.
 * Port 5000, CORS enabled for all origins.
 */
@RestController
@CrossOrigin(origins = "*")
public class RpsController {

    private final AiToJsonService aiToJsonService;
    private final JsonToDocxService jsonToDocxService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public RpsController(AiToJsonService aiToJsonService, JsonToDocxService jsonToDocxService) {
        this.aiToJsonService = aiToJsonService;
        this.jsonToDocxService = jsonToDocxService;
    }

    // ------------------------------------------------------------------ //
    //  GET /health
    //  Mirror: server returns {"status": "ok", "model": "gpt-5-mini-2025-08-07"}
    // ------------------------------------------------------------------ //
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        long startTime = System.currentTimeMillis();
        LoggerUtil.logRequest("/health", Map.of(), "");
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "ok");
        response.put("backend", "java");
        response.put("model", AiToJsonService.MODEL);
        LoggerUtil.logResponse("/health", 200, System.currentTimeMillis() - startTime);
        return ResponseEntity.ok(response);
    }

    // ------------------------------------------------------------------ //
    //  POST /generate
    //  Mirror: handles types: full, cpl, cpmk, weeklyPlan, references
    // ------------------------------------------------------------------ //
    @PostMapping("/generate")
    public ResponseEntity<Map<String, Object>> generate(@RequestBody Map<String, Object> body) {
        long startTime = System.currentTimeMillis();
        LoggerUtil.logRequest("/generate", body, "");

        String type = str(body.get("type"));
        String courseName = str(body.get("courseName"));
        String courseCode = str(body.get("courseCode"));
        int sks = toInt(body.get("sks"), 3);
        int semester = toInt(body.get("semester"), 1);
        String status = str(body.getOrDefault("status", "Mata Kuliah Wajib"));
        String prereq = str(body.getOrDefault("prereq", "-"));
        String additionalContext = str(body.getOrDefault("additionalContext", ""));
        String deskripsi = str(body.getOrDefault("deskripsi", ""));

        try {
            JsonNode result = null;

            switch (type) {
                case "full" -> {
                    result = aiToJsonService.generateRpsJson(
                            courseName, courseCode, sks, semester, status, prereq, additionalContext);
                }
                case "cpl" -> {
                    result = aiToJsonService.generateCplJson(
                            courseName, courseCode, sks, semester, deskripsi, additionalContext);
                }
                case "cpmk" -> {
                    JsonNode cplList = parseJsonField(body.get("cpl"));
                    result = aiToJsonService.generateCpmkJson(
                            courseName, courseCode, sks, semester, deskripsi, cplList, additionalContext);
                }
                case "weeklyPlan" -> {
                    JsonNode cpmkList = parseJsonField(body.get("cpmk"));
                    result = aiToJsonService.generateWeeklyPlanJson(
                            courseName, courseCode, sks, semester, deskripsi, cpmkList, additionalContext);
                }
                case "references" -> {
                    result = aiToJsonService.generateReferencesJson(
                            courseName, courseCode, additionalContext);
                }
                default -> {
                    Map<String, Object> err = new LinkedHashMap<>();
                    err.put("success", false);
                    err.put("error", "Unknown type: " + type + ". Use: full, cpl, cpmk, weeklyPlan, references");
                    LoggerUtil.logResponse("/generate", 400,
                            System.currentTimeMillis() - startTime, "Unknown type: " + type);
                    return ResponseEntity.badRequest().body(err);
                }
            }

            if (result == null) {
                Map<String, Object> err = new LinkedHashMap<>();
                err.put("success", false);
                err.put("error", "AI generation failed");
                LoggerUtil.logResponse("/generate", 500,
                        System.currentTimeMillis() - startTime, "AI generation failed");
                return ResponseEntity.status(500).body(err);
            }

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("success", true);
            response.put("data", result);
            LoggerUtil.logResponse("/generate", 200, System.currentTimeMillis() - startTime);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, Object> err = new LinkedHashMap<>();
            err.put("success", false);
            err.put("error", e.getMessage());
            LoggerUtil.logResponse("/generate", 500,
                    System.currentTimeMillis() - startTime, e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(err);
        }
    }

    // ------------------------------------------------------------------ //
    //  POST /export
    //  Mirror: accepts {rpsData: {...}, meta: {...}}, returns base64 DOCX
    // ------------------------------------------------------------------ //
    @PostMapping("/export")
    public ResponseEntity<Map<String, Object>> export(@RequestBody Map<String, Object> body) {
        long startTime = System.currentTimeMillis();
        LoggerUtil.logRequest("/export", body, "");

        try {
            Object rpsDataRaw = body.get("rpsData");
            Object metaRaw = body.get("meta");

            if (rpsDataRaw == null || metaRaw == null) {
                Map<String, Object> err = new LinkedHashMap<>();
                err.put("success", false);
                err.put("error", "Missing rpsData or meta in request body");
                return ResponseEntity.badRequest().body(err);
            }

            // Convert to JsonNode and Map
            JsonNode rpsData = objectMapper.valueToTree(rpsDataRaw);
            @SuppressWarnings("unchecked")
            Map<String, Object> meta = (Map<String, Object>) metaRaw;

            // Save to temp JSON file for export log
            LoggerUtil.saveExportJson(rpsDataRaw, meta, "export");

            // Create temp output file
            String courseCode = str(meta.getOrDefault("kode", "RPS")).replace("/", "_");
            File tempFile = File.createTempFile("RPS_" + courseCode + "_", ".docx");
            tempFile.deleteOnExit();

            boolean success = jsonToDocxService.exportToDocx(rpsData, meta, tempFile.getAbsolutePath());

            if (!success) {
                Map<String, Object> err = new LinkedHashMap<>();
                err.put("success", false);
                err.put("error", "DOCX generation failed");
                LoggerUtil.logResponse("/export", 500,
                        System.currentTimeMillis() - startTime, "DOCX generation failed");
                return ResponseEntity.status(500).body(err);
            }

            // Read file and encode as base64
            byte[] docxBytes = Files.readAllBytes(tempFile.toPath());
            String base64 = Base64.getEncoder().encodeToString(docxBytes);
            String filename = "RPS_" + courseCode + ".docx";

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("success", true);
            response.put("docx", base64);
            response.put("filename", filename);

            LoggerUtil.logResponse("/export", 200, System.currentTimeMillis() - startTime);
            LoggerUtil.logTiming("DOCX export", System.currentTimeMillis() - startTime);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, Object> err = new LinkedHashMap<>();
            err.put("success", false);
            err.put("error", e.getMessage());
            LoggerUtil.logResponse("/export", 500,
                    System.currentTimeMillis() - startTime, e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(err);
        }
    }

    // ------------------------------------------------------------------ //
    //  Utilities
    // ------------------------------------------------------------------ //
    private static String str(Object obj) {
        return obj != null ? obj.toString() : "";
    }

    private static int toInt(Object obj, int defaultVal) {
        if (obj == null) return defaultVal;
        try { return Integer.parseInt(obj.toString()); }
        catch (NumberFormatException e) { return defaultVal; }
    }

    private JsonNode parseJsonField(Object raw) {
        if (raw == null) return objectMapper.createArrayNode();
        try {
            return objectMapper.valueToTree(raw);
        } catch (Exception e) {
            return objectMapper.createArrayNode();
        }
    }
}
