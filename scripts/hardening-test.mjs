// Verifies hardening layers against the running app with hostile inputs.
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
const { data } = await c.auth.signInWithPassword({
  email: process.env.DEV_TEST_EMAIL,
  password: process.env.DEV_TEST_PASSWORD,
});
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

const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const loop = await (
  await fetch(`${B}/api/loop`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({
      company: "google",
      level: "l4",
      rounds: ["coding"],
    }),
  })
).json();

const { data: sess } = await admin
  .from("sessions")
  .select("id, artifact")
  .eq("loop_id", loop.loopId)
  .single();

console.log("=== 1. INFINITE LOOP (must be stopped quickly) ===");
const fn = sess.artifact.problemId;
const t0 = Date.now();
const r1 = await fetch(`${B}/api/run`, {
  method: "POST",
  headers: H,
  body: JSON.stringify({
    sessionId: sess.id,
    language: "python",
    code: "import time\nwhile True:\n    time.sleep(0.1)\n",
  }),
});
const j1 = await r1.json();
console.log(`   elapsed: ${Date.now() - t0}ms (sandbox cap would be 60000ms)`);
console.log(`   message: ${(j1.compileError || j1.error || "").slice(0, 90)}`);

console.log("\n=== 2. HUGE OUTPUT (must be truncated, not buffered whole) ===");
const t1 = Date.now();
const r2 = await fetch(`${B}/api/run`, {
  method: "POST",
  headers: H,
  body: JSON.stringify({
    sessionId: sess.id,
    language: "python",
    code: "for i in range(2000000):\n    print('x' * 200)\n",
  }),
});
const j2 = await r2.json();
const size = JSON.stringify(j2).length;
console.log(`   elapsed: ${Date.now() - t1}ms | response size: ${size} bytes`);
console.log(`   bounded: ${size < 200_000 ? "yes" : "NO (unbounded!)"}`);

console.log("\n=== 3. HEALTH ENDPOINT ===");
const anon = await (await fetch(`${B}/api/health`)).json();
console.log("   public :", JSON.stringify(anon));
const auth = await (await fetch(`${B}/api/health`, { headers: { Cookie } })).json();
console.log("   signed-in:", JSON.stringify(auth));

// cleanup
const { data: rows } = await admin
  .from("sessions")
  .select("id")
  .eq("loop_id", loop.loopId);
await admin.from("turns").delete().in("session_id", rows.map((r) => r.id));
await admin.from("sessions").delete().eq("loop_id", loop.loopId);
await admin.from("loops").delete().eq("id", loop.loopId);
console.log("\n(cleaned up)");
