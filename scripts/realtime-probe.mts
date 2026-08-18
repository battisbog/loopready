/**
 * Captures a real event timeline from the OpenAI Realtime API using the app's
 * OWN session config, instructions and event ordering.
 *
 * Why a probe instead of clicking through the app: the failure being chased is
 * about the ORDER of events, and a browser gives no durable record of that.
 * This drives the identical event sequence over a WebSocket, so what comes back
 * is what production would get.
 *
 * The only deliberate difference from the browser is transport (WebSocket
 * rather than WebRTC), which does not change session config, turn detection, or
 * response scheduling.
 *
 *   npx tsx scripts/realtime-probe.mts behavioral
 *   npx tsx scripts/realtime-probe.mts coding
 *   npx tsx scripts/realtime-probe.mts system_design
 */
import { readFileSync } from "node:fs";
import WebSocket from "ws";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
}

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) throw new Error("OPENAI_API_KEY missing");

const { REALTIME_MODEL, REALTIME_VOICE, TURN_DETECTION } = await import(
  "../lib/realtime/config.ts"
);
const {
  buildInstructions,
  buildGreeting,
  shouldGreet,
  ADVANCE_TOOL,
} = await import("../lib/realtime/conversation.ts");
const { pickSessionQuestions } = await import("../lib/interview/questions.ts");
const { getContext } = await import("../lib/interview/companies.ts");

const roundType = (process.argv[2] ?? "behavioral") as
  | "behavioral"
  | "coding"
  | "system_design";

/**
 * quiet — no mic audio at all until the greeting finishes.
 * noise — low-level ambient room noise from the moment the session opens,
 *         which is what a real open mic actually sends.
 */
const scenario = (process.argv[3] ?? "quiet") as
  | "quiet"
  | "noise"
  /** Byte-for-byte what the browser does today, seeded history included. */
  | "production"
  /** The advance path: our server's sayNext racing the VAD auto-response. */
  | "advance"
  /** The fixed transition: forward-looking instructions via session.update. */
  | "transition";

// Mirrors what startSession writes for a fresh round.
const session = {
  round_type: roundType,
  question_index: 0,
  followup_count: 0,
  questions: roundType === "behavioral" ? pickSessionQuestions() : null,
  artifact:
    roundType === "coding"
      ? { problemId: "two-sum", language: "python", code: "def two_sum(nums, target):\n    pass\n" }
      : roundType === "system_design"
        ? { promptId: "url-shortener", nodes: [], edges: [] }
        : {},
};
const ctx = getContext("Google", "L4");

const openingState = {
  questionIndex: session.question_index,
  followupCount: session.followup_count,
  phase: "questions" as const,
  done: false,
};
const instructions = buildInstructions(session, openingState, ctx);
const greeting = buildGreeting(session, ctx);

// Exactly what the server now computes: a fresh session has one seeded
// interviewer row and no candidate rows, so it must still be greeted.
const SEEDED_TURNS = [{ role: "interviewer", text: "" }];
const serverSaysGreet = shouldGreet(SEEDED_TURNS);

// ------------------------------------------------------------------ timeline

const t0 = Date.now();
const NOISY = new Set([
  "response.output_audio.delta",
  "response.output_audio_transcript.delta",
  "response.function_call_arguments.delta",
  "conversation.item.input_audio_transcription.delta",
  "response.text.delta",
  "response.output_item.added",
  "response.content_part.added",
  "response.content_part.done",
  "rate_limits.updated",
]);
const counts = new Map<string, number>();
let audioBytes = 0;

function log(dir: string, type: string, detail = "") {
  const t = String(Date.now() - t0).padStart(6);
  console.log(`[${t}ms] ${dir} ${type}${detail ? "  " + detail : ""}`);
}

let firedSayNext = false;
let secondTurnDone = false;

