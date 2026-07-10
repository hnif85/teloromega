"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * SectionTransition — wraps a section's content in a subtle fade+slide so
 * navigating between Beranda / Riset / Konten / etc. feels animated without
 * being slow. The `key` (sectionKey) on motion.div forces a re-mount on
 * section change, which triggers the enter animation each time.
 */
export function SectionTransition({
  children,
  sectionKey,
}: {
  children: ReactNode;
  sectionKey: string;
}) {
  return (
    <motion.div
      key={sectionKey}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}
