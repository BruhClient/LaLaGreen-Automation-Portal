"use server";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import * as XLSX from "xlsx";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { CANONICAL_SLOTS, MAX_SLOT_AMOUNT } from "@/lib/ppc-daily-cap-constants";

const SLOT_MINUTES = CANONICAL_SLOTS.map((s) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
});

function snapToSlot(minutes: number): string {
  let best = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < SLOT_MINUTES.length; i++) {
    const diff = Math.abs(SLOT_MINUTES[i] - minutes);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return CANONICAL_SLOTS[best];
}

function parseTimeToMinutes(raw: unknown): number | null {
  if (raw instanceof Date) {
    return raw.getUTCHours() * 60 + raw.getUTCMinutes();
  }
  if (typeof raw === "number") {
    if (raw >= 0 && raw < 1) return Math.round(raw * 24 * 60) % (24 * 60);
    if (Number.isInteger(raw) && raw >= 0 && raw <= 24) return raw * 60;
    if (Number.isInteger(raw) && raw >= 100 && raw <= 2359 && raw % 100 < 60) {
      return Math.floor(raw / 100) * 60 + (raw % 100);
    }
    return null;
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    let m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/i);
    if (m) {
      let h = Number(m[1]);
      const min = Number(m[2]);
      const ampm = m[3]?.toLowerCase();
      if (ampm === "pm" && h < 12) h += 12;
      if (ampm === "am" && h === 12) h = 0;
      if (h > 23 || min > 59) return null;
      return h * 60 + min;
    }
    m = s.match(/^(\d{3,4})$/);
    if (m) {
      const n = Number(m[1]);
      const h = Math.floor(n / 100);
      const min = n % 100;
      if (h > 23 || min > 59) return null;
      return h * 60 + min;
    }
    return null;
  }
  return null;
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

const COUNTRY_ALIASES: Record<string, string[]> = {
  US: ["us", "usa", "u.s.", "u.s.a.", "united states", "united states of america"],
  CA: ["ca", "canada"],
  UK: ["uk", "u.k.", "united kingdom", "great britain", "gb"],
  AU: ["au", "australia"],
  DE: ["de", "germany", "deutschland"],
  FR: ["fr", "france"],
  JP: ["jp", "japan"],
  MX: ["mx", "mexico"],
};

function matchCountryLabel(raw: string, validCountries: string[]): string | null {
  const norm = raw.trim().toLowerCase();
  if (!norm) return null;
  for (const code of validCountries) {
    if (norm === code.toLowerCase()) return code;
  }
  for (const code of validCountries) {
    if (COUNTRY_ALIASES[code.toUpperCase()]?.includes(norm)) return code;
  }
  return null;
}

function normalizeHeader(cell: unknown): string {
  return String(cell ?? "").trim().toLowerCase();
}

const TIME_HINTS = ["time", "slot", "hour"];
const AMOUNT_HINTS = ["amount", "budget", "cap", "spend", "dollar", "usd", "value", "$"];
const COUNTRY_HINTS = ["country", "marketplace", "market", "region", "cc"];

interface ColumnMapping {
  headerRowIndex: number;
  timeCol: number;
  amountCol: number;
  countryCol: number | null;
  inferredCountryCode?: string | null;
}

function detectColumnsHeuristically(matrix: unknown[][]): ColumnMapping | null {
  const maxScan = Math.min(matrix.length, 15);
  for (let r = 0; r < maxScan; r++) {
    const row = matrix[r] ?? [];
    let timeCol = -1;
    let amountCol = -1;
    let countryCol = -1;
    row.forEach((cell, i) => {
      const h = normalizeHeader(cell);
      if (timeCol === -1 && TIME_HINTS.some((hint) => h.includes(hint))) timeCol = i;
      if (amountCol === -1 && AMOUNT_HINTS.some((hint) => h.includes(hint))) amountCol = i;
      if (countryCol === -1 && COUNTRY_HINTS.some((hint) => h.includes(hint))) countryCol = i;
    });
    if (timeCol !== -1 && amountCol !== -1) {
      return { headerRowIndex: r, timeCol, amountCol, countryCol: countryCol === -1 ? null : countryCol };
    }
  }
  return null;
}

