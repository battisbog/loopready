import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

/**
 * Resolves the origin to redirect back to.
 *
 * Behind Vercel's proxy `request.url` can carry an internal host, so prefer an
 * explicitly configured site URL, then the forwarded host the browser actually
 * used, and only then the raw request origin.
 */
function resolveOrigin(request: Request, fallbackOrigin: string): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return getSiteUrl();

  const host = request.headers.get("x-forwarded-host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  }
  return fallbackOrigin;
}

export async function GET(request: Request) {
  const { searchParams, origin: requestOrigin } = new URL(request.url);
  const origin = resolveOrigin(request, requestOrigin);

  const code = searchParams.get("code");
  // Only allow same-site paths, so the callback can't be used as an open redirect.
  const requestedNext = searchParams.get("next") ?? "/dashboard";
  const next = requestedNext.startsWith("/") ? requestedNext : "/dashboard";

  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(providerError)}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  return NextResponse.redirect(`${origin}/login?error=Missing%20auth%20code`);
}
