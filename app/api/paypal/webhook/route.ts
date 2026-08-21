import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { paypalFetch } from "@/lib/paypal/client";
import {
  PREMIUM_VIDEO_ALLOWANCE,
  VIDEO_PACK_CREDITS,
  type Tier,
} from "@/lib/tiers";

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
type Purpose = "premium" | "voice" | "video-pack" | null;

/**
 * custom_id is written as `<userId>` or `<userId>:<purpose>` at checkout, so a
 * single webhook can tell a Premium subscription from a one-time video pack.
 */
function splitCustomId(raw: string): { userId: string; purpose: Purpose } {
  const [userId, purpose] = raw.split(":");
  const known: Purpose[] = ["premium", "voice", "video-pack"];
  return {
    userId,
    purpose: known.includes(purpose as Purpose) ? (purpose as Purpose) : null,
  };
}

async function resolveUserId(
  admin: ReturnType<typeof createAdminClient>,
  resource: Record<string, unknown>
): Promise<{ userId: string | null; purpose: Purpose }> {
  const custom =
    (resource.custom_id as string | undefined) ??
    (resource.custom as string | undefined) ??
    ((resource.purchase_units as { custom_id?: string }[] | undefined)?.[0]
      ?.custom_id as string | undefined);
  if (custom) {
    const parsed = splitCustomId(custom);
    return { userId: parsed.userId || null, purpose: parsed.purpose };
  }

  const subscriptionId =
    (resource.id as string | undefined) ??
    (resource.billing_agreement_id as string | undefined);
  if (subscriptionId) {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("paypal_subscription_id", subscriptionId)
      .maybeSingle();
    if (data?.id) return { userId: data.id, purpose: null };
  }
  return { userId: null, purpose: null };
}

