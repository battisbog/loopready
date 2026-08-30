"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/shadcn/sidebar";

/**
 * Primary navigation. Every item here leads to a page with real, populated
 * content -- deliberately no Community/Forum/Leaderboard links, which would
 * be empty shells at launch and read as an unfinished product.
 */
const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: IconHome },
  { href: "/start", label: "Start interview", icon: IconPlay },
  { href: "/problems", label: "Problems", icon: IconBook },
  { href: "/history", label: "History", icon: IconClock },
  { href: "/feedback", label: "Feedback", icon: IconChat },
];

const FOOTER = [
  { href: "/billing", label: "Billing", icon: IconCard },
  { href: "/settings", label: "Settings", icon: IconGear },
];

/**
 * Two-letter monogram for whatever identity we can show.
 *
 * A real name splits on spaces ("Aryan Patil" -> "AP"); an email falls back to
 * the local part and its separators ("ada.lovelace@x" -> "AL"). Passing the
 * display label rather than always the email means the monogram matches the
 * name shown beside it instead of contradicting it.
 */
function initials(label?: string): string {
  if (!label) return "?";
  const base = label.includes("@") ? label.split("@")[0] : label;
  const parts = base.split(/[\s._-]+/).filter(Boolean);
  const monogram =
    parts.length > 1 ? parts[0][0] + parts[1][0] : base.slice(0, 2);
  return monogram.toUpperCase();
}

export interface SidebarCredits {
  /** Only shown when the video feature is actually reachable. */
  visible: boolean;
  remaining: number;
}

/**
 * Structural foundation is shadcn's Sidebar primitive
 * (components/ui/shadcn/sidebar.tsx, pulled from the registry, not
 * hand-rolled): active-state styling, the icon-collapsed rail, and the
 * mobile Sheet drawer all come from it rather than being reimplemented here.
 * This file supplies only OUR content -- nav items, the credits card, the
 * account block -- inside its Header/Content/Footer slots.
 */
export default function AppSidebar({
  email,
  name,
  credits,
}: {
  email?: string;
  /** Display name from the auth provider, when it gave us one. */
  name?: string;
  credits: SidebarCredits;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold tracking-tight text-primary"
        >
          <IconLogo className="h-5 w-5 shrink-0 text-accent" />
          <span className="group-data-[collapsible=icon]:hidden">
            LoopReady
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
                // /start covers the loop builder; treat any nested route as
                // active too, so mid-flow the item still reads as current.
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Everything below used to be its own separately-bordered block
          (credits card, then a bordered footer nav, then a bordered account
          card) stacked with hand-tuned margins -- three floating pieces, and
          on a short viewport the last one sat flush against the screen edge.
          SidebarFooter is one slot; SidebarSeparator is the primitive's own
          divider, so the whole footer now reads as one structure. */}
      <SidebarFooter>
        {credits.visible && (
          <div className="mb-1 rounded-md border border-sidebar-border bg-elevated px-3 py-2.5 group-data-[collapsible=icon]:hidden">
            <p className="text-xs text-muted">Video credits</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-lg font-semibold text-primary">
                {credits.remaining}
              </span>
              <Link
                href="/checkout?product=video-pack"
                className="rounded-md border border-line-strong px-2 py-1 text-xs font-medium text-secondary transition-colors hover:border-accent-border hover:text-accent"
              >
                Buy more
              </Link>
            </div>
          </div>
        )}

        <SidebarMenu>
          {FOOTER.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        <SidebarSeparator />

        {/* The one account entry: an avatar, the display identity, and sign
            out, as two menu rows sharing this group -- not two components
            (a top-nav AccountMenu and a sidebar account card) that could
            ever both render on the same page. */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={name ?? email}
              className="cursor-default hover:bg-transparent active:bg-transparent"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-xs font-semibold text-secondary">
                {initials(name ?? email)}
              </span>
              <span className="min-w-0 flex-1 truncate text-secondary" title={email}>
                {name ?? email ?? "Account"}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} tooltip="Log out">
              <IconLogout />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

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

function IconLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle
        cx="12"
        cy="12"
        r="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      />
    </svg>
  );
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

function IconBook({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <path d="M4 5.5a2 2 0 0 1 2-2h6v15H6a2 2 0 0 0-2 2v-15Z" />
      <path d="M20 5.5a2 2 0 0 0-2-2h-6v15h6a2 2 0 0 1 2 2v-15Z" />
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

function IconCard({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function IconGear({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2M12 18.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M3.5 12h2M18.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function IconLogout({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}