const ColumnDetectSchema = z.object({
  sheets: z.array(
    z.object({
      sheetName: z.string(),
      headerRowIndex: z.number().nullable(),
      timeColumnIndex: z.number().nullable(),
      amountColumnIndex: z.number().nullable(),
      countryColumnIndex: z.number().nullable(),
      inferredCountryCode: z.string().nullable(),
    })
  ),
});

/** Structure-only detection — Claude never sees or reproduces the actual amounts, just column roles. */
async function detectColumnsWithAi(
  sheets: { sheetName: string; matrix: unknown[][] }[],
  validCountries: string[]
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

Known marketplace codes: ${validCountries.join(", ")}

For each sheet return:
- headerRowIndex: the row index containing column headers (null if none)
- timeColumnIndex: the column index holding a time-of-day / slot value (null if none found)
- amountColumnIndex: the column index holding a dollar amount (null if none found)
- countryColumnIndex: the column index holding a marketplace/country label (null if the sheet has no such column)
- inferredCountryCode: if there's no country column, which single known marketplace code this whole sheet represents based on context (e.g. sheet name), or null if unclear

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
    if (s.headerRowIndex === null || s.timeColumnIndex === null || s.amountColumnIndex === null) continue;
    result[s.sheetName] = {
      headerRowIndex: s.headerRowIndex,
      timeCol: s.timeColumnIndex,
      amountCol: s.amountColumnIndex,
      countryCol: s.countryColumnIndex,
      inferredCountryCode: s.inferredCountryCode,
    };
  }
  return Object.keys(result).length > 0 ? result : null;
}

export interface DetectedSheet {
  sheetName: string;
  headerRowIndex: number;
  timeColumnLabel: string;
  amountColumnLabel: string;
  countryColumnLabel: string | null;
  inferredCountryCode: string | null;
  source: "heuristic" | "ai";
  rowsParsed: number;
}

function parseSheetRows(opts: {
  sheetName: string;
  matrix: unknown[][];
  mapping: ColumnMapping;
  source: "heuristic" | "ai";
  validCountries: string[];
  totals: Map<string, Map<string, number>>;
  warnings: string[];
  unresolvedCountryLabels: Set<string>;
  detected: DetectedSheet[];
}) {
  const { sheetName, matrix, mapping, source, validCountries, totals, warnings, unresolvedCountryLabels, detected } = opts;
  const { headerRowIndex, timeCol, amountCol, countryCol } = mapping;
  const headerRow = matrix[headerRowIndex] ?? [];

  let sheetInferredCountry: string | null = mapping.inferredCountryCode ?? null;
  if (countryCol === null && !sheetInferredCountry) {
    sheetInferredCountry = matchCountryLabel(sheetName, validCountries);
    if (!sheetInferredCountry && validCountries.length === 1) sheetInferredCountry = validCountries[0];
  }

  if (countryCol === null && !sheetInferredCountry) {
    warnings.push(
      `${sheetName}: no marketplace column and couldn't tell which marketplace it belongs to (multiple exist) — sheet skipped.`
    );
    detected.push({
      sheetName,
      headerRowIndex,
      timeColumnLabel: String(headerRow[timeCol] ?? `column ${timeCol}`),
      amountColumnLabel: String(headerRow[amountCol] ?? `column ${amountCol}`),
      countryColumnLabel: null,
      inferredCountryCode: null,
      source,
      rowsParsed: 0,
    });
    return;
  }

  let duplicateCount = 0;
  let rowsParsed = 0;
  for (let r = headerRowIndex + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row) continue;
    const timeRaw = row[timeCol];
    const amountRaw = row[amountCol];
    if ((timeRaw === null || timeRaw === undefined) && (amountRaw === null || amountRaw === undefined)) continue;

    const minutes = parseTimeToMinutes(timeRaw);
    const amount = parseAmount(amountRaw);
    if (minutes === null || amount === null) continue;
    if (amount < 0 || amount > MAX_SLOT_AMOUNT) continue;

    let countryCode: string | null;
    if (countryCol !== null) {
      const raw = String(row[countryCol] ?? "").trim();
      if (!raw) {
        countryCode = sheetInferredCountry;
      } else {
        countryCode = matchCountryLabel(raw, validCountries);
        if (!countryCode) {
          unresolvedCountryLabels.add(raw);
          continue;
        }
      }
    } else {
      countryCode = sheetInferredCountry;
    }
    if (!countryCode || !validCountries.includes(countryCode)) continue;

    const slotTime = snapToSlot(minutes);
    const map = totals.get(countryCode) ?? new Map<string, number>();
    if (map.has(slotTime)) duplicateCount++;
    map.set(slotTime, amount);
    totals.set(countryCode, map);
    rowsParsed++;
  }

  if (duplicateCount > 0) {
    warnings.push(`${sheetName}: ${duplicateCount} duplicate slot row(s) were overwritten by the later value.`);
  }

  detected.push({
    sheetName,
    headerRowIndex,
    timeColumnLabel: String(headerRow[timeCol] ?? `column ${timeCol}`),
    amountColumnLabel: String(headerRow[amountCol] ?? `column ${amountCol}`),
    countryColumnLabel: countryCol !== null ? String(headerRow[countryCol] ?? `column ${countryCol}`) : null,
    inferredCountryCode: countryCol === null ? sheetInferredCountry : null,
    source,
    rowsParsed,
  });
}

