import * as fs from 'fs';
import * as path from 'path';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import JSZip from 'jszip';

export interface RPSData {
  deskripsi?: string;
  cpl?: any[];
  cpmk?: any[];
  ik?: any[];
  minggu?: any[];
  referensi?: any[];
  penilaian?: any[];
  cpmkList?: any[];
  deskripsiSingkat?: string;
  weeklyPlan?: any[];
  otoritas?: any;
  references?: any[];
  [key: string]: any;
}

export interface Metadata {
  nama?: string;
  kode?: string;
  sks?: number;
  semester?: number;
  status?: string;
  prasyarat?: string;
  koordinatorMK?: { nama: string; nip: string };
  koordinatorGPM?: { nama: string; nip: string };
  ketuaProdi?: { nama: string; nip: string };
  dekan?: { nama: string; nip: string };
  [key: string]: any;
}

interface TableRow {
  cells: TableCell[];
  element: any;
}

interface TableCell {
  text: string;
  paragraphs: TableParagraph[];
  element: any;
}

interface TableParagraph {
  text: string;
  runs: TableRun[];
  element: any;
}

interface TableRun {
  text: string;
  element: any;
}

interface Table {
  rows: TableRow[];
  columns: any[];
  element: any;
}

/**
 * Membersihkan text untuk pencarian key yang akurat.
 */
