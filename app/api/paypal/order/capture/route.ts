import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { paypalFetch } from "@/lib/paypal/client";

export const maxDuration = 30;

/**
 * Captures an approved one-time order.
 *
 * Credits are NOT granted here: PAYMENT.CAPTURE.COMPLETED arrives at the
 * webhook, which remains the only writer of entitlements. This just takes the
 * money and reports success to the UI.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId } = await request.json().catch(() => ({}));
  if (!orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }

  try {
    const result = await paypalFetch<{ status: string }>(
      `/v2/checkout/orders/${orderId}/capture`,
      { method: "POST" }
    );
    return NextResponse.json({ ok: true, status: result.status });
  } catch (e) {
    console.error("[paypal] capture failed:", e);
    return NextResponse.json(
      { error: "Payment could not be completed." },
      { status: 502 }
    );
  }
}
