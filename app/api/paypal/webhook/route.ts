import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { paypalFetch } from "@/lib/paypal/client";
import type { Tier } from "@/lib/tiers";

export const maxDuration = 30;

/**
 * PayPal webhook. This is the ONLY place a subscription tier is ever upgraded.
 *
 * Every request is signature-verified against PAYPAL_WEBHOOK_ID before it is
 * allowed to touch a profile. An unverified body is treated as hostile: anyone
 * can POST this URL, so trusting the payload would let a stranger grant
 * themselves a paid tier.
 */

interface VerifyResponse {
  verification_status: "SUCCESS" | "FAILURE";
}

async function verifySignature(
  headers: Headers,
  rawBody: string
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.error("[paypal] PAYPAL_WEBHOOK_ID missing; rejecting webhook");
    return false;
  }

  const required = [
    "paypal-auth-algo",
    "paypal-cert-url",
    "paypal-transmission-id",
    "paypal-transmission-sig",
    "paypal-transmission-time",
  ];
  const got: Record<string, string> = {};
  for (const h of required) {
    const v = headers.get(h);
    if (!v) {
      console.warn(`[paypal] webhook missing header ${h}`);
      return false;
    }
    got[h] = v;
  }

  try {
    const result = await paypalFetch<VerifyResponse>(
      "/v1/notifications/verify-webhook-signature",
      {
        method: "POST",
        body: JSON.stringify({
          auth_algo: got["paypal-auth-algo"],
          cert_url: got["paypal-cert-url"],
          transmission_id: got["paypal-transmission-id"],
          transmission_sig: got["paypal-transmission-sig"],
          transmission_time: got["paypal-transmission-time"],
          webhook_id: webhookId,
          // Must be the parsed body: PayPal re-serializes it their way.
          webhook_event: JSON.parse(rawBody),
        }),
      }
    );
    return result.verification_status === "SUCCESS";
  } catch (e) {
    console.error("[paypal] signature verification call failed:", e);
    return false;
  }
}

/**
 * Resolves the LoopReady user for an event.
 *
 * Preferred path is `custom_id`, which we set to the user id when creating the
 * subscription or order. Falls back to a stored subscription id so renewals
 * and cancellations still map even when custom_id is absent.
 */
async function resolveUserId(
  admin: ReturnType<typeof createAdminClient>,
  resource: Record<string, unknown>
): Promise<string | null> {
  const custom =
    (resource.custom_id as string | undefined) ??
    (resource.custom as string | undefined) ??
    ((resource.purchase_units as { custom_id?: string }[] | undefined)?.[0]
      ?.custom_id as string | undefined);
  if (custom) return custom;

  const subscriptionId =
    (resource.id as string | undefined) ??
    (resource.billing_agreement_id as string | undefined);
  if (subscriptionId) {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("paypal_subscription_id", subscriptionId)
      .maybeSingle();
    if (data?.id) return data.id;
  }
  return null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!(await verifySignature(request.headers, rawBody))) {
    // 401 rather than 400: PayPal retries on 5xx, and we do not want retries
    // of something we will never accept.
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { event_type?: string; resource?: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  const type = event.event_type ?? "";
  const resource = event.resource ?? {};
  const admin = createAdminClient();
  const userId = await resolveUserId(admin, resource);

  if (!userId) {
    // Acknowledge so PayPal stops retrying, but record it: this means a
    // checkout was created without a custom_id.
    console.error(`[paypal] ${type}: could not map event to a user`);
    return NextResponse.json({ ok: true, mapped: false });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  let tier: Tier | null = null;

  switch (type) {
    // --- Subscriptions (Voice) ---
    case "BILLING.SUBSCRIPTION.ACTIVATED":
    case "BILLING.SUBSCRIPTION.RE-ACTIVATED": {
      tier = "voice";
      patch.subscription_status = "ACTIVE";
      patch.paypal_subscription_id = resource.id;
      break;
    }
    case "BILLING.SUBSCRIPTION.UPDATED": {
      const status = String(resource.status ?? "");
      patch.subscription_status = status || "ACTIVE";
      patch.paypal_subscription_id = resource.id;
      // Only an active subscription keeps the paid tier.
      tier = status === "ACTIVE" || status === "" ? "voice" : "free";
      break;
    }
    case "BILLING.SUBSCRIPTION.CANCELLED":
    case "BILLING.SUBSCRIPTION.EXPIRED":
    case "BILLING.SUBSCRIPTION.SUSPENDED":
    case "BILLING.SUBSCRIPTION.PAYMENT.FAILED": {
      tier = "free";
      patch.subscription_status = type.split(".").pop();
      break;
    }
    // Renewal payments: keep the subscription alive.
    case "PAYMENT.SALE.COMPLETED": {
      if (resource.billing_agreement_id) {
        tier = "voice";
        patch.subscription_status = "ACTIVE";
      }
      break;
    }
    // --- One-time purchase (Premium) ---
    case "PAYMENT.CAPTURE.COMPLETED":
    case "CHECKOUT.ORDER.COMPLETED": {
      tier = "premium";
      patch.paypal_order_id = resource.id;
      patch.subscription_status = "COMPLETED";
      break;
    }
    case "PAYMENT.CAPTURE.REFUNDED":
    case "PAYMENT.CAPTURE.REVERSED": {
      tier = "free";
      patch.subscription_status = "REFUNDED";
      break;
    }
    default:
      // Unhandled events are acknowledged so PayPal does not retry them.
      return NextResponse.json({ ok: true, handled: false, type });
  }

  if (tier) {
    // Never downgrade an internal comp account from a billing event.
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
    // 500 makes PayPal retry, which is what we want for a transient DB error.
    console.error("[paypal] profile update failed:", error.message);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  console.log(`[paypal] ${type} applied for user ${userId} -> ${tier ?? "no tier change"}`);
  return NextResponse.json({ ok: true, handled: true });
}
