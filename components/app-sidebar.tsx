"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

/**
 * Primary navigation. Every item here leads to a page with real, populated
 * content -- deliberately no Community/Forum/Leaderboard links, which would
 * be empty shells at launch and read as an unfinished product.
 */
const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: IconHome },
  { href: "/start", label: "Start interview", icon: IconPlay },
  { href: "/history", label: "History", icon: IconClock },
  { href: "/feedback", label: "Feedback", icon: IconChat },
];

const FOOTER = [
  { href: "/billing", label: "Billing" },
  { href: "/settings", label: "Settings" },
];

function initials(email?: string): string {
  if (!email) return "?";
  const name = email.split("@")[0];
  const parts = name.split(/[._-]/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
}

export interface SidebarCredits {
  /** Only shown when the video feature is actually reachable. */
  visible: boolean;
  remaining: number;
}

function SidebarContent({
  email,
  credits,
  onNavigate,
}: {
  email?: string;
  credits: SidebarCredits;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="px-4 pb-2 pt-5 text-sm font-semibold tracking-tight text-primary"
      >
        LoopReady
      </Link>

      <nav className="mt-4 flex-1 space-y-0.5 px-2">
        {NAV.map((item) => {
          // /start covers the loop builder; treat any nested route as active
          // too, so mid-flow the item still reads as the current section.
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-accent-muted text-accent"
                  : "text-secondary hover:bg-elevated hover:text-primary"
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Credits: a persistent balance, not something you only discover after
          being blocked. Read server-side, display only -- purchasing happens
          on the checkout page this links to. */}
      {credits.visible && (
        <div className="mx-2 mb-3 rounded-md border border-line bg-elevated px-3 py-2.5">
          <p className="text-xs text-muted">Video credits</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="text-lg font-semibold text-primary">
              {credits.remaining}
            </span>
            <Link
              href="/checkout?product=video-pack"
              onClick={onNavigate}
              className="rounded-md border border-line-strong px-2 py-1 text-xs font-medium text-secondary transition-colors hover:border-accent-border hover:text-accent"
            >
              Buy more
            </Link>
          </div>
        </div>
      )}

      <div className="border-t border-line px-2 py-2">
        {FOOTER.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "block rounded-md px-3 py-1.5 text-sm transition-colors",
                active
                  ? "bg-elevated text-primary"
                  : "text-secondary hover:bg-elevated hover:text-primary"
              )}
            >
              {item.label}
            </Link>
          );
        })}

        <div className="mt-1 overflow-hidden rounded-md border border-line bg-elevated">
          {/* Avatar sized and styled to match AccountMenu's original top-nav
              avatar (h-8 w-8, text-xs), so the two do not look like different
              components. min-w-0 on both this row and the email span is what
              actually makes the truncate take effect inside a flex row. */}
          <div className="flex min-w-0 items-center gap-2.5 px-3 py-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-xs font-semibold text-secondary">
              {initials(email)}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-secondary" title={email}>
              {email ?? "Account"}
            </span>
          </div>
          <button
            onClick={signOut}
            className="block w-full border-t border-line px-3 py-2 text-left text-sm text-secondary transition-colors hover:bg-surface hover:text-primary"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}

// Spelled out as literal class names, not derived, because Tailwind's build-
// time scanner only picks up classes it can see as plain strings in source --
// a computed `\`pl-\${SIDEBAR_WIDTH...}\`\` would never actually be generated.
const SIDEBAR_WIDTH = "w-60";
const SIDEBAR_CONTENT_PADDING = "lg:pl-60";

/**
 * The sidebar itself, plus the mobile hamburger + slide-out drawer.
 *
 * Desktop (lg+): a fixed rail, always visible, compact rather than a wide
 * empty gutter. Mobile: hidden by default behind a hamburger, opening as a
 * slide-out drawer over a backdrop -- collapsing it entirely rather than
 * squeezing a rail onto a small screen.
 */
export default function AppSidebar({
  email,
  credits,
}: {
  email?: string;
  credits: SidebarCredits;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-base/85 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/dashboard" className="text-sm font-semibold text-primary">
          LoopReady
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-secondary transition-colors hover:border-line-strong hover:text-primary"
        >
          <IconMenu className="h-5 w-5" />
        </button>
      </div>

      {/* Desktop rail */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-line bg-surface lg:block",
          SIDEBAR_WIDTH
        )}
      >
        <SidebarContent email={email} credits={credits} />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60"
          />
          <aside
            className={cn(
              "absolute inset-y-0 left-0 border-r border-line bg-surface shadow-[var(--shadow-lg)]",
              SIDEBAR_WIDTH
            )}
          >
            <SidebarContent
              email={email}
              credits={credits}
              onNavigate={() => setOpen(false)}
            />
          </aside>
        </div>
      )}
    </>
  );
}

export { SIDEBAR_WIDTH, SIDEBAR_CONTENT_PADDING };

// ---------------------------------------------------------------- icons
// Minimal inline outline icons. No icon library is introduced.

function iconProps(className?: string) {
  return {
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
}

function IconHome({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

function IconPlay({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5v7l6-3.5-6-3.5Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconClock({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.5l3.5 2" />
    </svg>
  );
}

function IconChat({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <path d="M4 5.5h16v10H8.5L4 19V5.5Z" />
    </svg>
  );
}

function IconMenu({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <path d="M4 6.5h16M4 12h16M4 17.5h16" />
    </svg>
  );
}

