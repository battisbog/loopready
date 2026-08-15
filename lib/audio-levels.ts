"use client";

/**
 * Shared audio-amplitude bus.
 *
 * The orb needs to move with whichever voice currently has the floor, but the
 * voice pipeline owns its own audio objects. Rather than entangling the two,
 * the pipeline registers sources here and the orb just reads a number each
 * frame. Nothing in the voice logic changes behaviour by registering.
 *
 * Two source kinds:
 *   - MediaStream  : the mic, and the remote WebRTC track in live mode
 *   - HTMLAudioElement : each TTS chunk in push-to-talk mode
 */

type Kind = "output" | "input";

interface Source {
  analyser: AnalyserNode;
  data: Uint8Array;
  /** Element sources must be disconnected when the clip is discarded. */
  cleanup: () => void;
}

class AudioLevels {
  private ctx: AudioContext | null = null;
  private sources = new Map<Kind, Source>();
  // Per-element nodes are cached: createMediaElementSource throws if called
  // twice for the same element.
  private elementNodes = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
  private smoothed: Record<Kind, number> = { output: 0, input: 0 };

  private context(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
    }
    // Autoplay policies suspend the context until a gesture.
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private makeAnalyser(ctx: AudioContext): AnalyserNode {
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.75;
    return analyser;
  }

  /** Mic, or the interviewer's remote track in live mode. */
  attachStream(kind: Kind, stream: MediaStream) {
    const ctx = this.context();
    if (!ctx) return;
    this.detach(kind);
    try {
      const node = ctx.createMediaStreamSource(stream);
      const analyser = this.makeAnalyser(ctx);
      node.connect(analyser);
      // Deliberately NOT connected to destination: this is a tap, and routing
      // it to output would double-play the audio.
      this.sources.set(kind, {
        analyser,
        data: new Uint8Array(analyser.frequencyBinCount),
        cleanup: () => {
          try {
            node.disconnect();
          } catch {}
        },
      });
    } catch {
      /* amplitude is decorative; never break playback over it */
    }
  }

  /** A TTS clip being played through an <audio> element. */
  attachElement(kind: Kind, el: HTMLMediaElement) {
    const ctx = this.context();
    if (!ctx) return;
    this.detach(kind);
    try {
      let node = this.elementNodes.get(el);
      if (!node) {
        node = ctx.createMediaElementSource(el);
        this.elementNodes.set(el, node);
      }
      const analyser = this.makeAnalyser(ctx);
      node.connect(analyser);
      // Element sources MUST reach the destination or the clip goes silent.
      node.connect(ctx.destination);
      this.sources.set(kind, {
        analyser,
        data: new Uint8Array(analyser.frequencyBinCount),
        cleanup: () => {
          try {
            analyser.disconnect();
          } catch {}
        },
      });
    } catch {
      /* ignore: some browsers refuse cross-origin element capture */
    }
  }

  detach(kind: Kind) {
    const existing = this.sources.get(kind);
    if (existing) {
      existing.cleanup();
      this.sources.delete(kind);
    }
    this.smoothed[kind] = 0;
  }

  detachAll() {
    (["output", "input"] as Kind[]).forEach((k) => this.detach(k));
  }

  /**
   * Current loudness for a source, 0..1, smoothed so the orb glides rather
   * than jitters. Returns 0 when nothing is attached.
   */
  level(kind: Kind): number {
    const src = this.sources.get(kind);
    if (!src) {
      this.smoothed[kind] *= 0.9;
      return this.smoothed[kind];
    }
    src.analyser.getByteTimeDomainData(src.data as Uint8Array<ArrayBuffer>);

    // RMS around the 128 midpoint of time-domain data.
    let sum = 0;
    for (let i = 0; i < src.data.length; i++) {
      const v = (src.data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / src.data.length);
    // Speech RMS is small; scale then clamp so normal talking uses the range.
    const scaled = Math.min(1, rms * 4.5);

    // Asymmetric smoothing: rise fast so the orb feels responsive, fall slower
    // so it does not flicker between syllables.
    const prev = this.smoothed[kind];
    this.smoothed[kind] = scaled > prev ? prev + (scaled - prev) * 0.5 : prev * 0.86;
    return this.smoothed[kind];
  }
}

export const audioLevels = new AudioLevels();
