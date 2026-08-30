// M9 gate: run a multi-round loop to completion, then synthesise the verdict.
// Rounds are answered briefly to keep the run cheap; the point is the
// cross-round reconciliation, not the individual debriefs.
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local"), quiet: true });
const B = "http://localhost:3000";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const c = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
const { data, error } = await c.auth.signInWithPassword({
  email: process.env.DEV_TEST_EMAIL,
  password: process.env.DEV_TEST_PASSWORD,
});
if (error) throw error;
const ref = new URL(url).hostname.split(".")[0];
const enc =
  "base64-" + Buffer.from(JSON.stringify(data.session)).toString("base64url");
const CH = 3180;
const parts = [];
if (enc.length <= CH) parts.push(`sb-${ref}-auth-token=${enc}`);
else
  for (let i = 0; i * CH < enc.length; i++)
    parts.push(`sb-${ref}-auth-token.${i}=${enc.slice(i * CH, (i + 1) * CH)}`);
const Cookie = parts.join("; ");
const H = { "Content-Type": "application/json", Cookie };

const post = async (path, body) => {
  const r = await fetch(B + path, { method: "POST", headers: H, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(`${path} ${r.status}: ${JSON.stringify(j).slice(0, 200)}`);
  return j;
};

// Deliberately uneven: strong behavioral, weak coding. A real loop should
// reconcile those rather than average them.
const ANSWERS = {
  behavioral: [
    "I owned the migration of our billing pipeline off a legacy cron system that was mischarging about $40k a month. I proposed it after tracing three escalations to race conditions, designed the event-driven replacement myself, and ran six weeks of shadow mode. Mischarge rate went from 0.7% of invoices to under 0.01%, and billing pages dropped from twelve a month to one.",
    "The hardest moment was shadow mode surfacing diffs that were bugs in the legacy system, not mine. I wrote a one-page policy: replicate customer-visible behaviour unless it overcharged, fix silent undercharges, escalate overcharges to finance. Finance refunded $180k, which was uncomfortable, but my director said it saved two enterprise renewals.",
    "If I had not driven it, it would have stayed on the roadmap another year. The forcing function was putting a dollar figure on the mischarges.",
  ],
  coding: [
    "I think I would just loop through the array and check every pair.",
    "Um, I am not sure how to make it faster. Maybe sorting helps?",
    "I think it works now. I did not really check the edge cases.",
  ],
};

const loop = await post("/api/loop", {
  company: "amazon",
  level: "sde2",
  rounds: ["behavioral", "coding"],
});
console.log(`loop ${loop.loopId}\n`);

let sessionId = loop.sessionId;
let round = "behavioral";
const sessionIds = [];

for (let guard = 0; guard < 30; guard++) {
  sessionIds.push(sessionId);
  const pool = ANSWERS[round];
  let r = null;
  for (const answer of pool) {
    r = await post("/api/interview", { sessionId, userMessage: answer });
    if (r.done) break;
  }
  // Out of scripted answers but the round is still going: end it here.
  if (!r?.done) {
    const ended = await post("/api/interview/end", { sessionId });
    console.log(`${round}: ended early`);
    r = { done: true, nextRound: ended.nextRound, loopComplete: ended.loopComplete };
    // Ending early does not emit nextRound, so start the next round manually.
    const { data: rows } = await createClient(
      url,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    )
      .from("sessions")
      .select("id, round_type, status")
      .eq("loop_id", loop.loopId)
      .order("round_order", { ascending: true });
    const pending = (rows ?? []).find((x) => x.status === "active");
    if (pending) {
      sessionId = pending.id;
      round = pending.round_type;
      continue;
    }
  } else {
    console.log(`${round}: completed`);
  }

  if (r.nextRound) {
    sessionId = r.nextRound.sessionId;
    round = r.nextRound.roundType;
    sessionIds.push(sessionId);
    continue;
  }
  console.log(`loopComplete: ${r.loopComplete ?? "(none)"}\n`);
  break;
}

// Each round needs its own debrief before the loop can be reconciled.
const uniq = [...new Set(sessionIds)];
for (const id of uniq) {
  try {
    const fb = await post("/api/feedback", { sessionId: id });
    console.log(`round debrief ${id.slice(0, 8)}: ${fb.overallSignal}`);
  } catch (e) {
    console.log(`round debrief ${id.slice(0, 8)}: skipped (${String(e).slice(0, 60)})`);
  }
}

console.log("\n=== COMBINED LOOP VERDICT ===");
const s = await post("/api/loop/summary", { loopId: loop.loopId });
console.log("signal   :", s.overallSignal);
console.log("headline :", s.headline);
console.log("summary  :", s.summary);
console.log("\nper round:");
s.perRound.forEach((r) => console.log(`  [${r.signal}] ${r.round}: ${r.verdict}`));
console.log("\nfix first:", s.fixFirst.issue);
console.log("  why :", s.fixFirst.why);
console.log("  how :", s.fixFirst.how);
console.log("\nreadiness:", s.readiness);
console.log(`\nloop page: ${B}/loop/${loop.loopId}`);
