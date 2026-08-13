import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone =
  | "neutral"
  | "accent"
  | "success"
  | "warn"
  | "error"
  | "outline";

const TONES: Record<BadgeTone, string> = {
  neutral: "border-line bg-elevated text-secondary",
  accent: "border-accent-border bg-accent-muted text-accent",
  success: "border-success/30 bg-success-muted text-success",
  warn: "border-warn/30 bg-warn-muted text-warn",
  error: "border-error/30 bg-error-muted text-error",
  outline: "border-line-strong bg-transparent text-secondary",
};

/** Maps an interview verdict to its tone. */
export const SIGNAL_TONE: Record<string, BadgeTone> = {
  hire: "success",
  borderline: "warn",
  "no-hire": "error",
};

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
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
