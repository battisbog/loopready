"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#rounds", label: "Rounds" },
  { href: "#calibration", label: "Calibration" },
  { href: "#feedback", label: "Feedback" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export default function Nav({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  // Transparent at the top of the page so the hero's ambient glow shows
  // through behind it; a tinted, blurred bar appears only once the page has
  // actually scrolled, which is also when a scroll boundary starts being
  // useful rather than just a seam sitting on top of the glow.
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={cn(
        "sticky top-0 z-50 transition-colors duration-300",
        scrolled
          ? "border-b border-line bg-base/85 backdrop-blur"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <Logo />
          LoopReady
        </Link>

        <div className="hidden items-center gap-7 lg:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-secondary transition-colors hover:text-primary"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={signedIn ? "/dashboard" : "/login"}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-primary"
          >
            {signedIn ? "Dashboard" : "Sign in"}
          </Link>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="rounded-md border border-line p-2 text-secondary lg:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
            >
              {open ? (
                <path d="M18 6 6 18M6 6l12 12" />
              ) : (
                <path d="M3 6h18M3 12h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-base lg:hidden">
          <div className="mx-auto flex w-full max-w-6xl flex-col px-6 py-2">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="border-b border-line/70 py-3 text-sm text-secondary last:border-0"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        d="M12 3a9 9 0 1 0 9 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="text-accent"
      />
      <circle cx="12" cy="12" r="3" className="fill-accent" />
    </svg>
  );
}
