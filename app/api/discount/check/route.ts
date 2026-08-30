import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { discountedFirstCyclePrice, PRICING, type PaidPlan } from "@/lib/pricing";
import { checkIpRateLimit } from "@/lib/rate-limit";

export const maxDuration = 15;

/**
 * Read-only: reports whether a code is valid for a plan and what the
 * discounted first-cycle price would be, WITHOUT redeeming it. Redemption
 * (the atomic, one-time-use increment) happens only when the subscription is
 * actually created, in /api/paypal/subscription -- this endpoint exists so
 * the checkout page can show "Code applied: $19 -> $14" before the customer
 * commits to anything.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ipLimited = await checkIpRateLimit("checkout", request);
  if (!ipLimited.ok) return ipLimited.response!;

  const { code, plan } = await request.json().catch(() => ({}));
  if (typeof code !== "string" || !code.trim()) {
    return NextResponse.json({ valid: false, error: "Enter a code." }, { status: 400 });
  }
  if (plan !== "voice" && plan !== "premium") {
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }

  const admin = createAdminClient();

  // One redemption per account, ever, across every code -- checked here too
  // (not just at actual redemption in /api/paypal/subscription) so the UI
  // can say so up front rather than the customer typing a valid-looking code
  // and only finding out it's rejected at checkout.
  const { data: alreadyRedeemed, error: redeemedError } = await admin.rpc(
    "has_redeemed_discount_code",
    { p_user: user.id }
  );
  if (!redeemedError && alreadyRedeemed) {
    return NextResponse.json({
      valid: false,
      error: "You've already used a discount code on this account.",
    });
  }

  const { data, error } = await admin
    .from("discount_codes")
    .select("amount_off, active, max_uses, times_used, expires_at")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ valid: false, error: "That code isn't valid." });
  }
  if (!data.active) {
    return NextResponse.json({ valid: false, error: "That code is no longer active." });
  }
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ valid: false, error: "That code has expired." });
  }
  if (data.max_uses !== null && data.times_used >= data.max_uses) {
    return NextResponse.json({ valid: false, error: "That code has already been fully redeemed." });
  }

  const amountOff = Number(data.amount_off);
  const discounted = discountedFirstCyclePrice(plan as PaidPlan, amountOff);
  if (!discounted) {
    return NextResponse.json({
      valid: false,
      error: `That code doesn't apply to the ${plan === "voice" ? "Voice" : "Premium"} plan.`,
    });
  }

  return NextResponse.json({
    valid: true,
    amountOff,
    firstCyclePrice: discounted,
    regularPrice: PRICING[plan as PaidPlan].amount,
  });
}
