// Measures time-to-first-audio for the blocking vs streaming pipelines.
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local"), quiet: true });
const baseUrl = "http://localhost:3000";

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
const H = { "Content-Type": "application/json", Cookie: cookieHeader };

const ANSWER =
  "I led the migration of our billing pipeline off a legacy cron system. I designed the event-driven replacement, ran both systems in shadow mode for six weeks, and cut the mischarge rate from 0.7 percent to under 0.01 percent.";

async function newSession() {
  const res = await fetch(`${baseUrl}/api/loop`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ company: "amazon", level: "sde2", rounds: ["behavioral"] }),
  });
  return (await res.json()).sessionId;
}

// --- BEFORE: block on full LLM reply, then block on full TTS ---
async function measureBlocking() {
  const sessionId = await newSession();
  const t0 = Date.now();
  const res = await fetch(`${baseUrl}/api/interview`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ sessionId, userMessage: ANSWER }),
  });
  const data = await res.json();
  const llmDone = Date.now() - t0;

  const tts = await fetch(`${baseUrl}/api/tts`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ text: data.reply }),
  });
  await tts.arrayBuffer(); // old client awaited res.blob() — the whole clip
  const audioReady = Date.now() - t0;

  return { llmDone, audioReady, chars: data.reply.length };
}

// --- AFTER: first sentence streams out, TTS starts on its first bytes ---
async function measureStreaming() {
  const sessionId = await newSession();
  const t0 = Date.now();
  const res = await fetch(`${baseUrl}/api/interview/stream`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ sessionId, userMessage: ANSWER }),
  });

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let firstSentence = null;
  let firstSentenceAt = null;
  let fullAt = null;

  outer: while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let sep;
    while ((sep = buf.indexOf("\n\n")) !== -1) {
      const frame = buf.slice(0, sep);
      buf = buf.slice(sep + 2);
      const ev = /event: (\w+)/.exec(frame)?.[1];
      const dataLine = frame.split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) continue;
      const payload = JSON.parse(dataLine.slice(5).trim());
      if (ev === "sentence" && !firstSentence) {
        firstSentence = payload.text;
        firstSentenceAt = Date.now() - t0;
      }
      if (ev === "done") {
        fullAt = Date.now() - t0;
        break outer;
      }
    }
  }

  // Time until the first audio BYTE (not the whole clip) is available.
  const tAudio = Date.now();
  const tts = await fetch(`${baseUrl}/api/tts`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ text: firstSentence }),
  });
  const r = tts.body.getReader();
  await r.read();
  const firstByteAt = firstSentenceAt + (Date.now() - tAudio);
  await r.cancel();

  return { firstSentenceAt, firstByteAt, fullAt, firstSentence };
}

console.log("Measuring… (each run is a fresh session)\n");

const before = await measureBlocking();
console.log("BEFORE — blocking pipeline");
console.log(`  full LLM reply ready:      ${before.llmDone} ms  (${before.chars} chars)`);
console.log(`  full TTS clip downloaded:  ${before.audioReady} ms  ← audio starts here\n`);

const after = await measureStreaming();
console.log("AFTER — streaming pipeline");
console.log(`  first sentence emitted:    ${after.firstSentenceAt} ms`);
console.log(`  first audio byte playable: ${after.firstByteAt} ms  ← audio starts here`);
console.log(`  full reply finished:       ${after.fullAt} ms`);
console.log(`  first spoken chunk: "${after.firstSentence}"\n`);

const saved = before.audioReady - after.firstByteAt;
console.log(
  `Time-to-first-audio: ${before.audioReady} ms → ${after.firstByteAt} ms  (${saved} ms faster, ${Math.round((saved / before.audioReady) * 100)}% reduction)`
);
