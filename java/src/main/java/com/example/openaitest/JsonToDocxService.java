package com.example.openaitest;

import com.fasterxml.jackson.databind.JsonNode;
import org.apache.poi.xwpf.usermodel.*;
import org.apache.xmlbeans.XmlObject;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTRow;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTbl;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.regex.*;

/**
 * Java port of json_to_docx.py JSONToDocx class.
 * Converts RPS JSON data to a Word DOCX file using Apache POI XWPF.
 */
@Service
public class JsonToDocxService {

    private String templatePath;

    public JsonToDocxService() {
        // Default: look for RPS.docx in the Python directory or project root
        Path projectDir = Path.of(System.getProperty("user.dir"));
        Path pythonDir = projectDir.resolve("../python/RPS.docx").normalize();
        Path localDir = projectDir.resolve("RPS.docx");

        if (Files.exists(pythonDir)) {
            this.templatePath = pythonDir.toString();
        } else if (Files.exists(localDir)) {
            this.templatePath = localDir.toString();
        } else {
            this.templatePath = null;
        }
    }

    public JsonToDocxService(String templatePath) {
        this.templatePath = templatePath;
    }

    public boolean validateTemplate() {
        if (templatePath == null || !Files.exists(Path.of(templatePath))) {
            System.out.println("[ERROR] Template not found: " + templatePath);
            return false;
        }
        System.out.println("[OK] Template found: " + templatePath);
        return true;
    }

    // ------------------------------------------------------------------ //
    //  Helper: clean_key (normalize text for placeholder matching)
    // ------------------------------------------------------------------ //
    private static String cleanKey(String text) {
        if (text == null) return "";
        return text.replaceAll("[\"']", "")
                .replaceAll("\\s+", " ")
                .strip()
                .toLowerCase();
    }

    // ------------------------------------------------------------------ //
    //  Helper: generate_media_asesmen_string
    // ------------------------------------------------------------------ //
    private static String generateMediaAsesmenString(JsonNode cpmkItem) {
        List<String> components = new ArrayList<>();
        if (cpmkItem.path("N1").asInt(0) > 0) components.add("PRS");
        if (cpmkItem.path("N2").asInt(0) > 0) components.add("PRO");
        if (cpmkItem.path("N3").asInt(0) > 0) components.add("QUIZ");
        if (cpmkItem.path("N4").asInt(0) > 0) components.add("UTS");
        if (cpmkItem.path("N5").asInt(0) > 0) components.add("UAS");
        return String.join(", ", components);
    }

    // ------------------------------------------------------------------ //
    //  Helper: replace_paragraph_text
    // ------------------------------------------------------------------ //
    private static void replaceParagraphText(XWPFParagraph para, Map<String, String> placeholderMap) {
        String rawText = para.getText();
        if (rawText == null || rawText.isBlank()) return;
        String normText = cleanKey(rawText);

        // 1. Exact match
        for (Map.Entry<String, String> entry : placeholderMap.entrySet()) {
            if (cleanKey(entry.getKey()).equals(normText)) {
                setRunText(para, entry.getValue());
                return;
            }
        }

        // 2. Partial case-insensitive match
        for (Map.Entry<String, String> entry : placeholderMap.entrySet()) {
            String key = entry.getKey();
            String val = entry.getValue() != null ? entry.getValue() : "";
            Pattern pattern = Pattern.compile(Pattern.quote(key), Pattern.CASE_INSENSITIVE);
            Matcher matcher = pattern.matcher(rawText);
            if (matcher.find()) {
                String newText = matcher.replaceAll(val);
                setRunText(para, newText);
                return;
            }
        }
    }

    private static void setRunText(XWPFParagraph para, String text) {
        List<XWPFRun> runs = para.getRuns();
        if (runs != null && !runs.isEmpty()) {
            runs.get(0).setText(text != null ? text : "", 0);
            for (int i = 1; i < runs.size(); i++) {
                runs.get(i).setText("", 0);
            }
        } else {
            XWPFRun run = para.createRun();
            run.setText(text != null ? text : "");
        }
    }

