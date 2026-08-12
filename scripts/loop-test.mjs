// Config-driven gate run: starts a loop for a (company, level, rounds) config
// and plays an LLM candidate through it.
// Usage: node scripts/loop-test.mjs amazon sde3 behavioral
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local"), quiet: true });

const company = process.argv[2] ?? "generic";
const level = process.argv[3] ?? "mid";
const rounds = (process.argv[4] ?? "behavioral").split(",");
const baseUrl = "http://localhost:3000";

const PERSONA = `You are role-playing a competent senior software engineer in a behavioral
mock interview. You have real stories with specifics, but you are NOT perfect:
you sometimes lead with team framing before giving your individual role, and
you need one nudge before quantifying impact. Answer the interviewer's LAST
question directly. 80-140 words, first person, concrete.`;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
const { data, error } = await client.auth.signInWithPassword({
  email: "test@loopready.dev",
  password: "loopready-test-1234",
});
if (error) throw error;
const ref = new URL(url).hostname.split(".")[0];
const encoded =
  "base64-" + Buffer.from(JSON.stringify(data.session)).toString("base64url");
const CHUNK = 3180;
const cookies = [];
if (encoded.length <= CHUNK) cookies.push(`sb-${ref}-auth-token=${encoded}`);
else
  for (let i = 0; i * CHUNK < encoded.length; i++)
    cookies.push(`sb-${ref}-auth-token.${i}=${encoded.slice(i * CHUNK, (i + 1) * CHUNK)}`);
const cookieHeader = cookies.join("; ");

async function api(path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(json)}`);
  return json;
}

const history = [];
async function candidateAnswer() {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5.4",
      messages: [
        { role: "system", content: PERSONA },
        ...history.map((h) => ({
          role: h.role === "interviewer" ? "user" : "assistant",
          content: h.text,
        })),
      ],
    }),
  });
  const d = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(d.error));
  return d.choices[0].message.content.trim();
}

let r = await api("/api/loop", { company, level, rounds });
console.log(`=== ${company} / ${level} / ${rounds.join("+")} ===`);
console.log(`[loop ${r.loopId}] [session ${r.sessionId}]\n`);
console.log(`INTERVIEWER: ${r.reply}\n`);
history.push({ role: "interviewer", text: r.reply });

for (let turn = 0; turn < 12 && !r.done; turn++) {
  const answer = await candidateAnswer();
  history.push({ role: "candidate", text: answer });
  console.log(`CANDIDATE: ${answer.slice(0, 200)}...\n`);
  r = await api("/api/interview", { sessionId: r.sessionId, userMessage: answer });
  history.push({ role: "interviewer", text: r.reply });
  console.log(`INTERVIEWER: ${r.reply}\n`);
  if (r.nextRound) console.log(`>>> next round: ${r.nextRound.roundType} (${r.nextRound.sessionId})\n`);
}
console.log(`=== ${r.done ? "COMPLETED" : "TURN LIMIT"} — session ${r.sessionId} ===`);
