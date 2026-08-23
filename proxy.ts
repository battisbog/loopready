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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
