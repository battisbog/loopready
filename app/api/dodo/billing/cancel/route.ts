import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dodoClient, dodoConfigured } from "@/lib/dodo/client";

export const maxDuration = 30;

/**
 * Dodo mirror of app/api/billing/cancel/route.ts.
 *
 * Cancels at the next billing date rather than immediately -- the pricing
 * FAQ promise ("you keep access until the end of the period you've paid
 * for") applies the same way regardless of provider. subscription.cancelled
 * (app/api/dodo/webhook/route.ts) remains the only writer of entitlements
 * for a real Dodo subscription; this only records that cancellation was
 * requested.
 *
 * Same no-subscription branch as the PayPal route: an account granted a
 * paid tier directly (support, comped, testing) has no Dodo subscription to
 * cancel and no webhook will ever fire for one, so it downgrades directly.
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
    .select("dodo_subscription_id")
    .eq("id", user.id)
    .maybeSingle();

  const subscriptionId = profile?.dodo_subscription_id;
  if (!subscriptionId) {
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
  if (!dodoConfigured()) {
    return NextResponse.json(
      { error: "Billing is not configured." },
      { status: 501 }
    );
  }

  try {
    const client = dodoClient();
    await client.subscriptions.update(subscriptionId, {
      cancel_at_next_billing_date: true,
    });
  } catch (e) {
    console.error("[dodo] cancel failed:", e);
    return NextResponse.json(
      { error: "Dodo could not cancel the subscription. Please try again." },
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
