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

export const RATE_LIMITING_CONFIGURED = Boolean(REDIS_URL && REDIS_TOKEN);

// Fail-open is deliberate, but it must never be silent. In production a
// missing config is an incident, not a warning.
if (!RATE_LIMITING_CONFIGURED) {
  const message =
    "[rate-limit] Upstash is NOT configured. Per-user, per-IP and global spend limits are DISABLED. " +
    "Set UPSTASH_REDIS_REST_* or KV_REST_API_*.";
  if (process.env.NODE_ENV === "production") {
    console.error(
      "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n" +
        message +
        "\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
    );
  } else {
    console.warn(message);
  }
}

let warned = false;
function warnOnce() {
  if (warned) return;
  warned = true;
  if (process.env.NODE_ENV === "production") {
    console.error(
      "[rate-limit] Request served with limits DISABLED (Upstash unconfigured)."
    );
  } else {
    console.warn("[rate-limit] Limits disabled (Upstash unconfigured).");
  }
}

/** Confirms Redis is not just configured but actually reachable. */
export async function rateLimitHealth(): Promise<{
  configured: boolean;
  reachable: boolean;
  error?: string;
}> {
  if (!redis) return { configured: false, reachable: false };
  try {
    await redis.set("loopready:health", Date.now(), { ex: 60 });
    const value = await redis.get("loopready:health");
    return { configured: true, reachable: value != null };
  } catch (e) {
    return {
      configured: true,
      reachable: false,
      error: e instanceof Error ? e.message : "unknown",
    };
  }
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

// ============================================================
// Layer 2: per-IP limits
//
// Per-user limits do nothing against someone scripting hundreds of free
// accounts. These sit ON TOP of the existing per-user limits (both must pass)
// and are keyed by client IP.
//
// Budgets are deliberately generous: offices, universities and VPNs put many
// legitimate candidates behind one NAT address, and this user base is exactly
// those places. The goal is to stop scripted farming, not to punish a busy
// office.
// ============================================================

/**
 * Client IP as seen by Vercel.
 *
 * `x-vercel-forwarded-for` is set by the platform and cannot be spoofed by the
 * client, so it is preferred. Plain `x-forwarded-for` is attacker-controllable
 * off-platform, so it is only a last resort.
 */
export function clientIp(request: Request): string {
  const vercel = request.headers.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0].trim();

  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();

  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();

  return "unknown";
}

export type IpLimitName = "signup" | "interview" | "tts" | "transcribe" | "run";

const IP_LIMITS: Record<
  IpLimitName,
  { tokens: number; window: `${number} ${"s" | "m" | "h"}`; message: string }
> = {
  // Account creation is the actual abuse vector, so this is the tight one.
  signup: {
    tokens: 8,
    window: "1 h",
    message:
      "Too many accounts created from this network. Try again later, or contact us if you're on a shared connection.",
  },
  interview: {
    tokens: 150,
    window: "1 m",
    message: "This network is sending too many requests. Try again shortly.",
  },
  tts: {
    tokens: 300,
    window: "1 m",
    message: "This network is sending too many requests. Try again shortly.",
  },
  transcribe: {
    tokens: 100,
    window: "1 m",
    message: "This network is sending too many requests. Try again shortly.",
  },
  run: {
    tokens: 80,
    window: "1 m",
    message: "This network is running code too frequently. Try again shortly.",
  },
};

const ipLimiters = new Map<IpLimitName, Ratelimit>();

function ipLimiterFor(name: IpLimitName): Ratelimit | null {
  if (!redis) return null;
  const cached = ipLimiters.get(name);
  if (cached) return cached;
  const { tokens, window } = IP_LIMITS[name];
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    analytics: true,
    prefix: `loopready:ip:${name}`,
  });
  ipLimiters.set(name, limiter);
  return limiter;
}

/**
 * Additional IP-keyed check. Call ALONGSIDE checkRateLimit, not instead of it.
 * Unknown IPs are allowed through: the per-user limit still applies, and
 * blocking every request with a missing header would break the app outright.
 */
