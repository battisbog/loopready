"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export default function CancelSubscription() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not cancel");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not cancel");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <div className="flex flex-col items-end">
        <Button variant="ghost" onClick={() => setConfirming(true)}>
          Cancel subscription
        </Button>
        {error && <p className="mt-1 text-xs text-error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-secondary">Cancel your plan?</span>
      <Button variant="danger" size="sm" onClick={cancel} disabled={busy}>
        {busy ? "Cancelling…" : "Yes, cancel"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(false)}
        disabled={busy}
      >
        Keep plan
      </Button>
    </div>
  );
}
