/** The 144 ten-minute slot labels a daily-cap schedule must use: "00:00" .. "23:50". */
export const CANONICAL_SLOTS: readonly string[] = Array.from({ length: 144 }, (_, i) => {
  const mins = i * 10;
  const h = String(Math.floor(mins / 60)).padStart(2, "0");
  const m = String(mins % 60).padStart(2, "0");
  return `${h}:${m}`;
});

export const MAX_SLOT_AMOUNT = 1000;

function orderedSlots(resetTime: string): string[] {
  const pm = CANONICAL_SLOTS.filter((s) => s >= resetTime).sort();
  const am = CANONICAL_SLOTS.filter((s) => s < resetTime).sort();
  return [...pm, ...am];
}

/**
 * Reorders a schedule's slots into "PM session" (reset_time -> 23:30) then
 * "AM session" (00:00 -> just before reset_time), and returns the running
 * cumulative total at each slot. Mirrors get_day_slots/get_cumulative_cap in
 * sp_account_budget.py, but as a pure display calc (no wall-clock dependency)
 * so staff can see the same cumulative shape the Python script computes.
 */
export function computeRunningTotals(
  amounts: Record<string, number>,
  resetTime: string
): { slot: string; runningTotal: number }[] {
  let total = 0;
  return orderedSlots(resetTime).map((slot) => {
    total += amounts[slot] ?? 0;
    return { slot, runningTotal: total };
  });
}

/** Marketplace wall clock — always Singapore time (UTC+8, no DST). */
function nowSgt(): Date {
  return new Date(Date.now() + 8 * 60 * 60 * 1000);
}

export function todaySgt(): string {
  return nowSgt().toISOString().slice(0, 10);
}

function shiftDateSgt(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** The ten-minute slot bucket "now" currently falls in, in Singapore time. */
export function currentSlotSgt(): string {
  const d = nowSgt();
  const mins = d.getUTCHours() * 60 + Math.floor(d.getUTCMinutes() / 10) * 10;
  return `${String(Math.floor(mins / 60) % 24).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

/** The next ten-minute slot boundary at or after "now", in Singapore time. */
export function nextSlotSgt(): string {
  const d = nowSgt();
  const mins = d.getUTCHours() * 60 + Math.ceil(d.getUTCMinutes() / 10) * 10;
  return `${String(Math.floor(mins / 60) % 24).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

/**
 * The two calendar dates spanned by a reset cycle. dayOffset=0 (default) is
 * the cycle "now" currently falls in; +/-N steps to the cycle N days later/earlier.
 */
export function resolveCycleDates(
  resetTime: string,
  dayOffset = 0
): { pmDate: string; amDate: string } {
  const today = todaySgt();
  const base =
    currentSlotSgt() >= resetTime
      ? { pmDate: today, amDate: shiftDateSgt(today, 1) }
      : { pmDate: shiftDateSgt(today, -1), amDate: today };
  return dayOffset === 0
    ? base
    : { pmDate: shiftDateSgt(base.pmDate, dayOffset), amDate: shiftDateSgt(base.amDate, dayOffset) };
}

function orderedSlotsWithDates(resetTime: string, dayOffset = 0): { slot: string; date: string }[] {
  const { pmDate, amDate } = resolveCycleDates(resetTime, dayOffset);
  return orderedSlots(resetTime).map((slot) => ({
    slot,
    date: slot >= resetTime ? pmDate : amDate,
  }));
}

/**
 * Same cumulative shape as computeRunningTotals, but tagged with the real
 * calendar date each slot falls on (a reset cycle spans two dates), and with
 * any matching manual top-ups folded into the running total. dayOffset steps
 * to a different reset cycle (0 = the one "now" falls in).
 */
export function computeProjectedRows(
  amounts: Record<string, number>,
  resetTime: string,
  manualTopUps: { target_date: string; slot_time: string; amount: number }[],
  dayOffset = 0
): { slot: string; date: string; runningTotal: number }[] {
  let total = 0;
  return orderedSlotsWithDates(resetTime, dayOffset).map(({ slot, date }) => {
    const bump = manualTopUps
      .filter((t) => t.slot_time === slot && t.target_date === date)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    total += (amounts[slot] ?? 0) + bump;
    return { slot, date, runningTotal: total };
  });
}