function cleanKey(text: string | undefined): string {
  if (!text) return '';
  return text
    .replace(/"/g, '')
    .replace(/"/g, '')
    .replace(/"/g, '')
    .trim();
}

/**
 * Mendeteksi index CPMK dari header kolom.
 */
function getCpmkIndexFromHeader(text: string): number | null {
  const match = text.match(/CPMK\s*(?:1-)?(\d+)/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Normalize text untuk perbandingan (case-insensitive).
 */
function normalizeText(s: string | undefined): string {
  if (!s) return '';
  return s
    .replace(/"/g, '')
    .replace(/'/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Generate string media asesmen dari bobot CPMK.
 */
function generateMediaAsesmenString(cpmkItem: any): string {
  const components: string[] = [];
  if (cpmkItem?.N1 > 0) components.push('PRS');
  if (cpmkItem?.N2 > 0) components.push('PRO');
  if (cpmkItem?.N3 > 0) components.push('QUIZ');
  if (cpmkItem?.N4 > 0) components.push('UTS');
  if (cpmkItem?.N5 > 0) components.push('UAS');
  return components.join(', ');
}

/**
 * Extract all tables from document.xml
 */
function extractTables(docElement: any): Table[] {
  const tables: Table[] = [];
  const tblElements = docElement.getElementsByTagName('w:tbl');

  for (let t = 0; t < tblElements.length; t++) {
    const tblElement = tblElements[t];
    const rows: TableRow[] = [];
    const trElements = tblElement.getElementsByTagName('w:tr');

    for (let r = 0; r < trElements.length; r++) {
      const trElement = trElements[r];
      const cells: TableCell[] = [];
      const tcElements = trElement.getElementsByTagName('w:tc');

      for (let c = 0; c < tcElements.length; c++) {
        const tcElement = tcElements[c];
        const paragraphs: TableParagraph[] = [];
        const pElements = tcElement.getElementsByTagName('w:p');

        for (let p = 0; p < pElements.length; p++) {
          const pElement = pElements[p];
          const runs: TableRun[] = [];
          const rElements = pElement.getElementsByTagName('w:r');
          let paraText = '';

          for (let r2 = 0; r2 < rElements.length; r2++) {
            const rElement = rElements[r2];
            const tElements = rElement.getElementsByTagName('w:t');
            let runText = '';
            for (let t2 = 0; t2 < tElements.length; t2++) {
              runText += tElements[t2].textContent || '';
            }
            if (runText) {
              runs.push({ text: runText, element: rElement });
              paraText += runText;
            }
          }

          paragraphs.push({ text: paraText, runs, element: pElement });
        }

        const cellText = paragraphs.map(p => p.text).join(' ');
        cells.push({ text: cellText, paragraphs, element: tcElement });
      }

      rows.push({ cells, element: trElement });
    }

    // Get tblGrid for column info
    const tblGrid = tblElement.getElementsByTagName('w:tblGrid')[0];
    const gridCols = tblGrid ? tblGrid.getElementsByTagName('w:gridCol') : [];

    tables.push({ rows, columns: Array.from(gridCols), element: tblElement });
  }

  return tables;
}

/**
 * Replace referensi placeholder with line-break separated items using <w:br/> elements
 */
function replaceReferencesWithLineBreaks(
  paragraph: TableParagraph,
  referencesArray: string[],
  xmlDoc: Document
): void {
  if (!paragraph.runs || paragraph.runs.length === 0 || referencesArray.length === 0) {
    return;
  }

  try {
    const pElement = paragraph.element;
    const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

    // Format references with numbers
    const formattedRefs = referencesArray.map(
      (ref, i) => `${i + 1}. ${typeof ref === 'string' ? ref : ref}`
    );

    // Clear all existing runs
    const existingRuns = pElement.getElementsByTagName('w:r');
    while (existingRuns.length > 0) {
      existingRuns[0]?.parentNode?.removeChild(existingRuns[0]);
    }

    // Add new runs with line breaks
    for (let i = 0; i < formattedRefs.length; i++) {
      const ref = formattedRefs[i];

      // Create <w:r> element
      const run = xmlDoc.createElement('w:r');

      // Create <w:t> element with reference text
      const tElem = xmlDoc.createElement('w:t');
      tElem.setAttribute('xml:space', 'preserve');
      tElem.textContent = ref;

      run.appendChild(tElem);

      // Add to paragraph
      pElement.appendChild(run);

      // Add line break <w:br/> if not last item
      if (i < formattedRefs.length - 1) {
        const brRun = xmlDoc.createElement('w:r');
        const br = xmlDoc.createElement('w:br');
        brRun.appendChild(br);
        pElement.appendChild(brRun);
      }
    }

    // Update paragraph object
    paragraph.text = formattedRefs.join(' ');
    paragraph.runs = []; // Clear runs cache
  } catch (e) {
    console.warn(`[WARN] Error replacing references with line breaks:`, e);
  }
}

/**
 * Replace text di paragraph dengan exact dan partial matching.
 * Handles text split across multiple runs.
 */
function replaceParagraphText(
  paragraph: TableParagraph,
  placeholderMap: Record<string, any>
): void {
  if (!paragraph.text) return;

  const pTextRaw = paragraph.text;
  const pTextNorm = normalizeText(pTextRaw);

  // 1. Exact Match Check (Prioritas)
  for (const [key, val] of Object.entries(placeholderMap)) {
    if (normalizeText(key) === pTextNorm) {
      // Replace text carefully handling split runs
      replaceRunText(paragraph, String(val));
      return;
    }
  }

  // 2. Partial Match Check (case-insensitive)
  for (const [key, val] of Object.entries(placeholderMap)) {
    const fullText = paragraph.text;
    const keyVariants = [key, `"${key}"`, `'${key}'`];

    for (const variant of keyVariants) {
      const pattern = new RegExp(variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      if (pattern.test(fullText)) {
        const newText = fullText.replace(pattern, String(val));
        replaceRunText(paragraph, newText);
        return;
      }
    }
  }
}

/**
 * Replace run text handling splits across multiple runs.
 */
function replaceRunText(paragraph: TableParagraph, newText: string): void {
  try {
    if (!paragraph.runs || paragraph.runs.length === 0) {
      return;
    }

    // Strategy: Put all text in first run and clear others
    if (paragraph.runs.length > 0) {
      paragraph.runs[0].text = newText;
      // Update XML
      const tElement = paragraph.runs[0].element.getElementsByTagName('w:t');
      if (tElement && tElement.length > 0) {
        tElement[0].textContent = newText;
      }

      // Clear remaining runs
      for (let i = 1; i < paragraph.runs.length; i++) {
        const run = paragraph.runs[i];
        const tElems = run.element.getElementsByTagName('w:t');
        for (let j = 0; j < tElems.length; j++) {
          tElems[j].textContent = '';
        }
        run.text = '';
      }
    }
  } catch (e) {
    console.warn(`[WARN] Error replacing run text:`, e);
  }
}

/**
 * Set cell text while preserving formatting.
 */
function setCellTextPreserveFormat(cell: TableCell, text: string): void {
  try {
    text = String(text || '');

    if (!cell.paragraphs || cell.paragraphs.length === 0) {
      return;
    }

    const paragraph = cell.paragraphs[0];

    // Save formatting from first run
    let savedFontSize = null;
    let savedFontName = null;
    let savedBold = null;
    let savedItalic = null;

    if (paragraph.runs && paragraph.runs.length > 0) {
      const sourceRun = paragraph.runs[0];
      // Extract formatting from XML attributes if present
      // For now, we'll just replace text
    }

    // Clear all runs
    if (paragraph.runs && paragraph.runs.length > 0) {
      for (const run of paragraph.runs) {
        const tElements = run.element.getElementsByTagName('w:t');
        for (let i = 0; i < tElements.length; i++) {
          tElements[i].textContent = '';
        }
        run.text = '';
      }
    }

    // Add new text to first run or create new run
    if (text && paragraph.runs && paragraph.runs.length > 0) {
      const tElement = paragraph.runs[0].element.getElementsByTagName('w:t');
      if (tElement && tElement.length > 0) {
        tElement[0].textContent = text;
        paragraph.runs[0].text = text;
      }
    }
  } catch (e) {
    console.warn(`[WARN] Error setting cell text:`, e);
  }
}

/**
 * Delete column from table safely.
 */
function deleteColumnSafe(table: Table, colIdx: number): void {
  try {
    // Get tblGrid
    const tblGrid = table.element.getElementsByTagName('w:tblGrid')[0];
    if (tblGrid) {
      const gridCols = tblGrid.getElementsByTagName('w:gridCol');
      if (colIdx < gridCols.length) {
        tblGrid.removeChild(gridCols[colIdx]);
      }
    }

    // Remove cell from each row
    for (const row of table.rows) {
      if (colIdx < row.cells.length) {
        row.element.removeChild(row.cells[colIdx].element);
      }
    }
  } catch (e) {
    console.warn(`[WARN] Failed to delete column ${colIdx}:`, e);
  }
}

/**
 * Prune unused CPMK columns.
 */
function pruneUnusedCpmkColumns(table: Table, totalCpmkJson: number): void {
  const colsToDelete = new Set<number>();

  // Check header rows (first 2)
  const headerRows = table.rows.slice(0, 2);

  for (const row of headerRows) {
    for (let cIdx = 0; cIdx < row.cells.length; cIdx++) {
      const cell = row.cells[cIdx];
      const cIdxNum = getCpmkIndexFromHeader(cell.text);

      if (cIdxNum && cIdxNum > totalCpmkJson) {
        colsToDelete.add(cIdx);
      }

      // Check placeholders
      for (let i = totalCpmkJson + 1; i <= 12; i++) {
        if (
          cell.text.includes(`cpmk${i}`)
          || cell.text.toLowerCase().includes(`cpmk ${i}`)
        ) {
          colsToDelete.add(cIdx);
        }
      }
    }
  }

  // Delete from largest index to smallest
  const sortedCols = Array.from(colsToDelete).sort((a, b) => b - a);
  for (const colIdx of sortedCols) {
    deleteColumnSafe(table, colIdx);
  }
}

/**
 * Duplicate table row.
 */
function duplicateTableRow(table: Table, rowIdx: number): TableRow | null {
  try {
    if (rowIdx < 0 || rowIdx >= table.rows.length) return null;

    const sourceRow = table.rows[rowIdx];
    const clonedElement = sourceRow.element.cloneNode(true);
    sourceRow.element.parentNode.insertBefore(clonedElement, sourceRow.element.nextSibling);

    // Re-extract tables to get updated references
    return null; // Caller should re-extract
  } catch (e) {
    console.warn(`[WARN] Failed to duplicate row ${rowIdx}:`, e);
    return null;
  }
}

/**
 * Remove table row.
 */
function removeTableRow(table: Table, rowIdx: number): void {
  try {
    if (rowIdx >= 0 && rowIdx < table.rows.length) {
      const row = table.rows[rowIdx];
      row.element.parentNode.removeChild(row.element);
    }
  } catch (e) {
    console.warn(`[WARN] Failed to remove row ${rowIdx}:`, e);
  }
}

/**
 * Process smart list table with dynamic row handling.
 */
function processSmartListTable(
  table: Table,
  dataList: any[],
  mappingConfig: Record<string, string>
): void {
  if (!dataList || dataList.length === 0) return;

  const templateRows: number[] = [];
  const isIntegrationTable = Object.values(mappingConfig).join('').includes('cpl_kode');

  // Find template rows
  for (let i = 0; i < table.rows.length; i++) {
    const row = table.rows[i];
    const rowText = row.cells.map(c => c.text).join(' ');
    let isTemplate = false;

    if (isIntegrationTable) {
      if (i < 2) continue; // Skip header rows

      if (rowText.toLowerCase().includes('total bobot')) continue; // Skip total row

      const hasCpmkPattern = /CPMK\s+\d+-\d+/.test(rowText);
      const hasIkPattern = /IK\s+\d+-\d+/.test(rowText);
      if (hasCpmkPattern && hasIkPattern) {
        isTemplate = true;
      }
    } else {
      // Check if row contains placeholder (FIXED: correct inclusion check)
      for (const ph of Object.keys(mappingConfig)) {
        if (cleanKey(rowText).includes(cleanKey(ph))) {
          isTemplate = true;
          break;
        }
      }
    }

    if (isTemplate) {
      templateRows.push(i);
    }
  }

  if (templateRows.length === 0) return;

  const startIdx = templateRows[0];
  const available = templateRows.length;
  const needed = dataList.length;

  // Resize table
  if (needed > available) {
    const diff = needed - available;
    let insertPos = templateRows[templateRows.length - 1];
    for (let i = 0; i < diff; i++) {
      duplicateTableRow(table, insertPos);
      insertPos++;
    }
    // Re-extract table from DOM since we modified it
    const parentDoc = table.element.ownerDocument;
    const tables = extractTables(parentDoc.documentElement);
    const tableIndex = Array.from(table.element.parentNode.getElementsByTagName('w:tbl')).indexOf(table.element);
    if (tableIndex >= 0 && tableIndex < tables.length) {
      Object.assign(table, tables[tableIndex]);
    }
  } else if (needed < available) {
    const diff = available - needed;
    const indicesToRemove = templateRows.slice(needed);
    for (let i = indicesToRemove.length - 1; i >= 0; i--) {
      removeTableRow(table, indicesToRemove[i]);
    }
  }

  // Fill data
  for (let i = 0; i < dataList.length; i++) {
    const rowIdx = startIdx + i;
    if (rowIdx >= table.rows.length) break;

    const row = table.rows[rowIdx];
    const item = dataList[i];

    if (isIntegrationTable) {
      const colMapping: Record<string, number> = {
        cpl_kode: 0,
        ik_kode: 1,
        pernyataan: 2,
        cpmk_kode: 3,
        cpmk_pernyataan: 4,
        N_total: 5,
        MA_val: 6,
        N1: 7,
        N2: 8,
        N3: 9,
        N4: 10,
        N5: 11,
      };

      if (row.cells.length >= 12) {
        setCellTextPreserveFormat(row.cells[colMapping.cpl_kode], String(item.cpl_kode || ''));
        setCellTextPreserveFormat(row.cells[colMapping.ik_kode], String(item.ik_kode || ''));
        setCellTextPreserveFormat(row.cells[colMapping.pernyataan], String(item.pernyataan || ''));
        setCellTextPreserveFormat(row.cells[colMapping.cpmk_kode], String(item.cpmk_kode || ''));
        setCellTextPreserveFormat(row.cells[colMapping.cpmk_pernyataan], String(item.cpmk_pernyataan || ''));
        setCellTextPreserveFormat(row.cells[colMapping.N_total], String(item.N_total || ''));
        setCellTextPreserveFormat(row.cells[colMapping.MA_val], String(item.MA_val || ''));
        setCellTextPreserveFormat(row.cells[colMapping.N1], String(item.N1 || ''));
        setCellTextPreserveFormat(row.cells[colMapping.N2], String(item.N2 || ''));
        setCellTextPreserveFormat(row.cells[colMapping.N3], String(item.N3 || ''));
        setCellTextPreserveFormat(row.cells[colMapping.N4], String(item.N4 || ''));
        setCellTextPreserveFormat(row.cells[colMapping.N5], String(item.N5 || ''));
      }
    } else {
      const rowMap: Record<string, any> = {};
      for (const [ph, key] of Object.entries(mappingConfig)) {
        rowMap[ph] = item[key] || '';
      }

      for (const cell of row.cells) {
        for (const p of cell.paragraphs) {
          replaceParagraphText(p, rowMap);
        }
      }
    }
  }
}

export class JSONToDocx {
  private templatePath: string;

  constructor(templatePath?: string) {
    if (templatePath) {
      this.templatePath = templatePath;
    } else {
      const scriptDir = __dirname;
      const projectRoot = path.join(scriptDir, '../../..');
      this.templatePath = path.join(projectRoot, 'public', 'RPS.docx');
    }
  }

  private validateTemplate(): boolean {
    if (!fs.existsSync(this.templatePath)) {
      console.log(`[ERROR] Template not found: ${this.templatePath}`);
      return false;
    }
    console.log(`[OK] Template found: ${this.templatePath}`);
    return true;
  }

  public async exportToDocx(
    rpsData: RPSData,
    meta: Metadata,
    outputPath: string
  ): Promise<boolean> {
    try {
      const startTime = Date.now();

      console.log('[CONVERT] Validating template...');
      if (!this.validateTemplate()) {
        console.log('[ERROR] Template validation failed');
        return false;
      }

      console.log(
        '[CONVERT] Converting JSON to DOCX via pure npm full implementation...'
      );
      console.log(`   Template: ${this.templatePath}`);
      console.log(`   Output: ${outputPath}`);

      // Load DOCX
      console.log(`[LOAD] Loading template from ${this.templatePath}...`);
      const templateBuffer = fs.readFileSync(this.templatePath);
      const zip = new JSZip();
      const zipData = await zip.loadAsync(templateBuffer);

      // Read document.xml
      const docXmlContent = await zipData.file('word/document.xml')?.async('string');
      if (!docXmlContent) {
        console.error('[ERROR] Cannot read document.xml');
        return false;
      }

      // Parse XML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(docXmlContent, 'text/xml');
      const documentElement = xmlDoc.getElementsByTagName('w:document')[0];

      if (!documentElement) {
        console.error('[ERROR] No w:document element found');
        return false;
      }

      console.log('[LOAD] Template loaded successfully');

      // Prepare metadata
      const finalMeta: Metadata = {
        nama: meta.nama || 'Mata Kuliah',
        kode: meta.kode || 'MK001',
        sks: meta.sks || 3,
        semester: meta.semester || 1,
        status: meta.status || 'Mata Kuliah Wajib',
        prasyarat: meta.prasyarat || '-',
        ...meta,
      };

      // CPMK List
      const cpmkList = rpsData.cpmkList || rpsData.cpmk || [];
      const cpmkDescLookup: Record<string, string> = {};
      // Build two lookup maps: one normalized, one with original kode
      for (const item of cpmkList) {
        const kode = item.kode || '';
        const pernyataan = item.pernyataan || '';
        // Store both normalized and original
        cpmkDescLookup[cleanKey(kode)] = pernyataan;
        cpmkDescLookup[kode] = pernyataan; // Also store original
        // Store with and without spaces for flexible matching
        cpmkDescLookup[kode.replace(/\s+/g, '')] = pernyataan;
      }
      const totalCpmk = cpmkList.length;

      // Deskripsi
      const deskripsi = rpsData.deskripsiSingkat || rpsData.deskripsi || '';

      // Global map
      const globalMap: Record<string, any> = {
        'identitas.kode': finalMeta.kode,
        'identitas.nama': finalMeta.nama,
        'identitas.sks': String(finalMeta.sks),
        'identitas.semester': String(finalMeta.semester),
        'identitas.status': finalMeta.status,
        'identitas.prasyarat': finalMeta.prasyarat,
        'identitas.prasayarat': finalMeta.prasyarat,
        'Deskripsi mata kuliah': deskripsi,

        'Otoritas.koordinatormk.nama': finalMeta.koordinatorMK?.nama || '',
        'Otoritas.koordinatormk.nip': finalMeta.koordinatorMK?.nip || '',
        'Otoritas.koordinatorGPM.nama': finalMeta.koordinatorGPM?.nama || '',
        'Otoritas.koordinatorGPM.nip': finalMeta.koordinatorGPM?.nip || '',
        'Otoritas.ketuaProdi.nama': finalMeta.ketuaProdi?.nama || '',
        'Otoritas.ketuaProdi.nip': finalMeta.ketuaProdi?.nip || '',
        'Otoritas.dekan.nama': finalMeta.dekan?.nama || '',
        'Otoritas.dekan.nip': finalMeta.dekan?.nip || '',
      };

      // CPMK weights & media
      for (let i = 0; i < cpmkList.length; i++) {
        const cpmk = cpmkList[i];
        const idx = i + 1;
        const maStr = generateMediaAsesmenString(cpmk);
        globalMap[`MA_cpmk${idx}`] = maStr;
        globalMap[`N1_cpmk${idx}`] = cpmk.N1 || 0;
        globalMap[`N2_cpmk${idx}`] = cpmk.N2 || 0;
        globalMap[`N3_cpmk${idx}`] = cpmk.N3 || 0;
        globalMap[`N4_cpmk${idx}`] = cpmk.N4 || 0;
        globalMap[`N5_cpmk${idx}`] = cpmk.N5 || 0;
        globalMap[`Ntotal_cpmk${idx}`] = cpmk.N_cpmk || 0;
        globalMap[`CPMK 1-${idx}`] = cpmk.kode || '';
        globalMap[`Deskripsi cpmk 1-${idx}`] = cpmk.pernyataan || '';
      }

      // CPL List
      const cplList = rpsData.cplList || rpsData.cpl || [];

      // Integration rows
      const integrationRows: any[] = [];
      const ikList = rpsData.ik || [];
      if (ikList.length > 0) {
        const cpmkObjLookup: Record<string, any> = {};
        const cplObjLookup: Record<string, any> = {};

        for (const item of cpmkList) {
          cpmkObjLookup[item.kode || ''] = item;
        }
        for (const item of cplList) {
          cplObjLookup[item.kode || ''] = item;
        }

        for (const ikItem of ikList) {
          const cpmkCode = ikItem.mapping_cpmk || '';
          const cpmkData = cpmkObjLookup[cpmkCode] || {};
          const cplCode = ikItem.mapping_cpl || cpmkData.mapping_cpl || '';
          const cplData = cplObjLookup[cplCode] || {};
          const maVal = generateMediaAsesmenString(cpmkData);

          integrationRows.push({
            ik_kode: ikItem.kode || '',
            pernyataan: ikItem.pernyataan || '',
            cpmk_kode: cpmkCode,
            cpmk_pernyataan: cpmkData.pernyataan || '',
            cpl_kode: cplCode,
            cpl_pernyataan: cplData.pernyataan || '',
            N1: cpmkData.N1 || '',
            N2: cpmkData.N2 || '',
            N3: cpmkData.N3 || '',
            N4: cpmkData.N4 || '',
            N5: cpmkData.N5 || '',
            N_total: cpmkData.N_cpmk || '',
            MA_val: maVal,
          });
        }
      }

      // Extract tables
      const tables = extractTables(documentElement);
      console.log(`[PROCESS] Found ${tables.length} tables in template`);

      const processStart = Date.now();
      console.log(`[PROCESS] Starting table processing...`);

      // Process each table
      for (let tableIdx = 0; tableIdx < tables.length; tableIdx++) {
        const table = tables[tableIdx];
        if (!table.rows || table.rows.length === 0) continue;

        const allText = table.rows
          .flatMap(r => r.cells.map(c => c.text))
          .join(' ');

        // A. DELETE KOLOM CPMK BERLEBIH (Pruning)
        if (allText.includes('CPMK 1-') || allText.includes('CPMK 1 (')) {
          console.log(`   [TABLE ${tableIdx}] Pruning unused CPMK columns...`);
          pruneUnusedCpmkColumns(table, totalCpmk);
        }

        // B. GLOBAL REPLACE (Identitas, Otoritas, Bobot CPMK)
        console.log(`   [TABLE ${tableIdx}] Applying global replacements...`);
        for (const row of table.rows) {
          for (const cell of row.cells) {
            for (const p of cell.paragraphs) {
              replaceParagraphText(p, globalMap);
            }
          }
        }

        // C. CPL LIST
        if (allText.includes('cpl.kode')) {
          console.log(`   [TABLE ${tableIdx}] Processing CPL list...`);
          processSmartListTable(table, cplList, {
            'cpl.kode': 'kode',
            'cpl.pernyataan': 'pernyataan',
          });
        }

        // D. CPMK LIST
        if (allText.includes('cpmk.kode')) {
          console.log(`   [TABLE ${tableIdx}] Processing CPMK list...`);
          processSmartListTable(table, cpmkList, {
            'cpmk.kode': 'kode',
            'cpmk.pernyataan': 'pernyataan',
          });
        }

        // E. TABEL INTEGRASI (IK - CPL)
        if (allText.includes('IK - CPL') && integrationRows.length > 0) {
          console.log(`   [TABLE ${tableIdx}] Processing integration table...`);
          processSmartListTable(table, integrationRows, {
            'Kode CPL': 'cpl_kode',
            'IK - CPL': 'ik_kode',
            'Indikator Kinerja': 'pernyataan',
            'Kode CPMK': 'cpmk_kode',
            'CPMK': 'cpmk_pernyataan',
            'Bobot CPMK': 'N_total',
            'Media Asesmen': 'MA_val',
            'PRS': 'N1',
            'PRO': 'N2',
            'QUIZ': 'N3',
            'UTS': 'N4',
            'UAS': 'N5',
          });
        }

        // F. JADWAL MINGGUAN (Weekly)
        if (allText.includes('Minggu ke') && allText.includes('Kemampuan Akhir')) {
          console.log(`   [TABLE ${tableIdx}] Processing weekly schedule...`);
          const mingguList = rpsData.minggu || rpsData.weeklyPlan || [];
          const mingguMapData: Record<number, any> = {};
          for (const m of mingguList) {
            const key = m.mingguKe || m.minggu;
            if (key) mingguMapData[key] = m;
          }

          for (const row of table.rows) {
            if (!row.cells || row.cells.length === 0) continue;
            const txt = cleanKey(row.cells[0].text);
            if (/^\d+$/.test(txt)) {
              const mKe = parseInt(txt, 10);
              if (mingguMapData[mKe]) {
                const item = mingguMapData[mKe];
                const wm: Record<string, any> = {};

                // 1. Kemampuan Akhir & Deskripsi
                const rawKa = item.kemampuanAkhir || item.cpmk || '';
                wm['kemampuanAkhir'] = rawKa;
                
                // Try multiple lookup strategies for flexibility
                let deskripsi = rawKa; // default fallback
                
                // Strategy 1: Exact lookup with normalized key
                const cleanKa = cleanKey(rawKa);
                if (cpmkDescLookup[cleanKa]) {
                  deskripsi = cpmkDescLookup[cleanKa];
                } 
                // Strategy 2: Exact lookup with original key
                else if (cpmkDescLookup[rawKa]) {
                  deskripsi = cpmkDescLookup[rawKa];
                }
                // Strategy 3: Try without spaces
                else if (cpmkDescLookup[rawKa.replace(/\s+/g, '')]) {
                  deskripsi = cpmkDescLookup[rawKa.replace(/\s+/g, '')];
                }
                // Strategy 4: Loose substring matching
                else {
                  for (const [key, value] of Object.entries(cpmkDescLookup)) {
                    if (key.includes(rawKa) || rawKa.includes(key)) {
                      deskripsi = value;
                      break;
                    }
                  }
                }
                
                wm['pernyataan_kemampuanAkhir'] = deskripsi;

                // 2. Bahan Kajian
                wm['bahan kajian'] = item.bahanKajian || item.topik || '';

                // 3. Metode Pembelajaran (more robust handling)
                const metode = item.metodePembelajaran || {};
                if (typeof metode === 'object' && metode !== null) {
                  const metodeVal = metode.metode || '';
                  wm['metode'] = metodeVal;
                  wm['Metode :'] = metodeVal;
                  wm['TM SCL'] = metodeVal === 'TM SCL' ? '✓' : '';
                  wm['PBL'] = metodeVal === 'PBL' ? '✓' : '';
                  wm['CBL'] = metodeVal === 'CBL' ? '✓' : '';
                  wm['PjBL'] = metodeVal === 'PjBL' ? '✓' : '';
                  wm['deskripsi metode'] = metode.deskripsi || '';
                  wm['Aktivitas :'] = metode.aktivitas || '';
                  wm['deskripsi aktivitas'] = metode.aktivitas || '';
                } else {
                  wm['metode'] = String(metode);
                  wm['Metode :'] = String(metode);
                }

                // 4. Waktu
                wm['waktu'] = item.waktu || "3x50'";

                // 5. Pengalaman Belajar
                wm['pengalamanBelajar'] =
                  item.pengalamanBelajar || item.pengalaman || '';

                // 6. Penilaian
                const pen = item.penilaian || {};
                if (typeof pen === 'object' && pen !== null) {
                  wm['penilaian.kriteria'] = pen.kriteria || '';
                  wm['penilaian.bobot'] = pen.bobotMateri || pen.bobot || '';
                  wm['Kriteria & Indikator'] = pen.kriteria || '';
                  wm['Bobot (%)'] = pen.bobotMateri || pen.bobot || '';
                }

                for (const cell of row.cells) {
                  for (const p of cell.paragraphs) {
                    replaceParagraphText(p, wm);
                  }
                }
              }
            }
          }
        }

        // G. Referensi
        const refPlaceholderRegex = /paste[_\s]?referensi(nya)?[_\s]?disini/gi;
        if (refPlaceholderRegex.test(allText)) {
          console.log(`   [TABLE ${tableIdx}] Processing references with line breaks...`);
          const referencesList = rpsData.references || [];
          const referensiList = rpsData.referensi || [];

          const allRefs: string[] = [];
          if (referencesList.length > 0) {
            for (const ref of referencesList) {
              const refText = typeof ref === 'string' ? ref : ref.judul || '';
              if (refText) {
                allRefs.push(refText);
              }
            }
          } else if (referensiList.length > 0) {
            for (const s of referensiList) {
              const refText = (s || '').trim();
              if (refText) {
                allRefs.push(refText);
              }
            }
          }

          if (allRefs.length > 0) {
            for (const row of table.rows) {
              for (const cell of row.cells) {
                for (const p of cell.paragraphs) {
                  if (refPlaceholderRegex.test(p.text)) {
                    // Use new function with line breaks
                    replaceReferencesWithLineBreaks(p, allRefs, xmlDoc);
                  }
                }
              }
            }
          }
        }
      }

      const processTime = Date.now() - processStart;
      console.log(`[PROCESS] Table processing completed in ${(processTime / 1000).toFixed(2)}s`);

      // Serialize back to XML
      const serializer = new XMLSerializer();
      const modifiedXml = serializer.serializeToString(xmlDoc);

      // Write to DOCX
      console.log('[SAVE] Writing modified document...');
      zipData.file('word/document.xml', modifiedXml);

      const outputBuffer = await zipData.generateAsync({ type: 'nodebuffer' });
      fs.writeFileSync(outputPath, outputBuffer);

      console.log(`✅ DOCX export completed successfully!`);
      console.log(`   Output: ${outputPath}`);

      if (fs.existsSync(outputPath)) {
        const fileSize = fs.statSync(outputPath).size;
        console.log(`✅ File size: ${fileSize} bytes`);
        if (fileSize < 10000) {
          console.warn(`   ⚠️ Warning: File seems small (< 10KB), might be corrupted`);
        }
        return true;
      } else {
        console.error('[ERROR] Output file was not created');
        return false;
      }

    } catch (error) {
      console.error('[ERROR] Export failed:', error);
      return false;
    }
  }
}
