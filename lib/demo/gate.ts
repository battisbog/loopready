import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The shared demo account.
 *
 * One set of credentials handed to friends, so it must be assumed to leak. The
 * defence is a LIFETIME cap held in Postgres, not a per-day allowance and not
 * anything the client can influence: even if the login circulates widely, the
 * worst case is N demos in total, forever.
 */

export const DEMO_EMAIL = (
  process.env.TEST_ACCOUNT_EMAIL ?? "test@loopready.com"
).toLowerCase();

/** Total demos this account may EVER run. Never resets on its own. */
export const DEMO_VIDEO_CAP = Number(process.env.TEST_ACCOUNT_VIDEO_CAP ?? 12);

/** Hard ceiling on one demo, in seconds. Enforced by Tavus and by us. */
export const DEMO_SECONDS = Number(process.env.TEST_ACCOUNT_DEMO_SECONDS ?? 30);

/** Whether an email belongs to the shared demo account. */
export function isDemoAccount(email: string | null | undefined): boolean {
  return Boolean(email && email.toLowerCase() === DEMO_EMAIL);
}

export interface DemoConsumeResult {
  allowed: boolean;
  used: number;
  cap: number;
  disabled: boolean;
  /** True when the RPC itself failed; callers must treat this as a refusal. */
  error?: boolean;
}

/**
 * Consumes one demo use and reports whether it was allowed.
 *
 * THE CAP IS ENFORCED IN SQL, not here. `consume_demo_use` increments only
 * `where used < p_cap and disabled = false`, so the check and the increment are
 * one statement. Reading the count and then deciding in TypeScript would let
 * two simultaneous visitors both read 11 of 12 and both proceed; this cannot.
 *
 * FAILS CLOSED. If the RPC errors we refuse the demo, because an unbounded
 * shared account is a worse outcome than a friend seeing an error.
 */
export async function consumeDemoUse(
  admin: SupabaseClient,
  email: string = DEMO_EMAIL
): Promise<DemoConsumeResult> {
  const { data, error } = await admin.rpc("consume_demo_use", {
    p_email: email.toLowerCase(),
    p_cap: DEMO_VIDEO_CAP,
  });

  if (error) {
    console.error("[demo] cap check failed, refusing:", error.message);
    return { allowed: false, used: 0, cap: DEMO_VIDEO_CAP, disabled: false, error: true };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    allowed: Boolean(row?.allowed),
    used: Number(row?.used ?? 0),
    cap: Number(row?.cap ?? DEMO_VIDEO_CAP),
    disabled: Boolean(row?.disabled),
  };
}

/** Read-only view for the admin dashboard. Never increments. */
export async function peekDemoUsage(
  admin: SupabaseClient,
  email: string = DEMO_EMAIL
): Promise<{ used: number; cap: number; disabled: boolean; remaining: number }> {
  const { data } = await admin
    .from("demo_usage")
    .select("used, disabled")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  const used = Number(data?.used ?? 0);
  return {
    used,
    cap: DEMO_VIDEO_CAP,
    disabled: Boolean(data?.disabled),
    remaining: Math.max(0, DEMO_VIDEO_CAP - used),
  };
}

/**
 * A refusal a friend can actually understand, without revealing the cap size
 * or inviting them to try again later. It is over, permanently.
 */
export function demoExhaustedMessage(disabled: boolean): string {
  return disabled
    ? "This demo account has been closed. Create your own account to keep practising."
    : "This shared demo has been used up. Create your own account to keep practising.";
}
