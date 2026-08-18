/**
 * Measures the real post-speech gap for each semantic_vad eagerness setting,
 * and checks that the snappier setting does not cut people off mid-thought.
 *
 * Two things are measured per run:
 *   gap        end of the candidate's audio -> response.created
 *   interrupt  did VAD end the turn DURING a deliberate mid-story pause
 *
 *   npx tsx scripts/measure-eagerness.mts
 */
import { readFileSync } from "node:fs";
import WebSocket from "ws";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
}
const KEY = process.env.OPENAI_API_KEY!;
const { REALTIME_MODEL, REALTIME_VOICE } = await import("../lib/realtime/config.ts");
const { buildInstructions } = await import("../lib/realtime/conversation.ts");
const { pickSessionQuestions } = await import("../lib/interview/questions.ts");
const { getContext } = await import("../lib/interview/companies.ts");

const ctx = getContext("Google", "L4");
const session = {
  round_type: "behavioral",
  question_index: 0,
  followup_count: 0,
  phase: "questions",
  questions: pickSessionQuestions(),
  artifact: {},
};
const instructions = buildInstructions(
  session,
  { questionIndex: 0, followupCount: 0, phase: "questions", done: false },
  ctx
);

async function tts(text: string): Promise<Buffer> {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text,
      response_format: "pcm",
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return Buffer.from(await res.arrayBuffer());
}

const silence = (sec: number) => Buffer.alloc(Math.floor(24000 * sec) * 2);
function ambient(sec: number): Buffer {
  const n = Math.floor(24000 * sec);
  const b = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round((Math.random() - 0.5) * 66), i * 2);
  return b;
}

interface Result {
  gapMs: number | null;
  interruptedPause: boolean;
  responsesDuringPause?: number;
  transcript: string;
}

/**
 * @param pauseSec a deliberate mid-sentence pause, to test whether the model
 *   waits for the candidate to gather their thought
 */
function run(eagerness: string, pauseSec: number, audio: { a: Buffer; b: Buffer }): Promise<Result> {
  return new Promise((resolve) => {
    const ws = new WebSocket(
      `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(REALTIME_MODEL)}`,
      { headers: { Authorization: `Bearer ${KEY}` } }
    );

    let endOfSpeech = 0;
    let pauseStart = 0;
    let pauseEnd = 0;
    let interruptedPause = false;
    let gapMs: number | null = null;
    let responsesDuringPause = 0;
    let transcript = "";
    let settled = false;

    const finish = (r: Result) => {
      if (settled) return;
      settled = true;
      try { ws.close(); } catch {}
      resolve(r);
    };

    ws.on("open", async () => {
      ws.send(JSON.stringify({
        type: "session.update",
        session: {
          type: "realtime",
          model: REALTIME_MODEL,
          instructions,
          audio: {
            input: {
              transcription: { model: "whisper-1" },
              turn_detection: {
                type: "semantic_vad",
                eagerness,
                create_response: true,
                interrupt_response: true,
              },
            },
            output: { voice: REALTIME_VOICE },
          },
        },
      }));

      await new Promise((r) => setTimeout(r, 400));

      const stream = async (pcm: Buffer) => {
        const CHUNK = 4800;
        const t0 = Date.now();
        for (let i = 0, k = 0; i < pcm.length; i += CHUNK, k++) {
          ws.send(JSON.stringify({
            type: "input_audio_buffer.append",
            audio: pcm.subarray(i, i + CHUNK).toString("base64"),
          }));
          const wait = t0 + k * 100 - Date.now();
          if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        }
      };

      // First half of the answer, then a deliberate thinking pause, then the
      // rest. A setting that is too eager will end the turn inside the pause.
      await stream(audio.a);
      pauseStart = Date.now();
      await stream(silence(pauseSec));
      pauseEnd = Date.now();
      await stream(audio.b);
      endOfSpeech = Date.now();
      // Keep the mic open, as a real one would be.
      await stream(ambient(12));
      if (!settled) finish({ gapMs, interruptedPause, responsesDuringPause, transcript });
    });

    ws.on("message", (raw) => {
      const e = JSON.parse(raw.toString());
      if (e.type === "input_audio_buffer.speech_stopped") {
        const t = Date.now();
        // Ending the turn inside the pause, or before the second half even
        // began, means the candidate got cut off.
        if (pauseStart && t > pauseStart && t < pauseEnd + 250) interruptedPause = true;
      }
      if (e.type === "conversation.item.input_audio_transcription.completed") {
        transcript += (transcript ? " " : "") + e.transcript;
      }
      // A response created while the candidate is still mid-story means the
      // interviewer was about to talk over them; interrupt_response then
      // cancels it when they resume. Invisible to the user, but it is the real
      // measure of "too eager".
      if (e.type === "response.created" && pauseStart && !endOfSpeech) {
        responsesDuringPause++;
        interruptedPause = true;
      }
      if (e.type === "response.created" && endOfSpeech && gapMs === null) {
        // Record the gap, but stay connected: transcription lags the response
        // by over a second, and closing here would make every answer look
        // truncated when it was only unfinished transcription.
        gapMs = Date.now() - endOfSpeech;
        setTimeout(
          () => finish({ gapMs, interruptedPause, responsesDuringPause, transcript }),
          5000
        );
      }
    });

    ws.on("error", () => finish({ gapMs, interruptedPause, responsesDuringPause, transcript }));
    setTimeout(() => finish({ gapMs, interruptedPause, responsesDuringPause, transcript }), 90_000);
  });
}

// Split so the pause lands mid-thought, exactly where a real candidate stalls.
const partA = await tts(
  "So the situation was that I owned the checkout service, and during Black Friday our p99 latency jumped from 200 milliseconds to about four seconds. What I did was,"
);
const partB = await tts(
  "I traced it to an N plus one query against inventory, added a batch endpoint, and brought it back down to 180 milliseconds."
);

const TRIALS = Number(process.env.TRIALS ?? 3);
const PAUSE = Number(process.env.PAUSE ?? 2.0);

console.log(
  `\nmodel ${REALTIME_MODEL}, semantic_vad, ${PAUSE}s mid-story pause, ${TRIALS} trials each\n`
);
console.log("  eagerness   gaps after speech (ms)        median   cut off?   full answer?");
console.log("  " + "-".repeat(80));

const ONLY = (process.env.SETTINGS ?? "low,auto,high").split(",");
for (const e of (["low", "auto", "high"] as const).filter((x) => ONLY.includes(x))) {
  const gaps: number[] = [];
  let cut = 0;
  let full = 0;
  for (let i = 0; i < TRIALS; i++) {
    const r = await run(e, PAUSE, { a: partA, b: partB });
    if (r.gapMs !== null) gaps.push(r.gapMs);
    if (r.interruptedPause) cut++;
    if (/180|inventory/i.test(r.transcript)) full++;
  }
  const sorted = [...gaps].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : NaN;
  console.log(
    `  ${e.padEnd(11)} ${gaps.map((g) => String(g).padStart(5)).join(" ").padEnd(27)} ` +
      `${String(Number.isNaN(median) ? "-" : median).padStart(6)}   ` +
      `${(cut ? `${cut}/${TRIALS} CUT` : "none").padEnd(10)} ${full}/${TRIALS}`
  );
}
console.log();
