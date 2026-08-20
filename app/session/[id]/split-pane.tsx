"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const KEY = "loopready:rail-width";
const MIN = 18;
const MAX = 55;

/**
 * Draggable divider between the interviewer rail and the work surface, the way
 * a real coding environment lets you trade editor space against everything
 * else. The width is remembered, because re-dragging it at the start of every
 * interview is exactly the kind of friction that makes practice feel like a toy.
 *
 * Percent rather than pixels, so the split survives a window resize.
 */
export default function SplitPane({
  left,
  right,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  // Read once, lazily. This is a client component that only ever renders after
  // the mic gate, so localStorage is available and there is no SSR value to
  // hydrate against.
  const [pct, setPct] = useState(() => {
    if (typeof window === "undefined") return 28;
    const saved = Number(window.localStorage.getItem(KEY));
    return Number.isFinite(saved) && saved >= MIN && saved <= MAX ? saved : 28;
  });
  const [dragging, setDragging] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);

  const onMove = useCallback((clientX: number) => {
    const host = hostRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPct(Math.min(MAX, Math.max(MIN, next)));
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => onMove(e.clientX);
    const up = () => {
      setDragging(false);
      // Persist only on release, so a drag does not thrash localStorage.
      setPct((p) => {
        window.localStorage.setItem(KEY, String(Math.round(p)));
        return p;
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    // Stops the editor selecting text while the divider is being dragged.
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [dragging, onMove]);

  return (
    <div ref={hostRef} className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className="min-h-0 lg:h-full" style={{ flexBasis: `${pct}%` }}>
        {left}
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize the interviewer panel"
        tabIndex={0}
        onPointerDown={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onKeyDown={(e) => {
          // Keyboard users get the same control, in 2% steps.
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
          e.preventDefault();
          setPct((p) => {
            const next = Math.min(MAX, Math.max(MIN, p + (e.key === "ArrowLeft" ? -2 : 2)));
            window.localStorage.setItem(KEY, String(Math.round(next)));
            return next;
          });
        }}
        className={`group hidden w-1.5 shrink-0 cursor-col-resize items-center justify-center border-x border-line transition-colors lg:flex ${
          dragging ? "bg-accent-muted" : "hover:bg-elevated"
        }`}
      >
        <span
          className={`h-8 w-0.5 rounded-full transition-colors ${
            dragging ? "bg-accent" : "bg-line-strong group-hover:bg-accent"
          }`}
        />
      </div>

      <div className="min-h-0 flex-1 border-t border-line lg:border-t-0">
        {right}
      </div>
    </div>
  );
}
