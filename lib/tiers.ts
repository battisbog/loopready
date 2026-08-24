import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RoundType } from "@/lib/interview/rounds";

/**
 * Entitlements.
 *
 * `unlimited` is an internal comp tier (staff/test accounts). It is never sold
 * and never set by the webhook — only by hand in the database.
 */
export type Tier = "free" | "voice" | "premium" | "unlimited";

export interface TierFeatures {
  label: string;
  /** Rounds this tier may start. */
  rounds: RoundType[];
  /** Paid voice providers (ElevenLabs / realtime). Free gets standard voice. */
  /** Sessions per UTC day; null means uncapped. */
  dailySessions: number | null;
  /** Video-avatar interviews per month, when that ships. */
  videoSlots: number;
}

const FREE_DAILY = Number(process.env.FREE_DAILY_SESSION_LIMIT ?? 3);

/**
 * Video allowance. ONE definition, used by the tier table, the webhook that
 * grants credits, and every place the number is shown to a customer.
 *
 * It was previously three separate values: the webhook granted 3, the tier
 * table said 2, and the marketing copy hardcoded "2". Customers were quietly
 * given one more than they were sold, and nothing would have caught it.
 */
export const PREMIUM_VIDEO_ALLOWANCE = Number(
  process.env.PREMIUM_VIDEO_ALLOWANCE ?? 3
);

/** Credits added by a one-time video pack purchase. */
export const VIDEO_PACK_CREDITS = Number(process.env.VIDEO_PACK_CREDITS ?? 3);

export const TIERS: Record<Tier, TierFeatures> = {
  free: {
    label: "Free",
    rounds: ["behavioral"],
    dailySessions: FREE_DAILY,
    videoSlots: 0,
  },
  voice: {
    label: "Voice",
    rounds: ["coding", "system_design", "behavioral"],
    dailySessions: null,
    videoSlots: 0,
  },
  premium: {
    label: "Premium",
    rounds: ["coding", "system_design", "behavioral"],
    dailySessions: null,
    videoSlots: PREMIUM_VIDEO_ALLOWANCE,
  },
  unlimited: {
    label: "Unlimited",
    rounds: ["coding", "system_design", "behavioral"],
    dailySessions: null,
    videoSlots: PREMIUM_VIDEO_ALLOWANCE,
  },
};

/**
 * Subscription statuses that still carry paid access.
 *
 * ONE definition, imported by everything that gates on standing. It used to be
 * duplicated in lib/rate-limit.ts, which is how the two drifted apart.
 *
 * PAST_DUE is good standing: PayPal is still retrying the charge, and pulling
 * access mid-retry punishes a customer whose card just expired.
 *
 * CANCEL_REQUESTED is good standing too, and that is the important one. A
 * cancellation means "do not bill me again", not "cut me off now" -- the
 * pricing FAQ promises "you keep access until the end of the period you've paid
 * for". /api/billing/cancel sets this the moment the user clicks cancel, so
 * treating it as terminal revoked access instantly for someone who had already
 * paid for the rest of the month. PayPal sends CANCELLED or EXPIRED when the
 * period actually ends, and those ARE terminal.
 */
const GOOD_STANDING = ["ACTIVE", "APPROVED", "PAST_DUE", "CANCEL_REQUESTED"];

/**
 * Whether a subscription status still entitles the user to their paid tier.
 * An absent status is allowed: one-time purchases have no status.
 */
export function isGoodStanding(status: unknown): boolean {
  return !status || GOOD_STANDING.includes(String(status));
}

/**
 * Statuses that end the subscription but leave the already-paid period intact.
 * REFUNDED is excluded on purpose: the money went back, so the period did not
 * happen. SUSPENDED is excluded because PayPal stopped it, not the customer.
 */
const ENDS_AT_PERIOD_END = ["CANCELLED", "EXPIRED"];

/** Whether a terminated subscription is still inside the period paid for. */
export function withinPaidPeriod(
  status: unknown,
  currentPeriodEnd: unknown
): boolean {
  if (!ENDS_AT_PERIOD_END.includes(String(status))) return false;
  if (!currentPeriodEnd) return false;
  const until = new Date(String(currentPeriodEnd)).getTime();
  return Number.isFinite(until) && until > Date.now();
}

function isTier(value: unknown): value is Tier {
  return (
    value === "free" ||
    value === "voice" ||
    value === "premium" ||
    value === "unlimited"
  );
}

/**
 * The user's current entitlement, read server-side from `profiles`.
 *
 * Fails CLOSED: anything unexpected (missing profile, unknown value, database
 * error) resolves to `free`. A billing bug must never hand out paid features.
 */
export async function getUserTier(
  admin: SupabaseClient,
  userId: string
): Promise<Tier> {
  const { data, error } = await admin
    .from("profiles")
    .select("subscription_tier, subscription_status, current_period_end")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return "free";
  if (!isTier(data.subscription_tier)) return "free";

  // A paid tier only counts while the subscription is in good standing.
  // One-time (premium) purchases have no status, so absence is allowed.
  const paidSubscription =
    data.subscription_tier === "voice" || data.subscription_tier === "premium";
  if (paidSubscription && !isGoodStanding(data.subscription_status)) {
    // Cancelling stops the next charge; it does not refund the current period.
    // They keep what they already paid for, which is what the pricing FAQ
    // promises. A refund or a suspension is not a paid period, so neither gets
    // the grace.
    if (!withinPaidPeriod(data.subscription_status, data.current_period_end)) {
      return "free";
    }
  }

  return data.subscription_tier;
}

