"use client";

/**
 * WebRTC transport for a live interview.
 *
 * Flow:
 *   1. our server mints an ephemeral client secret (the standing API key never
 *      reaches the browser)
 *   2. browser captures the mic and creates an offer
 *   3. offer is POSTed as SDP to /v1/realtime/calls, answer applied
 *   4. audio flows peer-to-peer; JSON events flow over the "oai-events" data
 *      channel
 *
 * This module owns transport and event plumbing only. Interview progression
 * stays on the server (see /api/realtime/turn).
 */

import { audioLevels } from "@/lib/audio-levels";
import { rtLog } from "@/lib/realtime/log";
import { REALTIME_DEBUG } from "@/lib/realtime/config";
import { getUnlockedAudioElement } from "@/lib/audio-unlock";

const CALLS_URL = "https://api.openai.com/v1/realtime/calls";

export interface RealtimeHandlers {
  /** A finalized candidate utterance. */
  onCandidateTurn: (text: string) => void;
  /** A finalized interviewer utterance. */
  onInterviewerTurn: (text: string) => void;
  /** Live partial text as either side speaks. */
  onPartial?: (role: "candidate" | "interviewer", text: string) => void;
  /** The model asked to move to the next question. */
  onAdvanceRequested?: (callId: string, reason: string) => void;
  onSpeakingChange?: (speaking: boolean) => void;
  /** Fires when the candidate barges in over the interviewer. */
  onBargeIn?: () => void;
  onError?: (message: string) => void;
  onClose?: () => void;
}

export interface RealtimeStartOptions {
  clientSecret: string;
  model: string;
  /**
   * Already-granted microphone stream. Acquired by the pre-interview gate, so
   * the permission prompt can never appear once the interviewer is talking.
   */
  stream: MediaStream;
  greeting: string;
  /**
   * Decided by the server from whether the CANDIDATE has ever spoken. Never
   * inferred from history length here: startSession writes an opening line into
   * `turns` before the round loads, so a fresh session always has history.
   */
  shouldGreet: boolean;
  history: { role: string; text: string }[];
  handlers: RealtimeHandlers;
}

export class RealtimeSession {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private stream: MediaStream | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private handlers: RealtimeHandlers = {
    onCandidateTurn: () => {},
    onInterviewerTurn: () => {},
  };
  private closed = false;
  /** Whether the remote audio track has arrived. */
  private audioReady = false;
  /** One-shot retry hook, armed only if the initial autoplay was blocked. */
  private unlockRetry: (() => void) | null = null;
  /** True between response.created and response.done. */
  private responseActive = false;
  private pendingSpeak: string | null = null;

