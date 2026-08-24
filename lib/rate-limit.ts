import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COST,
  DAILY_CAP_MICRO,
  DAILY_CAP_USD,
  FREE_TIER_CEILING_MICRO,
  USD,
  usd,
  type Operation,
} from "@/lib/cost";
import { isGoodStanding, withinPaidPeriod, type Tier } from "@/lib/tiers";

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
  userId: string,
  /**
   * How many sessions the caller is about to create. A loop creates its first
   * round now and the rest as each one finishes, and those later rounds do NOT
   * re-check the quota -- deliberately, because stranding someone halfway
   * through a loop they were allowed to start is worse than the overshoot.
   *
   * So the WHOLE loop has to be authorised up front, which is what this counts.
   * Previously only the first round was, and the daily cap was enforced solely
   * by the coincidence that MAX_PER_ROUND_TYPE happened to equal the free
   * daily limit -- two unrelated constants, either of which could move.
   */
  sessionsNeeded = 1
): Promise<DailyQuota> {
  // `subscription_tier` is the canonical entitlement column (see
  // supabase/schema.sql). `profiles.plan` is a legacy column kept only so old
  // rows are not lost; it is permanently "free" for every account, including
  // real Voice/Premium/Unlimited subscribers, because nothing has written to
  // it since the migration. Reading it here silently capped every paying
  // customer at the free daily limit -- this was live in production.
  const { data: profile } = await admin
    .from("profiles")
    .select("subscription_tier, subscription_status, current_period_end")
    .eq("id", userId)
    .maybeSingle();

  // Missing profile is treated as free — fail closed on the paid path.
  const rawTier = profile?.subscription_tier ?? "free";
  // A lapsed paid subscription must not keep the uncapped quota forever. This
  // shares getUserTier's definition of good standing rather than repeating the
  // status list, because the copy that used to live here drifted out of step.
  const paidSubscription = rawTier === "voice" || rawTier === "premium";
  const lapsed =
    paidSubscription &&
    !isGoodStanding(profile?.subscription_status) &&
    !withinPaidPeriod(profile?.subscription_status, profile?.current_period_end);
  const plan = lapsed ? "free" : rawTier;

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
    exceeded:
      !UNCAPPED_PLANS.has(plan) && used + sessionsNeeded > FREE_DAILY_SESSIONS,
  };
}

