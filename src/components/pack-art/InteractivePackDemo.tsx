"use client";

import { useState } from "react";
import { PackShelf, type PackShelfItem } from "./PackShelf";
import { OpeningStage, type OpeningPhase } from "./OpeningStage";
import { CoinFlip } from "./CoinFlip";
import { CardOverlaySlot } from "./CardOverlaySlot";
import { RIP_VIDEO_BY_TIER } from "./rip-video-map";

// Only Spark and Starter are unlocked right now (see pack-tiers.ts's TESTNET_CEILING) —
// the demo mirrors real availability rather than showcasing locked tiers.
const DEMO_TIERS: PackShelfItem[] = [
  { tierKey: "spark", tierName: "Spark", price: 500_000 },
  { tierKey: "starter", tierName: "Starter", price: 1_000_000 },
];

// Real Pokemon TCG API images (same ones resolveCardImage would actually resolve in
// production) — this demo never touches the DB, so these stand in for a tier's real pool
// preview from /api/packs/[tierKey]/spin-preview.
const DEMO_POSSIBLE_CARDS = [
  { cardName: "Charmander", imageUrl: "https://images.pokemontcg.io/base1/46_hires.png" },
  { cardName: "Pikachu", imageUrl: "https://images.pokemontcg.io/base1/58_hires.png" },
  { cardName: "Squirtle", imageUrl: "https://images.pokemontcg.io/base1/63_hires.png" },
  { cardName: "Blastoise", imageUrl: "https://images.pokemontcg.io/base1/2_hires.png" },
  { cardName: "Venusaur", imageUrl: "https://images.pokemontcg.io/base1/15_hires.png" },
  { cardName: "Charizard", imageUrl: "https://images.pokemontcg.io/base1/4_hires.png" },
];

const DEMO_RESOLVED_IMAGE = {
  imageUrl: "https://images.pokemontcg.io/base1/4_hires.png",
  imageType: "CATALOG_RENDER" as const,
  provider: "pokemon_tcg" as const,
  attribution: "Card image via the Pokémon TCG API (pokemontcg.io).",
  isExactItem: false,
  fallbackUsed: false,
};

const DEMO_BONUS_IMAGE = {
  ...DEMO_RESOLVED_IMAGE,
  imageUrl: "https://images.pokemontcg.io/base1/58_hires.png",
};

export interface InteractivePackDemoProps {
  className?: string;
}

/**
 * A no-database, no-purchase demo of the real rip → spin → reveal sequence — same
 * components the actual opening theater uses (PackShelf, RipToOpen via OpeningStage,
 * CardRevealWheel, CoinFlip), just with a fixed placeholder outcome instead of a real
 * fairness-selected card. Used on the landing page and at /dev/rip-preview. Always clearly
 * labeled as a demo — never implies a real card was won or a real payment happened.
 */
export function InteractivePackDemo({ className }: InteractivePackDemoProps) {
  const [selected, setSelected] = useState<PackShelfItem>(DEMO_TIERS[0]);
  const [hasSelectedPack, setHasSelectedPack] = useState(false);
  const [phase, setPhase] = useState<OpeningPhase>("idle");
  const [showCoinFlip, setShowCoinFlip] = useState(false);
  const [bonusHit, setBonusHit] = useState(false);
  const [showBonusCard, setShowBonusCard] = useState(false);
  const [wheelKey, setWheelKey] = useState(0);

  function reset() {
    setPhase("idle");
    setShowCoinFlip(false);
    setShowBonusCard(false);
    setWheelKey((k) => k + 1);
  }

  function handleRipped() {
    // Mirrors the real opening flow (OpenPackClient.handleRipped): show the torn-pack art
    // for a beat before the reveal wheel spins, rather than jumping straight to
    // "revealing" — long enough to actually register, not just flash past.
    setPhase("tearing");
    window.setTimeout(() => setPhase("revealing"), 1100);
  }

  function handleRevealSettled() {
    setPhase("resolved");
    // Demo-only: real odds are a fixed 4% derived server-side from the committed
    // fairness seed (see deriveBonusFlipHit) — this ~40% just makes the flourish easier to
    // catch while demoing, not a claim about the real trigger rate. Whatever the rate,
    // the coin-flip UI itself must only ever appear on a hit — never on every spin.
    const hit = Math.random() < 0.4;
    setBonusHit(hit);
    if (hit) {
      window.setTimeout(() => setShowCoinFlip(true), 500);
    }
  }

  return (
    <div className={className}>
      <p className="border-accent/40 bg-surface text-muted mx-auto mb-6 max-w-sm rounded-md border p-3 text-center text-xs">
        Demo only — no purchase, no database, no real card outcome. See it live at{" "}
        <span className="text-accent">/packs</span>.
      </p>

      {hasSelectedPack ? (
        <>
          <p className="text-muted mb-4 text-center text-sm">
            Drag across the top to rip {selected.tierName} open.
          </p>
          <div className="mx-auto max-w-xs">
            <OpeningStage
              key={wheelKey}
              tierKey={selected.tierKey}
              tierName={selected.tierName}
              price={selected.price}
              phase={phase}
              cardName="Charizard (demo)"
              resolvedImage={DEMO_RESOLVED_IMAGE}
              possibleCards={DEMO_POSSIBLE_CARDS}
              ripVideoSrc={RIP_VIDEO_BY_TIER[selected.tierKey]?.video}
              ripOpenStillSrc={RIP_VIDEO_BY_TIER[selected.tierKey]?.openStill}
              onRipped={handleRipped}
              onSpinComplete={handleRevealSettled}
            />

            {showCoinFlip && (
              <CoinFlip
                hit={bonusHit}
                onComplete={() => {
                  setShowCoinFlip(false);
                  if (bonusHit) setShowBonusCard(true);
                }}
                className="mt-4"
              />
            )}

            {showBonusCard && (
              <div className="mt-4">
                <p className="text-accent mb-2 text-center text-sm font-semibold">
                  Bonus flip hit! You also got:
                </p>
                <CardOverlaySlot
                  cardName="Pikachu (demo)"
                  resolved={DEMO_BONUS_IMAGE}
                  className="mx-auto max-w-[160px]"
                />
              </div>
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
          </div>
        </>
      ) : (
        <p className="text-muted mb-4 text-center text-sm">
          Spin to a pack below, then tap it to select it.
        </p>
      )}

      <PackShelf
        items={DEMO_TIERS}
        selectedTierKey={hasSelectedPack ? selected.tierKey : undefined}
        onSelect={(item) => {
          setSelected(item);
          setHasSelectedPack(true);
          reset();
        }}
        className="mt-6"
      />
    </div>
  );
}
