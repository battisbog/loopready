import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { paypalConfigured, paypalFetch } from "@/lib/paypal/client";
import { dodoClient, dodoConfigured } from "@/lib/dodo/client";

/**
 * Cancels the caller's subscription, on whichever provider it's actually
 * on. New subscriptions go through Dodo only (see app/checkout/*), but
 * accounts subscribed before the switch still carry a real
 * paypal_subscription_id and must still be able to self-serve cancel from
 * here -- checking which provider ID is present, rather than assuming one,
 * is what keeps both cohorts working from a single route.
 *
 * The tier itself is NOT downgraded here for a REAL subscription on either
 * provider. Each provider's webhook (BILLING.SUBSCRIPTION.CANCELLED for
 * PayPal, subscription.cancelled for Dodo) remains the only writer of
 * entitlements for that case -- this only records that cancellation was
 * requested and lets the provider's own retry/grace-period rules apply.
 *
 * An account can be on a paid tier with NEITHER provider id at all --
 * granted directly (support, a comped account, testing) rather than bought.
 * There is nothing for either provider to cancel and no webhook will ever
 * fire for one, so without a separate path here that account had NO way to
 * ever self-serve back to free from the UI. Downgrade it directly instead
 * of refusing.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("paypal_subscription_id, dodo_subscription_id")
    .eq("id", user.id)
    .maybeSingle();

  const paypalSubscriptionId = profile?.paypal_subscription_id;
  const dodoSubscriptionId = profile?.dodo_subscription_id;

  if (!paypalSubscriptionId && !dodoSubscriptionId) {
    await admin
      .from("profiles")
      .update({
        subscription_tier: "free",
        subscription_status: null,
        video_plan_allowance: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    return NextResponse.json({ ok: true, downgraded: true });
  }

  if (dodoSubscriptionId) {
    if (!dodoConfigured()) {
      return NextResponse.json(
        { error: "Billing is not configured." },
        { status: 501 }
      );
    }
    try {
      const client = dodoClient();
      await client.subscriptions.update(dodoSubscriptionId, {
        cancel_at_next_billing_date: true,
      });
    } catch (e) {
      console.error("[dodo] cancel failed:", e);
      return NextResponse.json(
        { error: "Could not cancel the subscription. Please try again." },
        { status: 502 }
      );
    }
  } else {
    if (!paypalConfigured()) {
      return NextResponse.json(
        { error: "Billing is not configured." },
        { status: 501 }
      );
    }
    try {
      await paypalFetch(`/v1/billing/subscriptions/${paypalSubscriptionId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: "Cancelled by user" }),
      });
    } catch (e) {
      console.error("[paypal] cancel failed:", e);
      return NextResponse.json(
        { error: "Could not cancel the subscription. Please try again." },
        { status: 502 }
      );
    }
  }

  await admin
    .from("profiles")
    .update({
      subscription_status: "CANCEL_REQUESTED",
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}
