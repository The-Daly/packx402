"use client";

import { useEffect } from "react";
import { motion, useReducedMotion } from "motion/react";

export interface CoinFlipProps {
  /** The already-determined outcome from the server (see deriveBonusFlipHit in
   * src/server/fairness/engine.ts) — this component only animates it, it never decides
   * the outcome itself. `true` means the 4% bonus-flip hit and a second real card was
   * awarded alongside the primary pull. */
  hit: boolean;
  /** Fires once the flip animation finishes. */
  onComplete: () => void;
  className?: string;
}

/**
 * Animates the bonus-flip result the server already determined (a fixed 4% chance,
 * derived from the same committed fairness seed as the primary pull — see
 * offer-service.ts's settleOfferAndOpen). This component has no randomness of its own;
 * `hit` is real data, not a client-side coin toss.
 */
export function CoinFlip({ hit, onComplete, className }: CoinFlipProps) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      onComplete();
      return;
    }
    const timeout = window.setTimeout(onComplete, 1100);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onComplete is expected to be stable per mount
  }, [reducedMotion]);

  return (
    <div className={["flex flex-col items-center gap-2", className ?? ""].join(" ")} style={{ perspective: 600 }}>
      <motion.div
        className="border-accent bg-surface flex h-16 w-16 items-center justify-center rounded-full border-2 text-xs font-semibold [transform-style:preserve-3d]"
        animate={reducedMotion ? {} : { rotateY: [0, 1080 + (hit ? 0 : 180)] }}
        transition={{ duration: 1, ease: "easeOut" }}
        aria-hidden="true"
      >
        {hit ? "★" : "✦"}
      </motion.div>
      <p className="text-muted text-xs" role="status">
        Bonus flip…
      </p>
    </div>
  );
}
