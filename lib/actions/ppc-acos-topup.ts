"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getSession } from "@/lib/session";
import { assertCountryExists } from "@/lib/actions/ppc-daily-cap";
import {
  ACOS_BAND_KEYS,
  ACOS_METRIC_KEYS,
  MAX_BAND_TOPUP_AMOUNT,
  MAX_DAILY_TOPUP_PER_CAMPAIGN,
  MAX_TOPUPS_PER_CAMPAIGN_PER_DAY,
  type AcosBandKey,
  type AcosMetric,
} from "@/lib/ppc-acos-topup-constants";

export interface AcosTopupSettings {
  country_code: string;
  enabled: boolean;
  acos_metric: AcosMetric;
  max_daily_topup_per_campaign: number;
  max_topups_per_campaign_per_day: number;
}

export interface AcosTopupBand {
  country_code: string;
  band_key: AcosBandKey;
  topup_amount: number;
}

export interface AcosTopupLogEntry {
  id: string;
  country_code: string;
  campaign_id: string;
  campaign_name: string;
  acos_metric: AcosMetric;
  acos_value: number;
  band_key: AcosBandKey;
  topup_amount: number;
  previous_budget: number;
  new_budget: number;
  applied_at: string;
}

async function requireStaff() {
  const session = await getSession();
  if (!session) return { session: null, error: "Unauthorized" as const };
  return { session, error: null };
}

export async function getAcosTopupConfig(): Promise<{
  data: { settings: AcosTopupSettings[]; bands: AcosTopupBand[] } | null;
  error: string | null;
}> {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  const client = await createClient();

  const [{ data: settings, error: settingsError }, { data: bands, error: bandsError }] =
    await Promise.all([
      client
        .from("ppc_acos_topup_settings")
        .select(
          "country_code, enabled, acos_metric, max_daily_topup_per_campaign, max_topups_per_campaign_per_day"
        )
        .order("country_code", { ascending: true }),
      client
        .from("ppc_acos_topup_bands")
        .select("country_code, band_key, topup_amount")
        .order("country_code", { ascending: true }),
    ]);

  if (settingsError || bandsError) {
    return { data: null, error: (settingsError ?? bandsError)!.message };
  }

  return { data: { settings: settings ?? [], bands: bands ?? [] }, error: null };
}

export async function updateAcosTopupSettings(
  countryCode: string,
  updates: {
    enabled?: boolean;
    acosMetric?: AcosMetric;
    maxDailyTopupPerCampaign?: number;
    maxTopupsPerCampaignPerDay?: number;
  }
): Promise<{ data: AcosTopupSettings | null; error: string | null }> {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  if (
    updates.enabled === undefined &&
    updates.acosMetric === undefined &&
    updates.maxDailyTopupPerCampaign === undefined &&
    updates.maxTopupsPerCampaignPerDay === undefined
  ) {
    return { data: null, error: "No changes provided" };
  }
  if (updates.acosMetric !== undefined && !ACOS_METRIC_KEYS.includes(updates.acosMetric)) {
    return { data: null, error: `Invalid ACOS metric: ${updates.acosMetric}` };
  }
  if (
    updates.maxDailyTopupPerCampaign !== undefined &&
    (!Number.isFinite(updates.maxDailyTopupPerCampaign) ||
      updates.maxDailyTopupPerCampaign <= 0 ||
      updates.maxDailyTopupPerCampaign > MAX_DAILY_TOPUP_PER_CAMPAIGN)
  ) {
    return {
      data: null,
      error: `Invalid max daily top-up per campaign: ${updates.maxDailyTopupPerCampaign}`,
    };
  }
  if (
    updates.maxTopupsPerCampaignPerDay !== undefined &&
    (!Number.isInteger(updates.maxTopupsPerCampaignPerDay) ||
      updates.maxTopupsPerCampaignPerDay <= 0 ||
      updates.maxTopupsPerCampaignPerDay > MAX_TOPUPS_PER_CAMPAIGN_PER_DAY)
  ) {
    return {
      data: null,
      error: `Invalid max top-ups per campaign per day: ${updates.maxTopupsPerCampaignPerDay}`,
    };
  }

  const existsError = await assertCountryExists(countryCode);
  if (existsError) return { data: null, error: existsError };

  const service = createServiceClient();

  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;
  if (updates.acosMetric !== undefined) dbUpdates.acos_metric = updates.acosMetric;
  if (updates.maxDailyTopupPerCampaign !== undefined) {
    dbUpdates.max_daily_topup_per_campaign = updates.maxDailyTopupPerCampaign;
  }
  if (updates.maxTopupsPerCampaignPerDay !== undefined) {
    dbUpdates.max_topups_per_campaign_per_day = updates.maxTopupsPerCampaignPerDay;
  }

  const { data: after, error: updateError } = await service
    .from("ppc_acos_topup_settings")
    .update(dbUpdates)
    .eq("country_code", countryCode)
    .select(
      "country_code, enabled, acos_metric, max_daily_topup_per_campaign, max_topups_per_campaign_per_day"
    )
    .single();
  if (updateError) return { data: null, error: updateError.message };

  return { data: after, error: null };
}

export async function updateAcosTopupBands(
  countryCode: string,
  changes: { bandKey: AcosBandKey; topupAmount: number }[]
): Promise<{ data: { updated: number } | null; error: string | null }> {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  if (changes.length === 0) return { data: { updated: 0 }, error: null };

  // All-or-nothing validation: this data directly controls live ad spend,
  // so a batch save must never partially apply.
  for (const change of changes) {
    if (!ACOS_BAND_KEYS.includes(change.bandKey)) {
      return { data: null, error: `Invalid ACOS band: ${change.bandKey}` };
    }
    if (
      !Number.isFinite(change.topupAmount) ||
      change.topupAmount < 0 ||
      change.topupAmount > MAX_BAND_TOPUP_AMOUNT
    ) {
      return { data: null, error: `Invalid top-up amount for ${change.bandKey}: ${change.topupAmount}` };
    }
  }

  const existsError = await assertCountryExists(countryCode);
  if (existsError) return { data: null, error: existsError };

  const service = createServiceClient();

  for (const change of changes) {
    const { error: updateError } = await service
      .from("ppc_acos_topup_bands")
      .update({ topup_amount: change.topupAmount, updated_at: new Date().toISOString() })
      .eq("country_code", countryCode)
      .eq("band_key", change.bandKey);
    if (updateError) return { data: null, error: updateError.message };
  }

  return { data: { updated: changes.length }, error: null };
}

export async function getAcosTopupLog(
  countryCode: string,
  limit = 50
): Promise<{ data: AcosTopupLogEntry[] | null; error: string | null }> {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  const client = await createClient();
  const { data, error: dbError } = await client
    .from("ppc_acos_topup_log")
    .select(
      "id, country_code, campaign_id, campaign_name, acos_metric, acos_value, band_key, topup_amount, previous_budget, new_budget, applied_at"
    )
    .eq("country_code", countryCode)
    .order("applied_at", { ascending: false })
    .limit(limit);

  return { data, error: dbError?.message ?? null };
}
