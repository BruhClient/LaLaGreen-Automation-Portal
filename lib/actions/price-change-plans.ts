"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getSession } from "@/lib/session";
import { getSkuPricing, MARKETPLACE_IDS, type MarketplaceCode } from "@/lib/amazon/sp-api";

export interface PricePlan {
  id: string;
  sku: string;
  marketplace: MarketplaceCode;
  start_price: number;
  current_price: number;
  target_price: number;
  increment: number;
  direction: "increase" | "decrease";
  status: "active" | "completed" | "cancelled";
  created_by: string;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
}

const PLAN_COLUMNS =
  "id, sku, marketplace, start_price, current_price, target_price, increment, direction, status, created_by, created_at, updated_at, cancelled_at";

async function requireStaff() {
  const session = await getSession();
  if (!session) return { session: null, error: "Unauthorized" as const };
  return { session, error: null };
}

export async function listPricePlans(): Promise<{ data: PricePlan[] | null; error: string | null }> {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  const client = await createClient();
  const { data, error: dbError } = await client
    .from("price_change_plans")
    .select(PLAN_COLUMNS)
    .order("created_at", { ascending: false });

  return { data: data as PricePlan[] | null, error: dbError?.message ?? null };
}

export async function createPricePlan(input: {
  sku: string;
  marketplace: MarketplaceCode;
  targetPrice: number;
  increment: number;
}): Promise<{ data: PricePlan | null; error: string | null }> {
  const { session, error } = await requireStaff();
  if (error) return { data: null, error };

  const { sku, marketplace, targetPrice, increment } = input;

  if (!sku) return { data: null, error: "SKU is required" };
  if (!Number.isFinite(increment) || increment <= 0) {
    return { data: null, error: "Increment must be greater than 0" };
  }
  if (!Number.isFinite(targetPrice)) {
    return { data: null, error: "Target price is required" };
  }

  const [pricing] = await getSkuPricing([sku], MARKETPLACE_IDS[marketplace]);
  const startPrice = pricing?.salesPrice ?? null;
  if (startPrice === null) {
    return {
      data: null,
      error: pricing?.error ?? "No active offer on Amazon — a plan can't be created for this SKU",
    };
  }
  if (targetPrice === startPrice) {
    return { data: null, error: "Target price must differ from current price" };
  }

  const service = createServiceClient();

  const { data: existingActive, error: existingError } = await service
    .from("price_change_plans")
    .select("id")
    .eq("sku", sku)
    .eq("status", "active")
    .maybeSingle();
  if (existingError) return { data: null, error: existingError.message };
  if (existingActive) {
    return {
      data: null,
      error: "An active plan already exists for this SKU — cancel it first.",
    };
  }

  const direction = targetPrice > startPrice ? "increase" : "decrease";

  const { data, error: insertError } = await service
    .from("price_change_plans")
    .insert({
      sku,
      marketplace,
      start_price: startPrice,
      current_price: startPrice,
      target_price: targetPrice,
      increment,
      direction,
      created_by: session!.username,
    })
    .select(PLAN_COLUMNS)
    .single();

  if (insertError) return { data: null, error: insertError.message };
  return { data: data as PricePlan, error: null };
}

export async function cancelPricePlan(id: string): Promise<{ data: { ok: true } | null; error: string | null }> {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  const service = createServiceClient();

  const { data, error: updateError } = await service
    .from("price_change_plans")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "active")
    .select("id")
    .maybeSingle();

  if (updateError) return { data: null, error: updateError.message };
  if (!data) return { data: null, error: "Only active plans can be cancelled" };

  return { data: { ok: true }, error: null };
}
