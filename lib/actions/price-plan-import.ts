"use server";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import * as XLSX from "xlsx";
import { getSession } from "@/lib/session";

async function requireStaff() {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" as const };
  return { error: null };
}

const SKU_HINTS = ["sku", "item number", "item #", "item no", "product code", "asin", "product id"];
const TARGET_PRICE_HINTS = ["target price", "target", "new price", "desired price", "goal price"];
const PRICE_FALLBACK_HINTS = ["price"];

function normalizeHeader(cell: unknown): string {
  return String(cell ?? "").trim().toLowerCase();
}

function parseAmount(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string") {
    const cleaned = raw.replace(/[^0-9.-]/g, "");
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

interface ColumnMapping {
  headerRowIndex: number;
  skuCol: number;
  targetCol: number | null;
}

function detectColumnHeuristically(matrix: unknown[][]): ColumnMapping | null {
  const maxScan = Math.min(matrix.length, 15);
  for (let r = 0; r < maxScan; r++) {
    const row = matrix[r] ?? [];
    let skuCol = -1;
    row.forEach((cell, i) => {
      const h = normalizeHeader(cell);
      if (skuCol === -1 && SKU_HINTS.some((hint) => h.includes(hint))) skuCol = i;
    });
    if (skuCol !== -1) {
      const targetCol = detectTargetColumnHeuristically(row, skuCol);
      return { headerRowIndex: r, skuCol, targetCol };
    }
  }
  return null;
}

/** Scans the same header row already found for the SKU column for a target-price header, skipping the SKU column itself. */
function detectTargetColumnHeuristically(headerRow: unknown[], skuCol: number): number | null {
  let targetCol = -1;
  headerRow.forEach((cell, i) => {
    if (i === skuCol) return;
    const h = normalizeHeader(cell);
    if (targetCol === -1 && TARGET_PRICE_HINTS.some((hint) => h.includes(hint))) targetCol = i;
  });
  if (targetCol !== -1) return targetCol;

  headerRow.forEach((cell, i) => {
    if (i === skuCol) return;
    const h = normalizeHeader(cell);
    if (targetCol === -1 && PRICE_FALLBACK_HINTS.some((hint) => h.includes(hint))) targetCol = i;
  });
  return targetCol === -1 ? null : targetCol;
}

const ColumnDetectSchema = z.object({
  sheets: z.array(
    z.object({
      sheetName: z.string(),
      headerRowIndex: z.number().nullable(),
      skuColumnIndex: z.number().nullable(),
      targetPriceColumnIndex: z.number().nullable(),
    })
  ),
});

/** Structure-only detection — Claude never sees or reproduces the actual SKU/price values, just which columns hold them. */
async function detectColumnWithAi(
  sheets: { sheetName: string; matrix: unknown[][] }[]
): Promise<Record<string, ColumnMapping> | null> {
  const anthropic = new Anthropic();
  const preview = sheets
    .map(({ sheetName, matrix }) => {
      const rows = matrix
        .slice(0, 20)
        .map((row, i) => `[row ${i}] ${(row ?? []).map((c) => String(c ?? "")).join(" | ")}`);
      return `--- Sheet: ${sheetName} ---\n${rows.join("\n")}`;
    })
    .join("\n\n");

  let response;
  try {
    response = await anthropic.messages.parse({
      model: "claude-opus-4-8",
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: zodOutputFormat(ColumnDetectSchema) },
      messages: [
        {
          role: "user",
          content: `Identify the table structure in each sheet below (0-based row/column indices). Do NOT extract or reproduce any data values — only identify structure.

A SKU is a short product/item identifier code (letters, numbers, dashes/underscores) — not a description, note, or free-text field. A target price column holds the price each SKU should be moved toward (may be labeled "Target Price", "New Price", "Goal Price", or similar — plain "Price" only if nothing more specific exists).

For each sheet return:
- headerRowIndex: the row index containing column headers (null if none)
- skuColumnIndex: the column index holding product/item SKUs (null if no such column exists in this sheet)
- targetPriceColumnIndex: the column index holding the target/new price for each SKU (null if no such column exists)

${preview}`,
        },
      ],
    });
  } catch {
    return null;
  }

  const parsed = response.parsed_output;
  if (!parsed) return null;

  const result: Record<string, ColumnMapping> = {};
  for (const s of parsed.sheets) {
    if (s.headerRowIndex === null || s.skuColumnIndex === null) continue;
    result[s.sheetName] = {
      headerRowIndex: s.headerRowIndex,
      skuCol: s.skuColumnIndex,
      targetCol: s.targetPriceColumnIndex,
    };
  }
  return Object.keys(result).length > 0 ? result : null;
}

