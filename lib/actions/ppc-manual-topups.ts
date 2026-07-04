"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getSession } from "@/lib/session";
import { CANONICAL_SLOTS, MAX_SLOT_AMOUNT, todaySgt, currentSlotSgt } from "@/lib/ppc-daily-cap-constants";
import { assertCountryExists, getStaffId } from "@/lib/actions/ppc-daily-cap";

export interface ManualTopUp {
  id: string;
  country_code: string;
  target_date: string;
  slot_time: string;
  amount: number;
  status: "pending" | "applied" | "cancelled";
  created_by_username: string;
  created_at: string;
  applied_at: string | null;
}

async function requireStaff() {
  const session = await getSession();
  if (!session) return { session: null, error: "Unauthorized" as const };
  return { session, error: null };
}

export async function listManualTopUps(
  countryCode?: string
): Promise<{ data: ManualTopUp[] | null; error: string | null }> {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  const client = await createClient();
  let query = client
    .from("ppc_manual_topups")
    .select(
      "id, country_code, target_date, slot_time, amount, status, created_by_username, created_at, applied_at"
    )
    .order("target_date", { ascending: true })
    .order("slot_time", { ascending: true });

  if (countryCode) query = query.eq("country_code", countryCode);

  const { data, error: dbError } = await query;
  return { data, error: dbError?.message ?? null };
}

export async function createManualTopUp(
  countryCode: string,
  targetDate: string,
  slotTime: string,
  amount: number
): Promise<{ data: ManualTopUp | null; error: string | null }> {
  const { session, error } = await requireStaff();
  if (error) return { data: null, error };

  if (!CANONICAL_SLOTS.includes(slotTime)) {
    return { data: null, error: `Invalid slot time: ${slotTime}` };
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_SLOT_AMOUNT) {
    return { data: null, error: `Invalid amount: ${amount}` };
  }
  if (targetDate < todaySgt()) {
    return { data: null, error: "Target date can't be in the past" };
  }
  if (targetDate === todaySgt() && slotTime <= currentSlotSgt()) {
    return { data: null, error: "That slot isn't in the future anymore" };
  }

  const existsError = await assertCountryExists(countryCode);
  if (existsError) return { data: null, error: existsError };

  const service = createServiceClient();
  const changedBy = await getStaffId(session!.username);

  const { data, error: insertError } = await service
    .from("ppc_manual_topups")
    .insert({
      country_code: countryCode,
      target_date: targetDate,
      slot_time: slotTime,
      amount,
      created_by: changedBy,
      created_by_username: session!.username,
    })
    .select(
      "id, country_code, target_date, slot_time, amount, status, created_by_username, created_at, applied_at"
    )
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return {
        data: null,
        error: "A top-up is already scheduled for this slot — edit or cancel it instead.",
      };
    }
    return { data: null, error: insertError.message };
  }

  return { data, error: null };
}

export async function cancelManualTopUp(
  id: string
): Promise<{ data: { ok: true } | null; error: string | null }> {
  const { error } = await requireStaff();
  if (error) return { data: null, error };

  const service = createServiceClient();

  const { data: existing, error: fetchError } = await service
    .from("ppc_manual_topups")
    .select("target_date, slot_time, status")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) return { data: null, error: fetchError.message };
  if (!existing) return { data: null, error: "Top-up not found" };
  if (existing.status !== "pending") {
    return { data: null, error: "Only pending top-ups can be cancelled." };
  }
  const today = todaySgt();
  const isFuture = existing.target_date > today || (existing.target_date === today && existing.slot_time > currentSlotSgt());
  if (!isFuture) {
    return { data: null, error: "This slot has already started — it can no longer be cancelled." };
  }

  const { data, error: deleteError } = await service
    .from("ppc_manual_topups")
    .delete()
    .eq("id", id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (deleteError) return { data: null, error: deleteError.message };
  if (!data) return { data: null, error: "Only pending top-ups can be cancelled." };

  return { data: { ok: true }, error: null };
}
