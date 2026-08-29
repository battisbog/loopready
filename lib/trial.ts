import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Platform-wide daily cap on "Try it free" video trial sessions.
 *
 * IMPORTANT: this default is a conservative placeholder, not a number derived
 * from this Tavus account's actual plan. Nothing in this repo documents the
 * account's included minutes or concurrency limit (checked lib/video/config.ts,
 * README, docs/ -- Tavus bills by the minute per a comment there, but no
 * number is recorded anywhere). Set TRIAL_DAILY_CAP from the real plan limits
 * once known: worst case per trial is ~TRIAL_TASTE_MINUTES + 2 minutes of
 * Tavus billing (see lib/interview/length.ts and app/api/video/session/
 * route.ts's maxMinutes), so cap * (taste+2) is the daily minute ceiling this
 * allows -- keep it under whatever the account can actually sustain
 * concurrently and monthly.
 */
export const TRIAL_DAILY_CAP = Number(process.env.TRIAL_DAILY_CAP ?? 20);

export interface TrialSlotResult {
  allowed: boolean;
  used: number;
  cap: number;
  /** True when the RPC itself failed; callers must treat this as a refusal. */
  error?: boolean;
}

/**
 * Consumes one of today's trial slots and reports whether it was allowed.
 *
 * THE CAP IS ENFORCED IN SQL (consume_trial_slot), not here -- same reasoning
 * as lib/demo/gate.ts's consumeDemoUse: the check and the increment are one
 * atomic statement, so two visitors starting a trial in the same instant
 * cannot both read "19 of 20 used" and both proceed.
 *
 * FAILS CLOSED. If the RPC errors, refuse the trial -- an unbounded trial
 * flow burning real Tavus minutes is a worse outcome than one visitor seeing
 * a "come back later" message.
 */
export async function consumeTrialSlot(
  admin: SupabaseClient,
  cap: number = TRIAL_DAILY_CAP
): Promise<TrialSlotResult> {
  const { data, error } = await admin.rpc("consume_trial_slot", { p_cap: cap });
  if (error) {
    console.error("[trial] daily cap check failed, refusing:", error.message);
    return { allowed: false, used: 0, cap, error: true };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return {
    allowed: Boolean(row?.allowed),
    used: Number(row?.used ?? 0),
    cap: Number(row?.cap ?? cap),
  };
}

/** Read-only view for /admin/costs. Never increments. */
export async function peekTrialUsage(
  admin: SupabaseClient
): Promise<{ used: number; cap: number; remaining: number }> {
  const { data } = await admin
    .from("trial_daily_usage")
    .select("used")
    .eq("day", new Date().toISOString().slice(0, 10))
    .maybeSingle();
  const used = Number(data?.used ?? 0);
  return { used, cap: TRIAL_DAILY_CAP, remaining: Math.max(0, TRIAL_DAILY_CAP - used) };
}

/**
 * A visitor-facing refusal that degrades gracefully instead of a broken
 * session: point them at the (free, unlimited) demo video and /pricing
 * rather than a dead end. Paired with a heading that already says "at
 * capacity" (app/trial/start/page.tsx's CapacityScreen), so this doesn't
 * repeat it.
 */
export const TRIAL_CAPACITY_MESSAGE =
  "Too many live trials running at once. Watch a recorded demo instead, or pick a plan to start practising today.";
