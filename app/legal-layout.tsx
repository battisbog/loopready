import Link from "next/link";
import type { ReactNode } from "react";

/** Shared frame for Terms and Privacy. */
export default function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <Link
        href="/"
        className="text-xs text-muted transition-colors hover:text-secondary"
      >
        &larr; Back to LoopReady
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-primary">
        {title}
      </h1>
      <p className="mt-2 text-sm text-muted">Last updated: {updated}</p>

      <div className="mt-4 rounded-md border border-warn/30 bg-warn-muted p-5">
        <p className="text-sm leading-relaxed text-warn">
          This is a draft prepared for review. It has not been checked by a
          lawyer and should be reviewed before launch.
        </p>
      </div>

      <div className="legal mt-10 space-y-8">{children}</div>

      <footer className="mt-16 flex gap-6 border-t border-line pt-6 text-sm">
        <Link href="/terms" className="text-secondary hover:text-primary">
          Terms
        </Link>
        <Link href="/privacy" className="text-secondary hover:text-primary">
          Privacy
        </Link>
        <Link href="/" className="text-secondary hover:text-primary">
          Home
        </Link>
        <a
          href="mailto:support@loopready.io"
          className="text-secondary hover:text-primary"
        >
          Contact
        </a>
      </footer>
    </main>
  );
}

export function Clause({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-primary">{heading}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-secondary">
        {children}
      </div>
    </section>
  );
}
