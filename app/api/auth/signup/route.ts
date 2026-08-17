import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkIpRateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Server-side entry point for account creation.
 *
 * Supabase's client SDK talks to Supabase directly from the browser, so a
 * signup done that way never passes through our infrastructure and cannot be
 * IP-limited. Routing the email flows through here is what makes rate limiting
 * possible at all.
 *
 * Note: `signInWithOtp` creates an account when none exists, so it IS the
 * account-creation vector and is gated the same as password signup.
 */
export async function POST(request: Request) {
  const limited = await checkIpRateLimit("signup", request);
  if (!limited.ok) return limited.response!;

  const { email, password, redirectTo } = await request.json().catch(() => ({}));
  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  // Anon client: Supabase's own confirmation emails and policies still apply.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  if (typeof password === "string" && password.length > 0) {
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Use at least 8 characters." },
        { status: 400 }
      );
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    console.log(`[signup] password signup from ip ${clientIp(request)}`);
    return NextResponse.json({
      ok: true,
      message: "Check your email to confirm your account.",
    });
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  console.log(`[signup] magic link requested from ip ${clientIp(request)}`);
  return NextResponse.json({
    ok: true,
    message: "Check your email for a sign-in link.",
  });
}