function record(e: Record<string, unknown>) {
  const type = String(e.type);
  if (type === "response.created") sawResponse = true;

  // Mirrors use-realtime-turn: the candidate transcript triggers a POST to
  // /api/realtime/turn, and when the server says the question advanced the
  // client immediately calls live.speak(sayNext). The auto-response from VAD
  // is already in flight by then.
  // The FIXED path: the server pushes forward-looking instructions instead of
  // trying to speak. session.update never competes with an in-flight response.
  if (
    scenario === "transition" &&
    type === "conversation.item.input_audio_transcription.completed" &&
    !firedSayNext
  ) {
    firedSayNext = true;
    setTimeout(() => {
      send(
        {
          type: "session.update",
          session: { type: "realtime", instructions: MOVE_ON_INSTRUCTIONS },
        },
        "forward-looking MOVE ON instructions"
      );
    }, 180);
  }

  if (
    scenario === "advance" &&
    type === "conversation.item.input_audio_transcription.completed" &&
    !firedSayNext
  ) {
    firedSayNext = true;
    const roundTrip = 180; // a realistic /api/realtime/turn latency
    setTimeout(() => {
      send(
        {
          type: "response.create",
          response: {
            instructions: SAY_NEXT,
          },
        },
        "our server's sayNext, fired after the state machine advanced"
      );
    }, roundTrip);
  }
  if (type === "response.output_audio.delta") {
    audioBytes += String(e.delta ?? "").length;
  }
  if (NOISY.has(type)) {
    const n = (counts.get(type) ?? 0) + 1;
    counts.set(type, n);
    if (n === 1) log("<--", type, "(first, rest counted)");
    return;
  }

  let detail = "";
  switch (type) {
    case "session.created":
    case "session.updated": {
      const td = (e.session as any)?.audio?.input?.turn_detection;
      detail = `turn_detection=${JSON.stringify(td)}`;
      break;
    }
    case "response.created":
      detail = `id=${(e.response as any)?.id}`;
      break;
    case "response.done": {
      const r = e.response as any;
      const out = (r?.output ?? []).map((o: any) => o.type).join(",") || "EMPTY";
      const why =
        r?.status_details?.reason ??
        r?.status_details?.error?.message ??
        "";
      const u = r?.usage;
      const it = u?.input_token_details ?? {};
      const ot = u?.output_token_details ?? {};
      detail =
        `status=${r?.status}${why ? ` reason=${why}` : ""} output=[${out}]` +
        (u
          ? `\n            USAGE in=${u.input_tokens} (text ${it.text_tokens ?? 0}, audio ${it.audio_tokens ?? 0}, cached ${u.input_token_details?.cached_tokens ?? 0})` +
            ` out=${u.output_tokens} (text ${ot.text_tokens ?? 0}, audio ${ot.audio_tokens ?? 0})`
          : "");
      audioBytes = 0;
      break;
    }
    case "conversation.item.input_audio_transcription.completed":
      detail = `"${e.transcript}"`;
      break;
    case "response.output_audio_transcript.done":
      detail = `"${String(e.transcript ?? "").slice(0, 140)}"`;
      break;
    case "response.function_call_arguments.done":
      detail = `${e.name} ${e.arguments}`;
      break;
    case "error":
      detail = JSON.stringify(e.error);
      break;
  }
  log("<--", type, detail);
}

// -------------------------------------------------------------------- driver

const ws = new WebSocket(
  `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(REALTIME_MODEL)}`,
  { headers: { Authorization: `Bearer ${KEY}` } }
);

function send(event: Record<string, unknown>, detail = "") {
  log("-->", String(event.type), detail);
  ws.send(JSON.stringify(event));
}

