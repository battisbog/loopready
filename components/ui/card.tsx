import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const SURFACE =
  "rounded-lg border border-line bg-surface shadow-[var(--shadow-sm)]";

export function Card({
  children,
  className,
  padded = true,
  /** Turns the whole card into a link with hover feedback. */
  href,
  accent,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  href?: string;
  accent?: boolean;
}) {
  const classes = cn(
    SURFACE,
    padded && "p-5",
    accent && "border-accent-border bg-accent-muted",
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
