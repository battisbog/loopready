import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Badge as ShadcnBadge } from "@/components/ui/shadcn/badge";

export type BadgeTone =
  | "neutral"
  | "accent"
  | "success"
  | "warn"
  | "error"
  | "outline";

/** Maps an interview verdict to its tone. */
export const SIGNAL_TONE: Record<string, BadgeTone> = {
  hire: "success",
  borderline: "warn",
  "no-hire": "error",
};

/**
 * Thin wrapper around the real shadcn Badge (components/ui/shadcn/badge.tsx)
 * -- every call site across the app keeps using the "tone" prop this file
 * has always had, but the rendering, variant resolution, and base classes
 * (rounded-full pill, focus ring, disabled state) now come from the actual
 * cva-based primitive instead of a hand-rolled span.
 */
export function Badge({
  children,
  tone = "neutral",
  className,
  dot,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <ShadcnBadge
      variant={tone === "outline" ? "outline" : tone}
      className={cn("gap-1.5 px-2.5 py-0.5 text-xs font-medium", className)}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </ShadcnBadge>
  );
}
