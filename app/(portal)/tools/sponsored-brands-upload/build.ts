import { extractAssetId } from "@/lib/xlsx/assetId";
import type { Block, Theme, Brand, Asset } from "./product-block";

// One row destined for the bulk file. Two shapes depending on ad format; both
// share the fields the preview and the API route read.
export type Campaign =
  | {
      brandId: string;
      campaignName: string;
      adFormat: "productCollection";
      asins: string[];
      landingPageUrl?: string;
      bid: number;
      budget: number | undefined;
      startDate: string;
      keywords: string[];
      negativeKeywords: string[];
      matchTypes: ("exact" | "phrase" | "broad")[];
    }
  | {
      brandId: string;
      campaignName: string;
      adFormat: "video";
      asin: string;
      bid: number;
      budget: number | undefined;
      startDate: string;
      videoAssetId: string;
      keywords: string[];
      negativeKeywords: string[];
      matchTypes: ("exact" | "phrase" | "broad")[];
    };

export function toLines(text: string) {
  return text
    .split("\n")
    .map((k) => k.trim())
    .filter(Boolean);
}

export function spreadBids(min: number, max: number, n: number): number[] {
  if (n <= 1) return [Number(min.toFixed(2))];
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const v = min + ((max - min) * i) / (n - 1);
    out.push(Number(v.toFixed(2)));
  }
  return out;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const r = Math.floor(Math.random() * (i + 1));
    [a[i], a[r]] = [a[r], a[i]];
  }
  return a;
}

export function distributeKeywords(
  all: string[],
  n: number,
  perCampaign: number,
  mode: "sequential" | "random"
): string[][] {
  if (!all.length) return Array.from({ length: n }, () => []);
  const k = perCampaign > 0 ? Math.min(perCampaign, all.length) : all.length;
  const result: string[][] = [];
  if (mode === "random") {
    for (let i = 0; i < n; i++) result.push(shuffle(all).slice(0, k));
    return result;
  }
  let p = 0;
  for (let i = 0; i < n; i++) {
    const slice: string[] = [];
    for (let c = 0; c < k; c++) {
      slice.push(all[p % all.length]);
      p++;
    }
    result.push(slice);
  }
  return result;
}

/** How many campaign rows a single block expands into. */
export function campaignCountForBlock(block: Block): number {
  const n = Math.max(1, parseInt(block.numCampaigns || "1", 10) || 1);
  if (block.adFormat === "productCollection") return n;
  const asinCount = Math.max(1, block.asins.map((a) => a.trim()).filter(Boolean).length);
  return n * asinCount;
}

export type BlockSummary = {
  formatLabel: string;
  brandName: string;
  asinCount: number;
  campaignCount: number;
  keywordCount: number;
};

/** One-line summary of a saved product, for the build-step list rows. */
export function summarizeBlock(
  block: Block,
  brands: { id: string; name: string }[],
  themes: Theme[]
): BlockSummary {
  const selectedTheme = themes.find((t) => t.id === block.keywordThemeId);
  const keywordCount =
    block.keywordSource === "manual"
      ? toLines(block.manualKeywords).length
      : selectedTheme
      ? toLines(selectedTheme.keywords).length
      : 0;
  return {
    formatLabel: block.adFormat === "video" ? "Video" : "Collection",
    brandName: brands.find((b) => b.id === block.brandId)?.name ?? "No brand",
    asinCount: block.asins.map((a) => a.trim()).filter(Boolean).length,
    campaignCount: campaignCountForBlock(block),
    keywordCount,
  };
}

/**
 * Short labels for library references this block points at that no longer
 * exist (brand / video asset / keyword theme deleted out from under the draft).
 * Empty array = the block's references are all intact. Used to flag stale drafts
 * in the list; `buildCampaigns` enforces the same rules as hard errors.
 */
export function blockIssues(
  block: Block,
  brands: Brand[],
  assets: Asset[],
  themes: Theme[]
): string[] {
  const issues: string[] = [];
  if (!brands.some((b) => b.id === block.brandId)) {
    issues.push("brand");
  }
  if (
    block.adFormat === "video" &&
    block.videoSource === "saved" &&
    (!block.videoAssetId || !assets.some((a) => a.asset_id === block.videoAssetId))
  ) {
    issues.push("video asset");
  }
  if (
    block.keywordSource === "theme" &&
    (!block.keywordThemeId || !themes.some((t) => t.id === block.keywordThemeId))
  ) {
    issues.push("keyword theme");
  }
  return issues;
}

export function buildName(
  template: string,
  vars: { n: number; bid: number; kw: number; asin: string; date: string }
): string {
  const t = (template || "").trim() || "Campaign {n}";
  return t
    .replaceAll("{n}", String(vars.n))
    .replaceAll("{bid}", vars.bid.toFixed(2))
    .replaceAll("{kw}", String(vars.kw))
    .replaceAll("{asin}", vars.asin)
    .replaceAll("{date}", vars.date);
}

/**
 * Pure translation of the configured product blocks into the exact campaign
 * rows the bulk file will contain. Returns the first validation error it hits
 * (same messages the form used to raise inline) so the preview and the real
 * download stay identical. Note: `random` keyword distribution is
 * non-deterministic, so a preview render and the download may differ in which
 * keywords land where — the counts and campaign names are stable.
 */
