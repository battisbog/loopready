/**
 * Drives the real MicGate through every permission state in a DOM, so the
 * denial and already-granted paths are exercised rather than assumed.
 *
 *   npx tsx scripts/verify-mic-gate.mts
 */
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><div id=root></div>");
const frames = new Map<number, FrameRequestCallback>();
let fid = 0, clock = 0;
const g = globalThis as Record<string, unknown>;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
g.window = dom.window; g.document = dom.window.document;
g.HTMLElement = dom.window.HTMLElement; g.Element = dom.window.Element; g.Node = dom.window.Node;
g.IS_REACT_ACT_ENVIRONMENT = true;
// next/link schedules prefetch through requestIdleCallback, which reaches for
// `self`. The denied screen renders a Link, so without this the harness (not
// the component) throws.
g.self = dom.window;
(dom.window as unknown as Record<string, unknown>).requestIdleCallback = (cb: () => void) => { cb(); return 1; };
g.requestIdleCallback = (dom.window as unknown as Record<string, unknown>).requestIdleCallback;
g.cancelIdleCallback = () => {};
(dom.window as unknown as Record<string, unknown>).IntersectionObserver = class {
  observe() {} unobserve() {} disconnect() {}
};
g.IntersectionObserver = (dom.window as unknown as Record<string, unknown>).IntersectionObserver;
dom.window.requestAnimationFrame = ((cb: FrameRequestCallback) => { frames.set(++fid, cb); return fid; }) as never;
dom.window.cancelAnimationFrame = ((id: number) => { frames.delete(id); }) as never;
g.requestAnimationFrame = dom.window.requestAnimationFrame;
g.cancelAnimationFrame = dom.window.cancelAnimationFrame;
g.performance = { now: () => clock } as Performance;

const React = (await import("react")).default;
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { audioLevels } = await import("../lib/audio-levels.ts");
const MicGate = (await import("../app/session/[id]/mic-gate.tsx")).default;

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label.padEnd(56)} ${detail}`);
  if (!ok) failures++;
}

const track = () => ({ stop() { stopped++; }, kind: "audio" });
let stopped = 0;
function fakeStream() {
  return { getTracks: () => [track()], getAudioTracks: () => [track()] } as unknown as MediaStream;
}

function install(permission: string | null, gum: () => Promise<MediaStream>) {
  Object.defineProperty(dom.window.navigator, "mediaDevices", {
    value: { getUserMedia: gum }, configurable: true,
  });
  Object.defineProperty(dom.window.navigator, "permissions", {
    value: permission === null
      ? undefined
      : { query: async () => ({ state: permission }) },
    configurable: true,
  });
}

let roots: { unmount: () => void }[] = [];
async function render(): Promise<{ container: HTMLElement; handed: MediaStream[] }> {
  // A fresh container each time: React refuses to createRoot twice on one node.
  for (const r of roots) await act(async () => r.unmount());
  roots = [];
  const host = dom.window.document.getElementById("root")!;
  host.innerHTML = "";
  const container = dom.window.document.createElement("div");
  host.appendChild(container);
  const handed: MediaStream[] = [];
  const root = createRoot(container);
  roots.push(root);
  await act(async () => {
    root.render(React.createElement(MicGate, { onReady: (s: MediaStream) => handed.push(s), roundLabel: "Behavioral" }));
  });
  await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
  return { container, handed };
}
const text = (c: HTMLElement) => c.textContent ?? "";
const buttons = (c: HTMLElement) => [...c.querySelectorAll("button")] as HTMLButtonElement[];

console.log("\nPermission state: prompt (first time)");
{
  let called = 0;
  install("prompt", async () => { called++; return fakeStream(); });
  const { container, handed } = await render();
  check("does NOT request the mic on mount", called === 0, "no prompt until the user clicks");
  check("shows the explanation", /Enable microphone/.test(text(container)));
  check("interview has not started", handed.length === 0);

  const btn = buttons(container).find((b) => /Enable microphone/.test(b.textContent ?? ""));
  await act(async () => { btn?.click(); });
  await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
  check("requests only after the click", called === 1);
  check("moves to the sound check", /Say something/.test(text(container)));
  check("still has not started the interview", handed.length === 0, "waits for the start button");

  const start = buttons(container).find((b) => /Start/.test(b.textContent ?? ""));
  await act(async () => { start?.click(); });
  check("hands the stream over on start", handed.length === 1, "session receives a live stream");
}

console.log("\nPermission state: already granted");
{
  let called = 0;
  install("granted", async () => { called++; return fakeStream(); });
  const { container, handed } = await render();
  check("skips the explanation screen", !/Enable microphone/.test(text(container)));
  check("goes straight to the sound check", /Say something/.test(text(container)));
  check("acquires without a second click", called === 1, "no re-prompt");
  check("but still waits for confirmation", handed.length === 0, "mic check is always shown");
}

console.log("\nPermission state: denied");
{
  install("denied", async () => { throw Object.assign(new Error("no"), { name: "NotAllowedError" }); });
  const { container, handed } = await render();
  check("shows a blocked message", /Microphone access is blocked/.test(text(container)));
  check("explains how to fix it", /Set Microphone to Allow/.test(text(container)));
  check("never starts a broken interview", handed.length === 0);
  check("offers a way out", /Reload/.test(text(container)) && /dashboard/i.test(text(container)));
}

console.log("\nUser blocks at the browser prompt");
{
  install("prompt", async () => { throw Object.assign(new Error("denied"), { name: "NotAllowedError" }); });
  const { container } = await render();
  const btn = buttons(container).find((b) => /Enable microphone/.test(b.textContent ?? ""));
  await act(async () => { btn?.click(); });
  await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
  check("falls into the blocked state", /Microphone access is blocked/.test(text(container)));
}

console.log("\nNo microphone on the device");
{
  install("prompt", async () => { throw Object.assign(new Error("none"), { name: "NotFoundError" }); });
  const { container } = await render();
  const btn = buttons(container).find((b) => /Enable microphone/.test(b.textContent ?? ""));
  await act(async () => { btn?.click(); });
  await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
  check("distinguishes missing hardware from denial", /No microphone available/.test(text(container)));
}

console.log("\nBrowser without the Permissions API (Safari)");
{
  let called = 0;
  install(null, async () => { called++; return fakeStream(); });
  const { container } = await render();
  check("falls back to the prompt screen", /Enable microphone/.test(text(container)), "no crash");
  check("does not silently request", called === 0);
}

console.log("\nStream ownership");
{
  stopped = 0;
  install("granted", async () => fakeStream());
  const { container, handed } = await render();
  const start = buttons(container).find((b) => /Start/.test(b.textContent ?? ""));
  await act(async () => { start?.click(); });
  check("stream is handed off, not stopped by the gate", handed.length === 1 && stopped === 0,
    `handed=${handed.length} stopped=${stopped}`);
}

console.log(failures === 0 ? "\nAll mic gate checks passed.\n" : `\n${failures} FAILED.\n`);
process.exit(failures === 0 ? 0 : 1);
