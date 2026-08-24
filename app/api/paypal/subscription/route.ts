import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { paypalConfigured, paypalFetch } from "@/lib/paypal/client";
import { PRICING, planId, type PaidPlan } from "@/lib/pricing";
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

  const { plan } = await request.json().catch(() => ({}));
  if (plan !== "voice" && plan !== "premium") {
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }
  if (!paypalConfigured()) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 501 });
  }

  const id = planId(plan as PaidPlan);
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
      `[paypal] subscription ${sub.id} created for user=${user.id} plan=${plan} status=${sub.status}`
    );

    return NextResponse.json({
      subscriptionId: sub.id,
      amount: PRICING[plan as PaidPlan].amount,
    });
  } catch (e) {
    console.error("[paypal] subscription create failed:", e);
    return NextResponse.json(
      { error: "Could not start the subscription. Please try again." },
      { status: 502 }
    );
  }
}
