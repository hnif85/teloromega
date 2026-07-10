"use client";

import { useEffect, useRef, useState } from "react";

/**
 * AnimatedNumber — counts up from 0 to `value` on mount (and whenever `value`
 * changes) using an easeOutCubic curve driven by requestAnimationFrame.
 *
 * Use for StatCard values & similar numeric KPIs to give a subtle "live data"
 * feel without bringing in a heavier animation library.
 *
 * Pass `format` to render using `toLocaleString("id-ID")` (e.g. 12.500).
 * For currency formatting, format on the caller side (use a plain number here)
 * or wrap the AnimatedNumber with your own prefix/suffix.
 */
export function AnimatedNumber({
  value,
  duration = 800,
  format = false,
}: {
  value: number;
  duration?: number;
  format?: boolean;
}) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const startVal = 0;
    const endVal = value;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startVal + (endVal - startVal) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return <>{format ? display.toLocaleString("id-ID") : display}</>;
}
