/** Route-level loading state so navigation never shows a blank screen. */
export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-secondary">
        <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
        Loading…
      </div>
    </main>
  );
}
