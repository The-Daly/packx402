"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

export interface CoinFlipProps {
  /** Fires once the flip animation finishes, with the flip result. Purely cosmetic — the
   * caller decides what (if anything) happens next; this never determines a card outcome. */
  onResult: (heads: boolean) => void;
  className?: string;
}

/**
 * Purely cosmetic coin-flip flourish shown occasionally after a reveal (see
 * OpenPackClient's low-probability trigger). The flip result never changes which card the
 * user actually won — if it triggers a "bonus" re-reveal, that re-reveal always lands back
 * on the same already-resolved card. Never wired to the fairness engine or real odds.
 */
export function CoinFlip({ onResult, className }: CoinFlipProps) {
  const reducedMotion = useReducedMotion();
  const [heads] = useState(() => Math.random() < 0.5);

  useEffect(() => {
    if (reducedMotion) {
      onResult(heads);
      return;
    }
    const timeout = window.setTimeout(() => onResult(heads), 1100);
    return () => window.clearTimeout(timeout);
  }, [heads, reducedMotion, onResult]);

  return (
    <div className={["flex flex-col items-center gap-2", className ?? ""].join(" ")} style={{ perspective: 600 }}>
      <motion.div
        className="border-accent bg-surface flex h-16 w-16 items-center justify-center rounded-full border-2 text-xs font-semibold [transform-style:preserve-3d]"
        animate={reducedMotion ? {} : { rotateY: [0, 1080 + (heads ? 0 : 180)] }}
        transition={{ duration: 1, ease: "easeOut" }}
        aria-hidden="true"
      >
        {heads ? "★" : "✦"}
      </motion.div>
      <p className="text-muted text-xs" role="status">
        Bonus flip…
      </p>
    </div>
  );
}