export async function analyzeScheduleImport(formData: FormData) {
  const session = await getSession();
  if (!session) return { data: null, error: "Unauthorized" };

  const client = await createClient();
  const { data: countryRows, error: countriesError } = await client
    .from("ppc_topup_countries")
    .select("country_code");
  if (countriesError) return { data: null, error: countriesError.message };
  const validCountries = (countryRows ?? []).map((c) => c.country_code);
  if (validCountries.length === 0) return { data: null, error: "No marketplaces configured" };

  const file = formData.get("file");
  if (!(file instanceof File)) return { data: null, error: "No file provided" };
  if (file.size > 2_000_000) return { data: null, error: "File too large (max 2MB)" };

  let workbook: XLSX.WorkBook;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  } catch {
    return { data: null, error: "Couldn't read this file — make sure it's a valid Excel spreadsheet" };
  }

  const warnings: string[] = [];
  const totals = new Map<string, Map<string, number>>();
  const unresolvedCountryLabels = new Set<string>();
  const detected: DetectedSheet[] = [];
  const sheetsNeedingAi: { sheetName: string; matrix: unknown[][] }[] = [];

  for (const sheetName of workbook.SheetNames) {
    const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      raw: true,
      defval: null,
    }) as unknown[][];
    if (matrix.length === 0) continue;

    const mapping = detectColumnsHeuristically(matrix);
    if (!mapping) {
      sheetsNeedingAi.push({ sheetName, matrix });
      continue;
    }
    parseSheetRows({
      sheetName,
      matrix,
      mapping,
      source: "heuristic",
      validCountries,
      totals,
      warnings,
      unresolvedCountryLabels,
      detected,
    });
  }

  if (sheetsNeedingAi.length > 0) {
    const columnMap = await detectColumnsWithAi(sheetsNeedingAi, validCountries);
    for (const { sheetName, matrix } of sheetsNeedingAi) {
      const mapping = columnMap?.[sheetName];
      if (!mapping) {
        warnings.push(`${sheetName}: couldn't identify a time or amount column — sheet skipped.`);
        continue;
      }
      parseSheetRows({
        sheetName,
        matrix,
        mapping,
        source: "ai",
        validCountries,
        totals,
        warnings,
        unresolvedCountryLabels,
        detected,
      });
    }
  }

  if (detected.length === 0) {
    return { data: null, error: "Couldn't find any recognizable time/amount columns in this file" };
  }

  if (unresolvedCountryLabels.size > 0) {
    warnings.push(`Unrecognized marketplace label(s), rows skipped: ${[...unresolvedCountryLabels].join(", ")}`);
  }

  const countries = [...totals.entries()].map(([countryCode, slotMap]) => ({
    countryCode,
    changes: [...slotMap.entries()].map(([slotTime, amount]) => ({ slotTime, amount })),
  }));

  return { data: { countries, warnings, detected }, error: null };
}
