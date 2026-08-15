/**
 * Single source of truth for the site's public origin.
 *
 * Auth emails are generated server-side by Supabase, so a wrong origin here
 * sends people to localhost from a production email. Resolution order:
 *   1. NEXT_PUBLIC_SITE_URL   explicit, wins everywhere (set this in Vercel)
 *   2. the Vercel production URL, when the app is deployed
 *   3. window.location.origin on the client (correct for local dev and previews)
 *   4. localhost, for server-side local dev
 *
 * NOTE: Supabase only honours a redirect if the URL is in its allow list
 * (Authentication > URL Configuration). Otherwise it silently falls back to
 * the project's Site URL, which is what produces localhost links.
 */
function normalize(value: string): string {
  const withProtocol = value.startsWith("http") ? value : `https://${value}`;
  return withProtocol.replace(/\/+$/, "");
}

export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return normalize(explicit);

  const vercel = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return normalize(vercel);

  if (typeof window !== "undefined") return window.location.origin;

  return "http://localhost:3000";
}

/** Absolute URL for the auth callback, used for every redirect-based sign-in. */
export function getAuthCallbackUrl(next?: string): string {
  const base = `${getSiteUrl()}/auth/callback`;
  return next ? `${base}?next=${encodeURIComponent(next)}` : base;
}
