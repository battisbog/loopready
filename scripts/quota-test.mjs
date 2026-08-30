// Verifies the daily session cap blocks free users and exempts paid plans.
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local"), quiet: true });
const baseUrl = "http://localhost:3000";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function cookieFor(email, password) {
  const c = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`${email}: ${error.message}`);
  const ref = new URL(url).hostname.split(".")[0];
  const enc =
    "base64-" + Buffer.from(JSON.stringify(data.session)).toString("base64url");
  const CH = 3180;
  const parts = [];
  if (enc.length <= CH) parts.push(`sb-${ref}-auth-token=${enc}`);
  else
    for (let i = 0; i * CH < enc.length; i++)
      parts.push(`sb-${ref}-auth-token.${i}=${enc.slice(i * CH, (i + 1) * CH)}`);
  return { cookie: parts.join("; "), userId: data.user.id };
}

async function startLoop(cookie) {
  const res = await fetch(`${baseUrl}/api/loop`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      company: "generic",
      level: "mid",
      rounds: ["behavioral"],
    }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, error: body.error, sessionId: body.sessionId };
}

async function clearToday(userId) {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { data: rows } = await admin
    .from("sessions")
    .select("id")
    .eq("user_id", userId)
    .gte("started_at", since.toISOString());
  const ids = (rows ?? []).map((r) => r.id);
  if (!ids.length) return;
  await admin.from("turns").delete().in("session_id", ids);
  await admin.from("feedback").delete().in("session_id", ids);
  await admin.from("sessions").delete().in("id", ids);
}

const LIMIT = Number(process.env.FREE_DAILY_SESSION_LIMIT ?? 3);

// --- free user hits the wall ---
const free = await cookieFor("test@loopready.dev", "loopready-test-1234");
await clearToday(free.userId);
await admin.from("profiles").upsert({ id: free.userId, plan: "free" });

console.log(`FREE user (limit ${LIMIT}/day):`);
for (let i = 1; i <= LIMIT + 1; i++) {
  const r = await startLoop(free.cookie);
  console.log(
    `  attempt ${i}: HTTP ${r.status}${r.error ? ` — ${r.error}` : " — session created"}`
  );
}

// --- unlimited user is exempt ---
const me = await cookieFor(process.env.DEV_TEST_EMAIL, process.env.DEV_TEST_PASSWORD);
const { data: prof } = await admin
  .from("profiles")
  .select("plan")
  .eq("id", me.userId)
  .single();
console.log(`\nUNLIMITED user (plan="${prof.plan}"), beyond the free limit:`);
await clearToday(me.userId);
for (let i = 1; i <= LIMIT + 1; i++) {
  const r = await startLoop(me.cookie);
  console.log(
    `  attempt ${i}: HTTP ${r.status}${r.error ? ` — ${r.error}` : " — session created"}`
  );
}

// tidy up so the dashboard isn't full of test rows
await clearToday(free.userId);
await clearToday(me.userId);
console.log("\n(cleaned up test sessions)");