    // ------------------------------------------------------------------ //
    //  Helper: duplicate_table_row
    // ------------------------------------------------------------------ //
    private static void duplicateTableRow(XWPFTable table, int rowIdx) {
        XWPFTableRow sourceRow = table.getRow(rowIdx);
        CTRow ctRow = (CTRow) sourceRow.getCtRow().copy();
        CTTbl ctTbl = table.getCTTbl();
        ctTbl.addNewTr();
        // Insert copy at rowIdx+1 position by inserting XML node
        XmlObject[] rows = ctTbl.selectPath("declare namespace w='http://schemas.openxmlformats.org/wordprocessingml/2006/main' .//w:tr");
        // The new row is added at the end; we move it after to simplify (just append after last template)
        // Instead, we create a new XWPFTableRow from the copied CTRow
        XWPFTableRow newRow = new XWPFTableRow(ctRow, table);
        table.addRow(newRow, rowIdx + 1);
        // Remove the empty row that addNewTr() created (it's at the end)
        int lastIdx = table.getRows().size() - 1;
        // Check if last row is the empty one we created
        XWPFTableRow lastRow = table.getRow(lastIdx);
        if (lastRow.getCtRow() != ctTbl.getTrArray(ctTbl.getTrList().size() - 1)) {
            table.removeRow(lastIdx);
        }
    }

    // ------------------------------------------------------------------ //
    //  Helper: remove_row
    // ------------------------------------------------------------------ //
    private static void removeTableRow(XWPFTable table, int rowIdx) {
        table.removeRow(rowIdx);
    }

    // ------------------------------------------------------------------ //
    //  Helper: prune_unused_cpmk_columns
    //  (simplified: only handles CPMK header detection via row/cell text)
    // ------------------------------------------------------------------ //
    private static void pruneUnusedCpmkColumns(XWPFTable table, int totalCpmk) {
        // Find the header row with "CPMK 1-" pattern
        for (XWPFTableRow row : table.getRows()) {
            List<XWPFTableCell> cells = row.getTableCells();
            int cpmkColStart = -1;
            int cpmkColEnd = -1;
            for (int i = 0; i < cells.size(); i++) {
                String cellText = cells.get(i).getText();
                if (cellText != null && cellText.matches("(?i).*CPMK\\s+1-\\d+.*")) {
                    if (cpmkColStart == -1) cpmkColStart = i;
                    cpmkColEnd = i;
                }
            }
            if (cpmkColStart >= 0) {
                // Delete columns from cpmkColEnd down to cpmkColStart + totalCpmk
                for (int i = cpmkColEnd; i >= cpmkColStart + totalCpmk; i--) {
                    deleteColumnSafe(table, i);
                }
                break;
            }
        }
    }

    private static void deleteColumnSafe(XWPFTable table, int colIdx) {
        for (XWPFTableRow row : table.getRows()) {
            List<XWPFTableCell> cells = row.getTableCells();
            if (colIdx < cells.size()) {
                row.getCtRow().removeTc(colIdx);
            }
        }
    }

    // ------------------------------------------------------------------ //
    //  Helper: process_smart_list_table
    // ------------------------------------------------------------------ //
    private static void processSmartListTable(XWPFTable table, List<Map<String, String>> dataList,
                                               Map<String, String> mappingConfig) {
        if (dataList == null || dataList.isEmpty()) return;

        boolean isIntegrationTable = mappingConfig.containsValue("cpl_kode");
        List<Integer> templateRowIndices = new ArrayList<>();

        for (int i = 0; i < table.getRows().size(); i++) {
            XWPFTableRow row = table.getRow(i);
            String rowText = getRowText(row);
            boolean isTemplate = false;

            if (isIntegrationTable) {
                if (i < 2) continue;
                if (rowText.toLowerCase().contains("total bobot")) continue;
                if (rowText.matches("(?s).*CPL\\s+\\d+.*IK\\s+\\d+-\\d+.*") ||
                    rowText.matches("(?s).*CPMK\\s+\\d+-\\d+.*Ntotal_cpmk.*")) {
                    isTemplate = true;
                }
            } else {
                for (String ph : mappingConfig.keySet()) {
                    if (cleanKey(rowText).contains(cleanKey(ph))) {
                        isTemplate = true;
                        break;
                    }
                }
            }

            if (isTemplate) templateRowIndices.add(i);
        }

        if (templateRowIndices.isEmpty()) return;

        int startIdx = templateRowIndices.get(0);
        int available = templateRowIndices.size();
        int needed = dataList.size();

        if (needed > available) {
            int lastTemplate = templateRowIndices.get(templateRowIndices.size() - 1);
            int curr = lastTemplate;
            for (int d = 0; d < (needed - available); d++) {
                duplicateTableRow(table, curr);
                curr++;
            }
        } else if (needed < available) {
            for (int i = templateRowIndices.size() - 1; i >= needed; i--) {
                removeTableRow(table, templateRowIndices.get(i));
            }
        }

        // Fill data
        for (int i = 0; i < dataList.size(); i++) {
            int rowIdx = startIdx + i;
            if (rowIdx >= table.getRows().size()) break;
            XWPFTableRow row = table.getRow(rowIdx);
            Map<String, String> item = dataList.get(i);

            Map<String, String> rowMap = new LinkedHashMap<>();
            for (Map.Entry<String, String> e : mappingConfig.entrySet()) {
                rowMap.put(e.getKey(), item.getOrDefault(e.getValue(), ""));
            }

            for (XWPFTableCell cell : row.getTableCells()) {
                for (XWPFParagraph para : cell.getParagraphs()) {
                    replaceParagraphText(para, rowMap);
                }
            }
        }
    }

