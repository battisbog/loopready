import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const WIDTHS = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-6xl",
} as const;

/**
 * Consistent page frame: one max-width, one horizontal rhythm, and an
 * optional header block with a title, description, and actions.
 */
export function PageShell({
  title,
  description,
  actions,
  children,
  width = "md",
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  width?: keyof typeof WIDTHS;
  className?: string;
}) {
  return (
    <main className={cn("mx-auto w-full px-4 py-10 sm:px-6", WIDTHS[width], className)}>
      {(title || actions) && (
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title && (
              <h1 className="text-2xl font-semibold tracking-tight text-primary">
                {title}
              </h1>
            )}
            {description && (
              <p className="mt-1.5 text-sm leading-relaxed text-secondary">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </main>
  );
}

/** Titled section within a PageShell. */
export function Section({
  title,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-10 first:mt-0", className)}>
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between">
          {title && (
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted">
              {title}
            </h2>
          )}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
