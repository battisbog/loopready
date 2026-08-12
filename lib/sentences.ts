// Splits streaming LLM text into speakable chunks. TTS sounds unnatural on
// fragments, so a chunk is only emitted once it ends a sentence AND is long
// enough to be worth a request — except the FIRST chunk, which we release
// early because it determines how fast the candidate hears anything.

const FIRST_CHUNK_MIN = 12;
const CHUNK_MIN = 60;

// Avoid splitting on abbreviations and decimals ("e.g.", "O(n log n).", "3.5").
const ABBREVIATIONS = /\b(?:e\.g|i\.e|etc|vs|Mr|Mrs|Ms|Dr|approx|Fig|No)\.$/i;

function endsSentence(text: string): boolean {
  const trimmed = text.trimEnd();
  if (!/[.!?]$/.test(trimmed)) return false;
  if (ABBREVIATIONS.test(trimmed)) return false;
  if (/\d\.$/.test(trimmed) && !/\s\d\.$/.test(trimmed)) return false;
  return true;
}

export class SentenceBuffer {
  private buffer = "";
  private emitted = 0;

  /** Feed a token; returns any chunks that are ready to speak. */
  push(token: string): string[] {
    this.buffer += token;
    const out: string[] = [];
    const min = this.emitted === 0 ? FIRST_CHUNK_MIN : CHUNK_MIN;

    while (true) {
      const idx = this.findBreak(this.buffer, min);
      if (idx === -1) break;
      const chunk = this.buffer.slice(0, idx).trim();
      this.buffer = this.buffer.slice(idx);
      if (chunk) {
        out.push(chunk);
        this.emitted += 1;
      }
    }
    return out;
  }

  /** Anything left when the stream ends. */
  flush(): string | null {
    const rest = this.buffer.trim();
    this.buffer = "";
    if (rest) this.emitted += 1;
    return rest || null;
  }

  private findBreak(text: string, min: number): number {
    for (let i = min; i < text.length; i++) {
      const ch = text[i];
      if (ch !== "." && ch !== "!" && ch !== "?") continue;
      const next = text[i + 1];
      // Sentence end needs whitespace (or end of buffer) after it.
      if (next && !/\s/.test(next)) continue;
      if (!endsSentence(text.slice(0, i + 1))) continue;
      return i + 1;
    }
    return -1;
  }
}
