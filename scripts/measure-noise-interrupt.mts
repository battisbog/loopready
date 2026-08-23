/**
 * Reproduces the reported bug directly against the live Realtime API: while
 * the interviewer is mid-sentence, does a brief burst of non-speech audio on
 * the input channel (a breath, a cough, room noise) cause interrupt_response
 * to cancel it early? And separately: does a REAL interruption still work?
 *
 * Compares four configs so the two fixes can be judged independently rather
 * than assumed:
 *   A  eagerness=high, no noise_reduction    (the reported-broken state)
 *   B  eagerness=high, noise_reduction=near_field
 *   C  eagerness=auto, no noise_reduction
 *   D  eagerness=auto, noise_reduction=near_field   (what we are shipping)
 *
 *   npx tsx scripts/measure-noise-interrupt.mts
 */
import { readFileSync } from "node:fs";
import WebSocket from "ws";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
}
const KEY = process.env.OPENAI_API_KEY!;
const { REALTIME_MODEL, REALTIME_VOICE } = await import("../lib/realtime/config.ts");

async function tts(text: string): Promise<Buffer> {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: "alloy", input: text, response_format: "pcm" }),
  });
  if (!res.ok) throw new Error(await res.text());
  return Buffer.from(await res.arrayBuffer());
}

/** A short, low-amplitude broadband burst -- a breath, a cough, a shifted mic. */
function nonSpeechBurst(ms: number, peakAmp: number): Buffer {
  const n = Math.floor((24000 * ms) / 1000);
  const b = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    // Envelope: fast attack, slower decay, like a real breath/cough.
    const t = i / n;
    const env = t < 0.15 ? t / 0.15 : Math.pow(1 - (t - 0.15) / 0.85, 1.5);
    const sample = (Math.random() - 0.5) * 2 * peakAmp * env * 32767;
    b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(sample))), i * 2);
  }
  return b;
}

/** Scales a PCM buffer's amplitude, to simulate a QUIET utterance. */
function scaleAmplitude(pcm: Buffer, factor: number): Buffer {
  const out = Buffer.alloc(pcm.length);
  for (let i = 0; i < pcm.length; i += 2) {
    const v = pcm.readInt16LE(i);
    out.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v * factor))), i);
  }
  return out;
}

function silence(ms: number): Buffer {
  return Buffer.alloc(Math.floor((24000 * ms) / 1000) * 2);
}

interface RunResult {
  responseCompleted: boolean;
  cutShort: boolean;
  audioMsBeforeCut: number;
  status: string;
}

function run(
  eagerness: "auto" | "high" | "low",
  noiseReduction: "near_field" | null,
  inject: Buffer,
  label: string
): Promise<RunResult> {
  return new Promise((resolve) => {
    const ws = new WebSocket(
      `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(REALTIME_MODEL)}`,
      { headers: { Authorization: `Bearer ${KEY}` } }
    );

    let audioStart = 0;
    let audioMs = 0;
    let settled = false;
    const finish = (r: RunResult) => {
      if (settled) return;
      settled = true;
      try {
        ws.close();
      } catch {}
      resolve(r);
    };

    ws.on("open", async () => {
      const input: Record<string, unknown> = {
        transcription: { model: "whisper-1" },
        turn_detection: {
          type: "semantic_vad",
          eagerness,
          create_response: true,
          interrupt_response: true,
        },
      };
      if (noiseReduction) input.noise_reduction = { type: noiseReduction };

      ws.send(
        JSON.stringify({
          type: "session.update",
          session: {
            type: "realtime",
            model: REALTIME_MODEL,
            instructions:
              "You are a senior engineer conducting a behavioral interview. Speak naturally.",
            audio: { input, output: { voice: REALTIME_VOICE } },
          },
        })
      );

      await new Promise((r) => setTimeout(r, 400));

      // A response long enough to have a real window to inject noise into.
      ws.send(
        JSON.stringify({
          type: "response.create",
          response: {
            instructions:
              "Say exactly this, word for word, slowly: 'That is a great question, and I want to walk you through it carefully. First, let's talk about the situation you were in, then what you specifically decided to do, and finally what happened as a result.'",
          },
        })
      );
    });

    ws.on("message", async (raw) => {
      const e = JSON.parse(raw.toString());

      if (e.type === "response.output_audio.delta") {
        if (!audioStart) audioStart = Date.now();
        audioMs = Date.now() - audioStart;
        // Inject partway through the response, while it is actively speaking.
        if (audioMs > 900 && audioMs < 1000) {
          await streamInput(ws, inject);
          // Keep the input channel open with silence, as a live mic would be.
          void streamInput(ws, silence(3000));
        }
      }

      if (e.type === "response.done") {
        const r = e.response;
        const status = r?.status ?? "unknown";
        const completed = status === "completed";
        finish({
          responseCompleted: completed,
          cutShort: !completed,
          audioMsBeforeCut: audioMs,
          status: status + (r?.status_details?.reason ? `/${r.status_details.reason}` : ""),
        });
      }
    });

    ws.on("error", () =>
      finish({ responseCompleted: false, cutShort: true, audioMsBeforeCut: audioMs, status: "ws_error" })
    );
    setTimeout(
      () => finish({ responseCompleted: false, cutShort: true, audioMsBeforeCut: audioMs, status: "timeout" }),
      20_000
    );
  });
}

