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
  if (paidSubscription && status && !["ACTIVE", "APPROVED"].includes(status)) {
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
