// Gate run for the coding round: an LLM candidate talks through a problem,
// writes code, runs it against the real sandbox, and iterates.
// Usage: node scripts/coding-test.mjs [company] [level] [persona]
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local"), quiet: true });

const company = process.argv[2] ?? "google";
const level = process.argv[3] ?? "l4";
const persona = process.argv[4] ?? "strong";
const baseUrl = "http://localhost:3000";

const PERSONAS = {
  strong: `You are a strong candidate in a SYSTEM DESIGN interview. You clarify
requirements and scale FIRST, do real back-of-envelope math out loud, then draw
components. You volunteer bottlenecks and failure modes. Keep spoken parts under
100 words.`,
  silent: `You are a mediocre candidate in a SYSTEM DESIGN interview. You name
technologies immediately without asking about scale, you avoid doing arithmetic,
and you say things "scale well" without justification. Keep responses under 70
words.`,
};

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
  if (!res.ok) throw new Error(`${path} ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

const history = [];
let currentDiagram = { nodes: [], edges: [] };

async function candidateTurn() {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5.4",
      messages: [
        {
          role: "system",
          content: `${PERSONAS[persona]}

Reply as JSON only: {"say": "<what you say out loud>", "nodes": [{"id":"n1","label":"Load Balancer","kind":"load-balancer"}], "edges": [{"source":"n1","target":"n2","label":"HTTP"}]}
Include the FULL current diagram each time (nodes+edges), or null to leave unchanged.
Your current diagram is:
${JSON.stringify(currentDiagram)}`,
        },
        ...history.map((h) => ({
          role: h.role === "interviewer" ? "user" : "assistant",
          content: h.text,
        })),
      ],
      response_format: { type: "json_object" },
    }),
  });
  const d = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(d.error));
  return JSON.parse(d.choices[0].message.content);
}

let r = await api("/api/loop", { company, level, rounds: ["system_design"] });
console.log(`=== design · ${company}/${level} · persona=${persona} ===`);
console.log(`[session ${r.sessionId}]\n`);
console.log(`INTERVIEWER: ${r.reply}\n`);
history.push({ role: "interviewer", text: r.reply });

for (let turn = 0; turn < 8 && !r.done; turn++) {
  const move = await candidateTurn();
  if (move.nodes) currentDiagram = { nodes: move.nodes, edges: move.edges ?? [] };
  history.push({ role: "candidate", text: move.say });
  console.log(`CANDIDATE: ${move.say}`);
  if (move.nodes)
    console.log(`  [diagram: ${currentDiagram.nodes.length} nodes, ${currentDiagram.edges.length} edges]`);
  console.log();

  r = await api("/api/interview", {
    sessionId: r.sessionId,
    userMessage: move.say,
    artifact: currentDiagram,
  });
  history.push({ role: "interviewer", text: r.reply });
  console.log(`INTERVIEWER: ${r.reply}\n`);
}

console.log(`=== session ${r.sessionId} ===`);
