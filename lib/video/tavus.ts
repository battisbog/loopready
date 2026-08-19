import { TAVUS } from "./config";

/**
 * Thin Tavus client.
 *
 * Tavus supplies the face and the transport; it supplies none of the interview.
 * The persona is driven entirely by instructions built by
 * lib/realtime/conversation.ts, so the avatar interviewer is the SAME
 * interviewer as the voice one: same greeting arc, same probing, same reserve.
 * Only the presence changes.
 */

export interface TavusConversation {
  conversationId: string;
  /** Room URL the browser joins. */
  conversationUrl: string;
  status: string;
}

interface CreateArgs {
  /** Our full interviewer instructions for the current phase. */
  instructions: string;
  /** Spoken opening, when the round has not begun yet. */
  greeting?: string;
  /** Correlates the Tavus side with our session row. */
  sessionId: string;
  /** Hard stop, enforced by Tavus as well as by us. */
  maxMinutes: number;
  /** Where Tavus posts lifecycle events. */
  callbackUrl?: string;
}

async function tavusFetch(path: string, init: RequestInit): Promise<Response> {
  return fetch(`${TAVUS.apiBase}${path}`, {
    ...init,
    headers: {
      "x-api-key": TAVUS.apiKey,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

/**
 * Starts a conversational video session.
 *
 * Throws with the provider's own body on failure: a paid feature failing
 * silently is worse than one failing loudly, and the caller needs the detail to
 * decide whether to release the credit.
 */
export async function createConversation(
  args: CreateArgs
): Promise<TavusConversation> {
  const res = await tavusFetch("/v2/conversations", {
    method: "POST",
    body: JSON.stringify({
      replica_id: TAVUS.replicaId,
      persona_id: TAVUS.personaId,
      // Ours, not Tavus's: the persona is a puppet for our interviewer.
      conversational_context: args.instructions,
      custom_greeting: args.greeting,
      conversation_name: `loopready-${args.sessionId}`,
      callback_url: args.callbackUrl,
      properties: {
        // Belt and braces with our own timer, because a browser that never
        // reports back must not leave a billable session running.
        max_call_duration: Math.round(args.maxMinutes * 60),
        participant_left_timeout: 60,
        participant_absent_timeout: 120,
        enable_recording: false,
        enable_transcription: true,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Tavus create failed (${res.status}): ${body.slice(0, 400)}`);
  }

  const data = await res.json();
  const conversationUrl = data.conversation_url ?? data.conversationUrl;
  const conversationId = data.conversation_id ?? data.conversationId;
  if (!conversationUrl || !conversationId) {
    throw new Error(
      `Tavus returned no room: ${JSON.stringify(data).slice(0, 300)}`
    );
  }
  return { conversationId, conversationUrl, status: data.status ?? "active" };
}

/**
 * The message a CLIENT sends to refresh the interviewer's instructions.
 *
 * This is deliberately not a server call. The REST endpoint I first assumed
 * (POST /v2/conversations/{id}/interactions) returns 404: Tavus's interactions
 * protocol travels over the Daily data channel, so only the browser that is in
 * the room can send it.
 *
 * That changes where our state machine pushes updates. On the voice path the
 * server sends session.update straight to OpenAI. Here the server returns the
 * instructions and the client relays them into the room via
 * `callObject.sendAppMessage(contextUpdateMessage(...))`. Same forward-looking
 * semantics, one extra hop.
 */
export function contextUpdateMessage(
  conversationId: string,
  instructions: string
): Record<string, unknown> {
  return {
    message_type: "conversation",
    event_type: "conversation.overwrite_llm_context",
    conversation_id: conversationId,
    properties: { context: instructions },
  };
}

/** Makes the avatar speak a specific line, used for the closing wrap-up. */
export function speakMessage(
  conversationId: string,
  text: string
): Record<string, unknown> {
  return {
    message_type: "conversation",
    event_type: "conversation.echo",
    conversation_id: conversationId,
    properties: { text },
  };
}

/** Ends a conversation. Safe to call twice; a already-ended room is not an error. */
export async function endConversation(conversationId: string): Promise<void> {
  try {
    const res = await tavusFetch(
      `/v2/conversations/${encodeURIComponent(conversationId)}/end`,
      { method: "POST" }
    );
    if (!res.ok && res.status !== 404) {
      console.error("[video] end failed:", res.status, await res.text().catch(() => ""));
    }
  } catch (e) {
    // Never let cleanup failure surface to the candidate; the hard cap on the
    // Tavus side still stops the meter.
    console.error("[video] end threw:", e);
  }
}
