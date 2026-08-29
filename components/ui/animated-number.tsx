"use client";

import { useEffect, useRef, useState } from "react";

/**
 * requestAnimationFrame count-up, eased out (cubic). Re-fires whenever
 * `target` changes, animating from wherever the last run landed rather than
 * resetting to 0 -- so a live re-fetch settles on the new number instead of
 * replaying the whole climb.
 */
export function useAnimatedNumber(target: number, duration = 700) {
  const [display, setDisplay] = useState(0);
  const currentRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    const from = currentRef.current;
    const diff = target - from;
    if (diff === 0) return;

    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(from + diff * eased);
      currentRef.current = next;
      setDisplay(next);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        currentRef.current = target;
        setDisplay(target);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}

export function AnimatedNumber({
  value,
  duration,
}: {
  value: number;
  duration?: number;
}) {
  const animated = useAnimatedNumber(value, duration);
  return <>{animated.toLocaleString()}</>;
}
