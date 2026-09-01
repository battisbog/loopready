"use client";

/**
 * Unlocks HTMLMediaElement autoplay under WebKit's user-gesture policy.
 *
 * WebKit (Safari, and every other iOS browser -- they're all WKWebView
 * shells over the same engine) only allows a media element to start playing
 * from inside, or very shortly after, a genuine user gesture (a tap/click).
 * Once an element HAS begun playing under that gesture, swapping its
 * `srcObject`/`src` later and continuing playback is allowed without a
 * second gesture -- but creating a BRAND NEW `<audio>` element after the
 * gesture has passed is not.
 *
 * The live interview's remote audio element used to be exactly that: a new
 * `Audio()` created inside `RealtimeSession.start()`, which itself only runs
 * after several awaited network round-trips (our session endpoint, the SDP
 * offer POST, the SDP answer). By the time `pc.ontrack` fires and `.play()`
 * is finally called, the click that started the round is long gone as far
 * as the browser's gesture-tracking is concerned -- and WebKit silently
 * blocks the play. This is worse on a slow mobile connection, and worse
 * still in third-party iOS browser shells (Chrome/Firefox/Edge on iOS),
 * where gesture activation from a touch event has historically been more
 * fragile to propagate into web content than in Safari's own chrome.
 *
 * The fix: create ONE `<audio>` element synchronously inside the click
 * handler that starts the round (see mic-gate.tsx), play a silent clip on
 * it immediately so WebKit marks it "activated", and keep reusing that same
 * element for whatever real audio shows up later, however long that takes.
 */

// A ~0.05s silent WAV, inlined so this never depends on a network fetch.
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

let unlockedEl: HTMLAudioElement | null = null;

/**
 * Call synchronously from inside a click/tap handler, before any `await`.
 * Safe to call more than once (e.g. once when the mic gate mounts and again
 * on "Start interview") -- browsers that only honor the most recent gesture
 * benefit from the re-prime, and it's a no-op cost otherwise.
 */
export function unlockAudioElement(): HTMLAudioElement | null {
  if (typeof window === "undefined" || typeof Audio === "undefined") return null;
  if (!unlockedEl) {
    unlockedEl = new Audio(SILENT_WAV);
    unlockedEl.muted = false;
  }
  void unlockedEl.play().catch(() => {
    // Best effort -- if this silent prime is itself blocked, the caller's
    // own later .play() call (with a document-click retry, see
    // lib/realtime/client.ts) is the real fallback.
  });
  return unlockedEl;
}

/** The element primed by unlockAudioElement, if a gesture has happened yet. */
export function getUnlockedAudioElement(): HTMLAudioElement | null {
  return unlockedEl;
}