export async function checkIpRateLimit(
  name: IpLimitName,
  request: Request
): Promise<LimitResult> {
  const limiter = ipLimiterFor(name);
  if (!limiter) {
    warnOnce();
    return { ok: true };
  }

  const ip = clientIp(request);
  if (ip === "unknown") return { ok: true };

  try {
    const { success, limit, remaining, reset } = await limiter.limit(ip);
    if (success) return { ok: true };

    console.warn(`[abuse] ip ${ip} exceeded the ${name} limit`);
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return {
      ok: false,
      response: NextResponse.json(
        { error: IP_LIMITS[name].message, retryAfter },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": String(remaining),
          },
        }
      ),
    };
  } catch (e) {
    console.error("[rate-limit] ip check failed, allowing request:", e);
    return { ok: true };
  }
}

// ============================================================
// Layer 3: global daily spend ceiling
//
// A backstop against a bill, not a fairness mechanism. Every paid call (LLM,
// TTS, transcription) increments one counter keyed by UTC date. Past the cap,
// expensive endpoints degrade politely instead of continuing to spend.
// ============================================================

export const GLOBAL_DAILY_API_CAP = Number(
  process.env.GLOBAL_DAILY_API_CAP ?? 5000
);

function todayKey(prefix: string): string {
  return `${prefix}:${new Date().toISOString().slice(0, 10)}`;
}

export interface GlobalBudget {
  used: number;
  cap: number;
  exceeded: boolean;
  /** True when Redis is unavailable and the cap could not be enforced. */
  unknown: boolean;
}

/**
 * Counts one paid call against today's ceiling.
 *
 * Increments first, then compares: a small overshoot under heavy concurrency
 * is acceptable for a spend backstop, and it avoids a check-then-set race that
 * could let many parallel calls slip past the cap entirely.
 */
export async function consumeGlobalBudget(units = 1): Promise<GlobalBudget> {
  if (!redis) {
    warnOnce();
    return { used: 0, cap: GLOBAL_DAILY_API_CAP, exceeded: false, unknown: true };
  }
  try {
    const key = todayKey("loopready:spend");
    const used = await redis.incrby(key, units);
    // First write of the day sets the expiry; 48h covers any timezone skew.
    if (used <= units) await redis.expire(key, 60 * 60 * 48);
    return {
      used,
      cap: GLOBAL_DAILY_API_CAP,
      exceeded: used > GLOBAL_DAILY_API_CAP,
      unknown: false,
    };
  } catch (e) {
    // A Redis outage must not take the product down; the per-user and per-IP
    // limits are still in force.
    console.error("[budget] global counter failed, allowing request:", e);
    return { used: 0, cap: GLOBAL_DAILY_API_CAP, exceeded: false, unknown: true };
  }
}

/** Read-only view of today's spend, for the health endpoint. */
export async function peekGlobalBudget(): Promise<GlobalBudget> {
  if (!redis) {
    return { used: 0, cap: GLOBAL_DAILY_API_CAP, exceeded: false, unknown: true };
  }
  try {
    const used = Number((await redis.get(todayKey("loopready:spend"))) ?? 0);
    return {
      used,
      cap: GLOBAL_DAILY_API_CAP,
      exceeded: used > GLOBAL_DAILY_API_CAP,
      unknown: false,
    };
  } catch {
    return { used: 0, cap: GLOBAL_DAILY_API_CAP, exceeded: false, unknown: true };
  }
}

/** 503 shown when the app-wide daily ceiling is reached. */
export function serviceBusyResponse(): NextResponse {
  return NextResponse.json(
    {
      error:
        "LoopReady is unusually busy right now and has paused new interviews for today. Please try again tomorrow.",
      serviceBusy: true,
    },
    { status: 503, headers: { "Retry-After": "3600" } }
  );
}

// ============================================================
// Abuse monitoring: lightweight daily counters
// ============================================================

/** Records a request against per-user and per-IP daily counters. */
export async function recordUsage(
  endpoint: string,
  userId: string,
  request: Request
): Promise<void> {
  if (!redis) return;
  try {
    const day = new Date().toISOString().slice(0, 10);
    const ip = clientIp(request);
    const keys = [
      `loopready:usage:user:${userId}:${day}`,
      `loopready:usage:ip:${ip}:${day}`,
      `loopready:usage:endpoint:${endpoint}:${day}`,
    ];
    await Promise.all(
      keys.map(async (k) => {
        const n = await redis!.incr(k);
        if (n === 1) await redis!.expire(k, 60 * 60 * 72);
      })
    );
  } catch {
    // Monitoring must never affect the request path.
  }
}