  async start({
    clientSecret,
    model,
    greeting,
    shouldGreet,
    history,
    stream,
    handlers,
  }: RealtimeStartOptions): Promise<void> {
    this.handlers = handlers;
    rtLog.start(REALTIME_DEBUG);
    rtLog.mark("start", `history=${history.length} turns`);

    // The stream is handed in already granted; this class never prompts.
    this.stream = stream;

    rtLog.mark("mic.ready", `tracks=${this.stream.getAudioTracks().length} (pre-granted)`);

    const pc = new RTCPeerConnection();
    this.pc = pc;

    // Remote audio: the interviewer's voice.
    //
    // Reuse the <audio> element primed synchronously inside the mic gate's
    // click handler (see lib/audio-unlock.ts), rather than creating a fresh
    // one here. By the time `ontrack` fires below, several network
    // round-trips have happened since that click (our session endpoint, the
    // SDP offer POST, the SDP answer) -- long enough that WebKit no longer
    // treats a brand-new element's `.play()` as gesture-driven and silently
    // blocks it. An element that already started playing DURING the click
    // can have its srcObject swapped and keep playing without a second
    // gesture. This is WebKit's policy specifically (Safari and every other
    // iOS browser, which are all WKWebView shells over WebKit), so it
    // applies identically across all of them -- falling back to a fresh
    // element on other engines where this distinction doesn't matter.
    this.audioEl = getUnlockedAudioElement() ?? new Audio();
    this.audioEl.autoplay = true;
    pc.ontrack = (e) => {
      if (this.audioEl) this.audioEl.srcObject = e.streams[0];
      // The interviewer's voice drives the ring in live mode.
      audioLevels.attachStream("output", e.streams[0]);
      // When this lands relative to the greeting is the whole question for the
      // "interviewer never speaks" bug, so it is a first-class milestone.
      this.audioReady = true;
      rtLog.mark("audio.track", "remote interviewer audio attached");
      this.playRemoteAudio();
    };

    this.stream.getTracks().forEach((t) => pc.addTrack(t, this.stream!));
    // The mic is open for the whole round, so the candidate side is always live.
    audioLevels.attachStream("input", this.stream);

    const dc = pc.createDataChannel("oai-events");
    this.dc = dc;
    dc.onmessage = (e) => this.handleEvent(JSON.parse(e.data));
    dc.onopen = () => {
      rtLog.mark("datachannel.open", `audioReady=${this.audioReady}`);
      this.onChannelOpen(history, greeting, shouldGreet);
    };

    pc.onconnectionstatechange = () => {
      rtLog.mark("pc.state", pc.connectionState);
      if (
        !this.closed &&
        (pc.connectionState === "failed" || pc.connectionState === "disconnected")
      ) {
        this.handlers.onError?.("Live connection lost.");
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    rtLog.mark("sdp.offer.posted");

    const res = await fetch(`${CALLS_URL}?model=${encodeURIComponent(model)}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${clientSecret}`,
        "Content-Type": "application/sdp",
      },
    });
    if (!res.ok) {
      throw new Error(`Realtime handshake failed (${res.status})`);
    }
    await pc.setRemoteDescription({ type: "answer", sdp: await res.text() });
    rtLog.mark("sdp.answer.applied");
  }

  /**
   * Plays the remote interviewer track, with a fallback for the case the
   * unlocked element (or the fresh one, on an engine without this quirk)
   * still gets blocked: the pre-priming above covers the common case, but
   * isn't guaranteed on every iOS browser shell, since exactly how gesture
   * activation propagates from a touch event into WKWebView-hosted page
   * content is a Chrome-iOS/Firefox-iOS/Edge-iOS implementation detail, not
   * something this app controls. If `.play()` still rejects, arm a one-shot
   * listener so the candidate's very next tap anywhere on the page (which
   * they will almost certainly make, e.g. to use the mic) retries it -- so
   * a blocked interviewer voice degrades to "one extra tap" instead of
   * "the interview looks broken."
   */
  private playRemoteAudio() {
    this.audioEl
      ?.play()
      .then(() => rtLog.mark("audio.play.ok"))
      .catch((err) => {
        rtLog.mark("audio.play.blocked", String(err?.name ?? err));
        if (this.unlockRetry) return;
        const retry = () => {
          document.removeEventListener("pointerdown", retry, true);
          document.removeEventListener("touchend", retry, true);
          this.unlockRetry = null;
          void this.audioEl
            ?.play()
            .then(() => rtLog.mark("audio.play.retry.ok"))
            .catch((e) => rtLog.mark("audio.play.retry.blocked", String(e?.name ?? e)));
        };
        this.unlockRetry = retry;
        document.addEventListener("pointerdown", retry, true);
        document.addEventListener("touchend", retry, true);
      });
  }