export function buildCampaigns(
  blocks: Block[],
  themes: Theme[],
  brands: Brand[],
  assets: Asset[]
): { payload: Campaign[]; error: string | null } {
  const seen = new Map<string, number>();
  const payload: Campaign[] = [];

  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi];
    const label = `Ad ${bi + 1}`;

    if (!block.brandId) {
      return { payload: [], error: `${label}: choose a Brand Profile.` };
    }
    if (!brands.some((b) => b.id === block.brandId)) {
      return {
        payload: [],
        error: `${label}: its brand profile was deleted — edit it and pick another.`,
      };
    }

    const matchTypes = [
      block.matchExact && "exact",
      block.matchPhrase && "phrase",
      block.matchBroad && "broad",
    ].filter(Boolean) as ("exact" | "phrase" | "broad")[];
    if (!matchTypes.length) {
      return { payload: [], error: `${label}: select at least one match type.` };
    }

    const cleanAsins = block.asins.map((a) => a.trim()).filter(Boolean);
    if (!cleanAsins.length) {
      return { payload: [], error: `${label}: enter at least one ASIN.` };
    }
    if (
      block.adFormat === "productCollection" &&
      (cleanAsins.length < 3 || cleanAsins.length > 10)
    ) {
      return {
        payload: [],
        error: `${label}: Product Collection needs 3-10 ASINs (has ${cleanAsins.length}).`,
      };
    }
    if (block.adFormat === "productCollection" && block.landingPageMode === "url" && !block.landingPageUrl.trim()) {
      return {
        payload: [],
        error: `${label}: enter a landing page URL, or switch back to Product list.`,
      };
    }

    let videoAssetId = "";
    if (block.adFormat === "video") {
      videoAssetId =
        block.videoSource === "manual"
          ? extractAssetId(block.manualVideoAssetId)
          : block.videoAssetId;
      if (!videoAssetId) {
        return { payload: [], error: `${label}: select or enter a video asset.` };
      }
      if (
        block.videoSource === "saved" &&
        !assets.some((a) => a.asset_id === videoAssetId)
      ) {
        return {
          payload: [],
          error: `${label}: its video asset was deleted — pick another.`,
        };
      }
    }

    const selectedTheme = themes.find((t) => t.id === block.keywordThemeId);
    if (block.keywordSource === "theme" && !selectedTheme) {
      return { payload: [], error: `${label}: select a keyword theme.` };
    }
    const kwList =
      block.keywordSource === "manual"
        ? toLines(block.manualKeywords)
        : selectedTheme
        ? toLines(selectedTheme.keywords)
        : [];
    const negatives =
      block.keywordSource === "manual"
        ? toLines(block.manualNegatives)
        : selectedTheme
        ? toLines(selectedTheme.negative_keywords)
        : [];
    if (!kwList.length) {
      return { payload: [], error: `${label}: add at least one keyword.` };
    }

    const n = Math.max(1, parseInt(block.numCampaigns || "1", 10) || 1);
    const perCamp = Math.max(0, parseInt(block.keywordsPerCampaign || "0", 10) || 0);
    const bids =
      block.bidMode === "fixed"
        ? Array.from({ length: n }, () =>
            Number(parseFloat(block.bidFixed || "0").toFixed(2))
          )
        : spreadBids(parseFloat(block.bidMin || "0"), parseFloat(block.bidMax || "0"), n);
    const dist = distributeKeywords(kwList, n, perCamp, block.keywordMode);
    const kwPerName = perCamp > 0 ? perCamp : kwList.length;
    const budgetOverride =
      block.budgetMode === "fixed" ? Number(parseFloat(block.budgetValue || "0")) : undefined;

    if (block.adFormat === "productCollection") {
      // One creative (the whole ASIN collection) shared across all n campaigns.
      for (let i = 0; i < n; i++) {
        let name = buildName(block.campaignName, {
          n: i + 1,
          bid: bids[i],
          kw: kwPerName,
          asin: cleanAsins[0],
          date: block.startDate,
        });
        const c = (seen.get(name) ?? 0) + 1;
        seen.set(name, c);
        if (c > 1) name = `${name} ${c}`;
        payload.push({
          brandId: block.brandId,
          campaignName: name,
          adFormat: "productCollection",
          asins: cleanAsins,
          landingPageUrl:
            block.landingPageMode === "url" ? block.landingPageUrl.trim() : undefined,
          bid: bids[i],
          budget: budgetOverride,
          startDate: block.startDate,
          keywords: dist[i],
          negativeKeywords: negatives,
          matchTypes,
        });
      }
    } else {
      for (const asinValue of cleanAsins) {
        for (let i = 0; i < n; i++) {
          let name = buildName(block.campaignName, {
            n: i + 1,
            bid: bids[i],
            kw: kwPerName,
            asin: asinValue,
            date: block.startDate,
          });
          const c = (seen.get(name) ?? 0) + 1;
          seen.set(name, c);
          if (c > 1) name = `${name} ${c}`;
          payload.push({
            brandId: block.brandId,
            campaignName: name,
            adFormat: "video",
            asin: asinValue,
            bid: bids[i],
            budget: budgetOverride,
            startDate: block.startDate,
            videoAssetId,
            keywords: dist[i],
            negativeKeywords: negatives,
            matchTypes,
          });
        }
      }
    }
  }

  return { payload, error: null };
}
