// Drives a full interview through the local API as an authenticated user.
// Usage: node scripts/interview-test.mjs scripts/test-answers/run1.json [baseUrl]
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local"), quiet: true });

const answersFile = process.argv[2];
const baseUrl = process.argv[3] || "http://localhost:3000";
if (!answersFile) {
  console.error("Usage: node scripts/interview-test.mjs <answers.json> [baseUrl]");
  process.exit(1);
}
const answers = JSON.parse(readFileSync(answersFile, "utf8"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = "test@loopready.dev";
const PASSWORD = "loopready-test-1234";

// Ensure the test user exists and is confirmed
const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { error: createErr } = await admin.auth.admin.createUser({
  email: EMAIL,
  password: PASSWORD,
  email_confirm: true,
});
if (createErr && !/already/i.test(createErr.message)) {
  console.error("createUser failed:", createErr.message);
  process.exit(1);
}

// Sign in and build the @supabase/ssr cookie
const client = createClient(url, anon, { auth: { persistSession: false } });
const { data, error } = await client.auth.signInWithPassword({
  email: EMAIL,
  password: PASSWORD,
});
if (error) {
  console.error("signIn failed:", error.message);
  process.exit(1);
}
const projectRef = new URL(url).hostname.split(".")[0];
const encoded =
  "base64-" +
  Buffer.from(JSON.stringify(data.session)).toString("base64url");
const cookieName = `sb-${projectRef}-auth-token`;
// @supabase/ssr chunks cookies over ~3180 chars
const CHUNK = 3180;
const cookies = [];
if (encoded.length <= CHUNK) {
  cookies.push(`${cookieName}=${encoded}`);
} else {
  for (let i = 0; i * CHUNK < encoded.length; i++) {
    cookies.push(`${cookieName}.${i}=${encoded.slice(i * CHUNK, (i + 1) * CHUNK)}`);
  }
}
const cookieHeader = cookies.join("; ");

async function post(body) {
  const res = await fetch(`${baseUrl}/api/interview`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(json)}`);
  return json;
}

let r = await post({});
console.log(`\n[session ${r.sessionId}]`);
console.log(`\nINTERVIEWER: ${r.reply}`);

for (const answer of answers) {
  if (r.done) break;
  console.log(`\nCANDIDATE: ${answer}`);
  r = await post({ sessionId: r.sessionId, userMessage: answer });
  console.log(`\nINTERVIEWER (Q${r.questionIndex + 1}/${r.questionCount}${r.done ? ", done" : ""}): ${r.reply}`);
}

console.log(`\n=== ${r.done ? "COMPLETED" : "RAN OUT OF ANSWERS"} — session ${r.sessionId} ===`);
