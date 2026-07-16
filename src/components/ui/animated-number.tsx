"use client";

import { useEffect, useRef } from "react";
import { animate, useMotionValue, useMotionValueEvent } from "framer-motion";
import { useState } from "react";

/**
 * Counts up (or down) to `value` whenever it changes, instead of snapping —
 * makes polled dashboard stats (which update every few seconds) feel alive
 * rather than flickery. Renders "—" while the underlying query hasn't
 * loaded yet (value === null/undefined).
 */
export function AnimatedNumber({
  value,
  className,
}: {
  value: number | null | undefined;
  className?: string;
}) {
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState(0);
  const hasMounted = useRef(false);

  useMotionValueEvent(motionValue, "change", (latest) => {
    setDisplay(Math.round(latest));
  });

  useEffect(() => {
    if (value == null) return;
    // First real value: snap in immediately rather than counting up from 0
    // on initial load, which would look like a fake "loading" animation.
    if (!hasMounted.current) {
      hasMounted.current = true;
      motionValue.set(value);
      setDisplay(value);
      return;
    }
    const controls = animate(motionValue, value, {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [value, motionValue]);

  if (value == null) {
    return <span className={className}>—</span>;
  }

  return <span className={className}>{display}</span>;
}
