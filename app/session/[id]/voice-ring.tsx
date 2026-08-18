"use client";

import { useEffect, useRef } from "react";
import { audioLevels } from "@/lib/audio-levels";

/**
 * The interviewer's visual presence: a ring whose stroke undulates with
 * whichever voice currently holds the floor.
 *
 * SVG rather than WebGL. A ring is a one-dimensional shape, so there is nothing
 * here a shader buys us, and this costs one path recalculation per frame
 * instead of a GPU context per mounted round.
 *
 * Colour never appears as a literal. Every state names a design token, the
 * wrapper sets it as `color`, and everything inside paints with `currentColor`
 * so a state change animates as a single CSS colour transition.
 */
export type RingState =
  | "idle"
  | "recording"
  | "listening"
  | "transcribing"
  | "thinking"
  | "speaking"
  | "connecting"
  | "done"
  | "failed";

interface Style {
  /** A design token, never a literal. */
  color: string;
  /** Which side of the conversation drives the stroke, if any. */
  source: "output" | "input" | null;
  /** How far live audio deforms the stroke, in viewBox units. */
  reactivity: number;
  /** Ambient undulation when nobody is talking. */
  breath: number;
  /** Degrees per second for the orbiting arc. */
  spin: number;
  /** Number of waves around the circumference. */
  lobes: number;
  /** Resting stroke width. */
  width: number;
  /** Halo strength, 0..1. */
  glow: number;
  /** Opacity of the dashed arc that reads as "working". */
  arc: number;
}

const STATE_STYLE: Record<RingState, Style> = {
  // The interviewer is talking. This is the state the whole component exists
  // for: bright emerald, wide stroke, strongly voice-driven.
  speaking: {
    color: "var(--accent-hover)",
    source: "output",
    reactivity: 8,
    breath: 0.5,
    spin: 24,
    lobes: 5,
    width: 2.6,
    glow: 1,
    arc: 0.18,
  },
  // The candidate is talking. Cool cyan so the two voices never look alike.
  recording: {
    color: "var(--accent-cool)",
    source: "input",
    reactivity: 6.5,
    breath: 0.4,
    spin: -16,
    lobes: 4,
    width: 2.2,
    glow: 0.75,
    arc: 0.16,
  },
  listening: {
    color: "var(--accent-cool)",
    source: "input",
    reactivity: 6.5,
    breath: 0.4,
    spin: -16,
    lobes: 4,
    width: 2.2,
    glow: 0.75,
    arc: 0.16,
  },
  // Working. No audio to react to, so a slow breath plus a travelling arc.
  thinking: {
    color: "var(--text-secondary)",
    source: null,
    reactivity: 0,
    breath: 1.3,
    spin: 42,
    lobes: 3,
    width: 1.8,
    glow: 0.32,
    arc: 0.75,
  },
  transcribing: {
    color: "var(--text-secondary)",
    source: null,
    reactivity: 0,
    breath: 1.3,
    spin: 42,
    lobes: 3,
    width: 1.8,
    glow: 0.32,
    arc: 0.75,
  },
  connecting: {
    color: "var(--text-secondary)",
    source: null,
    reactivity: 0,
    breath: 1,
    spin: 58,
    lobes: 3,
    width: 1.6,
    glow: 0.28,
    arc: 0.85,
  },
  // Calm ambient drift, so the surface is never dead before the first turn.
  idle: {
    color: "var(--accent)",
    source: null,
    reactivity: 0,
    breath: 1.1,
    spin: 7,
    lobes: 3,
    width: 1.7,
    glow: 0.42,
    arc: 0.12,
  },
  done: {
    color: "var(--text-muted)",
    source: null,
    reactivity: 0,
    breath: 0.5,
    spin: 4,
    lobes: 2,
    width: 1.5,
    glow: 0.22,
    arc: 0,
  },
  failed: {
    color: "var(--error)",
    source: null,
    reactivity: 0,
    breath: 0.5,
    spin: 5,
    lobes: 2,
    width: 1.8,
    glow: 0.4,
    arc: 0,
  },
};

