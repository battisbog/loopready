import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const SURFACE =
  "rounded-lg border border-line bg-surface shadow-[var(--shadow-sm)]";

/** Semantic surfaces. Use these instead of hand-written colour classes. */
const TONES = {
  default: "",
  accent: "border-accent-border bg-accent-muted",
  warn: "border-warn/30 bg-warn-muted",
  error: "border-error/30 bg-error-muted",
} as const;

export type CardTone = keyof typeof TONES;

export function Card({
  children,
  className,
  padded = true,
  /** Turns the whole card into a link with hover feedback. */
  href,
  accent,
  tone = "default",
  /** Denser padding for list rows. */
  compact,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  href?: string;
  /** Shorthand for tone="accent". */
  accent?: boolean;
  tone?: CardTone;
  compact?: boolean;
}) {
  const classes = cn(
    SURFACE,
    padded && (compact ? "px-5 py-4" : "p-5"),
    TONES[accent ? "accent" : tone],
    href &&
      "block transition-colors duration-150 hover:border-line-strong hover:bg-elevated",
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return <div className={classes}>{children}</div>;
}

export function CardTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3 className={cn("text-sm font-medium text-primary", className)}>
      {children}
    </h3>
  );
}

export function CardLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-xs font-medium uppercase tracking-wide text-muted",
        className
      )}
    >
      {children}
    </p>
  );
}

/** Large single figure, for stat tiles. */
export function CardStat({
  value,
  hint,
  className,
}: {
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mt-2", className)}>
      <p className="text-3xl font-semibold tracking-tight text-primary">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
