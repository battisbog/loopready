"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendMagicLink() {
    if (!email) return setStatus("Enter your email first.");
    setBusy(true);
    setStatus(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);
    setStatus(error ? error.message : "Check your email for a sign-in link.");
  }

  async function signInWithPassword() {
    if (!email || !password) return setStatus("Enter email and password.");
    setBusy(true);
    setStatus(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
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
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <button
            onClick={sendMagicLink}
            disabled={busy}
            className="w-full rounded-md bg-emerald-500 px-3 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            Send magic link
          </button>

          <div className="flex items-center gap-3 py-1 text-xs text-zinc-600">
            <div className="h-px flex-1 bg-zinc-800" />
            or with password
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <button
            onClick={signInWithPassword}
            disabled={busy}
            className="w-full rounded-md border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-900 disabled:opacity-50"
          >
            Sign in
          </button>

          {status && <p className="text-sm text-zinc-400">{status}</p>}
        </div>
      </div>
    </main>
  );
}
