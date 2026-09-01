import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dodoClient, dodoConfigured } from "@/lib/dodo/client";
import { dodoProductId } from "@/lib/dodo/products";
import { discountedFirstCyclePrice, type PaidPlan } from "@/lib/pricing";
import { checkIpRateLimit, checkRateLimit } from "@/lib/rate-limit";
import { getSiteUrl } from "@/lib/site-url";

export const maxDuration = 30;

/**
 * Dodo mirror of app/api/paypal/subscription/route.ts.
 *
 * NOT wired into any live checkout UI yet -- see lib/dodo/client.ts's top
 * comment. Kept here so flipping providers is "point the checkout button at
 * this route" rather than a build-from-scratch.
 *
 * Creates a hosted Checkout Session server-side (never client-side, for the
 * same reason PayPal's version does this server-side: the plan and the
 * customer both have to come from a trusted source, not from whatever the
 * browser sends). Redirect the browser to the returned checkoutUrl; the
 * subscription itself is only real once the webhook's `subscription.active`
 * event fires (app/api/dodo/webhook/route.ts) -- never on the return_url
 * redirect, which is not proof of payment.
 *
 * Discount codes: Dodo checkout sessions take `discount_codes` natively and
 * resolve them against codes configured in the Dodo dashboard -- there is no
 * per-checkout price override the way PayPal's plan billing_cycles allows.
 * This still checks LoopReady's own discount_codes table first (so an
 * invalid/expired/exhausted code fails the same way it does today) and, if
 * valid, passes the code straight through to Dodo. For the discount to
 * actually take effect, a Dodo-side discount code with the SAME code string
 * and a matching amount must exist in the Dodo dashboard -- that is
 * dashboard configuration, not something this route can provision.
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

  const { plan, discountCode } = await request.json().catch(() => ({}));
  if (plan !== "voice" && plan !== "premium") {
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }
  if (!dodoConfigured()) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 501 });
  }

  const productId = dodoProductId(plan as PaidPlan);
  if (!productId) {
    return NextResponse.json(
      { error: `No Dodo product configured for ${plan}.` },
      { status: 501 }
    );
  }

  // Validated (not redeemed) here purely to reject a bad code with the same
  // message the UI already shows -- redemption bookkeeping for LoopReady's
  // own discount_codes table happens the same way PayPal's route does it,
  // via redeem_discount_code, so usage counts stay accurate regardless of
  // which provider actually applied the discount.
  let appliedCode: string | undefined;
  if (typeof discountCode === "string" && discountCode.trim()) {
    const admin = createAdminClient();
    const { data: redemption, error: redeemError } = await admin.rpc(
      "redeem_discount_code",
      { p_code: discountCode.trim(), p_user: user.id }
    );
    const result = redemption?.[0] as
      | { ok?: boolean; amount_off?: number | null; percent_off?: number | null }
      | undefined;
    if (redeemError || !result?.ok) {
      return NextResponse.json(
        { error: "That code isn't valid, has expired, or has already been fully redeemed." },
        { status: 400 }
      );
    }
    const firstCyclePrice = discountedFirstCyclePrice(
      plan as PaidPlan,
      result.percent_off != null
        ? { percentOff: result.percent_off }
        : { amountOff: result.amount_off! }
    );
    if (!firstCyclePrice) {
      return NextResponse.json(
        { error: "That code doesn't apply to this plan. Contact support to have it restored." },
        { status: 400 }
      );
    }
    appliedCode = discountCode.trim();
  }

  try {
    const client = dodoClient();
    const session = await client.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { email: user.email ?? "" },
      // Resolved by the webhook the same way custom_id resolves a PayPal
      // event -- see app/api/dodo/webhook/route.ts's resolveUserId.
      metadata: { app_user_id: user.id, plan },
      ...(appliedCode && { discount_codes: [appliedCode] }),
      return_url: `${getSiteUrl()}/billing?checkout=success`,
    });

    if (!session.checkout_url) {
      return NextResponse.json(
        { error: "Checkout URL was not returned." },
        { status: 502 }
      );
    }

    console.log(
      `[dodo] checkout session ${session.session_id} created for user=${user.id} plan=${plan}` +
        (appliedCode ? ` discountCode=${appliedCode}` : "")
    );

    return NextResponse.json({ checkoutUrl: session.checkout_url });
  } catch (e) {
    console.error("[dodo] subscription checkout create failed:", e);
    return NextResponse.json(
      { error: "Could not start the subscription. Please try again." },
      { status: 502 }
    );
  }
}
