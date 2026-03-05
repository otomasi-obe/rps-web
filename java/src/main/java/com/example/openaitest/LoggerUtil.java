package com.example.openaitest;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Java port of logger_util.py
 * Logs requests, responses, timings and saves JSON exports.
 */
@Component
public class LoggerUtil {

    private static final Logger log = LoggerFactory.getLogger(LoggerUtil.class);

    // Mirrors LOGS_DIR = Path(__file__).parent.parent / 'logs'
    // Python script is at /root/AI/python/ → parent.parent = /root/ → logs = /root/logs/
    // Java project is at /root/AI/openai/ → parent.parent = /root/ → logs = /root/logs/
    private static final Path LOGS_DIR = Path.of(System.getProperty("user.dir"))
            .resolve("../../logs").normalize();

    private static final Path EXPORTS_DIR = LOGS_DIR.resolve("exports");

    static {
        try {
            Files.createDirectories(EXPORTS_DIR);
        } catch (IOException e) {
            System.err.println("⚠️ Could not create logs/exports directories: " + e.getMessage());
        }
        cleanupOldLogs(7);
    }

    // ----------------------------------------------------------------- //
    //  log_request
    // ----------------------------------------------------------------- //
    public static void logRequest(String endpoint, Map<String, Object> data, String clientIp) {
        log.info("📥 REQUEST | {} | IP: {}", endpoint, clientIp);
        log.debug("Request data keys: {}", data != null ? data.keySet() : "null");
    }

    public static void logRequest(String endpoint, Map<String, Object> data) {
        logRequest(endpoint, data, "unknown");
    }

    // ----------------------------------------------------------------- //
    //  log_response
    // ----------------------------------------------------------------- //
    public static void logResponse(String endpoint, int status, double durationMs, String error) {
        if (error != null && !error.isBlank()) {
            log.error("❌ RESPONSE | {} | {} | {}ms | Error: {}", endpoint, status,
                    String.format("%.0f", durationMs), error);
        } else {
            log.info("✅ RESPONSE | {} | {} | {}ms", endpoint, status,
                    String.format("%.0f", durationMs));
        }
    }

    public static void logResponse(String endpoint, int status, double durationMs) {
        logResponse(endpoint, status, durationMs, null);
    }

    // ----------------------------------------------------------------- //
    //  log_timing
    // ----------------------------------------------------------------- //
    public static void logTiming(String label, double durationMs) {
        log.info("⏱️  TIMING | {}: {}ms", label, String.format("%.2f", durationMs));
    }

    // ----------------------------------------------------------------- //
    //  save_export_json
    // ----------------------------------------------------------------- //
    public static String saveExportJson(Object rpsData, Map<String, Object> meta, String filenamePrefix) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String courseCode = String.valueOf(meta.getOrDefault("kode", "unknown")).replace("/", "_");
        String filename = filenamePrefix + "_" + courseCode + "_" + timestamp + ".json";
        Path filepath = EXPORTS_DIR.resolve(filename);

        Map<String, Object> exportData = new LinkedHashMap<>();
        exportData.put("timestamp", LocalDateTime.now().toString());
        exportData.put("meta", meta);
        exportData.put("rpsData", rpsData);

        try {
            ObjectMapper mapper = new ObjectMapper();
            mapper.writerWithDefaultPrettyPrinter().writeValue(filepath.toFile(), exportData);
            log.info("💾 SAVED | Export JSON: {}", filename);
            return filepath.toString();
        } catch (Exception e) {
            log.error("❌ SAVE ERROR | Failed to save export JSON: {}", e.getMessage());
            return null;
        }
    }

    public static String saveExportJson(Object rpsData, Map<String, Object> meta) {
        return saveExportJson(rpsData, meta, "export");
    }

    // ----------------------------------------------------------------- //
    //  log_performance_metrics
    // ----------------------------------------------------------------- //
    public static void logPerformanceMetrics(Map<String, Object> metrics) {
        log.info("📊 PERFORMANCE METRICS:");
        for (Map.Entry<String, Object> entry : metrics.entrySet()) {
            Object v = entry.getValue();
            if (v instanceof Number) {
                double d = ((Number) v).doubleValue();
                log.info("   {}: {}", entry.getKey(),
                        d > 100 ? String.format("%.2fms", d) : String.format("%.2fs", d));
            } else {
                log.info("   {}: {}", entry.getKey(), v);
            }
        }
    }

    // ----------------------------------------------------------------- //
    //  cleanup_old_logs
    // ----------------------------------------------------------------- //
    public static void cleanupOldLogs(int daysToKeep) {
        try {
            if (!Files.exists(LOGS_DIR)) return;
            long cutoffMs = System.currentTimeMillis() - (long) daysToKeep * 86_400_000L;
            long[] deleted = {0};
            Files.list(LOGS_DIR)
                    .filter(p -> p.toString().endsWith(".log"))
                    .filter(p -> {
                        try { return Files.getLastModifiedTime(p).toMillis() < cutoffMs; }
                        catch (IOException e) { return false; }
                    })
                    .forEach(p -> {
                        try { Files.delete(p); deleted[0]++; }
                        catch (IOException ignored) {}
                    });
            if (deleted[0] > 0) {
                log.info("🧹 CLEANUP | Deleted {} old log files", deleted[0]);
            }
        } catch (IOException ignored) {}
    }
}
