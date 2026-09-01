import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dodoClient } from "@/lib/dodo/client";
import type { Metadata } from "dodopayments/resources/misc";
import {
  PREMIUM_VIDEO_ALLOWANCE,
  VIDEO_PACK_CREDITS,
  type Tier,
} from "@/lib/tiers";

export const maxDuration = 30;

/**
 * Dodo Payments webhook. Mirrors app/api/paypal/webhook/route.ts's role and
 * structure closely -- same idempotency discipline, same "webhook is the
 * only writer of entitlements" rule, same credit-grant RPC -- adapted to
 * Dodo's event shape and signature scheme.
 *
 * NOT the live webhook yet: nothing points a Dodo dashboard endpoint at this
 * route. See lib/dodo/client.ts's top comment. Register this route's URL
 * under Developer -> Webhooks in the Dodo dashboard when ready to switch,
 * and set DODO_PAYMENTS_WEBHOOK_KEY to the signing secret shown there.
 *
 * Every request is signature-verified via client.webhooks.unwrap before it
 * is allowed to touch a profile -- an unverified body is hostile input,
 * same as the PayPal route's own reasoning.
 */

type Purpose = "premium" | "voice" | "video-pack" | null;

/** metadata is whatever app/api/dodo/subscription and app/api/dodo/order set
 *  at checkout -- app_user_id always, plus plan or purpose/quantity. Dodo
 *  metadata values are always strings. */
function readMetadata(
  metadata: Metadata | null | undefined
): { userId: string | null; purpose: Purpose; quantity: number } {
  const userId = metadata?.app_user_id != null ? String(metadata.app_user_id) : null;
  const rawPurpose = metadata?.purpose != null ? String(metadata.purpose) : undefined;
  const rawPlan = metadata?.plan != null ? String(metadata.plan) : undefined;
  const known: Purpose[] = ["premium", "voice", "video-pack"];
  const purpose = known.includes(rawPurpose as Purpose)
    ? (rawPurpose as Purpose)
    : known.includes(rawPlan as Purpose)
      ? (rawPlan as Purpose)
      : null;
  const quantity = Math.min(
    10,
    Math.max(1, Math.round(Number(metadata?.quantity)) || 1)
  );
  return { userId, purpose, quantity };
}

/** Falls back to a stored subscription id when metadata is somehow absent
 *  (mirrors the PayPal route's subscription-id fallback for renewals). */
async function resolveUserIdBySubscription(
  admin: ReturnType<typeof createAdminClient>,
  subscriptionId: string | undefined
): Promise<string | null> {
  if (!subscriptionId) return null;
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("dodo_subscription_id", subscriptionId)
    .maybeSingle();
  return data?.id ?? null;
}

async function claimEvent(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string,
  eventType: string
): Promise<"fresh" | "duplicate" | "unknown"> {
  const { error } = await admin
    .from("dodo_webhook_events")
    .insert({ event_id: eventId, event_type: eventType });
  if (!error) return "fresh";
  if (error.code === "23505") return "duplicate";
  console.error(
    `[dodo] idempotency claim failed (${error.code}): ${error.message}. ` +
      "Processing anyway WITHOUT replay protection."
  );
  return "unknown";
}

async function releaseEvent(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string
): Promise<void> {
  await admin.from("dodo_webhook_events").delete().eq("event_id", eventId);
}

/** Mirrors the PayPal route's resolveTier: only trust an explicit purpose
 *  from this event; otherwise keep whatever the account already has, so an
 *  event with no plan information can never silently demote Premium. */
