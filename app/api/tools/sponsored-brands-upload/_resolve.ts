import type { SupabaseClient } from "@supabase/supabase-js";
import type { Country } from "@/lib/xlsx/buildSponsoredBrandsBulk";

/** Request shape shared by the generate (download) and upload routes. */
export type IncomingCampaign = {
  brandId: string;
  campaignName: string;
  bid: number;
  budget?: number;
  startDate: string;
  keywords: string[];
  negativeKeywords?: string[];
  matchTypes?: ("exact" | "phrase" | "broad")[];
} & (
  | { adFormat: "video"; asin: string; videoAssetId: string }
  | { adFormat: "productCollection"; asins: string[] }
);

export interface BrandRow {
  id: string;
  country: Country;
  brand_entity_id: string;
  brand_name: string;
  brand_logo_asset_id: string | null;
  store_page_url: string | null;
}

type ResolveOk = { country: Country; brandById: Map<string, BrandRow> };
type ResolveErr = { error: string; status: number };

/**
 * Loads the brand profiles referenced by a batch of campaigns and enforces that
 * they all belong to a single marketplace (a bulk file / an upload targets one
 * country at a time). Returns either the resolved brands + country or a
 * ready-to-return error with its HTTP status. Shared so the download and upload
 * routes stay consistent.
 */
export async function resolveMarketplace(
  campaigns: IncomingCampaign[],
  client: SupabaseClient
): Promise<ResolveOk | ResolveErr> {
  const { data: brands, error } = await client
    .from("bulk_campaign_brands")
    .select("id, country, brand_entity_id, brand_name, brand_logo_asset_id, store_page_url");
  if (error || !brands?.length) {
    return { error: "Brand profiles not found", status: 404 };
  }

  const brandById = new Map<string, BrandRow>(brands.map((b) => [b.id, b as BrandRow]));

  const countries = new Set<string>();
  for (const c of campaigns) {
    const brand = brandById.get(c.brandId);
    if (!brand) {
      return { error: "A campaign references an unknown brand profile", status: 400 };
    }
    countries.add(brand.country);
  }
  if (countries.size > 1) {
    return {
      error: `All product blocks must use brand profiles from the same marketplace. Found: ${[
        ...countries,
      ].join(", ")}.`,
      status: 400,
    };
  }

  return { country: [...countries][0] as Country, brandById };
}
