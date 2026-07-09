import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getMyPermissions } from "@/lib/permissions";
import { isAllowed } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { buildSponsoredBrandsBulk, type CampaignInput, type Country } from "@/lib/xlsx/buildSponsoredBrandsBulk";

type IncomingCampaign = {
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
    return NextResponse.json({ error: "No campaigns to generate" }, { status: 400 });
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
  const { data: brands, error } = await client
    .from("bulk_campaign_brands")
    .select("id, country, brand_entity_id, brand_name");
  if (error || !brands?.length) {
    return NextResponse.json({ error: "Brand profiles not found" }, { status: 404 });
  }

  const byId = new Map(brands.map((b) => [b.id, b]));

  const referencedCountries = new Set<string>();
  for (const c of campaigns) {
    const brand = byId.get(c.brandId);
    if (!brand) {
      return NextResponse.json(
        { error: "A campaign references an unknown brand profile" },
        { status: 400 }
      );
    }
    referencedCountries.add(brand.country);
  }
  if (referencedCountries.size > 1) {
    return NextResponse.json(
      {
        error: `All product blocks must use brand profiles from the same marketplace. Found: ${[...referencedCountries].join(", ")}.`,
      },
      { status: 400 }
    );
  }
  const country = [...referencedCountries][0] as Country;

  const enriched: CampaignInput[] = campaigns.map((c) => {
    const brand = byId.get(c.brandId)!;
    const { brandId: _omit, ...rest } = c;
    void _omit;
    return { ...rest, brandEntityId: brand.brand_entity_id, brandName: brand.brand_name };
  });

  const buffer = buildSponsoredBrandsBulk(country, enriched);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Sponsored_Brands_Bulk_${campaigns.length}.xlsx"`,
    },
  });
}
