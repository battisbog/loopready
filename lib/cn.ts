import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Joins class names.
 *
 * This used to be a hand-rolled `parts.filter(Boolean).join(" ")` that only
 * understood strings. Components pulled from the shadcn/Magic UI registries
 * pass clsx's object form -- cn("flex", { "flex-col": vertical }) -- which the
 * old version stringified to "[object Object]", silently dropping every
 * conditional class. Same signature, same import path, so nothing that already
 * called it needs to change.
 *
 * tailwind-merge is the second half: later Tailwind classes now actually win
 * over earlier conflicting ones, so a `className` prop can override a
 * component's own defaults instead of losing to whichever rule CSS ordering
 * happened to favour.
 */
export function cn(...parts: ClassValue[]): string {
  return twMerge(clsx(parts));
}
