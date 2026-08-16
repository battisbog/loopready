import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { paypalConfigured, paypalFetch } from "@/lib/paypal/client";

/**
 * Cancels the caller's PayPal subscription.
 *
 * The tier itself is NOT downgraded here. PayPal sends
 * BILLING.SUBSCRIPTION.CANCELLED, and the webhook remains the only writer of
 * entitlements. We only record that a cancellation was requested.
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
    .select("paypal_subscription_id")
    .eq("id", user.id)
    .maybeSingle();

  const subscriptionId = profile?.paypal_subscription_id;
  if (!subscriptionId) {
    return NextResponse.json(
      { error: "No active subscription found on this account." },
      { status: 409 }
    );
  }
  if (!paypalConfigured()) {
    return NextResponse.json(
      { error: "Billing is not configured." },
      { status: 501 }
    );
  }

  try {
    await paypalFetch(`/v1/billing/subscriptions/${subscriptionId}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason: "Cancelled by user" }),
    });
  } catch (e) {
    console.error("[billing] cancel failed:", e);
    return NextResponse.json(
      { error: "PayPal could not cancel the subscription. Please try again." },
      { status: 502 }
    );
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
