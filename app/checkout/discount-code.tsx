"use client";

import { useState } from "react";
import { Button, Field, Input } from "@/components/ui";

export interface AppliedDiscount {
  code: string;
  amountOff: number | null;
  percentOff: number | null;
  firstCyclePrice: string;
}

/**
 * Discount code input for the subscription checkout panel.
 *
 * Calling /api/discount/check here is a pure read -- it never redeems the
 * code -- so typing a wrong or already-used code costs the visitor nothing.
 * The actual one-time-use redemption happens later, server-side, when
 * CheckoutButtons creates the PayPal subscription with this same code.
 */
export default function DiscountCode({
  plan,
  onApplied,
  onCleared,
}: {
  plan: "voice" | "premium";
  onApplied: (discount: AppliedDiscount) => void;
  onCleared: () => void;
}) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "applied" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function apply() {
    const trimmed = code.trim();
    if (!trimmed) return;
    setStatus("checking");
    setMessage(null);
    try {
      const res = await fetch("/api/discount/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed, plan }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setStatus("error");
        setMessage(data.error ?? "That code isn't valid.");
        onCleared();
        return;
      }
      setStatus("applied");
      const off =
        data.percentOff != null ? `${data.percentOff}% off` : `$${data.amountOff} off`;
      setMessage(`Code applied — ${off}, $${data.firstCyclePrice} for your first month.`);
      onApplied({
        code: trimmed,
        amountOff: data.amountOff ?? null,
        percentOff: data.percentOff ?? null,
        firstCyclePrice: data.firstCyclePrice,
      });
    } catch {
      setStatus("error");
      setMessage("Couldn't check that code. Try again.");
      onCleared();
    }
  }

  function clear() {
    setCode("");
    setStatus("idle");
    setMessage(null);
    onCleared();
  }

  return (
    <div className="border-t border-line pt-5">
      {status === "applied" ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-success">{message}</p>
          <button
            type="button"
            onClick={clear}
            className="shrink-0 text-xs text-muted underline underline-offset-2 hover:text-secondary"
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <Field label="Discount code" className="flex-1">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), apply())}
              placeholder="Enter code"
              autoCapitalize="characters"
            />
          </Field>
          <Button
            type="button"
            variant="secondary"
            onClick={apply}
            disabled={!code.trim() || status === "checking"}
          >
            {status === "checking" ? "Checking…" : "Apply"}
          </Button>
        </div>
      )}
      {status === "error" && message && (
        <p className="mt-1.5 text-xs text-error">{message}</p>
      )}
    </div>
  );
}
