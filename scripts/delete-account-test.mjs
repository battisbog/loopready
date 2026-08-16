import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local"), quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const EMAIL = "delete-me@loopready.test", PW = "delete-me-12345";

await admin.auth.admin.createUser({ email: EMAIL, password: PW, email_confirm: true }).catch(()=>{});
const { data: list } = await admin.auth.admin.listUsers();
const u = list.users.find(x => x.email === EMAIL);

// Seed data in EVERY table the user touches.
const { data: loop } = await admin.from("loops").insert({ user_id: u.id, company: "amazon", level: "sde2", rounds: ["behavioral"] }).select().single();
const { data: sess } = await admin.from("sessions").insert({ user_id: u.id, loop_id: loop.id, round_type: "behavioral" }).select().single();
await admin.from("turns").insert([{ session_id: sess.id, role: "interviewer", text: "hi" }, { session_id: sess.id, role: "candidate", text: "hello" }]);
await admin.from("feedback").insert({ session_id: sess.id, overall_signal: "hire", content: { x: 1 } });
await admin.from("video_credit_events").insert({ user_id: u.id, session_id: sess.id, action: "grant" });
await admin.from("profiles").upsert({ id: u.id, subscription_tier: "free" });

const counts = async (label) => {
  const out = {};
  for (const [t, c] of [["loops","user_id"],["sessions","user_id"],["profiles","id"],["video_credit_events","user_id"]]) {
    const { count } = await admin.from(t).select("*", { count: "exact", head: true }).eq(c, u.id);
    out[t] = count ?? 0;
  }
  const { count: turns } = await admin.from("turns").select("*", { count: "exact", head: true }).eq("session_id", sess.id);
  const { count: fb } = await admin.from("feedback").select("*", { count: "exact", head: true }).eq("session_id", sess.id);
  out.turns = turns ?? 0; out.feedback = fb ?? 0;
  console.log(label, JSON.stringify(out));
  return out;
};
await counts("BEFORE:");

// Sign in as the doomed user and call the real endpoint.
const c = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const { data: s } = await c.auth.signInWithPassword({ email: EMAIL, password: PW });
const ref = new URL(url).hostname.split(".")[0];
const enc = "base64-" + Buffer.from(JSON.stringify(s.session)).toString("base64url");
const CH = 3180, parts = [];
if (enc.length <= CH) parts.push(`sb-${ref}-auth-token=${enc}`);
else for (let i = 0; i * CH < enc.length; i++) parts.push(`sb-${ref}-auth-token.${i}=${enc.slice(i*CH,(i+1)*CH)}`);
const Cookie = parts.join("; ");

console.log("\n-- wrong confirmation (must refuse) --");
const bad = await fetch("http://localhost:3000/api/account/delete", { method:"POST", headers:{"Content-Type":"application/json",Cookie}, body: JSON.stringify({ confirm: "yes" }) });
console.log("  HTTP", bad.status, (await bad.json()).error);

console.log("\n-- correct confirmation --");
const res = await fetch("http://localhost:3000/api/account/delete", { method:"POST", headers:{"Content-Type":"application/json",Cookie}, body: JSON.stringify({ confirm: EMAIL }) });
console.log("  HTTP", res.status, JSON.stringify(await res.json()));

await counts("\nAFTER:");
const { data: after } = await admin.auth.admin.listUsers();
console.log("auth user still exists:", after.users.some(x => x.email === EMAIL));