/** Everything is authored against this box and scaled by CSS. */
const VIEW = 200;
const CENTER = VIEW / 2;
const BASE_RADIUS = 74;

/**
 * A closed path drawn as quadratic curves through the midpoints of the sample
 * points. Cheaper than a spline and C1-continuous, so the stroke stays smooth
 * however hard the audio pushes it.
 */
function ringPath(points: ArrayLike<number>, count: number): string {
  const mid = (a: number, b: number) => (a + b) / 2;
  let px = points[(count - 1) * 2];
  let py = points[(count - 1) * 2 + 1];
  let d = `M${mid(px, points[0]).toFixed(2)} ${mid(py, points[1]).toFixed(2)}`;
  for (let i = 0; i < count; i++) {
    const cx = points[i * 2];
    const cy = points[i * 2 + 1];
    const n = (i + 1) % count;
    d += `Q${cx.toFixed(2)} ${cy.toFixed(2)} ${mid(cx, points[n * 2]).toFixed(2)} ${mid(cy, points[n * 2 + 1]).toFixed(2)}`;
    px = cx;
    py = cy;
  }
  return `${d}Z`;
}

export default function VoiceRing({
  state,
  size = 260,
  className = "",
}: {
  state: RingState;
  size?: number;
  className?: string;
}) {
  const glow = useRef<HTMLDivElement>(null);
  const path = useRef<SVGPathElement>(null);
  const echo = useRef<SVGPathElement>(null);
  const arc = useRef<SVGGElement>(null);

  // The frame loop reads the live state through a ref so that changing state
  // never tears down and rebuilds the animation. Committing it in an effect
  // rather than during render keeps the loop the only reader.
  const styleRef = useRef(STATE_STYLE[state] ?? STATE_STYLE.idle);
  useEffect(() => {
    styleRef.current = STATE_STYLE[state] ?? STATE_STYLE.idle;
  }, [state]);

  useEffect(() => {
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduced) return;

    // Fewer samples on small screens: the ring is physically smaller there, so
    // the extra vertices are not visible but the per-frame cost is.
    const count = window.innerWidth < 640 ? 72 : 120;
    const pts = new Float64Array(count * 2);
    // Precomputed because sin/cos of a fixed angle set never changes.
    const cos = new Float64Array(count);
    const sin = new Float64Array(count);
    const angle = new Float64Array(count);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      angle[i] = a;
      cos[i] = Math.cos(a);
      sin[i] = Math.sin(a);
    }

    let raf = 0;
    let last = performance.now();
    let time = 0;
    let spin = 0;
    let amp = 0;
    let width = styleRef.current.width;
    let glowLevel = styleRef.current.glow;
    let arcLevel = styleRef.current.arc;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);

      // Cap at 60fps. On a 120Hz display this halves the work for motion no
      // one can see, which matters most on the phones that have those screens.
      const dt = now - last;
      if (dt < 15.5) return;
      last = now;
      // A backgrounded tab returns one enormous delta; clamp so the ring does
      // not snap to a wild phase on return.
      const step = Math.min(dt, 50) / 1000;

      const s = styleRef.current;
      time += step;
      spin = (spin + s.spin * step) % 360;

      const raw = s.source ? audioLevels.level(s.source) : 0;
      // Rise quickly, fall gently: the ring should catch the attack of a word
      // but not flicker between syllables.
      amp += (raw - amp) * Math.min(1, step * (raw > amp ? 14 : 7));

      // Ease the per-state constants so switching states glides.
      const ease = Math.min(1, step * 4);
      width += (s.width + amp * 2.2 - width) * ease;
      glowLevel += (s.glow * (0.55 + amp * 0.75) - glowLevel) * ease;
      arcLevel += (s.arc - arcLevel) * ease;

      const radius = BASE_RADIUS + amp * 4;
      const wave = amp * s.reactivity;
      const breath = s.breath;

      for (let i = 0; i < count; i++) {
        const a = angle[i];
        const r =
          radius +
          breath * Math.sin(a * s.lobes + time * 0.9) +
          wave *
            (0.62 * Math.sin(a * s.lobes + time * 2.4) +
              0.38 * Math.sin(a * (s.lobes + 3) - time * 1.7));
        pts[i * 2] = CENTER + cos[i] * r;
        pts[i * 2 + 1] = CENTER + sin[i] * r;
      }

      if (path.current) {
        path.current.setAttribute("d", ringPath(pts, count));
        path.current.style.strokeWidth = width.toFixed(2);
      }

      // A second, lagging copy gives the stroke depth while the voice is loud
      // and costs nothing when it is quiet.
      if (echo.current) {
        if (wave > 0.05) {
          for (let i = 0; i < count; i++) {
            const a = angle[i];
            const r =
              radius +
              5 +
              wave * 0.7 * Math.sin(a * s.lobes - time * 1.9 + 1.1);
            pts[i * 2] = CENTER + cos[i] * r;
            pts[i * 2 + 1] = CENTER + sin[i] * r;
          }
          echo.current.setAttribute("d", ringPath(pts, count));
          echo.current.style.opacity = String(Math.min(0.4, amp * 0.55));
        } else {
          echo.current.style.opacity = "0";
        }
      }

      if (arc.current) {
        arc.current.style.transform = `rotate(${spin.toFixed(1)}deg)`;
        arc.current.style.opacity = arcLevel.toFixed(3);
      }
      if (glow.current) {
        glow.current.style.opacity = glowLevel.toFixed(3);
        glow.current.style.transform = `scale(${(0.94 + amp * 0.12).toFixed(3)})`;
      }
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const s = STATE_STYLE[state] ?? STATE_STYLE.idle;

  return (
    <div
      aria-hidden
      className={`relative ${className}`}
      // `color` is the single carrier for state colour: it transitions
      // natively and every child paints with currentColor.
      style={{
        width: size,
        height: size,
        color: s.color,
        transition: "color 600ms ease",
      }}
    >
      {/* Halo. A radial gradient rather than a blur filter, which stays cheap
          on low-power GPUs. */}
      <div
        ref={glow}
        className="pointer-events-none absolute inset-0 rounded-full motion-reduce:opacity-40"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, currentColor 0%, transparent 62%)",
          opacity: s.glow * 0.55,
          willChange: "opacity, transform",
        }}
      />

      <svg
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        className="absolute inset-0 h-full w-full overflow-visible"
        fill="none"
      >
        {/* Track: the ring never disappears, whatever the audio is doing. */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={BASE_RADIUS}
          stroke="currentColor"
          strokeWidth={1}
          opacity={0.16}
        />

        {/* Orbiting dashes. Carries "connecting" and "thinking", where there is
            no audio to react to. */}
        <g
          ref={arc}
          style={{
            transformOrigin: "50% 50%",
            opacity: s.arc,
            willChange: "transform, opacity",
          }}
        >
          <circle
            cx={CENTER}
            cy={CENTER}
            r={BASE_RADIUS + 9}
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeDasharray="34 210"
            opacity={0.85}
          />
          <circle
            cx={CENTER}
            cy={CENTER}
            r={BASE_RADIUS + 9}
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeDasharray="12 232"
            strokeDashoffset={-130}
            opacity={0.5}
          />
        </g>

        <path
          ref={echo}
          stroke="currentColor"
          strokeWidth={1.2}
          strokeLinejoin="round"
          opacity={0}
          style={{ willChange: "d, opacity" }}
        />
        <path
          ref={path}
          stroke="currentColor"
          strokeWidth={s.width}
          strokeLinejoin="round"
          style={{ willChange: "d" }}
          // Drawn before the first frame so there is no empty flash on mount,
          // and so it is the whole ring under reduced motion.
          d={`M${CENTER - BASE_RADIUS} ${CENTER}a${BASE_RADIUS} ${BASE_RADIUS} 0 1 0 ${BASE_RADIUS * 2} 0a${BASE_RADIUS} ${BASE_RADIUS} 0 1 0 ${-BASE_RADIUS * 2} 0Z`}
        />
      </svg>
    </div>
  );
}
