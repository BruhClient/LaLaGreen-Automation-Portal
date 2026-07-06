import * as XLSX from "xlsx";

export type Country = "US" | "CA" | "MX" | "AU" | "EU" | "UK" | "JP";

// Header row for the Sponsored Brands campaigns sheet (32 columns), taken
// verbatim from the official Amazon bulk templates. We build the workbook
// fresh in-memory rather than reading/mutating a template file, to avoid
// corrupting it.
// US-style header. MX / AU / EU / UK / JP currently reuse this layout until
// we have their real localized templates to copy exact headers/sheet names from.
const US_HEADER = [
  "Product", "Entity", "Operation", "Campaign ID", "Draft campaign ID", "Portfolio ID",
  "Ad Group ID", "Keyword ID", "Product Targeting ID", "Campaign name", "Start date",
  "End date", "State", "Budget type", "Budget", "Bid optimization", "Bid Multiplier",
  "Bid", "Keyword text", "Match type", "Product targeting expression", "Ad format",
  "Landing page URL", "Landing page ASINs", "Brand Entity ID", "Brand name",
  "Brand logo asset ID", "Custom image asset ID", "Creative headline", "Creative ASINs",
  "Video media IDs", "Creative Type",
];

const HEADER: Record<Country, string[]> = {
  US: US_HEADER,
  MX: US_HEADER,
  AU: US_HEADER,
  EU: US_HEADER,
  UK: US_HEADER,
  JP: US_HEADER,
  CA: [
    "Product", "Entity", "Operation", "Campaign ID", "Draft Campaign ID", "Portfolio ID",
    "Ad Group ID", "Keyword ID", "Product Targeting ID", "Campaign Name", "Start Date",
    "End Date", "State", "Budget Type", "Budget", "Bid Optimization", "Bid Multiplier",
    "Bid", "Keyword Text", "Match Type", "Product Targeting Expression", "Ad Format",
    "Landing Page URL", "Landing Page ASINs", "Brand Entity ID", "Brand Name",
    "Brand Logo Asset ID", "Custom Image Asset ID", "Creative Headline", "Creative ASINs",
    "Video Media IDs", "Creative Type",
  ],
};

interface BaseCampaignInput {
  campaignName: string;
  bid: number;
  budget?: number; // daily budget; defaults to max(2, ceil(bid)) when omitted
  startDate: string; // YYYY-MM-DD
  keywords: string[];
  matchTypes?: ("exact" | "phrase" | "broad")[]; // default all 3
  negativeKeywords?: string[];
  brandEntityId: string;
  brandName: string;
}

export type CampaignInput =
  | (BaseCampaignInput & {
      adFormat: "video";
      asin: string;
      videoAssetId: string; // amzn1.assetlibrary.asset1.XXXXX
    })
  | (BaseCampaignInput & {
      adFormat: "productCollection";
      asins: string[]; // 3-10 ASINs; Amazon auto-generates the creative (no logo/image/headline)
    });

const SHEET_NAME: Record<Country, string> = {
  US: "Sponsored Brands campaigns",
  MX: "Sponsored Brands campaigns",
  AU: "Sponsored Brands campaigns",
  EU: "Sponsored Brands campaigns",
  UK: "Sponsored Brands campaigns",
  JP: "Sponsored Brands campaigns",
  CA: "Sponsored Brands Campaigns",
};

function toAmazonDate(dateStr: string): number {
  return Number(dateStr.replaceAll("-", ""));
}

function budgetFor(bid: number): number {
  return Math.max(2, Math.ceil(bid));
}

// 32 columns per the Sponsored Brands campaigns sheet
function emptyRow(): (string | number | null)[] {
  return new Array(32).fill(null);
}

function dedupeKeywords(
  keywords: string[],
  matchTypes: string[]
): { kw: string; match: string }[] {
  const seen = new Set<string>();
  const result: { kw: string; match: string }[] = [];
  for (const kw of keywords) {
    const trimmed = kw.trim();
    if (!trimmed) continue;
    for (const match of matchTypes) {
      const key = `${trimmed.toLowerCase()}|${match}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ kw: trimmed, match });
    }
  }
  return result;
}

export function buildSponsoredBrandsBulk(country: Country, campaigns: CampaignInput[]): Buffer {
  const rows: (string | number | null)[][] = [HEADER[country]];

  for (const campaign of campaigns) {
    const matchTypes = campaign.matchTypes ?? ["exact", "phrase", "broad"];
    const budget =
      campaign.budget != null && campaign.budget > 0
        ? Math.max(1, campaign.budget)
        : budgetFor(campaign.bid);

    // Campaign row
    const campaignRow = emptyRow();
    campaignRow[0] = "Sponsored Brands"; // Product
    campaignRow[1] = "Campaign"; // Entity
    campaignRow[2] = "Create"; // Operation
    campaignRow[3] = campaign.campaignName; // Campaign ID
    campaignRow[9] = campaign.campaignName; // Campaign name
    campaignRow[10] = toAmazonDate(campaign.startDate); // Start date
    campaignRow[12] = "enabled"; // State
    campaignRow[13] = "daily"; // Budget type
    campaignRow[14] = budget; // Budget
    campaignRow[21] = campaign.adFormat; // Ad format
    campaignRow[24] = campaign.brandEntityId; // Brand Entity ID
    campaignRow[25] = campaign.brandName; // Brand name

    if (campaign.adFormat === "video") {
      campaignRow[29] = campaign.asin; // Creative ASINs
      campaignRow[30] = campaign.videoAssetId; // Video media IDs
      campaignRow[31] = "video"; // Creative Type
    } else {
      // productCollection: Amazon auto-generates the creative from the ASINs
      // (no logo/custom image/headline as of the Jan 2026 format overhaul).
      campaignRow[29] = campaign.asins.join(","); // Creative ASINs
    }
    rows.push(campaignRow);

    // Keyword rows (deduped)
    const kwRows = dedupeKeywords(campaign.keywords, matchTypes);
    for (const { kw, match } of kwRows) {
      const row = emptyRow();
      row[0] = "Sponsored Brands";
      row[1] = "Keyword";
      row[2] = "Create";
      row[3] = campaign.campaignName; // Campaign ID
      row[12] = "enabled"; // State
      row[17] = campaign.bid; // Bid
      row[18] = kw; // Keyword text
      row[19] = match; // Match type
      rows.push(row);
    }

    // Negative keyword rows
    for (const negKw of campaign.negativeKeywords ?? []) {
      const trimmed = negKw.trim();
      if (!trimmed) continue;
      const row = emptyRow();
      row[0] = "Sponsored Brands";
      row[1] = "Negative keyword";
      row[2] = "Create";
      row[3] = campaign.campaignName;
      row[12] = "enabled";
      row[18] = trimmed; // Keyword text
      row[19] = "negativeExact"; // Match type
      rows.push(row);
    }
  }

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, SHEET_NAME[country]);

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
