"use client";

import { useState } from "react";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { Button as ShadcnButton } from "@/components/ui/shadcn/button";
import CheckoutButtons from "./checkout-buttons";

const MIN_QUANTITY = 1;
// Matches the server-side clamp in /api/paypal/order and the webhook's
// custom_id parser -- the client can't buy more than the server will charge.
const MAX_QUANTITY = 10;

/** "$19" for one, "$38" for two -- same trailing-".00" strip as lib/pricing's money(). */
function formatUsd(amount: number): string {
  return `$${amount % 1 === 0 ? amount : amount.toFixed(2)}`;
}

export default function VideoPackCheckout({
  clientId,
  configured,
  unitPrice,
  creditsPerPack,
}: {
  clientId: string;
  configured: boolean;
  /** "19.00", from PRICING.videoPack.amount. */
  unitPrice: string;
  creditsPerPack: number;
}) {
  const [quantity, setQuantity] = useState(1);
  const unit = Number(unitPrice);
  const total = formatUsd(unit * quantity);
  const totalCredits = creditsPerPack * quantity;

  return (
    <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Order summary
        </p>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-primary">
              Video interview credits
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-secondary">
              {totalCredits} video interview{totalCredits === 1 ? "" : "s"},
              added instantly. Credits never expire.
            </p>
          </div>
          <Badge tone="accent">{total}</Badge>
        </div>

        {/* Quantity -- each pack is {creditsPerPack} credits for {unitPrice};
            the stepper multiplies packs, not individual credits, so the
            price always lines up with a whole number of packs. */}
        <div className="mt-5 flex items-center justify-between rounded-lg border border-line bg-elevated px-4 py-3">
          <div>
            <p className="text-sm font-medium text-primary">
              {quantity} pack{quantity === 1 ? "" : "s"}
            </p>
            <p className="text-xs text-muted">
              {creditsPerPack} credits per pack &middot; {formatUsd(unit)} each
            </p>
          </div>
          <div className="flex items-center gap-1">
            <ShadcnButton
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="One fewer pack"
              onClick={() => setQuantity((q) => Math.max(MIN_QUANTITY, q - 1))}
              disabled={quantity <= MIN_QUANTITY}
            >
              <Minus size={14} />
            </ShadcnButton>
            <span className="w-6 text-center font-mono text-sm text-primary">
              {quantity}
            </span>
            <ShadcnButton
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="One more pack"
              onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
              disabled={quantity >= MAX_QUANTITY}
            >
              <Plus size={14} />
            </ShadcnButton>
          </div>
        </div>

        <ul className="mt-5 space-y-2.5">
          {[
            `${totalCredits} video interview${totalCredits === 1 ? "" : "s"}`,
            "Added on top of any plan credits",
            "One-time payment, no subscription",
          ].map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm text-secondary">
              <span className="mt-0.5 shrink-0 text-accent" aria-hidden>
                &#10003;
              </span>
              {f}
            </li>
          ))}
        </ul>

        {/* The number actually being charged today, stated plainly. */}
        <div className="mt-6 space-y-2 border-t border-line pt-5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-secondary">
              Video interview credits &times; {quantity}
            </span>
            <span className="font-mono text-secondary">{total}</span>
          </div>
          <div className="flex items-baseline justify-between border-t border-line pt-3">
            <span className="text-sm font-medium text-primary">Due today</span>
            <span className="font-mono text-xl font-semibold text-primary">
              {total}
            </span>
          </div>
          <p className="pt-1 text-xs leading-relaxed text-muted">
            One-time payment. Credits never expire and do not renew.
          </p>
        </div>
      </Card>

      <div className="lg:sticky lg:top-8">
        <Card>
          {!configured ? (
            <div className="py-2 text-center">
              <p className="text-sm font-medium text-warn">
                Payments aren&rsquo;t configured on this environment yet.
              </p>
              <Link
                href="/dashboard"
                className="mt-3 inline-block text-sm text-accent hover:underline"
              >
                Back to dashboard
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-primary">Pay with PayPal</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Use a PayPal balance or any debit or credit card.
              </p>
              <div className="mt-4">
                <CheckoutButtons
                  clientId={clientId}
                  purchase={{ kind: "order", product: "video-pack", quantity }}
                />
              </div>
            </>
          )}
        </Card>

        <ul className="mt-4 space-y-2.5 px-1">
          {[
            "Card details go to PayPal, never to LoopReady",
            "Credits are added to your account immediately",
            "Access unlocks the moment payment clears",
          ].map((t) => (
            <li
              key={t}
              className="flex items-start gap-2.5 text-xs leading-relaxed text-muted"
            >
              <span className="mt-0.5 shrink-0 text-accent" aria-hidden>
                &#10003;
              </span>
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
