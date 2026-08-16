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
        This one is on us. Try again, and if it keeps happening let us know.
      </p>
      {error.digest && (
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
