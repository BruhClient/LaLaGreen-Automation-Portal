"use server";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import * as XLSX from "xlsx";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

async function requireStaff() {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" as const };
  return { error: null };
}

export interface Sku {
  id: string;
  sku: string;
  created_at: string;
}

export async function listSkus() {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  const client = await createClient();
  const { data, error: dbError } = await client
    .from("sku_master_list")
    .select("id, sku, created_at")
    .order("sku", { ascending: true });

  return { data: data as Sku[] | null, error: dbError?.message ?? null };
}

export async function addSkus(skus: string[]) {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  const cleaned = [...new Set(skus.map((s) => s.trim().toUpperCase()).filter(Boolean))];
  if (cleaned.length === 0) return { data: null, error: "No SKUs provided" };

  const service = createServiceClient();
  const { data, error: dbError } = await service
    .from("sku_master_list")
    .upsert(
      cleaned.map((sku) => ({ sku })),
      { onConflict: "sku", ignoreDuplicates: true }
    )
    .select("id, sku, created_at");

  return { data: data as Sku[] | null, error: dbError?.message ?? null };
}

export async function deleteSku(id: string) {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  const service = createServiceClient();
  const { error: dbError } = await service.from("sku_master_list").delete().eq("id", id);

  return { data: dbError ? null : { ok: true }, error: dbError?.message ?? null };
}

// --- AI-assisted Excel import ---

const SKU_HINTS = ["sku", "item number", "item #", "item no", "product code", "asin", "product id"];

function normalizeHeader(cell: unknown): string {
  return String(cell ?? "").trim().toLowerCase();
}

interface ColumnMapping {
  headerRowIndex: number;
  skuCol: number;
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
    if (skuCol !== -1) return { headerRowIndex: r, skuCol };
  }
  return null;
}

const ColumnDetectSchema = z.object({
  sheets: z.array(
    z.object({
      sheetName: z.string(),
      headerRowIndex: z.number().nullable(),
      skuColumnIndex: z.number().nullable(),
    })
  ),
});

/** Structure-only detection — Claude never sees or reproduces the actual SKU values, just which column holds them. */
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

For each sheet return:
- headerRowIndex: the row index containing column headers (null if none)
- skuColumnIndex: the column index holding product/item SKUs (null if no such column exists in this sheet)

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
    result[s.sheetName] = { headerRowIndex: s.headerRowIndex, skuCol: s.skuColumnIndex };
  }
  return Object.keys(result).length > 0 ? result : null;
}

export interface DetectedSkuSheet {
  sheetName: string;
  headerRowIndex: number;
  skuColumnLabel: string;
  source: "heuristic" | "ai";
  rowsFound: number;
}

function extractSkusFromSheet(opts: {
  sheetName: string;
  matrix: unknown[][];
  mapping: ColumnMapping;
  source: "heuristic" | "ai";
  found: Set<string>;
  detected: DetectedSkuSheet[];
}) {
  const { sheetName, matrix, mapping, source, found, detected } = opts;
  const { headerRowIndex, skuCol } = mapping;
  const headerRow = matrix[headerRowIndex] ?? [];

  let rowsFound = 0;
  for (let r = headerRowIndex + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row) continue;
    const raw = row[skuCol];
    if (raw === null || raw === undefined) continue;
    const sku = String(raw).trim().toUpperCase();
    if (!sku) continue;
    found.add(sku);
    rowsFound++;
  }

  detected.push({
    sheetName,
    headerRowIndex,
    skuColumnLabel: String(headerRow[skuCol] ?? `column ${skuCol}`),
    source,
    rowsFound,
  });
}

export async function parseSkuExcel(formData: FormData) {
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
  const found = new Set<string>();
  const detected: DetectedSkuSheet[] = [];
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
    extractSkusFromSheet({ sheetName, matrix, mapping, source: "heuristic", found, detected });
  }

  if (sheetsNeedingAi.length > 0) {
    const columnMap = await detectColumnWithAi(sheetsNeedingAi);
    for (const { sheetName, matrix } of sheetsNeedingAi) {
      const mapping = columnMap?.[sheetName];
      if (!mapping) {
        warnings.push(`${sheetName}: couldn't identify a SKU column — sheet skipped.`);
        continue;
      }
      extractSkusFromSheet({ sheetName, matrix, mapping, source: "ai", found, detected });
    }
  }

  if (detected.length === 0) {
    return { data: null, error: "Couldn't find any recognizable SKU column in this file" };
  }

  return { data: { skus: [...found].sort(), warnings, detected }, error: null };
}