  /** Seeds prior turns so a resumed round has its conversation history. */
  private onChannelOpen(
    history: { role: string; text: string }[],
    greeting: string,
    shouldGreet: boolean
  ) {
    for (const t of history) {
      this.send({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: t.role === "interviewer" ? "assistant" : "user",
          content: [
            t.role === "interviewer"
              ? { type: "output_text", text: t.text }
              : { type: "input_text", text: t.text },
          ],
        },
      });
    }
    // Speak the opening unless the candidate has already talked, in which case
    // this is a resume and re-greeting would be wrong.
    if (shouldGreet) {
      rtLog.mark(
        "greeting.dispatch",
        `audioReady=${this.audioReady} dc=${this.dc?.readyState}`
      );
      this.speak(greeting);
    } else {
      rtLog.mark("greeting.skipped", "candidate has already spoken; resuming");
    }
  }

  private send(event: unknown) {
    const type = (event as { type?: string }).type ?? "unknown";
    if (this.dc?.readyState !== "open") {
      // Silently dropping an event here is exactly the kind of failure this
      // log exists to surface.
      rtLog.mark("send.dropped", `${type} (dc=${this.dc?.readyState})`);
      return;
    }
    rtLog.sent(type, describeOutgoing(event));
    this.dc.send(JSON.stringify(event));
  }

  /** Swaps in new instructions when our state machine advances the question. */
  updateInstructions(instructions: string) {
    this.send({ type: "session.update", session: { type: "realtime", instructions } });
  }

  /**
   * Asks the interviewer to say something specific.
   *
   * Queued rather than sent when a response is already in flight. The API
   * rejects a concurrent response.create with
   * `conversation_already_has_active_response`, and that rejection used to
   * discard the request silently AND surface the raw error in the UI.
   */
  speak(instructions: string) {
    if (this.responseActive) {
      rtLog.mark("speak.queued", "a response is already in flight");
      this.pendingSpeak = instructions;
      return;
    }
    this.responseActive = true;
    this.send({ type: "response.create", response: { instructions } });
  }

  private flushPendingSpeak() {
    const next = this.pendingSpeak;
    if (!next) return;
    this.pendingSpeak = null;
    rtLog.mark("speak.flushed", "in-flight response finished");
    this.responseActive = true;
    this.send({ type: "response.create", response: { instructions: next } });
  }

  /** Answers the advance_question tool call so the model can continue. */
  resolveAdvance(callId: string, accepted: boolean) {
    this.send({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: callId,
        output: JSON.stringify({ accepted }),
      },
    });
    // A tool result on its own produces no speech. The model needs a response
    // to continue, and by now the response carrying the tool call has finished,
    // so this one is legal.
    this.speak(
      accepted
        ? "Continue the interview following your updated instructions."
        : "That question is not finished yet. Keep probing it."
    );
  }

  private handleEvent(event: { type: string; [k: string]: unknown }) {
    rtLog.recv(event.type, describeIncoming(event));

    switch (event.type) {
      // Candidate finished speaking and Whisper transcribed it.
      case "conversation.item.input_audio_transcription.completed": {
        const text = String(event.transcript ?? "").trim();
        if (text) this.handlers.onCandidateTurn(text);
        break;
      }
      case "conversation.item.input_audio_transcription.delta": {
        const d = String(event.delta ?? "");
        if (d) this.handlers.onPartial?.("candidate", d);
        break;
      }
      // Interviewer's own speech, transcribed as it is produced.
      case "response.output_audio_transcript.delta": {
        const d = String(event.delta ?? "");
        if (d) this.handlers.onPartial?.("interviewer", d);
        break;
      }
      case "response.output_audio_transcript.done": {
        const text = String(event.transcript ?? "").trim();
        if (text) this.handlers.onInterviewerTurn(text);
        break;
      }
      case "output_audio_buffer.started":
        this.handlers.onSpeakingChange?.(true);
        break;
      case "output_audio_buffer.stopped":
      case "output_audio_buffer.cleared":
        this.handlers.onSpeakingChange?.(false);
        break;
      // Barge-in: the candidate started talking over the interviewer. The API
      // cancels the response for us; this is just so the UI can react.
      case "input_audio_buffer.speech_started":
        this.handlers.onBargeIn?.();
        break;
      case "response.created":
        this.responseActive = true;
        break;
      case "response.done":
        this.responseActive = false;
        this.flushPendingSpeak();
        break;
      // Not acted on, but decisive for diagnosing who cancelled what.
      case "session.created":
      case "session.updated":
      case "input_audio_buffer.speech_stopped":
        break;
      case "response.function_call_arguments.done": {
        if (event.name === "advance_question") {
          let reason = "";
          try {
            reason = JSON.parse(String(event.arguments ?? "{}")).reason ?? "";
          } catch {
            /* reason is advisory only */
          }
          this.handlers.onAdvanceRequested?.(String(event.call_id), reason);
        }
        break;
      }
      case "error": {
        const err = event.error as { code?: string } | undefined;
        // Now handled by queueing, so it should never reach the user. If it
        // somehow does, it is a bug in our sequencing, not something the
        // candidate can act on.
        if (err?.code === "conversation_already_has_active_response") {
          rtLog.mark("error.suppressed", "concurrent response.create");
          break;
        }
        this.handlers.onError?.(
          (event.error as { message?: string } | undefined)?.message ??
            "Realtime error"
        );
        break;
      }
    }
  }

  stop() {
    rtLog.mark("stop");
    this.closed = true;
    this.pendingSpeak = null;
    this.responseActive = false;
    if (this.unlockRetry) {
      document.removeEventListener("pointerdown", this.unlockRetry, true);
      document.removeEventListener("touchend", this.unlockRetry, true);
      this.unlockRetry = null;
    }
    audioLevels.detachAll();
    try {
      this.dc?.close();
    } catch {}
    try {
      this.pc?.getSenders().forEach((s) => s.track?.stop());
      this.pc?.close();
    } catch {}
    this.stream?.getTracks().forEach((t) => t.stop());
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.srcObject = null;
      this.audioEl = null;
    }
    this.pc = null;
    this.dc = null;
    this.stream = null;
    this.handlers.onClose?.();
  }
}

