"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Fades + lifts route content in on navigation. Kept subtle (200ms, 6px) per
 * the design brief — this should read as "the page settled in", not as an
 * animation. `mode="wait"` would add a visible gap between pages, so we use
 * the default (overlapping exit/enter) since content sizes differ a lot
 * between the three dashboards.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={pathname}
        className="h-full min-h-0"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
