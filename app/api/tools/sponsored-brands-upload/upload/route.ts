import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getMyPermissions } from "@/lib/permissions";
import { isAllowed } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import {
  isUploadableCountry,
  getProfileId,
  uploadSbCampaign,
  sleep,
  type UploadCampaign,
  type UploadResult,
} from "@/lib/amazon/ads-api";
import { resolveMarketplace, type IncomingCampaign } from "../_resolve";

// Each campaign is 4+ sequential Ads API calls; allow headroom for larger batches.
export const maxDuration = 300;

// Small pause between campaigns to stay under Ads API rate limits.
const DELAY_BETWEEN_CAMPAIGNS_MS = 400;

/** Mirror of the bulk builder's daily-budget rule so download and upload match. */
function budgetFor(bid: number): number {
  return Math.max(2, Math.ceil(bid));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, permissions } = await getMyPermissions();
  if (!isAllowed(role, permissions, "tools", "sponsored-brands-upload")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { campaigns } = body as { campaigns: IncomingCampaign[] };
  if (!campaigns?.length) {
    return NextResponse.json({ error: "No campaigns to upload" }, { status: 400 });
  }

  for (const c of campaigns) {
    if (c.adFormat === "productCollection" && (c.asins.length < 3 || c.asins.length > 10)) {
      return NextResponse.json(
        { error: `Product Collection campaign "${c.campaignName}" must have 3-10 ASINs (has ${c.asins.length}).` },
        { status: 400 }
      );
    }
  }

  const client = await createClient();
  const resolved = await resolveMarketplace(campaigns, client);
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }
  const { country, brandById } = resolved;

  if (!isUploadableCountry(country)) {
    return NextResponse.json(
      { error: `Direct upload is only supported for US and CA — this batch is ${country}. Use "Download bulk file" instead.` },
      { status: 400 }
    );
  }

  let profileId: string;
  try {
    profileId = await getProfileId(country);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Advertising profile not configured" },
      { status: 400 }
    );
  }

  const toUpload: UploadCampaign[] = campaigns.map((c) => {
    const brand = brandById.get(c.brandId)!;
    const base = {
      campaignName: c.campaignName,
      bid: c.bid,
      budget: c.budget != null && c.budget > 0 ? Math.max(1, c.budget) : budgetFor(c.bid),
      startDate: c.startDate, // already YYYY-MM-DD
      keywords: c.keywords,
      negativeKeywords: c.negativeKeywords ?? [],
      matchTypes: c.matchTypes ?? ["exact", "phrase", "broad"],
      brandEntityId: brand.brand_entity_id,
      brandName: brand.brand_name,
      brandLogoAssetId: brand.brand_logo_asset_id,
      storePageUrl: brand.store_page_url,
    };
    return c.adFormat === "video"
      ? { ...base, adFormat: "video" as const, asin: c.asin, videoAssetId: c.videoAssetId }
      : { ...base, adFormat: "productCollection" as const, asins: c.asins };
  });

  // Sequential so partial failures are isolated and rate limits are respected.
  const results: UploadResult[] = [];
  for (let i = 0; i < toUpload.length; i++) {
    results.push(await uploadSbCampaign(profileId, toUpload[i]));
    if (i < toUpload.length - 1) await sleep(DELAY_BETWEEN_CAMPAIGNS_MS);
  }

  const created = results.filter((r) => r.ok).length;
  return NextResponse.json({ created, failed: results.length - created, results });
}
