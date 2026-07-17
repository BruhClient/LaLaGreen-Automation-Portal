/** Fixed ACOS bands staff can assign a top-up dollar amount to. Ranges are fixed — only the amount is editable. */
export const ACOS_BANDS = [
  { key: "0-10", label: "0% – 10%", min: 0, max: 10 },
  { key: "10-20", label: "10% – 20%", min: 10, max: 20 },
  { key: "20-30", label: "20% – 30%", min: 20, max: 30 },
  { key: "30-plus", label: "30%+", min: 30, max: null },
] as const;

export type AcosBandKey = (typeof ACOS_BANDS)[number]["key"];

export const ACOS_BAND_KEYS: readonly AcosBandKey[] = ACOS_BANDS.map((b) => b.key);

/** Which ACOS figure the bands are evaluated against — one choice applies to all bands for a marketplace. */
export const ACOS_METRICS = [
  { key: "14d", label: "14-Day ACOS" },
  { key: "today", label: "Today's ACOS" },
] as const;

export type AcosMetric = (typeof ACOS_METRICS)[number]["key"];

export const ACOS_METRIC_KEYS: readonly AcosMetric[] = ACOS_METRICS.map((m) => m.key);

export const MAX_BAND_TOPUP_AMOUNT = 1000;
export const MAX_DAILY_TOPUP_PER_CAMPAIGN = 2000;
export const MAX_TOPUPS_PER_CAMPAIGN_PER_DAY = 10;
