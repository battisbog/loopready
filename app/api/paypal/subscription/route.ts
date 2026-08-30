import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { paypalConfigured, paypalFetch } from "@/lib/paypal/client";
import {
  PRICING,
  planId,
  discountPlanId,
  discountedFirstCyclePrice,
  type PaidPlan,
} from "@/lib/pricing";
import { checkIpRateLimit, checkRateLimit } from "@/lib/rate-limit";
import { getSiteUrl } from "@/lib/site-url";

export const maxDuration = 30;

/**
 * Creates a subscription server-side and returns its id for the PayPal button.
 *
 * Deliberately NOT done with actions.subscription.create in the browser: that
 * lets the client choose plan_id and custom_id, so someone could subscribe at
 * the Voice price while tagging the order as Premium. Both values are set here
 * from trusted sources only.
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
  if (!paypalConfigured()) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 501 });
  }

  // Discount codes are re-validated and redeemed HERE, server-side, even
  // though /api/discount/check already looked at this same code -- that
  // route never mutates anything, so a client cannot make itself a discount
  // by calling only the check endpoint. Redemption happens now, at creation,
  // not gated on the subscription later activating: PayPal has no webhook
  // for "the payer closed the popup without approving," so there is no
  // reliable signal to release the code on abandonment the way a video
  // credit reservation can be released on a session that never started.
  let firstCyclePrice: string | null = null;
  if (typeof discountCode === "string" && discountCode.trim()) {
    const admin = createAdminClient();
    const { data: redemption, error: redeemError } = await admin.rpc(
      "redeem_discount_code",
      { p_code: discountCode.trim(), p_user: user.id }
    );
    const result = redemption?.[0] as { ok?: boolean; amount_off?: number } | undefined;
    if (redeemError || !result?.ok) {
      return NextResponse.json(
        {
          error:
            "That code isn't valid, has expired, has already been fully redeemed, or this account has already used a discount code.",
        },
        { status: 400 }
      );
    }
    firstCyclePrice = discountedFirstCyclePrice(plan as PaidPlan, result.amount_off!);
    if (!firstCyclePrice) {
      // Redeemed above, but doesn't apply to this plan -- this is checked in
      // /api/discount/check too, so a normal checkout never reaches here.
      // Still fails closed rather than silently charging full price, since
      // the code has already been consumed.
      return NextResponse.json(
        { error: "That code doesn't apply to this plan. Contact support to have it restored." },
        { status: 400 }
      );
    }
  }

  const id = firstCyclePrice ? discountPlanId(plan as PaidPlan) : planId(plan as PaidPlan);
  if (!id) {
    return NextResponse.json(
      { error: `No PayPal plan configured for ${plan}.` },
      { status: 501 }
    );
  }

  try {
    const sub = await paypalFetch<{ id: string; status: string }>(
      "/v1/billing/subscriptions",
      {
        method: "POST",
        body: JSON.stringify({
          plan_id: id,
          // Overrides ONLY the discount plan's one-time TRIAL cycle
          // (sequence 1). The REGULAR cycle after it is left untouched, so
          // renewals bill at the plan's normal full price.
          ...(firstCyclePrice && {
            plan: {
              billing_cycles: [
                {
                  sequence: 1,
                  pricing_scheme: {
                    fixed_price: { value: firstCyclePrice, currency_code: "USD" },
                  },
                },
              ],
            },
          }),
          // The webhook resolves the account from this. Without it a payment
          // can never be matched to a user.
          custom_id: `${user.id}:${plan}`,
          subscriber: { email_address: user.email },
          application_context: {
            brand_name: "LoopReady",
            user_action: "SUBSCRIBE_NOW",
            shipping_preference: "NO_SHIPPING",
            return_url: `${getSiteUrl()}/billing?checkout=success`,
            cancel_url: `${getSiteUrl()}/checkout?plan=${plan}&cancelled=1`,
          },
        }),
      }
    );

    // Logged because this id is otherwise never recorded anywhere unless the
    // subscription activates: the webhook is what persists it. An attempt that
    // the payer abandons, or that PayPal declines at the card step, leaves us
    // with no reference at all -- so a "my card was refused" report cannot be
    // traced back to the actual subscription to read its status.
    console.log(
      `[paypal] subscription ${sub.id} created for user=${user.id} plan=${plan} status=${sub.status}` +
        (firstCyclePrice ? ` discountCode=${discountCode} firstCycle=$${firstCyclePrice}` : "")
    );

    return NextResponse.json({
      subscriptionId: sub.id,
      amount: firstCyclePrice ?? PRICING[plan as PaidPlan].amount,
    });
  } catch (e) {
    console.error("[paypal] subscription create failed:", e);
    return NextResponse.json(
      { error: "Could not start the subscription. Please try again." },
      { status: 502 }
    );
  }
}
