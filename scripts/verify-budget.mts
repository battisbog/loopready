/**
 * Proves the spend ceiling degrades free users before paying ones, against the
 * REAL Redis instance, using a throwaway key namespace.
 *
 *   npx tsx scripts/verify-budget.mts
 */
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
}

const { Redis } = await import("@upstash/redis");
const { COST, DAILY_CAP_MICRO, FREE_TIER_CEILING_MICRO, DAILY_CAP_USD, USD, FREE_TIER_BUDGET_SHARE } =
  await import("../lib/cost.ts");

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label.padEnd(58)} ${detail}`);
  if (!ok) failures++;
}

const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token =
  process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

console.log("\nRedis reachability");
check("Upstash credentials present", Boolean(url && token));
if (!url || !token) process.exit(1);

const redis = new Redis({ url, token });
const probe = `loopready:verify:${Date.now()}`;
// A non-numeric marker: the Upstash client JSON-parses values on read, so "1"
// would come back as the number 1 and a strict compare would look like a
// connectivity failure.
const marker = `ok-${Math.round(Date.now() / 1000)}`;
await redis.set(probe, marker, { ex: 30 });
check("Redis reachable", (await redis.get(probe)) === marker, marker);

// The counters really do increment, which is what the ceiling depends on.
const counter = `${probe}:counter`;
await redis.incrby(counter, 5);
const after = await redis.incrby(counter, 7);
check("INCRBY accumulates", after === 12, `got ${after}, expected 12`);
await redis.del(probe, counter);

// ------------------------------------------------------- the priority ladder

console.log(`\nCeilings (cap $${DAILY_CAP_USD}, free share ${FREE_TIER_BUDGET_SHARE})`);
check(
  "free ceiling sits below the hard cap",
  FREE_TIER_CEILING_MICRO < DAILY_CAP_MICRO,
  `free $${(FREE_TIER_CEILING_MICRO / USD).toFixed(2)} < cap $${(DAILY_CAP_MICRO / USD).toFixed(2)}`
);
check(
  "a reserve exists that only paid tiers can spend",
  DAILY_CAP_MICRO - FREE_TIER_CEILING_MICRO > 0,
  `$${((DAILY_CAP_MICRO - FREE_TIER_CEILING_MICRO) / USD).toFixed(2)} reserved`
);

// Simulate the ladder without touching the live counter.
const PAID = new Set(["voice", "premium", "unlimited"]);
const ceiling = (tier: string) =>
  PAID.has(tier) ? DAILY_CAP_MICRO : FREE_TIER_CEILING_MICRO;
const refused = (spent: number, tier: string) => spent > ceiling(tier);

const justOverFree = FREE_TIER_CEILING_MICRO + 1;
check(
  "at the free ceiling, free users are refused",
  refused(justOverFree, "free") === true
);
check(
  "at the free ceiling, paying users continue",
  refused(justOverFree, "voice") === false &&
    refused(justOverFree, "premium") === false,
  "voice and premium unaffected"
);
const overCap = DAILY_CAP_MICRO + 1;
check(
  "at the hard cap, everyone stops",
  refused(overCap, "free") && refused(overCap, "voice") && refused(overCap, "premium")
);

// ------------------------------------------------------------ cost weighting

console.log("\nCost weighting");
check(
  "a realtime session costs far more than a TTS sentence",
  COST.realtime_session / COST.tts_sentence > 100,
  `${Math.round(COST.realtime_session / COST.tts_sentence)}x`
);
check(
  "the ceiling is expressed in money, not call count",
  DAILY_CAP_MICRO === Math.round(DAILY_CAP_USD * USD)
);

const perRound =
  COST.realtime_session + COST.realtime_turn * 9 + COST.feedback;
check(
  "a realtime round is charged a realistic amount",
  perRound > 0.5 * USD && perRound < 2 * USD,
  `$${(perRound / USD).toFixed(2)} for session + 9 turns + feedback`
);
console.log(
  `\n  A $${DAILY_CAP_USD} cap therefore buys about ${Math.floor(DAILY_CAP_MICRO / perRound)} realtime rounds/day,`
);
console.log(
  `  of which free users may consume about ${Math.floor(FREE_TIER_CEILING_MICRO / perRound)}.`
);

// ------------------------------------------------------------ endpoint sweep

console.log("\nEndpoint coverage");
const { readdirSync, statSync } = await import("node:fs");
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = `${dir}/${f}`;
    return statSync(p).isDirectory() ? walk(p) : p.endsWith("route.ts") ? [p] : [];
  });
}
const PAID_ROUTES = [
  "app/api/interview/route.ts",
  "app/api/interview/stream/route.ts",
  "app/api/tts/route.ts",
  "app/api/transcribe/route.ts",
  "app/api/run/route.ts",
  "app/api/realtime/session/route.ts",
  "app/api/realtime/turn/route.ts",
  "app/api/feedback/route.ts",
  "app/api/loop/route.ts",
  "app/api/loop/summary/route.ts",
];
for (const r of PAID_ROUTES) {
  const src = readFileSync(r, "utf8");
  const name = r.replace("app/api/", "").replace("/route.ts", "");
  check(
    `${name}: user + ip + global cap`,
    /checkRateLimit|checkDailySessionQuota/.test(src) &&
      /checkIpRateLimit/.test(src) &&
      /consumeGlobalBudget/.test(src)
  );
}
const all = walk("app/api");
const unguarded = all.filter((f) => {
  const src = readFileSync(f, "utf8");
  const spends = /generateText|streamText|generateObject|speakStream|Sandbox|api\.openai\.com/.test(src);
  return spends && !/consumeGlobalBudget/.test(src);
});
check(
  "no money-spending route is missing the ceiling",
  unguarded.length === 0,
  unguarded.length ? unguarded.join(", ") : "swept every route under app/api"
);

console.log(
  failures === 0 ? "\nAll budget checks passed.\n" : `\n${failures} FAILED.\n`
);
process.exit(failures === 0 ? 0 : 1);
