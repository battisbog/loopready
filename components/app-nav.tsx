"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import AccountMenu from "./account-menu";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/start", label: "Start interview" },
];

/** Navigation for signed-in app pages. Distinct from the marketing nav. */
export default function AppNav({ email }: { email?: string }) {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 border-b border-line bg-base/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-semibold tracking-tight text-primary"
          >
            <Logo />
            LoopReady
          </Link>
          <div className="hidden items-center gap-1 sm:flex">
            {LINKS.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "rounded-sm px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-elevated text-primary"
                      : "text-secondary hover:text-primary"
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
        </div>

        <AccountMenu email={email} />
      </div>

      {/* Compact links on mobile */}
      <div className="flex gap-1 border-t border-line px-4 py-2 sm:hidden">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "rounded-sm px-3 py-1.5 text-sm transition-colors",
              pathname === l.href
                ? "bg-elevated text-primary"
                : "text-secondary"
            )}
          >
            {l.label}
          </Link>
        ))}
      </div>
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
