"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getSession } from "@/lib/session";
import type { Country } from "@/lib/xlsx/buildSponsoredBrandsBulk";

const VALID_COUNTRIES: Country[] = ["US", "CA", "MX", "AU", "EU", "UK", "JP"];

async function requireStaff() {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" as const };
  return { error: null };
}

export interface Brand {
  id: string;
  name: string;
  country: Country;
  brand_entity_id: string;
  brand_name: string;
  brand_logo_asset_id: string | null;
  store_page_url: string | null;
  created_at: string;
}

const BRAND_COLUMNS =
  "id, name, country, brand_entity_id, brand_name, brand_logo_asset_id, store_page_url, created_at";

export interface VideoAsset {
  id: string;
  brand_id: string;
  label: string;
  asset_id: string;
  created_at: string;
}

export interface KeywordTheme {
  id: string;
  brand_id: string | null;
  name: string;
  keywords: string;
  negative_keywords: string;
  created_at: string;
}

export interface Preset {
  id: string;
  sku: string;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// --- Brands ---

export async function listBrands() {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  const client = await createClient();
  const { data, error: dbError } = await client
    .from("bulk_campaign_brands")
    .select(BRAND_COLUMNS)
    .order("created_at", { ascending: true });

  return { data: data as Brand[] | null, error: dbError?.message ?? null };
}

export async function createBrand(input: {
  name: string;
  country: string;
  brandEntityId: string;
  brandName: string;
  brandLogoAssetId?: string;
  storePageUrl?: string;
}) {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  if (!VALID_COUNTRIES.includes(input.country as Country)) {
    return { data: null, error: `Invalid country: ${input.country}` };
  }
  if (!input.name.trim() || !input.brandEntityId.trim() || !input.brandName.trim()) {
    return { data: null, error: "Name, Brand Entity ID, and Brand Name are required" };
  }

  const service = createServiceClient();
  const { data, error: dbError } = await service
    .from("bulk_campaign_brands")
    .insert({
      name: input.name.trim(),
      country: input.country,
      brand_entity_id: input.brandEntityId.trim(),
      brand_name: input.brandName.trim(),
      brand_logo_asset_id: input.brandLogoAssetId?.trim() || null,
      store_page_url: input.storePageUrl?.trim() || null,
    })
    .select(BRAND_COLUMNS)
    .single();

  return { data: data as Brand | null, error: dbError?.message ?? null };
}

export async function updateBrand(
  id: string,
  updates: {
    name?: string;
    country?: string;
    brandEntityId?: string;
    brandName?: string;
    brandLogoAssetId?: string;
    storePageUrl?: string;
  }
) {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  if (updates.country !== undefined && !VALID_COUNTRIES.includes(updates.country as Country)) {
    return { data: null, error: `Invalid country: ${updates.country}` };
  }

  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name.trim();
  if (updates.country !== undefined) dbUpdates.country = updates.country;
  if (updates.brandEntityId !== undefined) dbUpdates.brand_entity_id = updates.brandEntityId.trim();
  if (updates.brandName !== undefined) dbUpdates.brand_name = updates.brandName.trim();
  if (updates.brandLogoAssetId !== undefined)
    dbUpdates.brand_logo_asset_id = updates.brandLogoAssetId.trim() || null;
  if (updates.storePageUrl !== undefined)
    dbUpdates.store_page_url = updates.storePageUrl.trim() || null;

  const service = createServiceClient();
  const { data, error: dbError } = await service
    .from("bulk_campaign_brands")
    .update(dbUpdates)
    .eq("id", id)
    .select(BRAND_COLUMNS)
    .single();

  return { data: data as Brand | null, error: dbError?.message ?? null };
}

export async function deleteBrand(id: string) {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  const service = createServiceClient();
  const { error: dbError } = await service.from("bulk_campaign_brands").delete().eq("id", id);

  return { data: dbError ? null : { ok: true }, error: dbError?.message ?? null };
}

// --- Video assets ---

export async function listVideoAssets() {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  const client = await createClient();
  const { data, error: dbError } = await client
    .from("bulk_campaign_video_assets")
    .select("id, brand_id, label, asset_id, created_at")
    .order("created_at", { ascending: true });

  return { data: data as VideoAsset[] | null, error: dbError?.message ?? null };
}

export async function createVideoAsset(input: { brandId: string; label: string; assetId: string }) {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  if (!input.label.trim() || !input.assetId.trim()) {
    return { data: null, error: "Label and asset ID are required" };
  }

  const service = createServiceClient();
  const { data, error: dbError } = await service
    .from("bulk_campaign_video_assets")
    .insert({ brand_id: input.brandId, label: input.label.trim(), asset_id: input.assetId.trim() })
    .select("id, brand_id, label, asset_id, created_at")
    .single();

  return { data: data as VideoAsset | null, error: dbError?.message ?? null };
}

export async function updateVideoAsset(id: string, updates: { label?: string; assetId?: string }) {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  const dbUpdates: Record<string, unknown> = {};
  if (updates.label !== undefined) dbUpdates.label = updates.label.trim();
  if (updates.assetId !== undefined) dbUpdates.asset_id = updates.assetId.trim();

  const service = createServiceClient();
  const { data, error: dbError } = await service
    .from("bulk_campaign_video_assets")
    .update(dbUpdates)
    .eq("id", id)
    .select("id, brand_id, label, asset_id, created_at")
    .single();

  return { data: data as VideoAsset | null, error: dbError?.message ?? null };
}

export async function deleteVideoAsset(id: string) {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  const service = createServiceClient();
  const { error: dbError } = await service.from("bulk_campaign_video_assets").delete().eq("id", id);

  return { data: dbError ? null : { ok: true }, error: dbError?.message ?? null };
}

// --- Keyword themes ---

export async function listKeywordThemes() {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  const client = await createClient();
  const { data, error: dbError } = await client
    .from("bulk_campaign_keyword_themes")
    .select("id, brand_id, name, keywords, negative_keywords, created_at")
    .order("created_at", { ascending: true });

  return { data: data as KeywordTheme[] | null, error: dbError?.message ?? null };
}

export async function createKeywordTheme(input: {
  brandId: string | null;
  name: string;
  keywords: string;
  negativeKeywords: string;
}) {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  if (!input.name.trim()) return { data: null, error: "Name is required" };

  const service = createServiceClient();
  const { data, error: dbError } = await service
    .from("bulk_campaign_keyword_themes")
    .insert({
      brand_id: input.brandId,
      name: input.name.trim(),
      keywords: input.keywords,
      negative_keywords: input.negativeKeywords,
    })
    .select("id, brand_id, name, keywords, negative_keywords, created_at")
    .single();

  return { data: data as KeywordTheme | null, error: dbError?.message ?? null };
}

export async function updateKeywordTheme(
  id: string,
  updates: { brandId?: string | null; name?: string; keywords?: string; negativeKeywords?: string }
) {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  const dbUpdates: Record<string, unknown> = {};
  if (updates.brandId !== undefined) dbUpdates.brand_id = updates.brandId;
  if (updates.name !== undefined) dbUpdates.name = updates.name.trim();
  if (updates.keywords !== undefined) dbUpdates.keywords = updates.keywords;
  if (updates.negativeKeywords !== undefined) dbUpdates.negative_keywords = updates.negativeKeywords;

  const service = createServiceClient();
  const { data, error: dbError } = await service
    .from("bulk_campaign_keyword_themes")
    .update(dbUpdates)
    .eq("id", id)
    .select("id, brand_id, name, keywords, negative_keywords, created_at")
    .single();

  return { data: data as KeywordTheme | null, error: dbError?.message ?? null };
}

export async function deleteKeywordTheme(id: string) {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  const service = createServiceClient();
  const { error: dbError } = await service.from("bulk_campaign_keyword_themes").delete().eq("id", id);

  return { data: dbError ? null : { ok: true }, error: dbError?.message ?? null };
}

export async function duplicateKeywordTheme(id: string) {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  const service = createServiceClient();
  const { data: source, error: fetchError } = await service
    .from("bulk_campaign_keyword_themes")
    .select("brand_id, name, keywords, negative_keywords")
    .eq("id", id)
    .single();
  if (fetchError || !source) return { data: null, error: fetchError?.message ?? "Theme not found" };

  const { data, error: dbError } = await service
    .from("bulk_campaign_keyword_themes")
    .insert({
      brand_id: source.brand_id,
      name: `${source.name} (copy)`,
      keywords: source.keywords,
      negative_keywords: source.negative_keywords,
    })
    .select("id, brand_id, name, keywords, negative_keywords, created_at")
    .single();

  return { data: data as KeywordTheme | null, error: dbError?.message ?? null };
}

// --- Presets ---

export async function listPresets() {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  const client = await createClient();
  const { data, error: dbError } = await client
    .from("bulk_campaign_presets")
    .select("id, sku, config, created_at, updated_at")
    .order("sku", { ascending: true });

  return { data: data as Preset[] | null, error: dbError?.message ?? null };
}

export async function savePreset(sku: string, config: Record<string, unknown>) {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  const trimmedSku = sku.trim();
  if (!trimmedSku) return { data: null, error: "SKU is required" };

  const service = createServiceClient();
  const { data: existing } = await service
    .from("bulk_campaign_presets")
    .select("id")
    .ilike("sku", trimmedSku)
    .maybeSingle();

  const payload = { sku: trimmedSku, config, updated_at: new Date().toISOString() };

  const { data, error: dbError } = existing
    ? await service
        .from("bulk_campaign_presets")
        .update(payload)
        .eq("id", existing.id)
        .select("id, sku, config, created_at, updated_at")
        .single()
    : await service
        .from("bulk_campaign_presets")
        .insert(payload)
        .select("id, sku, config, created_at, updated_at")
        .single();

  return { data: data as Preset | null, error: dbError?.message ?? null };
}

export async function deletePreset(id: string) {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  const service = createServiceClient();
  const { error: dbError } = await service.from("bulk_campaign_presets").delete().eq("id", id);

  return { data: dbError ? null : { ok: true }, error: dbError?.message ?? null };
}

// --- Products (one saved ProductBlock config per row, persists across reloads) ---

export interface CampaignProduct {
  id: string;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export async function listProducts() {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  const client = await createClient();
  const { data, error: dbError } = await client
    .from("bulk_campaign_products")
    .select("id, config, created_at, updated_at")
    .order("created_at", { ascending: true });

  return { data: data as CampaignProduct[] | null, error: dbError?.message ?? null };
}

export async function saveProduct(config: Record<string, unknown>, id?: string | null) {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  if (!config || typeof config !== "object") {
    return { data: null, error: "Product config is required" };
  }

  const service = createServiceClient();
  const { data, error: dbError } = id
    ? await service
        .from("bulk_campaign_products")
        .update({ config, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("id, config, created_at, updated_at")
        .single()
    : await service
        .from("bulk_campaign_products")
        .insert({ config })
        .select("id, config, created_at, updated_at")
        .single();

  return { data: data as CampaignProduct | null, error: dbError?.message ?? null };
}

export async function deleteProduct(id: string) {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  const service = createServiceClient();
  const { error: dbError } = await service.from("bulk_campaign_products").delete().eq("id", id);

  return { data: dbError ? null : { ok: true }, error: dbError?.message ?? null };
}
