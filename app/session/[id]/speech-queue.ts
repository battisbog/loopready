"use client";

/**
 * Plays TTS chunks in order while fetching later ones concurrently.
 *
 * Latency shape: chunk 1's fetch starts the instant the first sentence exists,
 * and playback starts on its first bytes. Chunks 2..n are prefetched during
 * playback of earlier chunks, so there is no gap between sentences.
 */
export class SpeechQueue {
  private pending: Promise<Blob | null>[] = [];
  private playing = false;
  private cursor = 0;
  private stopped = false;
  private current: HTMLAudioElement | null = null;
  private idleResolvers: (() => void)[] = [];

  constructor(
    private fetchAudio: (text: string) => Promise<Blob | null>,
    private onFallback: (text: string) => Promise<void>
  ) {}

  /** Queue a sentence. Returns immediately; playback happens in order. */
  push(text: string) {
    if (this.stopped) return;
    // Kick the network request off now, not when it's this chunk's turn.
    const job = this.fetchAudio(text).catch(() => null);
    this.pending.push(
      job.then(async (blob) => {
        if (!blob) await this.onFallback(text).catch(() => {});
        return blob;
      })
    );
    void this.drain();
  }

  private async drain() {
    if (this.playing || this.stopped) return;
    this.playing = true;
    try {
      while (this.cursor < this.pending.length && !this.stopped) {
        const blob = await this.pending[this.cursor];
        this.cursor += 1;
        if (this.stopped) break;
        if (blob) await this.playBlob(blob);
      }
    } finally {
      this.playing = false;
      if (this.cursor >= this.pending.length) {
        this.idleResolvers.splice(0).forEach((r) => r());
      }
    }
  }

  private playBlob(blob: Blob): Promise<void> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      this.current = audio;
      const finish = () => {
        URL.revokeObjectURL(url);
        if (this.current === audio) this.current = null;
        resolve();
      };
      audio.onended = finish;
      audio.onerror = finish;
      audio.play().catch(finish);
    });
  }

  /** Resolves once everything queued so far has finished playing. */
  async idle(): Promise<void> {
    if (this.stopped) return;
    if (!this.playing && this.cursor >= this.pending.length) return;
    await new Promise<void>((r) => this.idleResolvers.push(r));
  }

  stop() {
    this.stopped = true;
    if (this.current) {
      this.current.pause();
      this.current.src = "";
      this.current = null;
    }
    this.idleResolvers.splice(0).forEach((r) => r());
  }
}