async function streamInput(ws: WebSocket, pcm: Buffer) {
  const CHUNK = 4800; // 100ms at 24kHz mono s16le
  for (let i = 0; i < pcm.length; i += CHUNK) {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(
      JSON.stringify({
        type: "input_audio_buffer.append",
        audio: pcm.subarray(i, i + CHUNK).toString("base64"),
      })
    );
    await new Promise((r) => setTimeout(r, 90));
  }
}

const TRIALS = Number(process.env.TRIALS ?? 3);
const UM_SCALE = Number(process.env.UM_SCALE ?? 1);

// A genuinely voiced "um" -- real pitch and formants, unlike synthetic noise,
// which is what actually exercises a semantic VAD model. Scaled down to test
// how quiet it can be and still register as speech.
const umFull = await tts('um');
const breath = scaleAmplitude(umFull, UM_SCALE);
console.log(`inject: TTS 'um', scaled to ${UM_SCALE}x volume`);
// A genuine interruption: real, clearly spoken words at normal volume.
const realInterrupt = await tts("Wait, can I ask something about that?");

console.log(`\nmodel ${REALTIME_MODEL}, ${TRIALS} trials per config\n`);
console.log("PART 1 — does a breath/cough/quiet noise cut the interviewer off?\n");
console.log("  config                                  cut short?   at (ms)   status");
console.log("  " + "-".repeat(78));

const ONLY = (process.env.ONLY ?? '').split(',').filter(Boolean);
const allConfigs: { label: string; eagerness: "auto" | "high" | "low"; nr: "near_field" | null }[] = [
  { label: "A  high, no noise reduction (reported-broken)", eagerness: "high", nr: null },
  { label: "B  high, near_field noise reduction", eagerness: "high", nr: "near_field" },
  { label: "C  auto, no noise reduction", eagerness: "auto", nr: null },
  { label: "D  auto, near_field noise reduction (shipping)", eagerness: "auto", nr: "near_field" },
  { label: "E  low, near_field noise reduction", eagerness: "low", nr: "near_field" },
];
const configs = ONLY.length ? allConfigs.filter((c) => ONLY.includes(c.label[0])) : allConfigs;

const results: Record<string, RunResult[]> = {};
for (const cfg of configs) {
  results[cfg.label] = [];
  for (let i = 0; i < TRIALS; i++) {
    const r = await run(cfg.eagerness, cfg.nr, breath, cfg.label);
    results[cfg.label].push(r);
    console.log(
      `  ${cfg.label.padEnd(38)} ${(r.cutShort ? "YES - CUT" : "no").padEnd(12)} ${String(r.audioMsBeforeCut).padStart(6)}   ${r.status}`
    );
  }
}

console.log("\n  summary (false interrupts / trials):");
for (const cfg of configs) {
  const cuts = results[cfg.label].filter((r) => r.cutShort).length;
  console.log(`    ${cfg.label.padEnd(46)} ${cuts}/${TRIALS}`);
}

console.log("\nPART 2 — does a REAL interruption still cut the interviewer off? (should be YES)\n");
console.log("  config                                  cut short?   at (ms)   status");
console.log("  " + "-".repeat(78));
let realFail = 0;
for (let i = 0; i < TRIALS; i++) {
  const r = await run("auto", "near_field", realInterrupt, "shipping config, real interrupt");
  if (!r.cutShort) realFail++;
  console.log(
    `  D  auto + near_field, REAL interrupt      ${(r.cutShort ? "YES - CUT" : "no, missed it!").padEnd(15)} ${String(r.audioMsBeforeCut).padStart(4)}   ${r.status}`
  );
}
console.log(`\n  barge-in still works: ${TRIALS - realFail}/${TRIALS} real interruptions were honoured\n`);
