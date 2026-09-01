import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createVideoPackCheckoutSession } from "@/lib/dodo/checkout";
import { checkIpRateLimit, checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 30;

/**
 * Dodo mirror of app/api/paypal/order/route.ts -- one-time video-pack
 * purchase.
 *
 * app/checkout/page.tsx calls createVideoPackCheckoutSession directly
 * server-side rather than fetching this route -- this endpoint is kept for
 * any non-browser caller. Quantity is clamped server-side inside that
 * shared function: the client's displayed price/credit count is a preview
 * only, never trusted for the actual charge.
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

  const { product, quantity } = await request.json().catch(() => ({}));
  if (product !== "video-pack") {
    return NextResponse.json({ error: "Unknown product" }, { status: 400 });
  }

  const result = await createVideoPackCheckoutSession({
    userId: user.id,
    email: user.email,
    quantity,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ checkoutUrl: result.checkoutUrl });
}