    private static String getRowText(XWPFTableRow row) {
        StringBuilder sb = new StringBuilder();
        for (XWPFTableCell cell : row.getTableCells()) {
            sb.append(cell.getText()).append(" ");
        }
        return sb.toString();
    }

    // ------------------------------------------------------------------ //
    //  Main export method: export_to_docx
    // ------------------------------------------------------------------ //
    public boolean exportToDocx(JsonNode rpsData, Map<String, Object> meta, String outputPath) {
        System.out.println("\n[CONVERT] Validating template...");
        if (!validateTemplate()) {
            System.out.println("[ERROR] Template validation failed");
            return false;
        }

        System.out.println("\n[CONVERT] Converting JSON to DOCX...");
        System.out.println("   Template: " + templatePath);
        System.out.println("   Output:   " + outputPath);

        long startTime = System.currentTimeMillis();

        try (FileInputStream fis = new FileInputStream(templatePath);
             XWPFDocument doc = new XWPFDocument(fis)) {

            System.out.println("[CONVERT] Document loaded. Tables: " + doc.getTables().size());

            // ---------------------------------------------------------
            // 1. GLOBAL MAP
            // ---------------------------------------------------------
            JsonNode cpmkListNode = rpsData.path("cpmkList").isMissingNode()
                    ? rpsData.path("cpmk") : rpsData.path("cpmkList");
            JsonNode cplListNode = rpsData.path("cplList").isMissingNode()
                    ? rpsData.path("cpl") : rpsData.path("cplList");

            int totalCpmk = cpmkListNode.size();

            String deskripsi = rpsData.path("deskripsiSingkat").isMissingNode()
                    ? rpsData.path("deskripsi").asText("")
                    : rpsData.path("deskripsiSingkat").asText("");

            Map<String, String> globalMap = new LinkedHashMap<>();
            globalMap.put("identitas.kode", str(meta.get("kode")));
            globalMap.put("identitas.nama", str(meta.get("nama")));
            globalMap.put("identitas.sks", str(meta.get("sks")));
            globalMap.put("identitas.semester", str(meta.get("semester")));
            globalMap.put("identitas.status", str(meta.get("status")));
            globalMap.put("identitas.prasyarat", str(meta.get("prasyarat")));
            globalMap.put("identitas.prasayarat", str(meta.get("prasyarat")));
            globalMap.put("Deskripsi mata kuliah", deskripsi);

            // Authority
            globalMap.put("Otoritas.koordinatormk.nama", nestedStr(meta, "koordinatorMK", "nama"));
            globalMap.put("Otoritas.koordinatormk.nip",  nestedStr(meta, "koordinatorMK", "nip"));
            globalMap.put("Otoritas.koordinatorGPM.nama", nestedStr(meta, "koordinatorGPM", "nama"));
            globalMap.put("Otoritas.koordinatorGPM.nip",  nestedStr(meta, "koordinatorGPM", "nip"));
            globalMap.put("Otoritas.ketuaProdi.nama",  nestedStr(meta, "ketuaProdi", "nama"));
            globalMap.put("Otoritas.ketuaProdi.nip",   nestedStr(meta, "ketuaProdi", "nip"));
            globalMap.put("Otoritas.dekan.nama", nestedStr(meta, "dekan", "nama"));
            globalMap.put("Otoritas.dekan.nip",  nestedStr(meta, "dekan", "nip"));

            // CPMK weights/media for global use
            for (int i = 0; i < cpmkListNode.size(); i++) {
                int idx = i + 1;
                JsonNode cpmk = cpmkListNode.get(i);
                String maStr = generateMediaAsesmenString(cpmk);
                globalMap.put("MA_cpmk" + idx, maStr);
                globalMap.put("N1_cpmk" + idx, cpmk.path("N1").asText("0"));
                globalMap.put("N2_cpmk" + idx, cpmk.path("N2").asText("0"));
                globalMap.put("N3_cpmk" + idx, cpmk.path("N3").asText("0"));
                globalMap.put("N4_cpmk" + idx, cpmk.path("N4").asText("0"));
                globalMap.put("N5_cpmk" + idx, cpmk.path("N5").asText("0"));
                globalMap.put("Ntotal_cpmk" + idx, cpmk.path("N_cpmk").asText("0"));
                globalMap.put("CPMK 1-" + idx, cpmk.path("kode").asText(""));
                globalMap.put("Deskripsi cpmk 1-" + idx, cpmk.path("pernyataan").asText(""));
            }

            // ---------------------------------------------------------
            // 2. CPL LIST DATA
            // ---------------------------------------------------------
            List<Map<String, String>> cplDataList = new ArrayList<>();
            for (JsonNode c : cplListNode) {
                Map<String, String> m = new LinkedHashMap<>();
                m.put("kode", c.path("kode").asText(""));
                m.put("pernyataan", c.path("pernyataan").asText(""));
                cplDataList.add(m);
            }

            // ---------------------------------------------------------
            // 3. CPMK LIST DATA
            // ---------------------------------------------------------
            List<Map<String, String>> cpmkDataList = new ArrayList<>();
            Map<String, String> cpmkDescLookup = new LinkedHashMap<>();
            for (JsonNode c : cpmkListNode) {
                Map<String, String> m = new LinkedHashMap<>();
                m.put("kode", c.path("kode").asText(""));
                m.put("pernyataan", c.path("pernyataan").asText(""));
                cpmkDataList.add(m);
                cpmkDescLookup.put(cleanKey(c.path("kode").asText("")), c.path("pernyataan").asText(""));
            }

            // ---------------------------------------------------------
            // 4. INTEGRATION ROWS (IK-CPL)
            // ---------------------------------------------------------
            List<Map<String, String>> integrationRows = new ArrayList<>();
            JsonNode ikList = rpsData.path("ik");
            if (!ikList.isMissingNode() && ikList.isArray()) {
                Map<String, JsonNode> cpmkObjLookup = new LinkedHashMap<>();
                Map<String, JsonNode> cplObjLookup = new LinkedHashMap<>();
                for (JsonNode c : cpmkListNode) cpmkObjLookup.put(c.path("kode").asText(""), c);
                for (JsonNode c : cplListNode) cplObjLookup.put(c.path("kode").asText(""), c);

                for (JsonNode ik : ikList) {
                    String cpmkCode = ik.path("mapping_cpmk").asText("");
                    JsonNode cpmkData = cpmkObjLookup.getOrDefault(cpmkCode, new com.fasterxml.jackson.databind.node.ObjectNode(null));
                    String cplCode = !ik.path("mapping_cpl").asText("").isBlank()
                            ? ik.path("mapping_cpl").asText("")
                            : cpmkData.path("mapping_cpl").asText("");
                    JsonNode cplData = cplObjLookup.getOrDefault(cplCode, new com.fasterxml.jackson.databind.node.ObjectNode(null));
                    String maVal = generateMediaAsesmenString(cpmkData);

                    Map<String, String> row = new LinkedHashMap<>();
                    row.put("ik_kode", ik.path("kode").asText(""));
                    row.put("pernyataan", ik.path("pernyataan").asText(""));
                    row.put("cpmk_kode", cpmkCode);
                    row.put("cpmk_pernyataan", cpmkData.path("pernyataan").asText(""));
                    row.put("cpl_kode", cplCode);
                    row.put("cpl_pernyataan", cplData.path("pernyataan").asText(""));
                    row.put("N1", cpmkData.path("N1").asText(""));
                    row.put("N2", cpmkData.path("N2").asText(""));
                    row.put("N3", cpmkData.path("N3").asText(""));
                    row.put("N4", cpmkData.path("N4").asText(""));
                    row.put("N5", cpmkData.path("N5").asText(""));
                    row.put("N_total", cpmkData.path("N_cpmk").asText(""));
                    row.put("MA_val", maVal);
                    integrationRows.add(row);
                }
            }

            // ---------------------------------------------------------
            // 5. PROCESS TABLES
            // ---------------------------------------------------------
            Pattern refPlaceholderRegex = Pattern.compile(
                    "paste[_\\s]?referensi(nya)?[_\\s]?disini", Pattern.CASE_INSENSITIVE);

            for (XWPFTable table : doc.getTables()) {
                if (table.getRows().isEmpty()) continue;
                String allText = getAllTableText(table);

                // A. Prune excess CPMK columns
                if (allText.contains("CPMK 1-") || allText.contains("CPMK 1 (")) {
                    pruneUnusedCpmkColumns(table, totalCpmk);
                }

                // B. Global replace
                for (XWPFTableRow row : table.getRows()) {
                    for (XWPFTableCell cell : row.getTableCells()) {
                        for (XWPFParagraph para : cell.getParagraphs()) {
                            replaceParagraphText(para, globalMap);
                        }
                    }
                }

                // C. CPL LIST
                if (allText.contains("cpl.kode")) {
                    Map<String, String> cplMapping = new LinkedHashMap<>();
                    cplMapping.put("cpl.kode", "kode");
                    cplMapping.put("cpl.pernyataan", "pernyataan");
                    processSmartListTable(table, cplDataList, cplMapping);
                }

                // D. CPMK LIST
                if (allText.contains("cpmk.kode")) {
                    Map<String, String> cpmkMapping = new LinkedHashMap<>();
                    cpmkMapping.put("cpmk.kode", "kode");
                    cpmkMapping.put("cpmk.pernyataan", "pernyataan");
                    processSmartListTable(table, cpmkDataList, cpmkMapping);
                }

                // E. INTEGRATION TABLE (IK - CPL)
                if (allText.contains("IK - CPL") && !integrationRows.isEmpty()) {
                    Map<String, String> ikMapping = new LinkedHashMap<>();
                    ikMapping.put("Kode CPL", "cpl_kode");
                    ikMapping.put("IK - CPL", "ik_kode");
                    ikMapping.put("Indikator Kinerja", "pernyataan");
                    ikMapping.put("Kode CPMK", "cpmk_kode");
                    ikMapping.put("CPMK", "cpmk_pernyataan");
                    ikMapping.put("Bobot CPMK", "N_total");
                    ikMapping.put("Media Asesmen", "MA_val");
                    ikMapping.put("PRS", "N1");
                    ikMapping.put("PRO", "N2");
                    ikMapping.put("QUIZ", "N3");
                    ikMapping.put("UTS", "N4");
                    ikMapping.put("UAS", "N5");
                    processSmartListTable(table, integrationRows, ikMapping);
                }

                // F. WEEKLY PLAN
                if (allText.contains("Minggu ke") && allText.contains("Kemampuan Akhir")) {
                    JsonNode mingguList = rpsData.path("minggu").isMissingNode()
                            ? rpsData.path("weeklyPlan") : rpsData.path("minggu");

                    Map<Integer, JsonNode> mingguMap = new LinkedHashMap<>();
                    for (JsonNode m : mingguList) {
                        int ke = m.path("mingguKe").asInt(m.path("minggu").asInt(-1));
                        if (ke > 0) mingguMap.put(ke, m);
                    }

                    for (XWPFTableRow row : table.getRows()) {
                        if (row.getTableCells().isEmpty()) continue;
                        String firstCellText = cleanKey(row.getTableCells().get(0).getText());
                        try {
                            int mKe = Integer.parseInt(firstCellText.strip());
                            JsonNode item = mingguMap.get(mKe);
                            if (item == null) continue;

                            Map<String, String> wm = new LinkedHashMap<>();
                            String rawKa = !item.path("kemampuanAkhir").asText("").isBlank()
                                    ? item.path("kemampuanAkhir").asText("")
                                    : item.path("cpmk").asText("");
                            wm.put("kemampuanAkhir", rawKa);

                            String cleanKa = cleanKey(rawKa);
                            wm.put("pernyataan_kemampuanAkhir",
                                    cpmkDescLookup.getOrDefault(cleanKa, rawKa));

                            String bahanKajian = !item.path("bahanKajian").asText("").isBlank()
                                    ? item.path("bahanKajian").asText("")
                                    : item.path("topik").asText("");
                            wm.put("bahan kajian", bahanKajian);

                            JsonNode metode = item.path("metodePembelajaran");
                            if (metode.isObject()) {
                                String metodeVal = metode.path("metode").asText("");
                                wm.put("metode", metodeVal);
                                wm.put("Metode :", metodeVal);
                                wm.put("deskripsi metode", metode.path("deskripsi").asText(""));
                                wm.put("deskripsi aktivitas", metode.path("aktivitas").asText(""));
                            } else {
                                wm.put("metode", metode.asText(""));
                                wm.put("Metode :", metode.asText(""));
                            }

                            wm.put("waktu", item.path("waktu").asText("3x50'"));

                            String pb = !item.path("pengalamanBelajar").asText("").isBlank()
                                    ? item.path("pengalamanBelajar").asText("")
                                    : item.path("pengalaman").asText("");
                            wm.put("pengalamanBelajar", pb);

                            JsonNode pen = item.path("penilaian");
                            if (pen.isObject()) {
                                wm.put("penilaian.kriteria", pen.path("kriteria").asText(""));
                                String bobot = !pen.path("bobotMateri").asText("").isBlank()
                                        ? pen.path("bobotMateri").asText("")
                                        : pen.path("bobot").asText("");
                                wm.put("penilaian.bobot", bobot);
                            }

                            for (XWPFTableCell cell : row.getTableCells()) {
                                for (XWPFParagraph para : cell.getParagraphs()) {
                                    replaceParagraphText(para, wm);
                                }
                            }
                        } catch (NumberFormatException ignored) {}
                    }
                }

                // G. REFERENCES
                if (refPlaceholderRegex.matcher(allText).find()) {
                    JsonNode refList = rpsData.path("references");
                    JsonNode referensiList = rpsData.path("referensi");

                    List<String> formattedRefs = new ArrayList<>();
                    if (!refList.isMissingNode() && refList.isArray() && refList.size() > 0) {
                        int idx = 1;
                        for (JsonNode ref : refList) {
                            if (ref.isObject()) {
                                String judul = ref.path("judul").asText("").strip();
                                if (!judul.isBlank()) formattedRefs.add(idx++ + ". " + judul);
                            } else {
                                String s = ref.asText("").strip();
                                if (!s.isBlank()) formattedRefs.add(idx++ + ". " + s);
                            }
                        }
                    } else if (!referensiList.isMissingNode() && referensiList.isArray()) {
                        int idx = 1;
                        for (JsonNode r : referensiList) {
                            String s = r.asText("").strip();
                            if (!s.isBlank()) formattedRefs.add(idx++ + ". " + s);
                        }
                    }

                    String refStr = String.join("\n", formattedRefs);

                    for (XWPFTableRow row : table.getRows()) {
                        for (XWPFTableCell cell : row.getTableCells()) {
                            for (XWPFParagraph para : cell.getParagraphs()) {
                                String paraText = para.getText();
                                if (paraText != null && refPlaceholderRegex.matcher(paraText).find()) {
                                    String newText = refPlaceholderRegex.matcher(paraText).replaceAll(refStr);
                                    setRunText(para, newText);
                                }
                            }
                        }
                    }
                }
            }

            // Save document
            try (FileOutputStream fos = new FileOutputStream(outputPath)) {
                doc.write(fos);
            }

            long totalMs = System.currentTimeMillis() - startTime;
            long fileSize = new File(outputPath).length();
            System.out.printf("✅ DOCX saved in %.2fs to: %s%n", totalMs / 1000.0, outputPath);
            System.out.println("✅ File size: " + fileSize + " bytes");

            if (fileSize < 10000) {
                System.out.println("   ⚠️ Warning: File seems small (< 10KB), might be corrupted");
            }
            return true;

        } catch (Exception e) {
            System.out.println("❌ Error converting to DOCX: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }

    private static String getAllTableText(XWPFTable table) {
        StringBuilder sb = new StringBuilder();
        for (XWPFTableRow row : table.getRows()) {
            for (XWPFTableCell cell : row.getTableCells()) {
                sb.append(cell.getText()).append(" ");
            }
        }
        return sb.toString();
    }

    // ------------------------------------------------------------------ //
    //  Utility helpers
    // ------------------------------------------------------------------ //
    private static String str(Object obj) {
        return obj != null ? obj.toString() : "";
    }

    @SuppressWarnings("unchecked")
    private static String nestedStr(Map<String, Object> meta, String outerKey, String innerKey) {
        Object outer = meta.get(outerKey);
        if (outer instanceof Map<?, ?> map) {
            Object inner = ((Map<String, Object>) map).get(innerKey);
            return inner != null ? inner.toString() : "";
        }
        return "";
    }
}
