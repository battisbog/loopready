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
    close?: () => void;
  };
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
}: {
  clientId: string;
  purchase: Purchase;
}) {
  const router = useRouter();
  const mount = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "working" | "error">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const isSubscription = purchase.kind === "subscription";

    loadSdk(clientId, isSubscription)
      .then((paypal) => {
        if (cancelled || !mount.current) return;
        mount.current.innerHTML = "";

        paypal
          .Buttons({
            style: { layout: "vertical", shape: "rect", label: "pay", height: 45 },

            // Both flows create the object on OUR server, so the plan id,
            // amount and custom_id can never be set by the browser.
            ...(isSubscription
              ? {
                  createSubscription: async () => {
                    const res = await fetch("/api/paypal/subscription", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ plan: purchase.plan }),
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
                      body: JSON.stringify({ product: purchase.product }),
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
                }),

            onCancel: () => {
              setStatus("ready");
              setError(null);
            },
            onError: (e: unknown) => {
              console.error("[paypal] button error:", e);
              setStatus("error");
              setError(
                "Something went wrong with PayPal. You have not been charged."
              );
            },
          })
          .render(mount.current)
          .then(() => !cancelled && setStatus("ready"))
          .catch(() => {
            if (cancelled) return;
            setStatus("error");
            setError("PayPal could not display the payment options.");
          });
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
        setError("Could not load PayPal. Check your connection and retry.");
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, purchase, router]);

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

      {/* Kept mounted: PayPal renders into it and re-rendering would tear it down. */}
      <div ref={mount} className={status === "working" ? "hidden" : ""} />

      {error && (
        <p className="mt-3 text-center text-sm text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
