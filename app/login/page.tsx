"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getAuthCallbackUrl } from "@/lib/site-url";

type Provider = "google" | "github";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Seed from the URL so an OAuth error shows on first paint, with no
  // setState-in-effect cascade.
  const [status, setStatus] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("error")
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [showEmail, setShowEmail] = useState(false);
  /**
   * Where to land after signing in.
   *
   * /checkout redirects here as `/login?next=/checkout?plan=voice` when a
   * logged-out visitor picks a paid plan. This used to be initialised to
   * "/dashboard" and never updated -- setNext was never called -- so that
   * parameter was passed and then ignored, and everyone who clicked "Get
   * Voice" while logged out was signed in and dropped on the dashboard as a
   * free user with no payment taken and no way to tell what had gone wrong.
   *
   * Seeded from the URL in a lazy initialiser, matching how `status` reads its
   * error param, so there is no setState-in-effect cascade.
   *
   * Only same-origin paths are accepted. A protocol-relative "//evil.com"
   * begins with "/" but navigates off-site, so it is rejected too.
   */
  const [next] = useState(() => {
    if (typeof window === "undefined") return "/dashboard";
    const requested = new URLSearchParams(window.location.search).get("next");
    if (!requested) return "/dashboard";
    return requested.startsWith("/") && !requested.startsWith("//")
      ? requested
      : "/dashboard";
  });

  async function signInWithProvider(provider: Provider) {
    setBusy(provider);
    setStatus(null);
    const supabase = createClient();

    // The destination rides ONLY in a cookie for OAuth, never in redirectTo's
    // query string.
    //
    // Supabase validates redirectTo against its Redirect URLs allowlist. An
    // exact-match allowlist entry for the bare callback URL does not also
    // match that same URL with "?next=..." appended -- a query string turns a
    // path that matches into one that does not, and Supabase silently
    // substitutes the project's Site URL instead of failing loudly. That
    // dropped the destination for both a stray "?code=" landing on the bare
    // homepage (redirectTo rejected outright) AND a clean callback that still
    // lost "next" and defaulted to /dashboard (the allowlist matched the PATH
    // but the query string was not preserved through it) -- both observed
    // from this exact code before this fix. Sending a bare callback URL with
    // no query string at all removes the one thing that needed a wildcard
    // allowlist entry to survive; a plain, exact "https://loopready.io/auth/
    // callback" is far more likely to already be correctly allowlisted than
    // any wildcard pattern is.
    //
    // The cookie is what actually carries the destination now, not a
    // fallback. It survives the round trip to the provider and back
    // regardless of what the allowlist says: SameSite=Lax is correct here
    // because the return leg is a top-level GET navigation, and OAuth stays
    // in the same browser the whole way (unlike a magic link, which can be
    // opened on a different device -- that path below still needs next in
    // the URL itself).
    if (next && next !== "/dashboard") {
      document.cookie = `lr_next=${encodeURIComponent(next)}; path=/; max-age=600; SameSite=Lax${
        location.protocol === "https:" ? "; Secure" : ""
      }`;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: getAuthCallbackUrl() },
    });
    if (error) {
      setBusy(null);
      setStatus(
        error.message.includes("not enabled")
          ? `${provider === "google" ? "Google" : "GitHub"} sign-in isn't enabled on this project yet.`
          : error.message
      );
    }
    // On success the browser redirects to the provider.
  }

  async function sendMagicLink() {
    if (!email) return setStatus("Enter your email first.");
    setBusy("magic");
    setStatus(null);
    // Routed through our API so account creation can be rate limited by IP;
    // the browser SDK would bypass our server entirely.
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, redirectTo: getAuthCallbackUrl(next) }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    setStatus(data.error ?? data.message ?? "Check your email for a sign-in link.");
  }

  async function signInWithPassword() {
    if (!email || !password) return setStatus("Enter email and password.");
    setBusy("password");
    setStatus(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(null);
    if (error) return setStatus(error.message);
    router.push(next);
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[26rem] w-[42rem] -translate-x-1/2 rounded-full bg-accent-muted blur-[110px]"
      />
      <div className="relative w-full max-w-sm">
        <Link
          href="/"
          className="text-xs text-muted transition-colors hover:text-secondary"
        >
          ← Back to home
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">LoopReady</h1>
        <p className="mt-1 text-sm text-secondary">
          Voice mock interviews, calibrated to what passes a FAANG loop.
        </p>

        <div className="mt-8 space-y-3">
          <button
            onClick={() => signInWithProvider("google")}
            disabled={Boolean(busy)}
            className="flex w-full items-center justify-center gap-3 rounded-md bg-primary px-3 py-2.5 text-sm font-medium text-base transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <GoogleMark />
            {busy === "google" ? "Redirecting…" : "Continue with Google"}
          </button>

          <button
            onClick={() => signInWithProvider("github")}
            disabled={Boolean(busy)}
            className="flex w-full items-center justify-center gap-3 rounded-md border border-line bg-surface px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:border-line-strong disabled:opacity-50"
          >
            <GithubMark />
            {busy === "github" ? "Redirecting…" : "Continue with GitHub"}
          </button>

          {!showEmail ? (
            <button
              onClick={() => setShowEmail(true)}
              className="w-full py-1 text-center text-xs text-muted transition-colors hover:text-secondary"
            >
              Continue with email instead
            </button>
          ) : (
            <>
              <div className="flex items-center gap-3 py-1 text-xs text-muted">
                <div className="h-px flex-1 bg-elevated" />
                or with email
                <div className="h-px flex-1 bg-elevated" />
              </div>

              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && signInWithPassword()}
                className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <button
                onClick={signInWithPassword}
                disabled={Boolean(busy)}
                className="w-full rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-50"
              >
                {busy === "password" ? "Signing in…" : "Sign in"}
              </button>
              <button
                onClick={sendMagicLink}
                disabled={Boolean(busy)}
                className="w-full text-center text-xs text-muted transition-colors hover:text-secondary disabled:opacity-50"
              >
                {busy === "magic" ? "Sending…" : "Email me a sign-in link instead"}
              </button>
            </>
          )}

          <p className="pt-2 text-center text-[11px] leading-relaxed text-muted">
            By continuing you agree to our{" "}
            <Link href="/terms" className="underline hover:text-secondary">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-secondary">
              Privacy Policy
            </Link>
            .
          </p>

          {status && (
            <p className="pt-1 text-sm text-secondary" role="status">
              {status}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8z"
      />
    </svg>
  );
}

function GithubMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.9 10.9c.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 1.8 2.7 1.3 3.4 1 .1-.7.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.4 11.4 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .4.2.7.8.6A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5z" />
    </svg>
  );
}
