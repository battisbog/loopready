// Adaptive gate run: an LLM plays a strong candidate responding to the real
// interviewer probes. Usage: node scripts/candidate-sim.mjs [baseUrl]
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local"), quiet: true });
const baseUrl = process.argv[2] || "http://localhost:3000";

const PERSONA = `You are role-playing a genuinely strong senior software engineer in a
behavioral mock interview. You have real stories with specific numbers,
individual ownership, honest failures with costs, and lessons applied later.
Answer the interviewer's LAST question directly and responsively — address
exactly what they asked, don't pivot to a different story. Keep answers to
80-150 words, first person, concrete, quantified where natural. Never be
vague; when asked for evidence, sequences, or names of allies, provide them.`;

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

async function api(body) {
  const res = await fetch(`${baseUrl}/api/interview`, {
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

let r = await api({});
console.log(`[session ${r.sessionId}]\n`);
console.log(`INTERVIEWER: ${r.reply}\n`);
history.push({ role: "interviewer", text: r.reply });

for (let turn = 0; turn < 12 && !r.done; turn++) {
  const answer = await candidateAnswer();
  history.push({ role: "candidate", text: answer });
  console.log(`CANDIDATE: ${answer}\n`);
  r = await api({ sessionId: r.sessionId, userMessage: answer });
  history.push({ role: "interviewer", text: r.reply });
  console.log(`INTERVIEWER (Q${r.questionIndex + 1}${r.done ? ", done" : ""}): ${r.reply}\n`);
}
console.log(`=== ${r.done ? "COMPLETED" : "TURN LIMIT"} — ${r.sessionId} ===`);
