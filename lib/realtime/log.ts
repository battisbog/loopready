/**
 * Realtime lifecycle log.
 *
 * The realtime path is a conversation between three parties (browser, our
 * server, OpenAI) where the interesting failures are all about ORDER: an event
 * arriving before the thing it depends on is ready, or two events racing. A
 * plain console.log loses that, so every entry is stamped with milliseconds
 * since the session opened and tagged with a direction.
 *
 * Kept out of the hot path: when disabled, every method is a no-op and nothing
 * is retained.
 */

export type Direction =
  /** browser to OpenAI */
  | "send"
  /** OpenAI to browser */
  | "recv"
  /** local lifecycle milestone */
  | "mark"
  /** our own server */
  | "srv";

export interface LogEntry {
  /** Milliseconds since the session started. */
  t: number;
  dir: Direction;
  type: string;
  detail?: string;
}

const ARROW: Record<Direction, string> = {
  send: "-->",
  recv: "<--",
  mark: " * ",
  srv: " @ ",
};

/**
 * Events that arrive dozens of times per second. They are counted rather than
 * printed so the timeline stays readable, since what matters is that they
 * happened and when they started and stopped.
 */
const NOISY = new Set([
  "response.output_audio.delta",
  "response.output_audio_transcript.delta",
  "response.text.delta",
  "response.function_call_arguments.delta",
  "conversation.item.input_audio_transcription.delta",
  "output_audio_buffer.append",
  "input_audio_buffer.append",
]);

export class RealtimeLog {
  private t0 = 0;
  private entries: LogEntry[] = [];
  private counts = new Map<string, { n: number; first: number; last: number }>();
  private enabled = false;
  private sink: ((line: string) => void) | null = null;

  /** Resets the clock. Called once per realtime session. */
  start(enabled: boolean, sink?: (line: string) => void) {
    this.enabled = enabled;
    this.sink = sink ?? null;
    this.t0 = Date.now();
    this.entries = [];
    this.counts = new Map();
    if (enabled) this.write({ t: 0, dir: "mark", type: "log.start" });
  }

  private write(e: LogEntry) {
    this.entries.push(e);
    const line = `[rt ${String(e.t).padStart(6)}ms] ${ARROW[e.dir]} ${e.type}${
      e.detail ? `  ${e.detail}` : ""
    }`;
    if (this.sink) this.sink(line);
    else console.log(line);
  }

  private add(dir: Direction, type: string, detail?: string) {
    if (!this.enabled) return;
    const t = Date.now() - this.t0;

    if (NOISY.has(type)) {
      const c = this.counts.get(type);
      if (c) {
        c.n++;
        c.last = t;
      } else {
        this.counts.set(type, { n: 1, first: t, last: t });
        // Announce the first one so the timeline shows when the stream began.
        this.write({ t, dir, type, detail: "(first; further deltas counted)" });
      }
      return;
    }
    this.write({ t, dir, type, detail });
  }

  sent(type: string, detail?: string) {
    this.add("send", type, detail);
  }
  recv(type: string, detail?: string) {
    this.add("recv", type, detail);
  }
  mark(type: string, detail?: string) {
    this.add("mark", type, detail);
  }
  server(type: string, detail?: string) {
    this.add("srv", type, detail);
  }

  /** Rolls the counted streams up so the summary shows their span. */
  summary(): string {
    const lines = [...this.counts].map(
      ([type, c]) =>
        `  ${type}: ${c.n} events, ${c.first}ms to ${c.last}ms (${c.last - c.first}ms span)`
    );
    return lines.length ? `Streamed events:\n${lines.join("\n")}` : "";
  }

  all(): LogEntry[] {
    return this.entries;
  }
}

export const rtLog = new RealtimeLog();
