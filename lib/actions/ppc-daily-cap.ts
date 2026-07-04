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

export interface AuditRow {
  id: string;
  country_code: string;
  slot_time: string | null;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by_username: string;
  created_at: string;
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

export async function getAuditLog(
  countryCode: string,
  limit = 25,
  offset = 0,
  date?: string
): Promise<{ data: { rows: AuditRow[]; hasMore: boolean } | null; error: string | null }> {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  const client = await createClient();
  let query = client
    .from("ppc_topup_audit_log")
    .select("id, country_code, slot_time, field_name, old_value, new_value, changed_by_username, created_at")
    .eq("country_code", countryCode)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit);

  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { data: null, error: `Invalid date: ${date}` };
    const dayStart = new Date(`${date}T00:00:00+08:00`);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    query = query.gte("created_at", dayStart.toISOString()).lt("created_at", dayEnd.toISOString());
  }

  const { data, error: dbError } = await query;
  if (dbError) return { data: null, error: dbError.message };
  const rows = data ?? [];
  return { data: { rows: rows.slice(0, limit), hasMore: rows.length > limit }, error: null };
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
  const { session, error } = await requireStaff();
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

  const { data: before, error: beforeError } = await service
    .from("ppc_topup_countries")
    .select("enabled, reset_time")
    .eq("country_code", countryCode)
    .single();
  if (beforeError) return { data: null, error: beforeError.message };

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

  const auditRows: Record<string, unknown>[] = [];
  if (updates.enabled !== undefined && updates.enabled !== before.enabled) {
    auditRows.push({
      country_code: countryCode,
      slot_time: null,
      field_name: "enabled",
      old_value: String(before.enabled),
      new_value: String(updates.enabled),
      changed_by_username: session!.username,
    });
  }
  if (updates.resetTime !== undefined && updates.resetTime !== before.reset_time) {
    auditRows.push({
      country_code: countryCode,
      slot_time: null,
      field_name: "reset_time",
      old_value: before.reset_time,
      new_value: updates.resetTime,
      changed_by_username: session!.username,
    });
  }
  if (auditRows.length > 0) {
    const changedBy = await getStaffId(session!.username);
    await service
      .from("ppc_topup_audit_log")
      .insert(auditRows.map((row) => ({ ...row, changed_by: changedBy })));
  }

  return { data: after, error: null };
}

export async function updateScheduleSlots(
  countryCode: string,
  changes: { slotTime: string; amount: number }[]
): Promise<{ data: { updated: number } | null; error: string | null }> {
  const { session, error } = await requireStaff();
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

  const { data: before, error: beforeError } = await service
    .from("ppc_topup_schedule")
    .select("slot_time, amount")
    .eq("country_code", countryCode)
    .in(
      "slot_time",
      changes.map((c) => c.slotTime)
    );
  if (beforeError) return { data: null, error: beforeError.message };

  const beforeBySlot = new Map((before ?? []).map((row) => [row.slot_time, row.amount]));

  for (const change of changes) {
    const { error: updateError } = await service
      .from("ppc_topup_schedule")
      .update({ amount: change.amount, updated_at: new Date().toISOString() })
      .eq("country_code", countryCode)
      .eq("slot_time", change.slotTime);
    if (updateError) return { data: null, error: updateError.message };
  }

  const auditRows = changes
    .filter((change) => Number(beforeBySlot.get(change.slotTime)) !== change.amount)
    .map((change) => ({
      country_code: countryCode,
      slot_time: change.slotTime,
      field_name: "amount",
      old_value: String(beforeBySlot.get(change.slotTime) ?? ""),
      new_value: String(change.amount),
      changed_by_username: session!.username,
    }));

  if (auditRows.length > 0) {
    const changedBy = await getStaffId(session!.username);
    await service
      .from("ppc_topup_audit_log")
      .insert(auditRows.map((row) => ({ ...row, changed_by: changedBy })));
  }

  return { data: { updated: changes.length }, error: null };
}
