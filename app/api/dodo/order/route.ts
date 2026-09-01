import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dodoClient, dodoConfigured } from "@/lib/dodo/client";
import { clampPackQuantity, dodoVideoPackProductId } from "@/lib/dodo/products";
import { VIDEO_PACK_CREDITS } from "@/lib/tiers";
import { checkIpRateLimit, checkRateLimit } from "@/lib/rate-limit";
import { videoAvailable } from "@/lib/video/config";
import { getSiteUrl } from "@/lib/site-url";

export const maxDuration = 30;

/**
 * Dodo mirror of app/api/paypal/order/route.ts -- one-time video-pack
 * purchase. NOT wired into any live checkout UI yet; see
 * lib/dodo/client.ts's top comment.
 *
 * Quantity is clamped server-side exactly like the PayPal route: the
 * client's displayed price/credit count is a preview only, never trusted
 * for the actual charge. The Dodo product's unit price is set once in the
 * Dodo dashboard and must match PRICING.videoPack -- Checkout Sessions bill
 * unit_price * quantity via product_cart, so quantity alone is enough to
 * charge the right total.
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

  const { product, quantity: rawQuantity } = await request
    .json()
    .catch(() => ({}));
  if (product !== "video-pack") {
    return NextResponse.json({ error: "Unknown product" }, { status: 400 });
  }
  const quantity = clampPackQuantity(rawQuantity);

  if (!videoAvailable()) {
    return NextResponse.json(
      { error: "Video interviews are not available right now." },
      { status: 409 }
    );
  }
  if (!dodoConfigured()) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 501 });
  }

  const productId = dodoVideoPackProductId();
  if (!productId) {
    return NextResponse.json(
      { error: "No Dodo product configured for the video pack." },
      { status: 501 }
    );
  }

  try {
    const client = dodoClient();
    const session = await client.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity }],
      customer: { email: user.email ?? "" },
      // Same fields the subscription route sets, plus quantity -- the
      // webhook grants (and, on refund, reverses) VIDEO_PACK_CREDITS *
      // quantity credits, so it has to survive round-trip through Dodo.
      metadata: {
        app_user_id: user.id,
        purpose: "video-pack",
        quantity: String(quantity),
      },
      return_url: `${getSiteUrl()}/billing?checkout=success`,
    });

    if (!session.checkout_url) {
      return NextResponse.json(
        { error: "Checkout URL was not returned." },
        { status: 502 }
      );
    }

    console.log(
      `[dodo] checkout session ${session.session_id} created for user=${user.id} ` +
        `video-pack x${quantity} (${VIDEO_PACK_CREDITS * quantity} credits)`
    );

    return NextResponse.json({ checkoutUrl: session.checkout_url });
  } catch (e) {
    console.error("[dodo] order checkout create failed:", e);
    return NextResponse.json(
      { error: "Could not start the purchase. Please try again." },
      { status: 502 }
    );
  }
}
