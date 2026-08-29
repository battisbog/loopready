import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { paypalConfigured, paypalFetch } from "@/lib/paypal/client";
import { PRICING } from "@/lib/pricing";
import { VIDEO_PACK_CREDITS } from "@/lib/tiers";
import { checkIpRateLimit, checkRateLimit } from "@/lib/rate-limit";
import { videoAvailable } from "@/lib/video/config";

export const maxDuration = 30;

/** One-time purchase (video credit pack). Amount is fixed server-side. */
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

  const { product, quantity: rawQuantity } = await request
    .json()
    .catch(() => ({}));
  if (product !== "video-pack") {
    return NextResponse.json({ error: "Unknown product" }, { status: 400 });
  }
  // Clamped and re-derived from the raw input server-side -- the client's
  // displayed price/credits are just a preview, never trusted for the charge.
  const quantity = Math.min(10, Math.max(1, Math.round(Number(rawQuantity)) || 1));
  // Never take money for a switched-off feature. Every "Buy more" entry point
  // is tier-blind, so this is the one place that can refuse the sale.
  if (!videoAvailable()) {
    return NextResponse.json(
      { error: "Video interviews are not available right now." },
      { status: 409 }
    );
  }
  if (!paypalConfigured()) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 501 });
  }

  try {
    const order = await paypalFetch<{ id: string }>("/v2/checkout/orders", {
      method: "POST",
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            // Same mechanism the webhook already uses to map a payment; the
            // trailing segment is how many packs this order is for, so the
            // webhook grants (and, on refund, reverses) the right multiple.
            custom_id: `${user.id}:video-pack:${quantity}`,
            description: `${VIDEO_PACK_CREDITS * quantity} video interview credits (${quantity} pack${quantity === 1 ? "" : "s"})`,
            amount: {
              currency_code: PRICING.videoPack.currency,
              value: (Number(PRICING.videoPack.amount) * quantity).toFixed(2),
            },
          },
        ],
        application_context: {
          brand_name: "LoopReady",
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
        },
      }),
    });
    return NextResponse.json({ orderId: order.id });
  } catch (e) {
    console.error("[paypal] order create failed:", e);
    return NextResponse.json(
      { error: "Could not start the purchase. Please try again." },
      { status: 502 }
    );
  }
}
