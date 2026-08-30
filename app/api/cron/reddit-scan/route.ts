import { NextResponse } from "next/server";
import { redditConfigured } from "@/lib/reddit/client";
import { scanForOpportunities } from "@/lib/reddit/scan";
import { sendRedditDigest } from "@/lib/email/reddit-digest";

export const maxDuration = 60;

/**
 * Daily Reddit-opportunity scan, triggered by Vercel Cron (see vercel.json).
 *
 * Verifies the CRON_SECRET bearer token Vercel sends automatically on cron
 * invocations -- without this, this route is a public, unauthenticated way
 * to trigger a Reddit scan + email send. Whitelisted in proxy.ts since a
 * cron invocation has no Supabase session to check.
 *
 * Never posts or comments anywhere on Reddit -- this only reads and emails
 * a digest. Per references/playbook.md Section 5: no auto-posting, no
 * sockpuppeting. Aryan reads the digest and replies personally, disclosing
 * he built LoopReady, same as every other community-engagement rule in
 * this codebase.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!redditConfigured()) {
    console.warn("[reddit-scan] REDDIT_CLIENT_ID/SECRET not set, skipping");
    return NextResponse.json({ skipped: "Reddit not configured" });
  }

  const digestTo = process.env.REDDIT_DIGEST_EMAIL;
  if (!digestTo) {
    console.warn("[reddit-scan] REDDIT_DIGEST_EMAIL not set, skipping");
    return NextResponse.json({ skipped: "No digest recipient configured" });
  }

  try {
    const posts = await scanForOpportunities();
    await sendRedditDigest(digestTo, posts);
    return NextResponse.json({ ok: true, found: posts.length });
  } catch (e) {
    console.error("[reddit-scan] failed:", e);
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}
