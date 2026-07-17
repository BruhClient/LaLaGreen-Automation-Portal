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
  IT: ["it", "italy", "italia"],
  ES: ["es", "spain", "espana", "españa"],
  NL: ["nl", "netherlands", "holland"],
  SE: ["se", "sweden", "sverige"],
  PL: ["pl", "poland", "polska"],
  BE: ["be", "belgium", "belgique"],
  TR: ["tr", "turkey", "turkiye", "türkiye"],
  EG: ["eg", "egypt"],
  SA: ["sa", "saudi arabia", "ksa"],
  AE: ["ae", "uae", "united arab emirates"],
  IN: ["in", "india"],
  SG: ["sg", "singapore"],
  BR: ["br", "brazil", "brasil"],
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
// Checked before the broader AMOUNT_HINTS list so a phrase like "cap at $20" (a conditional top-up
// threshold, not the base budget) doesn't get mistaken for the real amount column.
const PRIMARY_AMOUNT_HINTS = ["daily budget cap", "budget cap"];

interface ColumnMapping {
  headerRowIndex: number;
  timeCol: number;
  amountCol: number;
  countryCol: number | null;
  inferredCountryCode?: string | null;
}

function findHeaderRow(matrix: unknown[][]): number | null {
  const maxScan = Math.min(matrix.length, 15);
  for (let r = 0; r < maxScan; r++) {
    const row = matrix[r] ?? [];
    let timeCol = -1;
    let amountCol = -1;
    row.forEach((cell, i) => {
      const h = normalizeHeader(cell);
      if (timeCol === -1 && TIME_HINTS.some((hint) => h.includes(hint))) timeCol = i;
      if (amountCol === -1 && AMOUNT_HINTS.some((hint) => h.includes(hint))) amountCol = i;
    });
    if (timeCol !== -1 && amountCol !== -1) return r;
  }
  return null;
}

/**
 * Country labels for side-by-side blocks often sit in a row above the header (e.g. "US" merged over
 * one group of columns, "CA" over another) rather than in a header cell itself. Scans upward from the
 * header row and leftward from the block's amount column, stopping at leftBoundary so one block never
 * picks up a neighboring block's label.
 */
function findCountryLabelAbove(
  matrix: unknown[][],
  headerRowIndex: number,
  col: number,
  leftBoundary: number,
  validCountries: string[]
): string | null {
  const lookupRows = 3;
  for (let r = headerRowIndex - 1; r >= Math.max(0, headerRowIndex - lookupRows); r--) {
    const row = matrix[r] ?? [];
    for (let c = col; c >= leftBoundary; c--) {
      const cell = row[c];
      if (cell === null || cell === undefined || String(cell).trim() === "") continue;
      return matchCountryLabel(String(cell), validCountries);
    }
  }
  return null;
}

/**
 * Detects every time+amount column pairing in the header row. Most files have exactly one (a single
 * marketplace per sheet); some lay out several marketplaces side by side on one tab, sharing a single
 * time column — each amount-hint column found becomes its own block with its own resolved country.
 */
function detectColumnBlocks(matrix: unknown[][], validCountries: string[]): ColumnMapping[] | null {
  const headerRowIndex = findHeaderRow(matrix);
  if (headerRowIndex === null) return null;
  const row = matrix[headerRowIndex] ?? [];

  let amountCols: number[] = [];
  row.forEach((cell, i) => {
    if (PRIMARY_AMOUNT_HINTS.some((hint) => normalizeHeader(cell).includes(hint))) amountCols.push(i);
  });
  if (amountCols.length === 0) {
    const idx = row.findIndex((cell) => AMOUNT_HINTS.some((hint) => normalizeHeader(cell).includes(hint)));
    if (idx !== -1) amountCols = [idx];
  }
  if (amountCols.length === 0) return null;
  amountCols.sort((a, b) => a - b);

  const timeCols: number[] = [];
  row.forEach((cell, i) => {
    if (TIME_HINTS.some((hint) => normalizeHeader(cell).includes(hint))) timeCols.push(i);
  });
  if (timeCols.length === 0) return null;

  const countryColsInRow: number[] = [];
  row.forEach((cell, i) => {
    if (COUNTRY_HINTS.some((hint) => normalizeHeader(cell).includes(hint))) countryColsInRow.push(i);
  });

  return amountCols.map((amountCol, idx) => {
    const timeCandidates = timeCols.filter((t) => t <= amountCol);
    const timeCol = timeCandidates.length > 0 ? timeCandidates[timeCandidates.length - 1] : timeCols[0];

    const countryCandidates = countryColsInRow.filter((c) => c <= amountCol);
    const countryCol = countryCandidates.length > 0 ? countryCandidates[countryCandidates.length - 1] : null;

    let inferredCountryCode: string | null = null;
    if (countryCol === null) {
      const leftBoundary = idx > 0 ? amountCols[idx - 1] + 1 : 0;
      inferredCountryCode = findCountryLabelAbove(matrix, headerRowIndex, amountCol, leftBoundary, validCountries);
    }

    return { headerRowIndex, timeCol, amountCol, countryCol, inferredCountryCode };
  });
}

