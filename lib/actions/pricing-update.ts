"use server";

import { getSession } from "@/lib/session";
import { getSkuPricing, MARKETPLACE_IDS, type MarketplaceCode } from "@/lib/amazon/sp-api";

async function requireStaff() {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" as const };
  return { error: null };
}

export async function fetchSkuPricing(skus: string[], marketplace: MarketplaceCode) {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  if (skus.length === 0) return { data: null, error: "No SKUs selected" };

  try {
    const data = await getSkuPricing(skus, MARKETPLACE_IDS[marketplace]);
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Failed to fetch pricing" };
  }
}
