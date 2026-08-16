import Link from "next/link";
import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-sm text-accent">404</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-primary">
        This page doesn&rsquo;t exist
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-secondary">
        The link may be broken, or the page may have moved.
      </p>
      <div className="mt-6 flex gap-3">
        <Button href="/dashboard">Go to dashboard</Button>
        <Button href="/" variant="secondary">
          Home
        </Button>
      </div>
    </main>
  );
}
