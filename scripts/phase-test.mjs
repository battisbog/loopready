import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local"), quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const c = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const { data } = await c.auth.signInWithPassword({ email: process.env.DEV_TEST_EMAIL, password: process.env.DEV_TEST_PASSWORD });
const ref = new URL(url).hostname.split(".")[0];
const enc = "base64-" + Buffer.from(JSON.stringify(data.session)).toString("base64url");
const CH = 3180, parts = [];
if (enc.length <= CH) parts.push(`sb-${ref}-auth-token=${enc}`);
else for (let i = 0; i * CH < enc.length; i++) parts.push(`sb-${ref}-auth-token.${i}=${enc.slice(i*CH,(i+1)*CH)}`);
const H = { "Content-Type": "application/json", Cookie: parts.join("; ") };
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const loop = await (await fetch("http://localhost:3000/api/loop", { method:"POST", headers:H, body: JSON.stringify({ company:"amazon", level:"sde2", rounds:["behavioral"] }) })).json();
const sid = loop.sessionId;
const phase = async () => (await admin.from("sessions").select("phase,question_index").eq("id",sid).single()).data;

console.log("── TURN 0 (session created) ──");
console.log("phase:", JSON.stringify(await phase()));
console.log("INTERVIEWER:", loop.reply, "\n");

const say = async (text) => {
  const r = await (await fetch("http://localhost:3000/api/interview", { method:"POST", headers:H, body: JSON.stringify({ sessionId: sid, userMessage: text }) })).json();
  return r;
};

console.log("── candidate introduces themselves ──");
let r = await say("Sure. I'm a backend engineer with about five years of experience, mostly on payments and billing systems. Recently I've been leading a migration off a legacy cron pipeline onto an event-driven design.");
console.log("phase:", JSON.stringify(await phase()));
console.log("INTERVIEWER:", r.reply, "\n");

console.log("── candidate says they're ready ──");
r = await say("That sounds good, no questions from me. Ready when you are.");
console.log("phase:", JSON.stringify(await phase()));
console.log("INTERVIEWER:", r.reply, "\n");

console.log("── candidate answers question 1 ──");
r = await say("We migrated the billing pipeline. It went well and everyone was happy with the result.");
console.log("phase:", JSON.stringify(await phase()));
console.log("INTERVIEWER (should probe, not accept):", r.reply);

const { data: rows } = await admin.from("sessions").select("id").eq("loop_id", loop.loopId);
await admin.from("turns").delete().in("session_id", rows.map(x=>x.id));
await admin.from("sessions").delete().eq("loop_id", loop.loopId);
await admin.from("loops").delete().eq("id", loop.loopId);
