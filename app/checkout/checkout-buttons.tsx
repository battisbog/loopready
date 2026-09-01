"use client";

import { useState } from "react";

type Purchase =
  | { kind: "subscription"; plan: "voice" | "premium" }
  | { kind: "order"; product: "video-pack"; quantity: number };

/**
 * Dodo's checkout is a hosted page, not an embedded SDK widget like
 * PayPal's -- this just asks our server for a checkout_url and redirects
 * the browser there. No client-side provider SDK, no funding-source
 * eligibility dance, no iframe styling workarounds.
 */
export default function CheckoutButtons({
  purchase,
  discountCode,
}: {
  purchase: Purchase;
  /** Applied via /api/discount/check before rendering; re-validated and
   *  actually redeemed server-side when the checkout session is created. */
  discountCode?: string;
}) {
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setStatus("working");
    setError(null);
    try {
      const isSubscription = purchase.kind === "subscription";
      const res = await fetch(
        isSubscription ? "/api/dodo/subscription" : "/api/dodo/order",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isSubscription
              ? { plan: purchase.plan, discountCode: discountCode || undefined }
              : { product: purchase.product, quantity: purchase.quantity }
          ),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) {
        setStatus("error");
        setError(data.error ?? "Could not start checkout.");
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setStatus("error");
      setError("Could not reach the payment provider. Please try again.");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={startCheckout}
        disabled={status === "working"}
        className="flex h-11 w-full items-center justify-center rounded-md bg-accent text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {status === "working" ? "Redirecting to checkout…" : "Continue to payment"}
      </button>

      {error && (
        <p className="mt-3 text-center text-sm text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
