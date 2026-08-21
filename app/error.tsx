"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";

/** Catches render/data errors anywhere in the app instead of a blank screen. */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] unhandled error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-primary">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-secondary">
        This one is on us. Try again, and if it keeps happening email us at{" "}
        <a
          href={`mailto:support@loopready.io?subject=${encodeURIComponent(
            "LoopReady error" + (error.digest ? ` (ref ${error.digest})` : "")
          )}`}
          className="text-accent underline underline-offset-2"
        >
          support@loopready.io
        </a>
        .
      </p>
      {error.digest && (
        // Prefilled into the mail subject above too: a report without this is
        // far harder to trace.
        <p className="mt-3 font-mono text-xs text-muted">ref: {error.digest}</p>
      )}
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button href="/dashboard" variant="secondary">
          Dashboard
        </Button>
      </div>
    </main>
  );
}
