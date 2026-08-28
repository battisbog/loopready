"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Purchase =
  | { kind: "subscription"; plan: "voice" | "premium" }
  | { kind: "order"; product: "video-pack" };

/** Minimal shape of the bits of the PayPal SDK we use. */
interface PayPalSdk {
  Buttons: (opts: Record<string, unknown>) => {
    render: (target: HTMLElement) => Promise<void>;
    isEligible: () => boolean;
    close?: () => void;
  };
  /** Funding source constants, used to render each button on its own. */
  FUNDING: Record<string, string>;
}
declare global {
  interface Window {
    paypal?: PayPalSdk;
  }
}

function loadSdk(clientId: string, subscription: boolean): Promise<PayPalSdk> {
  return new Promise((resolve, reject) => {
    // Subscriptions and one-time orders need different SDK intents, so a
    // previously-loaded script for the other mode has to be replaced.
    const existing = document.querySelector<HTMLScriptElement>("script[data-paypal]");
    if (existing?.dataset.mode === (subscription ? "sub" : "order") && window.paypal) {
      return resolve(window.paypal);
    }
    existing?.remove();

    const params = new URLSearchParams({
      "client-id": clientId,
      currency: "USD",
      components: "buttons",
      ...(subscription
        ? { intent: "subscription", vault: "true" }
        : { intent: "capture" }),
    });

    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?${params.toString()}`;
    script.dataset.paypal = "true";
    script.dataset.mode = subscription ? "sub" : "order";
    script.onload = () =>
      window.paypal ? resolve(window.paypal) : reject(new Error("SDK missing"));
    script.onerror = () => reject(new Error("Could not load PayPal"));
    document.body.appendChild(script);
  });
}

export default function CheckoutButtons({
  clientId,
  purchase,
  discountCode,
}: {
  clientId: string;
  purchase: Purchase;
  /** Applied via /api/discount/check before rendering; re-validated and
   *  actually redeemed server-side when the subscription is created. */
  discountCode?: string;
}) {
  const router = useRouter();
  const paypalMount = useRef<HTMLDivElement>(null);
  const cardMount = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "working" | "error">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const isSubscription = purchase.kind === "subscription";

    /** Handlers are identical for every funding source. */
    const flow = isSubscription
      ? {
          createSubscription: async () => {
            const res = await fetch("/api/paypal/subscription", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                plan: (purchase as { plan: string }).plan,
                discountCode: discountCode || undefined,
              }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Could not start");
            return data.subscriptionId;
          },
          onApprove: async () => {
            setStatus("working");
            // The webhook grants the tier; this just moves the user on.
            router.push("/billing?checkout=success");
          },
        }
      : {
          createOrder: async () => {
            const res = await fetch("/api/paypal/order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                product: (purchase as { product: string }).product,
              }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Could not start");
            return data.orderId;
          },
          onApprove: async (data: { orderID: string }) => {
            setStatus("working");
            const res = await fetch("/api/paypal/order/capture", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: data.orderID }),
            });
            const body = await res.json();
            if (!res.ok) {
              setStatus("error");
              setError(body.error ?? "Payment could not be completed.");
              return;
            }
            router.push("/billing?checkout=success");
          },
        };

    const shared = {
      style: { shape: "rect", label: "pay", height: 45 } as Record<string, unknown>,
      ...flow,
      onCancel: () => {
        setStatus("ready");
        setError(null);
      },
      onError: (e: unknown) => {
        console.error("[paypal] button error:", e);
        setStatus("error");
        setError("Something went wrong with PayPal. You have not been charged.");
      },
    };

    loadSdk(clientId, isSubscription)
      .then(async (paypal) => {
        if (cancelled) return;

        /**
         * Each funding source is rendered on its own.
         *
         * layout:"vertical" puts every funding source inside ONE PayPal
         * iframe, and the spacing between them lives in PayPal's own DOM --
         * unreachable from our stylesheet, which is why tightening
         * .paypal-buttons did nothing. Naming a fundingSource renders exactly
         * one button per container, so the gap between them becomes ours.
         *
         * isEligible() is checked first because render() throws on an
         * ineligible source, and eligibility genuinely varies: the standalone
         * card button is not always offered for subscriptions. Skipping one
         * quietly is correct -- PayPal's own flow still takes cards for guests.
         */
        const targets = [
          { funding: paypal.FUNDING.PAYPAL, mount: paypalMount.current },
          { funding: paypal.FUNDING.CARD, mount: cardMount.current },
        ];

        let rendered = 0;
        for (const t of targets) {
          if (!t.mount || !t.funding) continue;
          t.mount.innerHTML = "";
          const button = paypal.Buttons({ ...shared, fundingSource: t.funding });
          if (!button.isEligible()) continue;
          try {
            await button.render(t.mount);
            rendered += 1;
          } catch {
            // One unavailable source must not take the whole checkout down.
          }
        }

        if (cancelled) return;
        if (rendered === 0) {
          setStatus("error");
          setError("PayPal could not display the payment options.");
          return;
        }
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
        setError("Could not load PayPal. Check your connection and retry.");
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, purchase, router, discountCode]);

  return (
    <div>
      {status === "loading" && (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-secondary">
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
          Loading payment options…
        </div>
      )}
      {status === "working" && (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-secondary">
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
          Confirming your payment…
        </div>
      )}

      {/* One container per funding source, so the spacing between the buttons
          is ours rather than PayPal's. Kept mounted: PayPal renders into these
          and re-rendering would tear them down. */}
      <div className={`space-y-2 ${status === "working" ? "hidden" : ""}`}>
        {/* overflow-hidden + a matching radius clips the corners of PayPal's
            iframe, whose background is opaque white. The button inside is
            rounded, so without this the square white box behind it shows
            through at each corner. Nothing inside the frame is stylable from
            here, so clipping from the outside is the only lever we have. */}
        <div ref={paypalMount} className="overflow-hidden rounded-md" />
        <div ref={cardMount} className="overflow-hidden rounded-md" />
      </div>

      {error && (
        <p className="mt-3 text-center text-sm text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
