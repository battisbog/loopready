"use client";

/**
 * Best-effort cleanup fired when the candidate leaves WITHOUT clicking "End
 * interview" — closing the tab, navigating away, killing the browser.
 *
 * Before this, only the explicit "End interview" button fully abandoned a
 * loop (session -> completed, every sibling round -> completed, loop ->
 * completed, any held video credit settled). A closed tab left the session
 * and loop rows "active" forever, and for a video round it left the credit
 * reservation held indefinitely — which is exactly what produced "you already
 * have a video interview open in another tab" days after the tab was gone.
 * That state must never exist; this is what removes it at the source instead
 * of only healing it reactively on the next attempt.
 *
 * `pagehide` is used because it is the one unload event that reliably fires on
 * a real tab close and on mobile Safari (unlike `beforeunload`).
 * `keepalive: true` lets the fetch complete even after the page is gone, and
 * the calls are fired WITHOUT awaiting: a pagehide handler gets essentially no
 * time budget, so this is fire-and-forget by design.
 *
 * Both endpoints are idempotent server-side, so calling this after the button
 * has already run, or after a normal round completion, would be harmless —
 * but callers should still gate it with a "finished" ref so an in-progress
 * loop is never abandoned by a stray unload during a normal transition.
 */
export function endInterviewBeacon(sessionId: string, isVideo: boolean) {
  try {
    if (isVideo) {
      fetch("/api/video/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, reason: "user_ended" }),
        keepalive: true,
      }).catch(() => {});
    }
    fetch("/api/interview/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, abandonLoop: true }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* best effort; the Tavus call cap and duration cap still bound the cost */
  }
}
