"use client";

import type { PackTierKey } from "@/server/config/pack-tiers";
import { PackArt } from "./PackArt";
import { CardOverlaySlot } from "./CardOverlaySlot";
import { ResultEffect, type ResultIntensity } from "./ResultEffect";
import type { ResolvedCardImage } from "@/shared/card-image";
import type { OpeningPhase } from "./OpeningStage";

export interface FourPackSlot {
  tierKey: PackTierKey;
  tierName: string;
  price: number;
  phase: OpeningPhase;
  cardName?: string;
  resolvedImage?: ResolvedCardImage | null;
  resultIntensity?: ResultIntensity;
}

export interface FourPackStageProps {
  slots: [FourPackSlot, FourPackSlot, FourPackSlot, FourPackSlot];
  className?: string;
}

/**
 * Synchronized four-pack opening grid: an exact 2x2 formation with equal spacing and
 * identical scale, per the creative brief. Each slot independently tracks its own phase
 * so one card can resolve into a "major" result while the other three stay standard,
 * without covering or resizing any slot.
 */
export function FourPackStage({ slots, className }: FourPackStageProps) {
  return (
    <div
      className={["mx-auto grid w-full max-w-xl grid-cols-2 gap-4 sm:gap-6", className ?? ""].join(
        " ",
      )}
    >
      {slots.map((slot, i) => (
        <div key={i} className="relative">
          {slot.phase === "idle" || slot.phase === "tearing" ? (
            <PackArt
              tierKey={slot.tierKey}
              tierName={slot.tierName}
              price={slot.price}
              size="card"
              animationState={slot.phase === "tearing" ? "opening" : "idle"}
            />
          ) : (
            <>
              <ResultEffect
                intensity={slot.resultIntensity ?? "standard"}
                active={slot.phase === "revealing" || slot.phase === "resolved"}
              />
              <CardOverlaySlot
                cardName={slot.cardName ?? "Your card"}
                resolved={slot.phase === "resolved" ? slot.resolvedImage : null}
                loading={slot.phase === "revealing" && !slot.resolvedImage}
                className="relative z-10"
              />
            </>
          )}
        </div>
      ))}
    </div>
  );
}
