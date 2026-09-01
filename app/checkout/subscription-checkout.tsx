"use client";

import { useState } from "react";
import DiscountCode, { type AppliedDiscount } from "./discount-code";
import CheckoutButtons from "./checkout-buttons";

/**
 * Payment-panel content for a subscription checkout: the discount field, a
 * confirmation line once a code is applied, and the checkout button. Kept
 * entirely within the payment panel rather than also updating the order
 * summary card's price -- that card shows what the PLAN costs, which stays
 * true regardless of a one-time discount on this specific purchase, and
 * keeping this self-contained avoids syncing state across two separate Card
 * elements in different columns of the page.
 */
export default function SubscriptionCheckout({
  plan,
  regularPrice,
}: {
  plan: "voice" | "premium";
  /** Full monthly price, e.g. "19.00". */
  regularPrice: string;
}) {
  const [discount, setDiscount] = useState<AppliedDiscount | null>(null);

  return (
    <>
      {discount && (
        <p className="mb-4 text-sm text-secondary">
          Due today:{" "}
          <span className="font-mono font-semibold text-primary">
            ${discount.firstCyclePrice}
          </span>{" "}
          <span className="text-muted">
            (then ${regularPrice}/mo from your second month)
          </span>
        </p>
      )}

      <DiscountCode
        plan={plan}
        onApplied={setDiscount}
        onCleared={() => setDiscount(null)}
      />

      <div className="mt-4">
        <CheckoutButtons
          purchase={{ kind: "subscription", plan }}
          discountCode={discount?.code}
        />
      </div>
    </>
  );
}
