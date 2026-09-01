import { dodoClient, dodoConfigured } from "./client";
import { clampPackQuantity, dodoProductId, dodoVideoPackProductId } from "./products";
import { VIDEO_PACK_CREDITS } from "@/lib/tiers";
import { videoAvailable } from "@/lib/video/config";
import { getSiteUrl } from "@/lib/site-url";
import type { PaidPlan } from "@/lib/pricing";

/**
 * Shared Dodo checkout-session creation, used by both the API routes
 * (app/api/dodo/subscription, app/api/dodo/order -- kept for any
 * non-browser caller) and app/checkout/page.tsx, which calls these
 * directly server-side rather than round-tripping through its own API.
 *
 * Discount codes are no longer validated or redeemed here -- Dodo's
 * hosted checkout page collects the code itself (feature_flags:
 * allow_discount_code) and enforces its own usage_limit. LoopReady's
 * discount_codes table/RPCs still exist but are no longer read on this
 * path.
 */
export type CheckoutSessionResult =
  | { ok: true; checkoutUrl: string }
  | { ok: false; error: string; status: number };

export async function createSubscriptionCheckoutSession(params: {
  userId: string;
  email: string | null | undefined;
  plan: PaidPlan;
}): Promise<CheckoutSessionResult> {
  if (!dodoConfigured()) {
    return { ok: false, error: "Billing is not configured.", status: 501 };
  }

  const productId = dodoProductId(params.plan);
  if (!productId) {
    return { ok: false, error: `No Dodo product configured for ${params.plan}.`, status: 501 };
  }

  try {
    const client = dodoClient();
    const session = await client.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { email: params.email ?? "" },
      // Resolved by the webhook the same way custom_id resolves a PayPal
      // event -- see app/api/dodo/webhook/route.ts's resolveUserId.
      metadata: { app_user_id: params.userId, plan: params.plan },
      feature_flags: { allow_discount_code: true },
      return_url: `${getSiteUrl()}/billing?checkout=success`,
    });

    if (!session.checkout_url) {
      return { ok: false, error: "Checkout URL was not returned.", status: 502 };
    }

    console.log(
      `[dodo] checkout session ${session.session_id} created for user=${params.userId} plan=${params.plan}`
    );
    return { ok: true, checkoutUrl: session.checkout_url };
  } catch (e) {
    console.error("[dodo] subscription checkout create failed:", e);
    return { ok: false, error: "Could not start the subscription. Please try again.", status: 502 };
  }
}

export async function createVideoPackCheckoutSession(params: {
  userId: string;
  email: string | null | undefined;
  quantity: unknown;
}): Promise<CheckoutSessionResult> {
  const quantity = clampPackQuantity(params.quantity);

  if (!videoAvailable()) {
    return { ok: false, error: "Video interviews are not available right now.", status: 409 };
  }
  if (!dodoConfigured()) {
    return { ok: false, error: "Billing is not configured.", status: 501 };
  }

  const productId = dodoVideoPackProductId();
  if (!productId) {
    return { ok: false, error: "No Dodo product configured for the video pack.", status: 501 };
  }

  try {
    const client = dodoClient();
    const session = await client.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity }],
      customer: { email: params.email ?? "" },
      // Same fields the subscription session sets, plus quantity -- the
      // webhook grants (and, on refund, reverses) VIDEO_PACK_CREDITS *
      // quantity credits, so it has to survive round-trip through Dodo.
      metadata: {
        app_user_id: params.userId,
        purpose: "video-pack",
        quantity: String(quantity),
      },
      feature_flags: { allow_discount_code: true },
      return_url: `${getSiteUrl()}/billing?checkout=success`,
    });

    if (!session.checkout_url) {
      return { ok: false, error: "Checkout URL was not returned.", status: 502 };
    }

    console.log(
      `[dodo] checkout session ${session.session_id} created for user=${params.userId} ` +
        `video-pack x${quantity} (${VIDEO_PACK_CREDITS * quantity} credits)`
    );
    return { ok: true, checkoutUrl: session.checkout_url };
  } catch (e) {
    console.error("[dodo] order checkout create failed:", e);
    return { ok: false, error: "Could not start the purchase. Please try again.", status: 502 };
  }
}
