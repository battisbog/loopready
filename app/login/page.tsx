"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Provider = "google" | "github";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showEmail, setShowEmail] = useState(false);

  // Surface OAuth failures redirected back from /auth/callback.
  useEffect(() => {
    const err = searchParams.get("error");
    if (err) setStatus(err);
  }, [searchParams]);

  async function signInWithProvider(provider: Provider) {
    setBusy(provider);
    setStatus(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
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
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(null);
    setStatus(error ? error.message : "Check your email for a sign-in link.");
  }

  async function signInWithPassword() {
    if (!email || !password) return setStatus("Enter email and password.");
    setBusy("password");
    setStatus(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(null);
    if (error) return setStatus(error.message);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[26rem] w-[42rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[110px]"
      />
      <div className="relative w-full max-w-sm">
        <Link
          href="/"
          className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
        >
          ← Back to home
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">LoopReady</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Voice mock interviews, calibrated to what passes a FAANG loop.
        </p>

        <div className="mt-8 space-y-3">
          <button
            onClick={() => signInWithProvider("google")}
            disabled={Boolean(busy)}
            className="flex w-full items-center justify-center gap-3 rounded-md bg-zinc-100 px-3 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-white disabled:opacity-50"
          >
            <GoogleMark />
            {busy === "google" ? "Redirecting…" : "Continue with Google"}
          </button>

          <button
            onClick={() => signInWithProvider("github")}
            disabled={Boolean(busy)}
            className="flex w-full items-center justify-center gap-3 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-700 disabled:opacity-50"
          >
            <GithubMark />
            {busy === "github" ? "Redirecting…" : "Continue with GitHub"}
          </button>

          {!showEmail ? (
            <button
              onClick={() => setShowEmail(true)}
              className="w-full py-1 text-center text-xs text-zinc-500 transition-colors hover:text-zinc-300"
            >
              Continue with email instead
            </button>
          ) : (
            <>
              <div className="flex items-center gap-3 py-1 text-xs text-zinc-600">
                <div className="h-px flex-1 bg-zinc-800" />
                or with email
                <div className="h-px flex-1 bg-zinc-800" />
              </div>

              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && signInWithPassword()}
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
              <button
                onClick={signInWithPassword}
                disabled={Boolean(busy)}
                className="w-full rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {busy === "password" ? "Signing in…" : "Sign in"}
              </button>
              <button
                onClick={sendMagicLink}
                disabled={Boolean(busy)}
                className="w-full text-center text-xs text-zinc-500 transition-colors hover:text-zinc-300 disabled:opacity-50"
              >
                {busy === "magic" ? "Sending…" : "Email me a sign-in link instead"}
              </button>
            </>
          )}

          {status && (
            <p className="pt-1 text-sm text-zinc-400" role="status">
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
