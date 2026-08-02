"use client";

import { useState } from "react";
import { PackCarousel, type PackCarouselItem } from "@/components/pack-art/PackCarousel";
import { OpeningStage, type OpeningPhase } from "@/components/pack-art/OpeningStage";
import { CoinFlip } from "@/components/pack-art/CoinFlip";

const DEMO_TIERS: PackCarouselItem[] = [
  { tierKey: "spark", tierName: "Spark", price: 500_000 },
  { tierKey: "obsidian", tierName: "Obsidian", price: 100_000_000 },
  { tierKey: "mythic", tierName: "Mythic", price: 250_000_000 },
];

/**
 * No-database preview of the full carousel-select -> rip -> spin -> reveal sequence, for
 * local demoing when Postgres isn't running (the real /packs/[tierKey]/open page 404s
 * without a live DB — this page never touches it). Uses a fixed placeholder card name/
 * image, not a real fairness-selected outcome — dev-only, not linked from anywhere in the
 * real app.
 */
export default function RipPreviewPage() {
  const [selected, setSelected] = useState<PackCarouselItem>(DEMO_TIERS[0]);
  const [hasSelectedPack, setHasSelectedPack] = useState(false);
  const [phase, setPhase] = useState<OpeningPhase>("idle");
  const [showCoinFlip, setShowCoinFlip] = useState(false);
  const [wheelKey, setWheelKey] = useState(0);

  function reset() {
    setPhase("idle");
    setShowCoinFlip(false);
    setWheelKey((k) => k + 1);
  }

  function handleRevealSettled() {
    setPhase("resolved");
    if (Math.random() < 0.35) {
      // Higher than production's 15% so the flourish is easy to see while demoing.
      window.setTimeout(() => setShowCoinFlip(true), 500);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-12">
      <p className="border-accent/40 bg-surface text-muted mb-6 rounded-md border p-3 text-center text-xs">
        Dev preview only — no database, no real card outcome. Not linked from the real
        app.
      </p>

      <h1 className="mb-6 text-center text-xl font-semibold">Rip-open animation preview</h1>

      {hasSelectedPack ? (
        <>
          <p className="text-muted mb-4 text-center text-sm">
            Drag across the top to rip {selected.tierName} open.
          </p>
          <OpeningStage
            key={wheelKey}
            tierKey={selected.tierKey}
            tierName={selected.tierName}
            price={selected.price}
            phase={phase}
            cardName="Charizard (demo)"
            resolvedImage={null}
            onRipped={() => setPhase("revealing")}
            onSpinComplete={handleRevealSettled}
          />

          {showCoinFlip && (
            <CoinFlip
              onResult={(heads) => {
                setShowCoinFlip(false);
                if (heads) {
                  setWheelKey((k) => k + 1);
                  setPhase("revealing");
                }
              }}
              className="mt-4"
            />
          )}

          <button
            onClick={() => {
              setHasSelectedPack(false);
              reset();
            }}
            className="border-border-subtle hover:border-accent/50 mt-6 w-full rounded-md border px-4 py-2 text-sm"
          >
            Choose a different pack
          </button>
        </>
      ) : (
        <p className="text-muted mb-4 text-center text-sm">
          Spin to a pack below, then tap it to select it.
        </p>
      )}

      <PackCarousel
        items={DEMO_TIERS}
        initialIndex={DEMO_TIERS.findIndex((t) => t.tierKey === selected.tierKey)}
        onSelect={(item) => {
          setSelected(item);
          setHasSelectedPack(false);
          reset();
        }}
        onActivate={(item) => {
          setSelected(item);
          setHasSelectedPack(true);
          reset();
        }}
        className="mt-6"
      />
    </div>
  );
}