async function resolveTier(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  purpose: Purpose
): Promise<Tier> {
  if (purpose === "premium") return "premium";
  if (purpose === "voice") return "voice";
  const { data } = await admin
    .from("profiles")
    .select("subscription_tier")
    .eq("id", userId)
    .maybeSingle();
  return data?.subscription_tier === "premium" ? "premium" : "voice";
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const headerId = request.headers.get("webhook-id");
  const headerSignature = request.headers.get("webhook-signature");
  const headerTimestamp = request.headers.get("webhook-timestamp");

  if (!headerId || !headerSignature || !headerTimestamp) {
    return NextResponse.json({ error: "Missing webhook headers" }, { status: 400 });
  }

  let event: ReturnType<ReturnType<typeof dodoClient>["webhooks"]["unwrap"]>;
  try {
    const client = dodoClient();
    event = client.webhooks.unwrap(rawBody, {
      headers: {
        "webhook-id": headerId,
        "webhook-signature": headerSignature,
        "webhook-timestamp": headerTimestamp,
      },
    });
  } catch (e) {
    // 401 rather than 500: an invalid signature will never verify on retry,
    // same reasoning as the PayPal route's 401 on a bad signature.
    console.error("[dodo] signature verification failed:", e);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const type = event.type;
  const admin = createAdminClient();

  const claim = await claimEvent(admin, headerId, type);
  if (claim === "duplicate") {
    console.log(`[dodo] ${type} ${headerId} already applied; ignoring replay`);
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const failed = async (body: object, status: number) => {
    await releaseEvent(admin, headerId);
    return NextResponse.json(body, { status });
  };

  // event.data's type is narrowed per-branch below via event.type -- Payment,
  // Subscription, and Refund each carry their own metadata/customer shape,
  // and only Subscription carries subscription_id/next_billing_date/
  // cancel_at_next_billing_date, so those are read inside their own cases
  // rather than hoisted out of the union.
  let userId: string | null = null;
  let purpose: Purpose = null;
  let quantity = 1;
  let customerId: string | undefined;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  let tier: Tier | null = null;
  let credits:
    | { mode: "set" | "add"; amount: number; reset: string | null; detail: string }
    | null = null;

  switch (event.type) {
    // --- Subscriptions (Voice / Premium) ---
    case "subscription.active": {
      const sub = event.data;
      ({ userId, purpose, quantity } = readMetadata(sub.metadata));
      customerId = sub.customer?.customer_id;
      userId ??= await resolveUserIdBySubscription(admin, sub.subscription_id);
      if (!userId) break;

      const isPremium = (await resolveTier(admin, userId, purpose)) === "premium";
      tier = isPremium ? "premium" : "voice";
      patch.dodo_subscription_id = sub.subscription_id;
      // Mirrors the PayPal webhook's ACTIVE write. Without this, Dodo
      // subscribers keep whatever subscription_status they started with --
      // null for a first-time subscriber -- forever. lib/tiers.ts's
      // isGoodStanding(null) happens to also read as "good standing," so
      // access was never actually broken by the missing write, but
      // app/(app)/billing/page.tsx shows the raw column and was rendering
      // "No subscription" for a fully paying, active customer.
      patch.subscription_status = "ACTIVE";
      if (sub.next_billing_date) patch.current_period_end = sub.next_billing_date;
      if (isPremium) {
        credits = {
          mode: "set",
          amount: PREMIUM_VIDEO_ALLOWANCE,
          reset: sub.next_billing_date ?? null,
          detail: `${type} premium allowance`,
        };
      }
      break;
    }
    case "subscription.renewed": {
      const sub = event.data;
      ({ userId, purpose, quantity } = readMetadata(sub.metadata));
      customerId = sub.customer?.customer_id;
      userId ??= await resolveUserIdBySubscription(admin, sub.subscription_id);
      if (!userId) break;

      const { data: prof } = await admin
        .from("profiles")
        .select("subscription_tier, video_plan_allowance")
        .eq("id", userId)
        .maybeSingle();
      tier = prof?.subscription_tier === "premium" ? "premium" : "voice";
      // A renewal after a recovered on_hold clears the PAST_DUE status set
      // below back to ACTIVE, same as PayPal's payment-completed handler.
      patch.subscription_status = "ACTIVE";
      if (sub.next_billing_date) patch.current_period_end = sub.next_billing_date;
      const allowance = Number(prof?.video_plan_allowance ?? 0);
      if (allowance > 0) {
        // Plan credits do not roll over: reset, never accumulate -- same
        // rule as PAYMENT.SALE.COMPLETED in the PayPal webhook.
        credits = { mode: "set", amount: allowance, reset: null, detail: "renewal reset" };
      }
      break;
    }
    case "subscription.on_hold": {
      const sub = event.data;
      ({ userId, purpose, quantity } = readMetadata(sub.metadata));
      customerId = sub.customer?.customer_id;
      userId ??= await resolveUserIdBySubscription(admin, sub.subscription_id);
      if (!userId) break;

      console.warn(
        `[dodo] renewal payment failed for user=${userId}, marking past_due (access retained)`
      );
      // Not a downgrade: on_hold is recoverable, exactly like PayPal's
      // BILLING.SUBSCRIPTION.PAYMENT.FAILED. Access continues -- tier is
      // untouched -- but the status column needs to actually say PAST_DUE:
      // isGoodStanding treats PAST_DUE as good standing already, so this
      // doesn't change entitlement, it's what makes the billing page show
      // the retry state instead of silently doing nothing.
      patch.subscription_status = "PAST_DUE";
      break;
    }
    case "subscription.cancelled": {
      const sub = event.data;
      ({ userId, purpose, quantity } = readMetadata(sub.metadata));
      customerId = sub.customer?.customer_id;
      userId ??= await resolveUserIdBySubscription(admin, sub.subscription_id);
      if (!userId) break;

      if (sub.next_billing_date) patch.current_period_end = sub.next_billing_date;
      if (sub.cancel_at_next_billing_date) {
        // Access is retained until the period end; tier is left alone and
        // getUserTier resolves from (status, current_period_end) the same
        // way it does for a PayPal CANCEL_REQUESTED. That fallback reads
        // subscription_status, so it has to actually be written here --
        // /api/dodo/billing/cancel already sets it when the user cancels
        // in-app, but this event also fires for a cancellation Dodo itself
        // initiates (or one made directly in the Dodo dashboard), which
        // never touches our profiles row otherwise. There is no scheduled
        // downgrade job -- when the date passes, entitlement resolution
        // does it on its own.
        patch.subscription_status = "CANCEL_REQUESTED";
        console.log(
          `[dodo] subscription.cancelled for ${userId}: access retained until ${sub.next_billing_date}`
        );
      } else {
        tier = "free";
        patch.subscription_status = "CANCELLED";
        credits = { mode: "set", amount: 0, reset: null, detail: type };
      }
      break;
    }
    case "subscription.expired":
    case "subscription.failed": {
      const sub = event.data;
      ({ userId, purpose, quantity } = readMetadata(sub.metadata));
      customerId = sub.customer?.customer_id;
      userId ??= await resolveUserIdBySubscription(admin, sub.subscription_id);
      if (!userId) break;

      tier = "free";
      patch.subscription_status = type === "subscription.expired" ? "EXPIRED" : "FAILED";
      credits = { mode: "set", amount: 0, reset: null, detail: type };
      break;
    }

    // --- One-time purchase (video pack) ---
    case "payment.succeeded": {
      const payment = event.data;
      ({ userId, purpose, quantity } = readMetadata(payment.metadata));
      customerId = payment.customer?.customer_id;
      if (!userId) break;

      if (purpose === "video-pack") {
        credits = {
          mode: "add",
          amount: VIDEO_PACK_CREDITS * quantity,
          reset: null,
          detail: `video pack purchase (x${quantity})`,
        };
      }
      // A payment.succeeded with no purpose is a subscription's initial
      // charge, already covered by subscription.active -- nothing to do.
      break;
    }
    case "refund.succeeded": {
      const refund = event.data;
      ({ userId, purpose, quantity } = readMetadata(refund.metadata));
      customerId = refund.customer?.customer_id;
      if (!userId) break;

      if (purpose === "video-pack") {
        credits = {
          mode: "add",
          amount: -VIDEO_PACK_CREDITS * quantity,
          reset: null,
          detail: `video pack refunded (x${quantity})`,
        };
      } else {
        tier = "free";
        patch.subscription_status = "REFUNDED";
        credits = { mode: "set", amount: 0, reset: null, detail: type };
      }
      break;
    }

    default:
      // Unhandled events are acknowledged so Dodo does not retry them.
      return NextResponse.json({ ok: true, handled: false, type });
  }

  if (!userId) {
    // Release the claim rather than leaving it committed: unlike the
    // profile-update/credit-grant failures below, this returns 200 (a
    // genuinely unmappable event -- e.g. metadata stripped in transit --
    // should not retry-storm forever), but releasing means a *transient*
    // resolution failure (an admin-client blip, a not-yet-visible profile
    // row) gets a real second chance on Dodo's redelivery instead of being
    // silently and permanently dropped after one bad read.
    await releaseEvent(admin, headerId);
    console.error(`[dodo] ${type}: could not map event to a user`);
    return NextResponse.json({ ok: true, mapped: false });
  }
  if (customerId) patch.dodo_customer_id = customerId;

  if (tier) {
    // Never downgrade an internal comp account from a billing event -- same
    // guard as the PayPal webhook.
    const { data: current } = await admin
      .from("profiles")
      .select("subscription_tier")
      .eq("id", userId)
      .maybeSingle();
    if (current?.subscription_tier !== "unlimited") {
      patch.subscription_tier = tier;
    }
  }

  const { error } = await admin.from("profiles").update(patch).eq("id", userId);
  if (error) {
    console.error("[dodo] profile update failed:", error.message);
    return failed({ error: "Update failed" }, 500);
  }

  if (credits) {
    const { data: current } = await admin
      .from("profiles")
      .select("subscription_tier")
      .eq("id", userId)
      .maybeSingle();
    if (current?.subscription_tier === "unlimited") {
      console.log(`[dodo] ${type}: skipped credit change for comp account`);
    } else {
      const { error: creditError } = await admin.rpc("grant_video_credits", {
        p_user: userId,
        p_allowance: credits.amount,
        p_reset: credits.reset,
        p_mode: credits.mode,
        p_detail: credits.detail,
      });
      if (creditError) {
        console.error("[dodo] credit grant failed:", creditError.message);
        return failed({ error: "Credit update failed" }, 500);
      }
    }
  }

  console.log(
    `[dodo] ${type} applied for ${userId} -> tier=${tier ?? "unchanged"} credits=${
      credits ? `${credits.mode} ${credits.amount}` : "unchanged"
    }`
  );
  return NextResponse.json({ ok: true, handled: true });
}
