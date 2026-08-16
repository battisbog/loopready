"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/settings", label: "Settings" },
  { href: "/billing", label: "Billing & Plan" },
];

function initials(email?: string): string {
  if (!email) return "?";
  const name = email.split("@")[0];
  const parts = name.split(/[._-]/).filter(Boolean);
  return (parts.length > 1
    ? parts[0][0] + parts[1][0]
    : name.slice(0, 2)
  ).toUpperCase();
}

/** Avatar dropdown shown on every signed-in page. */
export default function AccountMenu({ email }: { email?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-elevated text-xs font-semibold text-secondary transition-colors hover:border-line-strong hover:text-primary"
      >
        {initials(email)}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-md border border-line bg-surface shadow-[var(--shadow-lg)]"
        >
          {email && (
            <div className="border-b border-line px-3 py-2.5">
              <p className="truncate text-xs text-muted">Signed in as</p>
              <p className="truncate text-sm text-primary">{email}</p>
            </div>
          )}
          {ITEMS.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-secondary transition-colors hover:bg-elevated hover:text-primary"
            >
              {i.label}
            </Link>
          ))}
          <button
            role="menuitem"
            onClick={signOut}
            className="block w-full border-t border-line px-3 py-2 text-left text-sm text-secondary transition-colors hover:bg-elevated hover:text-primary"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
