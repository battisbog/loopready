import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Per-user rate limiting for routes that cost money (LLM, STT, TTS, sandbox).
 *
 * Every limit is keyed by the authenticated user id, never by IP — IP keying
 * punishes people behind shared NAT and is trivially bypassed.
 *
 * If Upstash is not configured the limiter fails OPEN and logs once. That is
 * deliberate: a missing env var should not take the whole app down. The daily
 * session cap is enforced separately in Supabase, so the expensive path still
 * has a hard ceiling even with Redis absent.
 */

// The Vercel Upstash integration provisions KV_REST_API_* names; a manual
// Upstash setup uses UPSTASH_REDIS_REST_*. Accept either.
const REDIS_URL =
  process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const REDIS_TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

const redis =
  REDIS_URL && REDIS_TOKEN
    ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN })
    : null;

let warned = false;
function warnOnce() {
  if (warned) return;
  warned = true;
  console.warn(
    "[rate-limit] Upstash not configured — limits are disabled. Set UPSTASH_REDIS_REST_* or KV_REST_API_*."
  );
}

export type LimitName =
  | "interview"
  | "feedback"
  | "transcribe"
  | "tts"
  | "run";

/**
 * Budgets are sized so a real interview never touches them, but a runaway
 * client or a scripted abuser hits the wall quickly.
 *
 * A human turn is roughly: 1 transcribe + 1 interview + 2-4 tts chunks.
 * TTS is highest because the streaming pipeline issues one call per sentence.
 */
const LIMITS: Record<
  LimitName,
  { tokens: number; window: `${number} ${"s" | "m" | "h"}`; message: string }
> = {
  interview: {
    tokens: 30,
    window: "1 m",
    message: "You're going too fast for the interviewer. Wait a moment and try again.",
  },
  feedback: {
    tokens: 10,
    window: "5 m",
    message: "Too many feedback reports requested. Try again in a few minutes.",
  },
  transcribe: {
    tokens: 20,
    window: "1 m",
    message: "Too many recordings in a short time. Pause a moment and try again.",
  },
  tts: {
    tokens: 60,
    window: "1 m",
    message: "Too much audio requested at once. Wait a moment and try again.",
  },
  run: {
    tokens: 15,
    window: "1 m",
    message: "You're running code too frequently. Wait a few seconds and try again.",
  },
};

const limiters = new Map<LimitName, Ratelimit>();

function limiterFor(name: LimitName): Ratelimit | null {
  if (!redis) return null;
  const cached = limiters.get(name);
  if (cached) return cached;
  const { tokens, window } = LIMITS[name];
  const limiter = new Ratelimit({
    redis,
    // Sliding window avoids the burst-at-the-boundary problem a fixed window has.
    limiter: Ratelimit.slidingWindow(tokens, window),
    analytics: true,
    prefix: `loopready:${name}`,
  });
  limiters.set(name, limiter);
  return limiter;
}

export interface LimitResult {
  ok: boolean;
  response?: NextResponse;
}

/**
 * Call AFTER the auth check, passing the authenticated user id.
 * Returns `{ ok: false, response }` — return that response directly.
 */
export async function checkRateLimit(
  name: LimitName,
  userId: string
): Promise<LimitResult> {
  const limiter = limiterFor(name);
  if (!limiter) {
    warnOnce();
    return { ok: true };
  }

  try {
    const { success, limit, remaining, reset } = await limiter.limit(userId);
    if (success) return { ok: true };

    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return {
      ok: false,
      response: NextResponse.json(
        { error: LIMITS[name].message, retryAfter },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": String(remaining),
            "X-RateLimit-Reset": String(reset),
          },
        }
      ),
    };
  } catch (e) {
    // Redis hiccup must not break a live interview.
    console.error("[rate-limit] check failed, allowing request:", e);
    return { ok: true };
  }
}

/** Plans exempt from the daily session cap. */
const UNCAPPED_PLANS = new Set(["voice", "premium", "unlimited"]);

/** Free-tier ceiling on how many interviews a user can start per day. */
export const FREE_DAILY_SESSIONS = Number(
  process.env.FREE_DAILY_SESSION_LIMIT ?? 3
);

export interface DailyQuota {
  used: number;
  limit: number;
  exceeded: boolean;
  plan: string;
}

/**
 * Counts sessions the user started since UTC midnight.
 *
 * This lives in Postgres rather than Redis on purpose: it is a product limit,
 * not abuse protection, so it must survive cache eviction and stay accurate.
 */
export async function checkDailySessionQuota(
  admin: SupabaseClient,
  userId: string
): Promise<DailyQuota> {
  const { data: profile } = await admin
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();

  // Missing profile is treated as free — fail closed on the paid path.
  const plan = profile?.plan ?? "free";

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count } = await admin
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("started_at", since.toISOString());

  const used = count ?? 0;
  return {
    used,
    plan,
    limit: FREE_DAILY_SESSIONS,
    exceeded: !UNCAPPED_PLANS.has(plan) && used >= FREE_DAILY_SESSIONS,
  };
}

export function dailyQuotaResponse(quota: DailyQuota): NextResponse {
  return NextResponse.json(
    {
      error: `You've used all ${quota.limit} practice interviews for today. Your quota resets at midnight UTC.`,
      used: quota.used,
      limit: quota.limit,
      quotaExceeded: true,
    },
    { status: 429 }
  );
}