/**
 * Finds where the real slot schedule ends, so a trailing reference table further down the sheet
 * (totals, notes, a differently-shaped mini-table) never gets read as more schedule rows — even if it
 * happens to reuse valid-looking time values in the same column.
 */
function findScheduleEndRow(matrix: unknown[][], headerRowIndex: number, timeCols: number[]): number {
  const uniqueTimeCols = [...new Set(timeCols)];
  let sawValidRow = false;
  let invalidStreak = 0;
  for (let r = headerRowIndex + 1; r < matrix.length; r++) {
    const row = matrix[r];
    const anyValidTime = row ? uniqueTimeCols.some((c) => parseTimeToMinutes(row[c]) !== null) : false;
    if (anyValidTime) {
      sawValidRow = true;
      invalidStreak = 0;
      continue;
    }
    if (sawValidRow) {
      invalidStreak++;
      if (invalidStreak >= 2) return r;
    }
  }
  return matrix.length;
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
  endRow: number;
  labelSuffix: boolean;
}) {
  const {
    sheetName,
    matrix,
    mapping,
    source,
    validCountries,
    totals,
    warnings,
    unresolvedCountryLabels,
    detected,
    endRow,
    labelSuffix,
  } = opts;
  const { headerRowIndex, timeCol, amountCol, countryCol } = mapping;
  const headerRow = matrix[headerRowIndex] ?? [];

  let sheetInferredCountry: string | null = mapping.inferredCountryCode ?? null;
  if (countryCol === null && !sheetInferredCountry) {
    sheetInferredCountry = matchCountryLabel(sheetName, validCountries);
    if (!sheetInferredCountry && validCountries.length === 1) sheetInferredCountry = validCountries[0];
  }

  const displayName = labelSuffix && sheetInferredCountry ? `${sheetName} (${sheetInferredCountry})` : sheetName;

  if (countryCol === null && !sheetInferredCountry) {
    warnings.push(
      `${displayName}: no marketplace column and couldn't tell which marketplace it belongs to (multiple exist) — sheet skipped.`
    );
    detected.push({
      sheetName: displayName,
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
  let unparseableCount = 0;
  let rowsParsed = 0;
  for (let r = headerRowIndex + 1; r < endRow; r++) {
    const row = matrix[r];
    if (!row) continue;
    const timeRaw = row[timeCol];
    const amountRaw = row[amountCol];
    if ((timeRaw === null || timeRaw === undefined) && (amountRaw === null || amountRaw === undefined)) continue;

    const minutes = parseTimeToMinutes(timeRaw);
    const amount = parseAmount(amountRaw);
    if (minutes === null || amount === null) {
      // Only flag it when a value was actually present but didn't parse — a blank cell just means
      // "no data for this slot", not a malformed one, and shouldn't raise a false alarm.
      const timeLooksBad = timeRaw !== null && timeRaw !== undefined && minutes === null;
      const amountLooksBad = amountRaw !== null && amountRaw !== undefined && amount === null;
      if (timeLooksBad || amountLooksBad) unparseableCount++;
      continue;
    }
    if (amount < 0 || amount > MAX_SLOT_AMOUNT) {
      unparseableCount++;
      continue;
    }

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
    warnings.push(`${displayName}: ${duplicateCount} duplicate slot row(s) were overwritten by the later value.`);
  }
  if (unparseableCount > 0) {
    warnings.push(
      `${displayName}: ${unparseableCount} row(s) had an unrecognized time or amount value and were skipped.`
    );
  }

  detected.push({
    sheetName: displayName,
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

    const blocks = detectColumnBlocks(matrix, validCountries);
    if (!blocks) {
      sheetsNeedingAi.push({ sheetName, matrix });
      continue;
    }
    const endRow = findScheduleEndRow(
      matrix,
      blocks[0].headerRowIndex,
      blocks.map((b) => b.timeCol)
    );
    const labelSuffix = blocks.length > 1;
    for (const mapping of blocks) {
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
        endRow,
        labelSuffix,
      });
    }
  }

  if (sheetsNeedingAi.length > 0) {
    const columnMap = await detectColumnsWithAi(sheetsNeedingAi, validCountries);
    for (const { sheetName, matrix } of sheetsNeedingAi) {
      const mapping = columnMap?.[sheetName];
      if (!mapping) {
        warnings.push(`${sheetName}: couldn't identify a time or amount column — sheet skipped.`);
        continue;
      }
      const endRow = findScheduleEndRow(matrix, mapping.headerRowIndex, [mapping.timeCol]);
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
        endRow,
        labelSuffix: false,
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
