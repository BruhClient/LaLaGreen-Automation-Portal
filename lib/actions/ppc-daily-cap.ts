"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getSession } from "@/lib/session";
import { CANONICAL_SLOTS, MAX_SLOT_AMOUNT } from "@/lib/ppc-daily-cap-constants";

export interface CountryConfig {
  country_code: string;
  enabled: boolean;
  reset_time: string;
}

export interface ScheduleRow {
  country_code: string;
  slot_time: string;
  amount: number;
}

async function requireStaff() {
  const session = await getSession();
  if (!session) return { session: null, error: "Unauthorized" as const };
  return { session, error: null };
}

export async function getDailyCapConfig(): Promise<{
  data: { countries: CountryConfig[]; schedule: ScheduleRow[] } | null;
  error: string | null;
}> {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  const client = await createClient();

  const [{ data: countries, error: countriesError }, { data: schedule, error: scheduleError }] =
    await Promise.all([
      client
        .from("ppc_topup_countries")
        .select("country_code, enabled, reset_time")
        .order("country_code", { ascending: true }),
      client
        .from("ppc_topup_schedule")
        .select("country_code, slot_time, amount")
        .order("country_code", { ascending: true })
        .order("slot_time", { ascending: true }),
    ]);

  if (countriesError || scheduleError) {
    return { data: null, error: (countriesError ?? scheduleError)!.message };
  }

  return { data: { countries: countries ?? [], schedule: schedule ?? [] }, error: null };
}

export async function getStaffId(username: string): Promise<string | null> {
  const service = createServiceClient();
  const { data } = await service.from("staff").select("id").eq("username", username).maybeSingle();
  return data?.id ?? null;
}

export async function assertCountryExists(countryCode: string): Promise<string | null> {
  const client = await createClient();
  const { data, error } = await client
    .from("ppc_topup_countries")
    .select("country_code")
    .eq("country_code", countryCode)
    .maybeSingle();
  if (error) return error.message;
  if (!data) return `Unknown country_code: ${countryCode}`;
  return null;
}

export async function updateCountrySettings(
  countryCode: string,
  updates: { enabled?: boolean; resetTime?: string }
): Promise<{ data: CountryConfig | null; error: string | null }> {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  if (updates.enabled === undefined && updates.resetTime === undefined) {
    return { data: null, error: "No changes provided" };
  }
  if (updates.resetTime !== undefined && !CANONICAL_SLOTS.includes(updates.resetTime)) {
    return { data: null, error: `Invalid reset time: ${updates.resetTime}` };
  }

  const existsError = await assertCountryExists(countryCode);
  if (existsError) return { data: null, error: existsError };

  const service = createServiceClient();

  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;
  if (updates.resetTime !== undefined) dbUpdates.reset_time = updates.resetTime;

  const { data: after, error: updateError } = await service
    .from("ppc_topup_countries")
    .update(dbUpdates)
    .eq("country_code", countryCode)
    .select("country_code, enabled, reset_time")
    .single();
  if (updateError) return { data: null, error: updateError.message };

  return { data: after, error: null };
}

export async function updateScheduleSlots(
  countryCode: string,
  changes: { slotTime: string; amount: number }[]
): Promise<{ data: { updated: number } | null; error: string | null }> {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  if (changes.length === 0) return { data: { updated: 0 }, error: null };

  // All-or-nothing validation: this data directly controls live ad spend,
  // so a batch save must never partially apply.
  for (const change of changes) {
    if (!CANONICAL_SLOTS.includes(change.slotTime)) {
      return { data: null, error: `Invalid slot time: ${change.slotTime}` };
    }
    if (!Number.isFinite(change.amount) || change.amount < 0 || change.amount > MAX_SLOT_AMOUNT) {
      return { data: null, error: `Invalid amount for ${change.slotTime}: ${change.amount}` };
    }
  }

  const existsError = await assertCountryExists(countryCode);
  if (existsError) return { data: null, error: existsError };

  const service = createServiceClient();

  for (const change of changes) {
    const { error: updateError } = await service
      .from("ppc_topup_schedule")
      .update({ amount: change.amount, updated_at: new Date().toISOString() })
      .eq("country_code", countryCode)
      .eq("slot_time", change.slotTime);
    if (updateError) return { data: null, error: updateError.message };
  }

  return { data: { updated: changes.length }, error: null };
}
