import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site-url";
import { sendWelcomeEmail } from "@/lib/email/welcome";

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

/**
 * Sends the one-time welcome/discount email, at most once per account.
 *
 * welcome_email_sent_at IS NULL in the WHERE clause is the atomic claim: two
 * callbacks for the same brand-new account racing (a double-tap on a magic
 * link, or a retried OAuth exchange) can only have ONE of them win the
 * update and see a row back, so only one ever sends -- same pattern as
 * consume_demo_use / consume_trial_slot elsewhere in this codebase. This
 * runs on EVERY successful login, not just signup, because there is no
 * separate "just created an account" signal at this callback -- the claim
 * itself is what makes repeat logins a no-op.
 */
async function maybeSendWelcomeEmail(userId: string, email: string): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({ welcome_email_sent_at: new Date().toISOString() })
    .eq("id", userId)
    .is("welcome_email_sent_at", null)
    .select("email_notifications")
    .maybeSingle();

  if (error) {
    console.error("[auth] welcome-email claim failed:", error.message);
    return;
  }
  if (!data) return; // Already claimed by an earlier login -- not an error.
  if (data.email_notifications === false) return;

  await sendWelcomeEmail(email);
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) await maybeSendWelcomeEmail(user.id, user.email);
      return withCleared(NextResponse.redirect(`${origin}${next}`));
    }
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  return NextResponse.redirect(`${origin}/login?error=Missing%20auth%20code`);
}