/** Speaks a candidate answer with TTS so semantic VAD sees genuine speech. */
async function candidateAudio(text: string): Promise<Buffer> {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text,
      response_format: "pcm", // 24kHz mono s16le, exactly what realtime wants
      speed: 1.0,
    }),
  });
  if (!res.ok) throw new Error(`TTS failed ${res.status}: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

/** 100ms of 24kHz mono s16le at a realistic room-noise floor. */
function ambient(seconds: number): Buffer {
  const n = Math.floor(24000 * seconds);
  const b = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    // About -60 dBFS, which is roughly what a mic with noiseSuppression on
    // actually emits in a quiet room.
    b.writeInt16LE(Math.round((Math.random() - 0.5) * 66), i * 2);
  }
  return b;
}

function silence(seconds: number): Buffer {
  return Buffer.alloc(Math.floor(24000 * seconds) * 2);
}

/**
 * Keeps the mic "open" with room tone until the model creates a response, the
 * way a real session does. Resolves early the moment it sees one.
 */
let sawResponse = false;
async function holdOpen(maxSeconds: number) {
  const started = Date.now();
  let k = 0;
  while (!sawResponse && Date.now() - started < maxSeconds * 1000) {
    ws.send(
      JSON.stringify({
        type: "input_audio_buffer.append",
        audio: ambient(0.1).toString("base64"),
      })
    );
    k++;
    const wait = started + k * 100 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }
  log(
    " * ",
    sawResponse ? "hold.released" : "hold.timeout",
    `${((Date.now() - started) / 1000).toFixed(1)}s of open mic after the answer`
  );
}

/** Streams PCM at wall-clock speed, exactly as a live mic would. */
async function streamPcm(pcm: Buffer, label: string) {
  const CHUNK = 4800; // 100ms at 24kHz mono s16le
  const started = Date.now();
  for (let i = 0, k = 0; i < pcm.length; i += CHUNK, k++) {
    ws.send(
      JSON.stringify({
        type: "input_audio_buffer.append",
        audio: pcm.subarray(i, i + CHUNK).toString("base64"),
      })
    );
    const target = started + k * 100;
    const wait = target - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }
  log(" * ", "audio.streamed", `${label}: ${(pcm.length / 48000).toFixed(1)}s`);
}

// Short enough to land inside a single VAD segment, so the capture shows one
// clean turn rather than a turn the probe itself chopped in half.
/** The real opening text startSession writes into `turns`. */
const SEEDED_OPENING =
  "Hi, thanks for joining. I'm a senior engineer at Google and I'll be running your behavioral round today. It's about three questions and I may dig into your answers.";

/** Verbatim from app/api/realtime/turn/route.ts when a question advances. */
const SAY_NEXT =
  'Briefly acknowledge their answer in a few neutral words, then ask exactly this question: "Tell me about a time you had to influence a team without authority."';

/** What buildInstructions emits once the follow-up budget is spent. */
const MOVE_ON_INSTRUCTIONS =
  buildInstructions(
    { ...session, question_index: 0, followup_count: 2, phase: "questions" },
    { questionIndex: 0, followupCount: 2, phase: "questions", done: false },
    ctx
  );

const ANSWER =
  "Sure. I owned the checkout service, and during Black Friday our p99 latency jumped from 200 milliseconds to about 4 seconds. I found an N plus one query against inventory, added a batch endpoint, and brought it back down to 180.";

console.log(`\n=== ROUND: ${roundType} | scenario: ${scenario} | model ${REALTIME_MODEL} ===`);
console.log(`instructions: ${instructions.length} chars`);
console.log(`greeting instruction: "${greeting}"\n`);
console.log("--- (a) SESSION START THROUGH GREETING ---");

let phase: "greeting" | "candidate" | "done" = "greeting";
let greetingResponses = 0;

ws.on("open", () => {
  log(" * ", "ws.open");

  // Identical to what /api/realtime/session sends when minting the secret.
  send(
    {
      type: "session.update",
      session: {
        type: "realtime",
        model: REALTIME_MODEL,
        instructions,
        tools: [ADVANCE_TOOL],
        tool_choice: "auto",
        audio: {
          input: {
            transcription: { model: "whisper-1" },
            turn_detection: TURN_DETECTION,
          },
          output: { voice: REALTIME_VOICE },
        },
      },
    },
    `${instructions.length} chars of instructions`
  );

  // RealtimeSession.onChannelOpen. In production the server always returns at
  // least one turn, because startSession writes the opening line into `turns`
  // before the round ever loads.
  // The server now suppresses the seeded opening when it is about to greet,
  // because that line was never actually spoken aloud.
  const history =
    scenario === "production" && !serverSaysGreet
      ? [{ role: "interviewer", text: SEEDED_OPENING }]
      : [];

  for (const t of history) {
    send(
      {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: t.text }],
        },
      },
      "seeded prior turn from the DB"
    );
  }

  if (scenario === "production") {
    log(
      " * ",
      "greeting.decision",
      `seeded turns=1, candidate turns=0 -> shouldGreet=${serverSaysGreet}`
    );
  }

  if (serverSaysGreet || history.length === 0) {
    send(
      { type: "response.create", response: { instructions: greeting } },
      "THE GREETING"
    );
  } else {
    log(
      " * ",
      "greeting.SKIPPED",
      `history.length=${history.length}, so no response.create is ever sent`
    );
    // Nothing further happens until the candidate speaks. Prove it.
    void (async () => {
      await new Promise((r) => setTimeout(r, 6000));
      log(" * ", "greeting.silence.check", "6s elapsed with no response from the model");
      const pcm = await candidateAudio("Hello? Can you hear me?");
      await streamPcm(pcm, "candidate says hello into the silence");
      await holdOpen(20);
    })();
  }

  // In the browser the mic track is added BEFORE the offer, so audio flows from
  // the instant the connection is up. This reproduces that.
  if (scenario === "noise") {
    log(" * ", "mic.ambient.start", "streaming room tone, as an open mic does");
    void streamPcm(ambient(12), "ambient room tone");
  }
});

ws.on("message", async (raw) => {
  const e = JSON.parse(raw.toString());
  record(e);

  if (e.type === "response.done" && phase === "greeting") {
    greetingResponses++;
    const r = e.response;
    const spoke = (r?.output ?? []).length > 0;
    console.log(
      `\n>>> GREETING RESULT: status=${r?.status}` +
        `${r?.status_details?.reason ? ` reason=${r.status_details.reason}` : ""}` +
        `, produced_output=${spoke}\n`
    );
    phase = "candidate";
    // Reset: the greeting's own response must not count as the reply we are
    // waiting for.
    sawResponse = false;

    console.log("--- (b) ONE CANDIDATE TURN THROUGH THE AI REPLY ---");
    const pcm = await candidateAudio(ANSWER);
    log(" * ", "tts.ready", `${pcm.length} bytes of 24kHz PCM`);

    // Paced at true wall-clock speed. Sending faster makes VAD see a second
    // utterance start before the first has drained, which is an artifact of
    // the probe rather than anything production would do.
    await streamPcm(pcm, "candidate answer");
    // A real mic never stops sending. Cutting the stream dead leaves semantic
    // VAD with nothing to evaluate, so it can never decide the turn ended;
    // keep feeding room tone until the model actually responds.
    log(" * ", "candidate.audio.sent", `${(pcm.length / 48000).toFixed(1)}s of speech, now holding the line open`);
    await holdOpen(25);
    // Deliberately NOT committing the buffer: semantic VAD should end the turn
    // on its own, which is what production relies on.
  } else if (e.type === "response.done" && phase === "candidate" && scenario === "transition" && !secondTurnDone) {
    secondTurnDone = true;
    console.log("\n--- (c) NEXT TURN: does it acknowledge AND move on? ---");
    sawResponse = false;
    const pcm = await candidateAudio(
      "Right, and after that I wrote a postmortem and added alerting on the p99 so we would catch it earlier next time."
    );
    await streamPcm(pcm, "second candidate answer");
    await holdOpen(25);
  } else if (e.type === "response.done" && phase === "candidate") {
    phase = "done";
    setTimeout(() => {
      console.log("\n--- STREAMED EVENT COUNTS ---");
      for (const [k, v] of counts) console.log(`  ${k}: ${v}`);
      ws.close();
      process.exit(0);
    }, 1500);
  }
});

ws.on("error", (err) => {
  console.error("ws error:", err.message);
  process.exit(1);
});

setTimeout(() => {
  console.log("\n--- TIMEOUT (60s) ---");
  console.log(`phase=${phase} greetingResponses=${greetingResponses}`);
  for (const [k, v] of counts) console.log(`  ${k}: ${v}`);
  process.exit(2);
}, 120_000);