export interface DetectedPriceImportSheet {
  sheetName: string;
  skuColumnLabel: string;
  targetColumnLabel: string | null;
  source: "heuristic" | "ai";
  rowsFound: number;
}

function extractRowsFromSheet(opts: {
  sheetName: string;
  matrix: unknown[][];
  mapping: ColumnMapping;
  source: "heuristic" | "ai";
  rowsBySku: Map<string, number | null>;
  detected: DetectedPriceImportSheet[];
  warnings: string[];
}) {
  const { sheetName, matrix, mapping, source, rowsBySku, detected, warnings } = opts;
  const { headerRowIndex, skuCol, targetCol } = mapping;
  const headerRow = matrix[headerRowIndex] ?? [];

  let rowsFound = 0;
  for (let r = headerRowIndex + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row) continue;
    const raw = row[skuCol];
    if (raw === null || raw === undefined) continue;
    const sku = String(raw).trim();
    if (!sku) continue;

    const targetPrice = targetCol !== null ? parseAmount(row[targetCol]) : null;
    if (rowsBySku.has(sku)) {
      warnings.push(`Duplicate SKU "${sku}" found — using the last occurrence in the file.`);
    }
    rowsBySku.set(sku, targetPrice);
    rowsFound++;
  }

  detected.push({
    sheetName,
    skuColumnLabel: String(headerRow[skuCol] ?? `column ${skuCol}`),
    targetColumnLabel: targetCol !== null ? String(headerRow[targetCol] ?? `column ${targetCol}`) : null,
    source,
    rowsFound,
  });
}

export async function analyzeBulkPriceImport(formData: FormData): Promise<{
  data: {
    rows: { sku: string; targetPrice: number | null }[];
    detected: DetectedPriceImportSheet[];
    warnings: string[];
  } | null;
  error: string | null;
}> {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  const file = formData.get("file");
  if (!(file instanceof File)) return { data: null, error: "No file provided" };
  if (file.size > 2_000_000) return { data: null, error: "File too large (max 2MB)" };

  let workbook: XLSX.WorkBook;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch {
    return { data: null, error: "Couldn't read this file — make sure it's a valid Excel spreadsheet" };
  }

  const warnings: string[] = [];
  const rowsBySku = new Map<string, number | null>();
  const detected: DetectedPriceImportSheet[] = [];
  const sheetsNeedingAi: { sheetName: string; matrix: unknown[][] }[] = [];

  for (const sheetName of workbook.SheetNames) {
    const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      raw: true,
      defval: null,
    }) as unknown[][];
    if (matrix.length === 0) continue;

    const mapping = detectColumnHeuristically(matrix);
    if (!mapping) {
      sheetsNeedingAi.push({ sheetName, matrix });
      continue;
    }
    extractRowsFromSheet({ sheetName, matrix, mapping, source: "heuristic", rowsBySku, detected, warnings });
  }

  if (sheetsNeedingAi.length > 0) {
    const columnMap = await detectColumnWithAi(sheetsNeedingAi);
    for (const { sheetName, matrix } of sheetsNeedingAi) {
      const mapping = columnMap?.[sheetName];
      if (!mapping) {
        warnings.push(`${sheetName}: couldn't identify a SKU column — sheet skipped.`);
        continue;
      }
      extractRowsFromSheet({ sheetName, matrix, mapping, source: "ai", rowsBySku, detected, warnings });
    }
  }

  if (detected.length === 0) {
    return { data: null, error: "Couldn't find any recognizable SKU column in this file" };
  }

  const rows = [...rowsBySku].map(([sku, targetPrice]) => ({ sku, targetPrice }));
  return { data: { rows, detected, warnings }, error: null };
}
