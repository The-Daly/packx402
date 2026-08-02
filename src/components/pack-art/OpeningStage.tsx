"use client";

import { useEffect, useState } from "react";
import type { PackTierKey } from "@/server/config/pack-tiers";
import { PackArt } from "./PackArt";
import { CardOverlaySlot } from "./CardOverlaySlot";
import { ResultEffect, type ResultIntensity } from "./ResultEffect";
import type { ResolvedCardImage } from "@/shared/card-image";

export type OpeningPhase = "idle" | "tearing" | "revealing" | "resolved";

export interface OpeningStageProps {
  tierKey: PackTierKey;
  tierName: string;
  price: number;
  phase: OpeningPhase;
  cardName?: string;
  resolvedImage?: ResolvedCardImage | null;
  resultIntensity?: ResultIntensity;
  /** Future hooks — see docs/ASSET_MANIFEST.md (pack402_idle_*, pack402_open_single_*). */
  idleVideoSrc?: string;
  openingVideoSrc?: string;
  onSkipReveal?: () => void;
  className?: string;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const listener = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);
  return reduced;
}

/**
 * Single-pack opening stage: composes PackArt (idle/opening), the CardOverlaySlot
 * reveal, and a ResultEffect layer, always keeping the card-overlay position stable so
 * swapping in real Higgsfield video later never requires a layout change. Honors
 * reduced-motion by collapsing straight to the resolved state.
 */
export function OpeningStage({
  tierKey,
  tierName,
  price,
  phase,
  cardName,
  resolvedImage,
  resultIntensity = "standard",
  idleVideoSrc,
  openingVideoSrc,
  onSkipReveal,
  className,
}: OpeningStageProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const effectivePhase = prefersReducedMotion && phase !== "idle" ? "resolved" : phase;

  return (
    <div className={["relative mx-auto w-full max-w-xs", className ?? ""].join(" ")}>
      {effectivePhase === "idle" || effectivePhase === "tearing" ? (
        <>
          {idleVideoSrc ? (
            <video
              className="aspect-[2/3] w-full rounded-xl object-cover"
              src={idleVideoSrc}
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <PackArt
              tierKey={tierKey}
              tierName={tierName}
              price={price}
              size="detail"
              priority
              animationState={effectivePhase === "tearing" ? "opening" : "idle"}
            />
          )}
        </>
      ) : (
        <div className="relative">
          <ResultEffect
            intensity={resultIntensity}
            videoSrc={openingVideoSrc}
            active={effectivePhase === "revealing" || effectivePhase === "resolved"}
          />
          <CardOverlaySlot
            cardName={cardName ?? "Your card"}
            resolved={effectivePhase === "resolved" ? resolvedImage : null}
            loading={effectivePhase === "revealing" && !resolvedImage}
            className="relative z-10"
          />
        </div>
      )}

      {onSkipReveal && effectivePhase !== "resolved" && (
        <button
          type="button"
          onClick={onSkipReveal}
          className="border-border-subtle text-muted hover:border-accent/50 hover:text-foreground mt-4 w-full rounded-md border px-4 py-2 text-xs"
        >
          Skip Reveal
        </button>
      )}
    </div>
  );
}