export function featuresFor(tier: Tier): TierFeatures {
  return TIERS[tier] ?? TIERS.free;
}

export function canUseRound(tier: Tier, round: RoundType): boolean {
  return featuresFor(tier).rounds.includes(round);
}

/** 402 with an upgrade path, for a feature the tier does not include. */
export function upgradeRequired(
  message: string,
  tier: Tier,
  requires: Tier = "voice"
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      upgradeRequired: true,
      currentTier: tier,
      requiredTier: requires,
      upgradeUrl: "/pricing",
    },
    { status: 402 }
  );
}

// ============================================================
// Video interview credits
// ============================================================


export interface Entitlements {
  tier: Tier;
  videoCreditsRemaining: number;
  videoPlanAllowance: number;
  videoCreditsResetAt: string | null;
  /** Session currently holding a reservation, if any. */
  openReservationSessionId: string | null;
  canUseVideo: boolean;
}

/**
 * Everything the server needs to decide what a user may start.
 *
 * Like getUserTier, this fails closed: on any error the caller sees a free
 * tier with zero credits.
 */
export async function getEntitlements(
  admin: SupabaseClient,
  userId: string
): Promise<Entitlements> {
  const empty: Entitlements = {
    tier: "free",
    videoCreditsRemaining: 0,
    videoPlanAllowance: 0,
    videoCreditsResetAt: null,
    openReservationSessionId: null,
    canUseVideo: false,
  };

  const { data, error } = await admin
    .from("profiles")
    .select(
      "subscription_tier, subscription_status, video_credits_remaining, video_plan_allowance, video_credits_reset_at, video_reservation_session_id"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return empty;

  const tier = await getUserTier(admin, userId);
  const remaining = Number(data.video_credits_remaining ?? 0);

  return {
    tier,
    videoCreditsRemaining: remaining,
    videoPlanAllowance: Number(data.video_plan_allowance ?? 0),
    videoCreditsResetAt: data.video_credits_reset_at ?? null,
    openReservationSessionId: data.video_reservation_session_id ?? null,
    // Video is a Premium feature AND needs a credit. Both must hold.
    canUseVideo: featuresFor(tier).videoSlots > 0 && remaining > 0,
  };
}

export type CreditFailure =
  | "no_credits"
  | "reservation_open"
  | "no_reservation"
  | "error";

export type CreditResult =
  | { ok: true; remaining?: number }
  | { ok: false; reason: CreditFailure };

const FAILURES: CreditFailure[] = [
  "no_credits",
  "reservation_open",
  "no_reservation",
  "error",
];

function toFailure(reason: unknown): CreditFailure {
  return FAILURES.includes(reason as CreditFailure)
    ? (reason as CreditFailure)
    : "error";
}

async function creditRpc(
  admin: SupabaseClient,
  fn: string,
  args: Record<string, unknown>
): Promise<CreditResult> {
  const { data, error } = await admin.rpc(fn, args);
  if (error) {
    console.error(`[credits] ${fn} failed:`, error.message);
    return { ok: false, reason: "error" };
  }
  const result = data as
    | { ok?: boolean; reason?: string; remaining?: number }
    | null;
  if (result?.ok) return { ok: true, remaining: result.remaining };
  return { ok: false, reason: toFailure(result?.reason) };
}

/**
 * Takes a credit and marks the session as holding it.
 *
 * Atomic in one SQL statement, so two parallel requests cannot both spend the
 * last credit, and a user cannot hold two reservations at once. Re-reserving
 * the same session is idempotent (reconnects are not double charges).
 */
export function reserveVideoCredit(
  admin: SupabaseClient,
  userId: string,
  sessionId: string
): Promise<CreditResult> {
  return creditRpc(admin, "reserve_video_credit", {
    p_user: userId,
    p_session: sessionId,
  });
}

/** Confirms the spend once the interview genuinely started. */
export function commitVideoCredit(
  admin: SupabaseClient,
  userId: string,
  sessionId: string
): Promise<CreditResult> {
  return creditRpc(admin, "commit_video_credit", {
    p_user: userId,
    p_session: sessionId,
  });
}

/** Hands the credit back when the session never really began. */
export function releaseVideoCredit(
  admin: SupabaseClient,
  userId: string,
  sessionId: string
): Promise<CreditResult> {
  return creditRpc(admin, "release_video_credit", {
    p_user: userId,
    p_session: sessionId,
  });
}

/** Returns a credit that was already committed (support/refund path). */
export function refundVideoCredit(
  admin: SupabaseClient,
  userId: string,
  sessionId: string,
  detail?: string
): Promise<CreditResult> {
  return creditRpc(admin, "refund_video_credit", {
    p_user: userId,
    p_session: sessionId,
    p_detail: detail ?? null,
  });
}

/** 402 for a video request with no credit left, offering the voice path. */
export function outOfVideoCredits(ent: Entitlements): NextResponse {
  return NextResponse.json(
    {
      error:
        "You've used your video interviews this cycle. Continue with voice (unlimited on your plan), or buy more video credits.",
      outOfVideoCredits: true,
      currentTier: ent.tier,
      videoCreditsRemaining: ent.videoCreditsRemaining,
      videoCreditsResetAt: ent.videoCreditsResetAt,
      buyMoreUrl: "/checkout?product=video-pack",
      fallbackMode: "voice",
    },
    { status: 402 }
  );
}
