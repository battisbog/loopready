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
  premiumVoice: boolean;
  /** Sessions per UTC day; null means uncapped. */
  dailySessions: number | null;
  /** Video-avatar interviews per month, when that ships. */
  videoSlots: number;
}

const FREE_DAILY = Number(process.env.FREE_DAILY_SESSION_LIMIT ?? 3);

export const TIERS: Record<Tier, TierFeatures> = {
  free: {
    label: "Free",
    rounds: ["behavioral"],
    premiumVoice: false,
    dailySessions: FREE_DAILY,
    videoSlots: 0,
  },
  voice: {
    label: "Voice",
    rounds: ["coding", "system_design", "behavioral"],
    premiumVoice: true,
    dailySessions: null,
    videoSlots: 0,
  },
  premium: {
    label: "Premium",
    rounds: ["coding", "system_design", "behavioral"],
    premiumVoice: true,
    dailySessions: null,
    videoSlots: 2,
  },
  unlimited: {
    label: "Unlimited",
    rounds: ["coding", "system_design", "behavioral"],
    premiumVoice: true,
    dailySessions: null,
    videoSlots: 2,
  },
};

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
    .select("subscription_tier, subscription_status")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return "free";
  if (!isTier(data.subscription_tier)) return "free";

  // A paid tier only counts while the subscription is in good standing.
  // One-time (premium) purchases have no status, so absence is allowed.
  const status = data.subscription_status;
  const paidSubscription =
    data.subscription_tier === "voice" || data.subscription_tier === "premium";
  // PAST_DUE is deliberately good standing: PayPal is still retrying the
  // charge, and pulling access mid-retry punishes a customer whose card just
  // expired. CANCELLED/EXPIRED/SUSPENDED are the terminal states.
  if (
    paidSubscription &&
    status &&
    !["ACTIVE", "APPROVED", "PAST_DUE"].includes(status)
  ) {
    return "free";
  }

  return data.subscription_tier;
}

export function featuresFor(tier: Tier): TierFeatures {
  return TIERS[tier] ?? TIERS.free;
}

export function canUseRound(tier: Tier, round: RoundType): boolean {
  return featuresFor(tier).rounds.includes(round);
}

export function canUsePremiumVoice(tier: Tier): boolean {
  return featuresFor(tier).premiumVoice;
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

/** Credits granted by an active Premium subscription each cycle. */
export const PREMIUM_VIDEO_ALLOWANCE = Number(
  process.env.PREMIUM_VIDEO_ALLOWANCE ?? 3
);

/** Credits added by a one-time video pack purchase. */
export const VIDEO_PACK_CREDITS = Number(process.env.VIDEO_PACK_CREDITS ?? 3);

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
