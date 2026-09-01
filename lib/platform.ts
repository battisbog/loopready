"use client";

/**
 * iOS / WebKit detection.
 *
 * Apple requires every browser on iOS -- Chrome, Firefox, Edge, and Safari
 * itself -- to run on WebKit under the hood (they're WKWebView shells around
 * the same rendering engine, not a different one). That means the WebKit
 * media quirks (autoplay/user-gesture requirements for <audio>/<video>,
 * getUserMedia constraint strictness, MediaRecorder codec support) apply to
 * ALL of them, not just to pages that identify Safari's own UA string.
 *
 * A common, easy-to-write bug is testing for "real Safari" and gating a
 * WebKit-only workaround behind that -- which silently SKIPS the workaround
 * for Chrome/Firefox/Edge on iOS even though they need it just as much.
 * `isIOS` exists so workarounds key off "are we on WebKit-on-iOS" (apply to
 * everyone), while `isRealSafari` exists ONLY for copy/messaging that should
 * differ (e.g. "click the address bar icon" doesn't apply the same way in
 * an iOS Chrome/Firefox shell) -- never for deciding whether a WebKit
 * workaround runs.
 */

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iP(hone|od|ad)/.test(ua)) return true;
  // iPadOS 13+ reports as "Macintosh" in its UA string, so a touch-capable
  // "Mac" is actually an iPad.
  return (
    navigator.platform === "MacIntel" &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1
  );
}

/**
 * True only for Safari's own browser chrome. Every other iOS browser is
 * ALSO WebKit and needs the same audio-unlock treatment -- this is for
 * messaging copy only (e.g. how to point someone at the right permission
 * toggle), never for deciding whether an iOS/WebKit workaround applies.
 */
export function isRealSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Android/.test(ua);
}

/** iOS, but not Safari itself -- Chrome/Firefox/Edge/etc. inside a WKWebView shell. */
export function isIOSNonSafari(): boolean {
  return isIOS() && !isRealSafari();
}
