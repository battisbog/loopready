import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { Redis } from "@upstash/redis";
import dotenv from "dotenv";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local"), quiet: true });
const B = "http://localhost:3000";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});
const day = new Date().toISOString().slice(0, 10);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const c = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const { data } = await c.auth.signInWithPassword({ email: "test@loopready.dev", password: "loopready-test-1234" });
const ref = new URL(url).hostname.split(".")[0];
const enc = "base64-" + Buffer.from(JSON.stringify(data.session)).toString("base64url");
const CH = 3180, parts = [];
if (enc.length <= CH) parts.push(`sb-${ref}-auth-token=${enc}`);
else for (let i = 0; i * CH < enc.length; i++) parts.push(`sb-${ref}-auth-token.${i}=${enc.slice(i*CH,(i+1)*CH)}`);
const Cookie = parts.join("; ");
const H = { "Content-Type": "application/json", Cookie };

const usage = async (label) => {
  const u = await redis.get(`loopready:usage:user:${data.user.id}:${day}`);
  console.log(`   ${label} per-user usage counter: ${u ?? 0}`);
  return Number(u ?? 0);
};

console.log("=== A. unauthenticated is rejected before any gate ===");
for (const p of ["/api/interview", "/api/tts", "/api/transcribe", "/api/run", "/api/interview/stream"]) {
  const r = await fetch(B + p, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  process.stdout.write(`   ${p} -> ${r.status}\n`);
}

console.log("\n=== B. global daily cap forces 503 (cap temporarily set to 1) ===");
await redis.set(`loopready:spend:${day}`, 99999, { ex: 300 });
const before = await usage("before:");
const r503 = await fetch(`${B}/api/tts`, { method: "POST", headers: H, body: JSON.stringify({ text: "hello" }) });
const body503 = await r503.json().catch(() => ({}));
console.log(`   /api/tts -> ${r503.status} ${body503.error?.slice(0, 60) ?? ""}`);
const after = await usage("after: ");
console.log(`   recordUsage did NOT fire on rejection: ${after === before ? "correct" : "WRONG"}`);

console.log("\n=== C. reset cap, a real paid call succeeds and IS counted ===");
await redis.del(`loopready:spend:${day}`);
const ok = await fetch(`${B}/api/tts`, { method: "POST", headers: H, body: JSON.stringify({ text: "Tell me about a conflict." }) });
console.log(`   /api/tts -> ${ok.status} (${(await ok.arrayBuffer()).byteLength} bytes audio)`);
await new Promise(r => setTimeout(r, 800));
const counted = await usage("after: ");
console.log(`   recordUsage fired on success: ${counted > after ? "correct" : "WRONG"}`);

console.log("\n=== D. signup is IP limited (limit 8/hour) ===");
const ipKey = "loopready:ip:signup";
let first429 = null, sent = 0;
for (let i = 1; i <= 11; i++) {
  const r = await fetch(`${B}/api/auth/signup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: `abuse${i}@example.com` }) });
  if (r.status === 429 && !first429) first429 = i;
  if (r.status !== 429) sent++;
}
console.log(`   allowed: ${sent}, first 429 at attempt #${first429 ?? "never"}`);

console.log("\n=== E. global spend counter is tracking real calls ===");
console.log(`   loopready:spend:${day} = ${await redis.get(`loopready:spend:${day}`)}`);
