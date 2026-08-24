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

  // Where to land afterwards, preferring the query param but falling back to
  // the cookie the login page set.
  //
  // Supabase drops a redirectTo that does not match its Redirect URLs
  // allowlist and quietly substitutes the Site URL, which strips the query
  // string this used to depend on entirely. The cookie survives that, so the
  // "sign in, then continue to checkout" path no longer depends on a dashboard
  // setting being exactly right.
  const cookieNext = request.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("lr_next="))
    ?.slice("lr_next=".length);

  const requested =
    searchParams.get("next") ??
    (cookieNext ? decodeURIComponent(cookieNext) : null) ??
    "/dashboard";

  // Same-origin paths only, so the callback cannot be used as an open
  // redirect. "//evil.com" starts with "/" but navigates off-site.
  const next =
    requested.startsWith("/") && !requested.startsWith("//")
      ? requested
      : "/dashboard";

  // Which channel actually carried the destination. Logged because a sign-in
  // that silently lands on /dashboard instead of checkout is otherwise
  // impossible to diagnose after the fact -- the failure leaves no trace.
  console.log(
    `[auth] callback next=${JSON.stringify(next)} ` +
      `via=${searchParams.get("next") ? "query" : cookieNext ? "cookie" : "default"} ` +
      `queryPresent=${Boolean(searchParams.get("next"))} cookiePresent=${Boolean(cookieNext)}`
  );

  /** Clears the one-shot destination cookie on the way out. */
  const withCleared = (res: NextResponse) => {
    if (cookieNext) res.cookies.set("lr_next", "", { path: "/", maxAge: 0 });
    return res;
  };

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
      return withCleared(NextResponse.redirect(`${origin}${next}`));
    }
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  return NextResponse.redirect(`${origin}/login?error=Missing%20auth%20code`);
}