/** Period end from a subscription resource, used as the credit reset date. */
function periodEnd(resource: Record<string, unknown>): string | null {
  const billing = resource.billing_info as
    | { next_billing_time?: string }
    | undefined;
  return billing?.next_billing_time ?? null;
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
  const { userId, purpose } = await resolveUserId(admin, resource);

  if (!userId) {
    // Acknowledge so PayPal stops retrying, but record it: this means a
    // checkout was created without a custom_id.
    console.error(`[paypal] ${type}: could not map event to a user`);
    return NextResponse.json({ ok: true, mapped: false });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  let tier: Tier | null = null;
  // Video credits are written through an RPC (atomic + audited), not this patch.
  let credits:
    | { mode: "set" | "add"; amount: number; reset: string | null; detail: string }
    | null = null;

  switch (type) {
    // --- Subscriptions (Voice) ---
    case "BILLING.SUBSCRIPTION.ACTIVATED":
    case "BILLING.SUBSCRIPTION.RE-ACTIVATED": {
      const isPremium = purpose === "premium";
      tier = isPremium ? "premium" : "voice";
      patch.subscription_status = "ACTIVE";
      patch.paypal_subscription_id = resource.id;
      if (isPremium) {
        credits = {
          mode: "set",
          amount: PREMIUM_VIDEO_ALLOWANCE,
          reset: periodEnd(resource),
          detail: `${type} premium allowance`,
        };
      }
      break;
    }
    case "BILLING.SUBSCRIPTION.UPDATED": {
      const status = String(resource.status ?? "");
      patch.subscription_status = status || "ACTIVE";
      patch.paypal_subscription_id = resource.id;
      const active = status === "ACTIVE" || status === "";
      // Only an active subscription keeps the paid tier.
      tier = active ? (purpose === "premium" ? "premium" : "voice") : "free";
      if (!active) {
        credits = { mode: "set", amount: 0, reset: null, detail: type };
      }
      break;
    }
    /**
     * A failed charge is NOT the end of a subscription.
     *
     * PayPal retries a failed payment several times over days before it gives
     * up and sends CANCELLED or EXPIRED. Downgrading on the first failure would
     * strip a paying customer's access over an expired card that they fix an
     * hour later, and would delete their video credits with it.
     *
     * So this marks them past_due and changes nothing else. Access continues.
     * The real downgrade happens below, when PayPal confirms the subscription
     * is actually over.
     */
    case "BILLING.SUBSCRIPTION.PAYMENT.FAILED": {
      patch.subscription_status = "PAST_DUE";
      console.warn(
        `[paypal] payment failed for user=${userId}, marked past_due (access retained)`
      );
      break;
    }

    // Genuinely over: PayPal has stopped trying, or the user cancelled.
    case "BILLING.SUBSCRIPTION.CANCELLED":
    case "BILLING.SUBSCRIPTION.EXPIRED":
    case "BILLING.SUBSCRIPTION.SUSPENDED": {
      tier = "free";
      patch.subscription_status = type.split(".").pop();
      // Losing the subscription loses the plan allowance.
      credits = { mode: "set", amount: 0, reset: null, detail: type };
      break;
    }
    // Renewal payments: keep the subscription alive.
    case "PAYMENT.SALE.COMPLETED": {
      if (resource.billing_agreement_id) {
        patch.subscription_status = "ACTIVE";
        // A renewal payment refreshes the cycle. Read the stored tier rather
        // than assuming: this event carries no plan information.
        const { data: prof } = await admin
          .from("profiles")
          .select("subscription_tier, video_plan_allowance")
          .eq("id", userId)
          .maybeSingle();
        const existing = prof?.subscription_tier;
        tier = existing === "premium" ? "premium" : "voice";
        const allowance = Number(prof?.video_plan_allowance ?? 0);
        if (allowance > 0) {
          // Plan credits do not roll over: reset, never accumulate.
          credits = {
            mode: "set",
            amount: allowance,
            reset: null,
            detail: "renewal reset",
          };
        }
      }
      break;
    }
    // --- One-time purchase (Premium) ---
    case "PAYMENT.CAPTURE.COMPLETED":
    case "CHECKOUT.ORDER.COMPLETED": {
      patch.paypal_order_id = resource.id;
      if (purpose === "video-pack") {
        // A pack tops up on TOP of whatever is left; it never sets the tier.
        credits = {
          mode: "add",
          amount: VIDEO_PACK_CREDITS,
          reset: null,
          detail: "video pack purchase",
        };
      } else {
        tier = "premium";
        patch.subscription_status = "COMPLETED";
        credits = {
          mode: "set",
          amount: PREMIUM_VIDEO_ALLOWANCE,
          reset: null,
          detail: "premium purchase",
        };
      }
      break;
    }
    case "PAYMENT.CAPTURE.REFUNDED":
    case "PAYMENT.CAPTURE.REVERSED": {
      if (purpose === "video-pack") {
        // Refunding a pack removes the credits it granted, floored at zero.
        credits = {
          mode: "add",
          amount: -VIDEO_PACK_CREDITS,
          reset: null,
          detail: "video pack refunded",
        };
      } else {
        tier = "free";
        patch.subscription_status = "REFUNDED";
        credits = { mode: "set", amount: 0, reset: null, detail: type };
      }
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

  if (credits) {
    const { data: current } = await admin
      .from("profiles")
      .select("subscription_tier")
      .eq("id", userId)
      .maybeSingle();
    if (current?.subscription_tier === "unlimited") {
      console.log(`[paypal] ${type}: skipped credit change for comp account`);
    } else {
      const { error: creditError } = await admin.rpc("grant_video_credits", {
        p_user: userId,
        p_allowance: credits.amount,
        p_reset: credits.reset,
        p_mode: credits.mode,
        p_detail: credits.detail,
      });
      if (creditError) {
        console.error("[paypal] credit grant failed:", creditError.message);
        return NextResponse.json({ error: "Credit update failed" }, { status: 500 });
      }
    }
  }

  console.log(
    `[paypal] ${type} applied for ${userId} -> tier=${tier ?? "unchanged"} credits=${
      credits ? `${credits.mode} ${credits.amount}` : "unchanged"
    }`
  );
  return NextResponse.json({ ok: true, handled: true });
}
