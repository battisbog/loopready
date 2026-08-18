/**
 * Verifies the shipped VoiceRing component, not a reimplementation of it.
 *
 * The component is rendered into a DOM, its animation clock is driven by hand,
 * and a synthetic speech-shaped amplitude is fed through the same audio bus the
 * real voice pipeline writes to. We then read the path the component actually
 * wrote and measure it.
 *
 *   npx tsx scripts/verify-ring.mts
 */
import { JSDOM } from "jsdom";

// ---------------------------------------------------------------- DOM setup

const dom = new JSDOM("<!doctype html><div id=root></div>", {
  pretendToBeVisual: false,
});

// Keyed so cancelAnimationFrame genuinely cancels: without that, an unmounted
// component's pending callback would keep running and look like a leak.
const frameQueue = new Map<number, FrameRequestCallback>();
let frameId = 0;
let clock = 0;

const g = globalThis as Record<string, unknown>;
// navigator is a getter-only global in Node, so it is redefined rather than set.
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});
g.window = dom.window;
g.document = dom.window.document;
g.HTMLElement = dom.window.HTMLElement;
g.SVGElement = dom.window.SVGElement;
g.Element = dom.window.Element;
g.Node = dom.window.Node;
g.IS_REACT_ACT_ENVIRONMENT = true;

let reducedMotion = false;
dom.window.matchMedia = ((q: string) => ({
  matches: q.includes("reduce") ? reducedMotion : false,
  media: q,
  addEventListener() {},
  removeEventListener() {},
})) as unknown as typeof dom.window.matchMedia;

Object.defineProperty(dom.window, "innerWidth", { value: 1280, writable: true });

// A hand-cranked clock: nothing advances unless the test says so, so every
// measurement below is deterministic.
dom.window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
  frameQueue.set(++frameId, cb);
  return frameId;
}) as typeof dom.window.requestAnimationFrame;
dom.window.cancelAnimationFrame = ((id: number) => {
  frameQueue.delete(id);
}) as typeof dom.window.cancelAnimationFrame;
g.requestAnimationFrame = dom.window.requestAnimationFrame;
g.cancelAnimationFrame = dom.window.cancelAnimationFrame;
g.performance = { now: () => clock } as Performance;

function advance(frames: number, ms = 16.7) {
  for (let i = 0; i < frames; i++) {
    clock += ms;
    const due = [...frameQueue];
    frameQueue.clear();
    for (const [, cb] of due) cb(clock);
  }
}

// -------------------------------------------------------------- the subject

const React = (await import("react")).default;
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { audioLevels } = await import("../lib/audio-levels.ts");
const VoiceRing = (await import("../app/session/[id]/voice-ring.tsx")).default;

// Stand in for the real bus. Same object the voice pipeline writes to, so the
// component is reading through its production code path.
let feed: (kind: "output" | "input") => number = () => 0;
audioLevels.level = (kind: "output" | "input") => feed(kind);

/** Speech-shaped: a syllable envelope that never sits at a constant value. */
const speech = (t: number) =>
  0.45 + 0.35 * Math.sin(t * 0.021) * Math.sin(t * 0.0067);

const container = dom.window.document.getElementById("root")!;
const root = createRoot(container);

function render(state: string) {
  act(() => {
    root.render(React.createElement(VoiceRing, { state, size: 300 }));
  });
}

// ------------------------------------------------------------- measurements

/** The Q control points in the emitted path are exactly the sample points. */
function radii(): number[] {
  const d =
    container.querySelectorAll("path")[1]?.getAttribute("d") ?? "";
  const out: number[] = [];
  const re = /Q(-?[\d.]+) (-?[\d.]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    out.push(Math.hypot(Number(m[1]) - 100, Number(m[2]) - 100));
  }
  return out;
}

const pathD = () =>
  container.querySelectorAll("path")[1]?.getAttribute("d") ?? "";
const strokeWidth = () =>
  Number(
    (container.querySelectorAll("path")[1] as SVGPathElement | undefined)?.style
      .strokeWidth || 0
  );
const deviation = () => {
  const r = radii();
  return r.length ? Math.max(...r) - Math.min(...r) : 0;
};

let failures = 0;
function check(label: string, ok: boolean, detail: string) {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label.padEnd(52)} ${detail}`);
  if (!ok) failures++;
}

// ------------------------------------------------------------------- checks

console.log("\nSPEAKING, interviewer voice on the output bus");
feed = (k) => (k === "output" ? speech(clock) : 0);
render("speaking");
advance(60);
const speakDev = deviation();
const speakWidth = strokeWidth();
const before = pathD();
advance(1);
check(
  "stroke deviates from a circle",
  speakDev > 2,
  `peak-to-peak ${speakDev.toFixed(2)} units`
);
check("path changes every frame", before !== pathD(), "d differs after 1 frame");
check(
  "stroke thickens with the voice",
  speakWidth > 2.6,
  `${speakWidth.toFixed(2)} vs 2.60 resting`
);

console.log("\nSPEAKING, but only the candidate mic is loud");
feed = (k) => (k === "input" ? 1 : 0);
advance(90);
const wrongSource = deviation();
check(
  "ignores the mic while the interviewer speaks",
  wrongSource < speakDev * 0.25,
  `${wrongSource.toFixed(2)} vs ${speakDev.toFixed(2)} on the right source`
);

console.log("\nLISTENING, candidate voice on the input bus");
feed = (k) => (k === "input" ? speech(clock) : 0);
render("listening");
advance(60);
const listenDev = deviation();
check("stroke reacts to the mic", listenDev > 2, `peak-to-peak ${listenDev.toFixed(2)}`);

console.log("\nTHINKING, no audio anywhere");
feed = () => 0;
render("thinking");
advance(60);
const thinkBefore = pathD();
advance(4);
const thinkDev = deviation();
check("still breathing", thinkBefore !== pathD(), "d advances with no audio");
check("but calm", thinkDev < 4, `peak-to-peak ${thinkDev.toFixed(2)}`);

console.log("\nIDLE");
render("idle");
advance(40);
check("ambient motion only", deviation() < 4, `peak-to-peak ${deviation().toFixed(2)}`);

console.log("\nColour comes from tokens");
const wrapper = container.firstElementChild as HTMLElement;
const inline = container.innerHTML;
render("speaking");
advance(2);
const speakColor = wrapper.style.color;
render("listening");
advance(2);
const listenColor = wrapper.style.color;
check("speaking uses a token", speakColor.startsWith("var(--"), speakColor);
check("listening uses a token", listenColor.startsWith("var(--"), listenColor);
check("the two states differ", speakColor !== listenColor, `${speakColor} vs ${listenColor}`);
check(
  "no hex literals in the rendered markup",
  !/#[0-9a-fA-F]{3,8}\b/.test(inline),
  "markup is token-only"
);

console.log("\nprefers-reduced-motion");
act(() => root.unmount());
reducedMotion = true;
const root2 = createRoot(container);
act(() => {
  root2.render(React.createElement(VoiceRing, { state: "speaking", size: 300 }));
});
feed = (k) => (k === "output" ? 1 : 0);
const staticBefore = pathD();
advance(60);
check(
  "no animation loop runs",
  staticBefore === pathD() && frameQueue.size === 0,
  "path is a static circle, no frames requested"
);
check("still visible", staticBefore.length > 0, "circle path present");

console.log(
  failures === 0
    ? "\nAll ring checks passed.\n"
    : `\n${failures} ring check(s) FAILED.\n`
);
process.exit(failures === 0 ? 0 : 1);
