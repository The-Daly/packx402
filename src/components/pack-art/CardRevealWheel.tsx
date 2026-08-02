"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, animate, useReducedMotion } from "motion/react";
import { CardBack } from "./CardBack";
import { CardOverlaySlot } from "./CardOverlaySlot";
import type { ResolvedCardImage } from "@/shared/card-image";

export interface SpinPossibleCard {
  cardName: string;
  imageUrl: string;
}

export interface CardRevealWheelProps {
  cardName: string;
  resolvedImage: ResolvedCardImage | null;
  /** Real cards this pack's pool could actually contain, cycled through as the non-winner
   * spin slots — shows genuine possible pulls instead of a blank card back. Falls back to
   * generic card backs when empty (e.g. no images resolved yet). Never includes or implies
   * which one is the actual winner — that's `resolvedImage`/`cardName` alone. */
  possibleCards?: SpinPossibleCard[];
  /** How many slots spin past before landing on the winner. */
  spinCount?: number;
  onSpinComplete?: () => void;
  className?: string;
}

const SLOT_WIDTH = 200;

/**
 * After the pack is ripped open, this spins a horizontal strip of generic card backs past
 * the viewport — fast at first, decelerating — until it comes to rest exactly on the final
 * slot, which then flips over (3D rotateY) to reveal the actual resolved card. The
 * deceleration is purely a presentation animation; the winning card was already determined
 * by the fairness engine before this component ever mounts (see docs/FAIRNESS_PROTOCOL.md)
 * — nothing here influences which card is won.
 */
export function CardRevealWheel({
  cardName,
  resolvedImage,
  possibleCards = [],
  spinCount = 10,
  onSpinComplete,
  className,
}: CardRevealWheelProps) {
  const reducedMotion = useReducedMotion();
  const x = useMotionValue(0);
  const [spinning, setSpinning] = useState(!reducedMotion);
  const [flipped, setFlipped] = useState(reducedMotion);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (reducedMotion) {
      onSpinComplete?.();
      return;
    }

    const target = -(spinCount * SLOT_WIDTH);
    const controls = animate(x, target, {
      duration: 2.4,
      ease: [0.1, 0.55, 0.15, 1], // fast start, long decelerating tail — settles, doesn't overshoot
    });
    controls.then(() => {
      setSpinning(false);
      onSpinComplete?.();
      window.setTimeout(() => setFlipped(true), 150);
    });
  }, [x, spinCount, reducedMotion, onSpinComplete]);

  const slots = Array.from({ length: spinCount + 1 });

  return (
    <div
      className={["relative aspect-[5/7] w-full max-w-[200px] overflow-hidden", className ?? ""].join(
        " ",
      )}
    >
      <div className="from-background pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r to-transparent" />
      <div className="from-background pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l to-transparent" />

      <motion.div className="absolute inset-y-0 left-1/2 flex" style={{ x }}>
        {slots.map((_, i) => {
          const isWinnerSlot = i === spinCount;
          return (
            <div
              key={i}
              className="flex h-full items-center justify-center px-2"
              style={{ width: SLOT_WIDTH, marginLeft: i === 0 ? -SLOT_WIDTH / 2 : 0 }}
            >
              {isWinnerSlot ? (
                <div style={{ perspective: 800 }} className="h-full w-full">
                  <motion.div
                    className="h-full w-full [transform-style:preserve-3d]"
                    animate={{ rotateY: flipped ? 0 : 180 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  >
                    {flipped ? (
                      <CardOverlaySlot cardName={cardName} resolved={resolvedImage} />
                    ) : (
                      <CardBack />
                    )}
                  </motion.div>
                </div>
              ) : possibleCards.length > 0 ? (
                <CardOverlaySlot
                  cardName={possibleCards[i % possibleCards.length].cardName}
                  resolved={{
                    imageUrl: possibleCards[i % possibleCards.length].imageUrl,
                    imageType: "CATALOG_RENDER",
                    provider: "pokemon_tcg",
                    attribution: null,
                    isExactItem: false,
                    fallbackUsed: false,
                  }}
                />
              ) : (
                <CardBack />
              )}
            </div>
          );
        })}
      </motion.div>

      {spinning && (
        <span className="sr-only" role="status">
          Spinning through cards…
        </span>
      )}
    </div>
  );
}
