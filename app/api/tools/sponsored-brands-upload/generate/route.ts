import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getMyPermissions } from "@/lib/permissions";
import { isAllowed } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { buildSponsoredBrandsBulk, type CampaignInput } from "@/lib/xlsx/buildSponsoredBrandsBulk";
import { resolveMarketplace, type IncomingCampaign } from "../_resolve";

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
  const resolved = await resolveMarketplace(campaigns, client);
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }
  const { country, brandById } = resolved;

  const enriched: CampaignInput[] = campaigns.map((c) => {
    const brand = brandById.get(c.brandId)!;
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
