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
  greeting: string;
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

  async start({
    clientSecret,
    model,
    greeting,
    history,
    handlers,
  }: RealtimeStartOptions): Promise<void> {
    this.handlers = handlers;

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const pc = new RTCPeerConnection();
    this.pc = pc;

    // Remote audio: the interviewer's voice.
    this.audioEl = new Audio();
    this.audioEl.autoplay = true;
    pc.ontrack = (e) => {
      if (this.audioEl) this.audioEl.srcObject = e.streams[0];
    };

    this.stream.getTracks().forEach((t) => pc.addTrack(t, this.stream!));

    const dc = pc.createDataChannel("oai-events");
    this.dc = dc;
    dc.onmessage = (e) => this.handleEvent(JSON.parse(e.data));
    dc.onopen = () => this.onChannelOpen(history, greeting);

    pc.onconnectionstatechange = () => {
      if (
        !this.closed &&
        (pc.connectionState === "failed" || pc.connectionState === "disconnected")
      ) {
        this.handlers.onError?.("Live connection lost.");
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

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
  }

  /** Seeds prior turns so a resumed round has its conversation history. */
  private onChannelOpen(history: { role: string; text: string }[], greeting: string) {
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
    // Only speak an opening when the round has not started yet; otherwise the
    // interviewer would re-greet a candidate mid-interview.
    if (history.length === 0) {
      this.send({
        type: "response.create",
        response: { instructions: greeting },
      });
    }
  }

  private send(event: unknown) {
    if (this.dc?.readyState === "open") this.dc.send(JSON.stringify(event));
  }

  /** Swaps in new instructions when our state machine advances the question. */
  updateInstructions(instructions: string) {
    this.send({ type: "session.update", session: { type: "realtime", instructions } });
  }

  /** Tells the interviewer what to say next (transition or closing line). */
  speak(instructions: string) {
    this.send({ type: "response.create", response: { instructions } });
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
  }

  private handleEvent(event: { type: string; [k: string]: unknown }) {
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
      case "error":
        this.handlers.onError?.(
          (event.error as { message?: string } | undefined)?.message ??
            "Realtime error"
        );
        break;
    }
  }

  stop() {
    this.closed = true;
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