export function dailyQuotaResponse(quota: DailyQuota): NextResponse {
  const remaining = Math.max(0, quota.limit - quota.used);
  // "You've used all 3" is wrong when they have 1 left and asked for a
  // 3-round loop, which is now a case that can refuse.
  const error =
    remaining > 0
      ? `That loop needs more rounds than you have left today (${remaining} of ${quota.limit} remaining). ` +
        `Start a shorter loop, or come back after midnight UTC.`
      : `You've used all ${quota.limit} practice interviews for today. Your quota resets at midnight UTC.`;

  return NextResponse.json(
    { error, used: quota.used, limit: quota.limit, remaining, quotaExceeded: true },
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

export type IpLimitName =
  | "signup"
  | "checkout"
  | "interview"
  | "tts"
  | "transcribe"
  | "run";

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
  // Checkout deliberately does NOT share the signup budget: a network that
  // hit the signup limit must still be able to pay.
  checkout: {
    tokens: 30,
    window: "1 h",
    message: "Too many payment attempts from this network. Try again shortly.",
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

export const GLOBAL_DAILY_API_CAP = DAILY_CAP_USD;

function todayKey(prefix: string): string {
  return `${prefix}:${new Date().toISOString().slice(0, 10)}`;
}

export interface GlobalBudget {
  /** Microdollars spent today. */
  used: number;
  /** Microdollars allowed today. */
  cap: number;
  /** The ceiling that applied to THIS caller, given their tier. */
  callerCeiling: number;
  exceeded: boolean;
  /** True when Redis is unavailable and the cap could not be enforced. */
  unknown: boolean;
}

/** Paid tiers keep spending after free traffic has been cut off. */
const PAID_TIERS = new Set<Tier>(["voice", "premium", "unlimited"]);

function ceilingFor(tier: Tier): number {
  return PAID_TIERS.has(tier) ? DAILY_CAP_MICRO : FREE_TIER_CEILING_MICRO;
}

/**
 * Charges one paid operation against today's ceiling, in microdollars.
 *
 * Increments first, then compares: a small overshoot under heavy concurrency is
 * acceptable for a spend backstop, and it avoids a check-then-set race that
 * could let many parallel calls slip past the cap entirely.
 *
 * Free users are held to a fraction of the ceiling so that the remainder is
 * reserved for paying customers. A spike in free traffic therefore degrades
 * free users first and never takes the product away from someone who paid.
 */
export async function consumeGlobalBudget(
  operation: Operation,
  tier: Tier = "free",
  multiplier = 1
): Promise<GlobalBudget> {
  const units = Math.round(COST[operation] * multiplier);
  const ceiling = ceilingFor(tier);

  if (!redis) {
    warnOnce();
    return {
      used: 0,
      cap: DAILY_CAP_MICRO,
      callerCeiling: ceiling,
      exceeded: false,
      unknown: true,
    };
  }
  try {
    const key = todayKey("loopready:spend");
    const used = await redis.incrby(key, units);
    // First write of the day sets the expiry; 48h covers any timezone skew.
    if (used <= units) await redis.expire(key, 60 * 60 * 48);

    // Per-operation breakdown, so the dashboard can show where money went.
    const opKey = todayKey(`loopready:spend:op:${operation}`);
    const opUsed = await redis.incrby(opKey, units);
    if (opUsed <= units) await redis.expire(opKey, 60 * 60 * 48);

    const exceeded = used > ceiling;
    if (exceeded) {
      console.warn(
        `[budget] ${operation} refused for tier=${tier}: ${usd(used)} used of ${usd(ceiling)} allowed (hard cap ${usd(DAILY_CAP_MICRO)})`
      );
    } else if (used > ceiling * 0.8 && used - units <= ceiling * 0.8) {
      // Fires once, on the request that crosses the line.
      console.warn(
        `[budget] 80% of the ${tier === "free" ? "free-tier" : "global"} ceiling reached: ${usd(used)} of ${usd(ceiling)}`
      );
    }

    return {
      used,
      cap: DAILY_CAP_MICRO,
      callerCeiling: ceiling,
      exceeded,
      unknown: false,
    };
  } catch (e) {
    // A Redis outage must not take the product down; the per-user and per-IP
    // limits are still in force.
    console.error("[budget] global counter failed, allowing request:", e);
    return {
      used: 0,
      cap: DAILY_CAP_MICRO,
      callerCeiling: ceiling,
      exceeded: false,
      unknown: true,
    };
  }
}

/** Read-only view of today's spend, for the health and cost endpoints. */
export async function peekGlobalBudget(): Promise<
  GlobalBudget & { byOperation: Record<string, number> }
> {
  const empty = {
    used: 0,
    cap: DAILY_CAP_MICRO,
    callerCeiling: DAILY_CAP_MICRO,
    exceeded: false,
    unknown: true,
    byOperation: {} as Record<string, number>,
  };
  if (!redis) return empty;
  try {
    const used = Number((await redis.get(todayKey("loopready:spend"))) ?? 0);
    const ops = Object.keys(COST) as Operation[];
    const values = await Promise.all(
      ops.map((o) => redis!.get(todayKey(`loopready:spend:op:${o}`)))
    );
    const byOperation: Record<string, number> = {};
    ops.forEach((o, i) => {
      const v = Number(values[i] ?? 0);
      if (v > 0) byOperation[o] = v;
    });
    return {
      used,
      cap: DAILY_CAP_MICRO,
      callerCeiling: DAILY_CAP_MICRO,
      exceeded: used > DAILY_CAP_MICRO,
      unknown: false,
      byOperation,
    };
  } catch {
    return empty;
  }
}

/** Today's per-endpoint request counts, for the cost dashboard. */
export async function peekUsageCounts(): Promise<Record<string, number>> {
  if (!redis) return {};
  try {
    const day = new Date().toISOString().slice(0, 10);
    const keys = await redis.keys(`loopready:usage:endpoint:*:${day}`);
    if (!keys.length) return {};
    const values = await redis.mget<(string | number | null)[]>(...keys);
    const out: Record<string, number> = {};
    keys.forEach((k, i) => {
      const name = k.replace("loopready:usage:endpoint:", "").replace(`:${day}`, "");
      out[name] = Number(values[i] ?? 0);
    });
    return out;
  } catch {
    return {};
  }
}

/**
 * 503 shown when the daily ceiling is reached.
 *
 * Free users are told they can upgrade, because for them the wall is the
 * reserved-for-paying-customers threshold rather than the hard cap.
 */
export function serviceBusyResponse(tier: Tier = "free"): NextResponse {
  const paid = tier !== "free";
  return NextResponse.json(
    {
      error: paid
        ? "LoopReady has hit its daily capacity limit and has paused new interviews. This is a safety limit on our side, not your account. Please try again tomorrow."
        : "Free practice is paused for today because of unusually high demand. Paid plans are unaffected, and free capacity resets at midnight UTC.",
      serviceBusy: true,
      upgradeHelps: !paid,
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