/**
 * One-line summaries for the log. Deliberately terse: the value of the timeline
 * is in the ordering, and full payloads would bury it.
 */
function describeOutgoing(event: unknown): string | undefined {
  const e = event as { type?: string; response?: { instructions?: string }; session?: { instructions?: string }; item?: { role?: string; type?: string } };
  if (e.type === "response.create") {
    const i = e.response?.instructions ?? "";
    return i ? `instructions="${i.slice(0, 90)}${i.length > 90 ? "…" : ""}"` : "(no per-response instructions)";
  }
  if (e.type === "session.update") {
    return `instructions ${e.session?.instructions?.length ?? 0} chars`;
  }
  if (e.type === "conversation.item.create") {
    return `${e.item?.type} role=${e.item?.role ?? "-"}`;
  }
  return undefined;
}

function describeIncoming(event: { type: string; [k: string]: unknown }): string | undefined {
  switch (event.type) {
    case "response.created":
      return `id=${(event.response as { id?: string })?.id}`;
    case "response.done": {
      const r = event.response as
        | { id?: string; status?: string; status_details?: { reason?: string; error?: { message?: string } }; output?: { type?: string }[] }
        | undefined;
      const kinds = (r?.output ?? []).map((o) => o.type).join(",") || "empty";
      const why = r?.status_details?.reason ?? r?.status_details?.error?.message ?? "";
      return `id=${r?.id} status=${r?.status}${why ? ` reason=${why}` : ""} output=[${kinds}]`;
    }
    case "error": {
      const err = event.error as { type?: string; code?: string; message?: string } | undefined;
      return `${err?.type ?? ""}/${err?.code ?? ""}: ${err?.message ?? ""}`;
    }
    case "conversation.item.input_audio_transcription.completed":
      return `"${String(event.transcript ?? "").slice(0, 80)}"`;
    case "response.output_audio_transcript.done":
      return `"${String(event.transcript ?? "").slice(0, 80)}"`;
    case "response.function_call_arguments.done":
      return `${event.name} ${String(event.arguments ?? "")}`;
    case "session.created":
    case "session.updated": {
      const s = event.session as { audio?: { input?: { turn_detection?: Record<string, unknown> } } } | undefined;
      const td = s?.audio?.input?.turn_detection;
      return td ? `turn_detection=${JSON.stringify(td)}` : undefined;
    }
    default:
      return undefined;
  }
}
