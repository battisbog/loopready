import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSubscriptionCheckoutSession } from "@/lib/dodo/checkout";
import type { PaidPlan } from "@/lib/pricing";
import { checkIpRateLimit, checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 30;

/**
 * Dodo mirror of app/api/paypal/subscription/route.ts.
 *
 * app/checkout/page.tsx calls createSubscriptionCheckoutSession directly
 * server-side rather than fetching this route -- this endpoint is kept for
 * any non-browser caller. Creates a hosted Checkout Session server-side:
 * the plan and the customer both have to come from a trusted source, not
 * from whatever the browser sends. The subscription itself is only real
 * once the webhook's `subscription.active` event fires
 * (app/api/dodo/webhook/route.ts) -- never on the return_url redirect,
 * which is not proof of payment.
 *
 * Discount codes: Dodo's own hosted checkout page collects and validates
 * the code (feature_flags.allow_discount_code) and enforces its own
 * usage_limit. LoopReady's discount_codes table/RPCs are not consulted on
 * this path anymore.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await checkRateLimit("feedback", user.id);
  if (!limited.ok) return limited.response!;
  const ipLimited = await checkIpRateLimit("checkout", request);
  if (!ipLimited.ok) return ipLimited.response!;

  const { plan } = await request.json().catch(() => ({}));
  if (plan !== "voice" && plan !== "premium") {
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }

  const result = await createSubscriptionCheckoutSession({
    userId: user.id,
    email: user.email,
    plan: plan as PaidPlan,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ checkoutUrl: result.checkoutUrl });
}
