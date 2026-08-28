import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/auth",
  "/signup",
  "/checkout",
  "/pricing",
  // PayPal posts server-to-server with no session. This route authenticates
  // itself by verifying the PayPal signature, so session auth must not block it.
  "/api/paypal/webhook",
  // Tavus posts lifecycle callbacks the same way, and was missed when the
  // PayPal one was whitelisted: every callback got the proxy's 401 instead of
  // reaching the route, so the "candidate closed their laptop" safety net had
  // never once fired. The route is behind the video flag and only ever marks a
  // room as ended, so an unauthenticated POST cannot move money or credits.
  "/api/video/callback",
  // Uptime monitors have no session. The route itself returns only a bare
  // status to anonymous callers and detail to signed-in ones.
  "/api/health",
  // Signup must be reachable before a session exists.
  "/api/auth/signup",
  "/terms",
  "/privacy",
];

// Public surface: marketing page, auth, and crawler files. Everything else
// requires a session.
//
// /demo.mp4 and /demo-poster.png are here because the matcher below only
// excludes image extensions, not video -- without this an anonymous visitor
// clicking "Watch it in action" on the homepage got redirected to /login
// instead of the demo.
const PUBLIC_FILES = [
  "/sitemap.xml",
  "/robots.txt",
  "/opengraph-image",
  "/icon",
  "/demo.mp4",
  "/demo-poster.png",
  "/interviewer-demo.mp4",
];

function isPublicPath(pathname: string) {
  return (
    pathname === "/" ||
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    PUBLIC_FILES.some((p) => pathname.startsWith(p))
  );
}

export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  /**
   * Send an unauthenticated visitor to sign in, remembering where they were
   * going -- server-side, in a cookie set on this very response.
   *
   * /checkout is a public path (it has to be, so a logged-out visitor can
   * reach it from the pricing CTAs) and it does its own redirect to
   * /login?next=... The problem is what happens next: /login is statically
   * prerendered and CDN-cached, so recovering the destination depended
   * entirely on client JS reading window.location.search on a cached page.
   * The production logs show a sign-in where no /login request hit the server
   * at all between /checkout and /auth/callback, and the callback resolved to
   * /dashboard -- the destination never made it.
   *
   * Setting the cookie here removes every moving part: no client JS, no
   * hydration, no cache. The redirect response that sends them to /login is
   * the same response that carries the destination.
   */
  if (!user && pathname.startsWith("/checkout")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const target = `${pathname}${request.nextUrl.search}`;
    url.search = `?next=${encodeURIComponent(target)}`;

    const res = NextResponse.redirect(url);
    res.cookies.set("lr_next", target, {
      path: "/",
      maxAge: 600,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    });
    return res;
  }

  if (!user && !isPublicPath(pathname)) {
    // API callers need JSON, not an HTML login page — a mid-interview fetch
    // that follows a redirect would fail to parse the response.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // _vercel is Vercel's own infra path (Analytics beacons, Speed Insights).
    // Without this exclusion those requests ran through the auth check like
    // any other route, so a logged-out visitor's page-view beacon -- which is
    // most traffic, since it fires from the marketing pages -- got redirected
    // to /login instead of recorded. Silent: analytics just under-counts, with
    // nothing to signal why.
    "/((?!_next/static|_next/image|_vercel|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
