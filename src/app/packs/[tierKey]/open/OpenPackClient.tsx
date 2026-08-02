"use client";

import { useState } from "react";
import Link from "next/link";
import { PackCarousel, type PackCarouselItem } from "@/components/pack-art/PackCarousel";
import { OpeningStage, type OpeningPhase } from "@/components/pack-art/OpeningStage";
import { CoinFlip } from "@/components/pack-art/CoinFlip";
import type { PackTierKey } from "@/server/config/pack-tiers";
import type { ResolvedCardImage } from "@/shared/card-image";
import { usdcBaseUnitsToDisplayString } from "@/shared/money";

export interface OpenPackClientProps {
  tiers: PackCarouselItem[];
  initialTierKey: PackTierKey;
  initialLocked: boolean;
  /** Rendered when a 401 requires sign-in — a Server Component (GoogleSignInButton uses a
   * server action), so it's passed down from the server page rather than imported here. */
  signInSlot?: React.ReactNode;
}

interface PendingPayment {
  offerId: string;
  amountBaseUnits: string;
  payTo: string;
}

// Low, purely cosmetic chance of a "bonus flip" flourish after a reveal. Winning it only
// re-plays the reveal wheel animation, always landing back on the same already-resolved
// card — see CoinFlip.tsx. Never changes the real fairness-selected outcome or its odds.
const BONUS_FLIP_CHANCE = 0.15;

/**
 * Ties the pack-browsing carousel to the actual opening flow: pick a pack in the
 * carousel, drag-rip it open, then either the real x402 payment requirement (no wallet
 * connect UI exists yet — see PROJECT_STATUS.md — so this is shown rather than faked) or,
 * once a wallet flow supplies a real X-PAYMENT header, the card-reveal wheel spins down to
 * the actual fairness-selected card. Never fabricates a card outcome client-side.
 */
export function OpenPackClient({
  tiers,
  initialTierKey,
  initialLocked,
  signInSlot,
}: OpenPackClientProps) {
  const [selected, setSelected] = useState<PackCarouselItem>(
    tiers.find((t) => t.tierKey === initialTierKey) ?? tiers[0],
  );
  const [locked, setLocked] = useState(initialLocked);
  const [hasSelectedPack, setHasSelectedPack] = useState(false);
  const [phase, setPhase] = useState<OpeningPhase>("idle");
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCoinFlip, setShowCoinFlip] = useState(false);
  const [wheelKey, setWheelKey] = useState(0);

  // Populated once a real wallet-connect flow supplies X-PAYMENT and settlement succeeds —
  // not reachable yet in this beta (no wallet-connect UI), so these stay null for now.
  const resolvedImage: ResolvedCardImage | null = null;
  const cardName: string | null = null;

  async function handleRipped() {
    setPhase("tearing");
    setError(null);
    try {
      const res = await fetch("/api/x402/algorand/v1/packs/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierKey: selected.tierKey, network: "testnet" }),
      });
      const data = await res.json();

      if (res.status === 401) {
        setError("Sign in to open a pack.");
        setPhase("idle");
        return;
      }
      if (res.status === 402 && data.accepts?.[0]) {
        setPendingPayment({
          offerId: data.offerId,
          amountBaseUnits: data.accepts[0].amountBaseUnits ?? data.accepts[0].amount,
          payTo: data.accepts[0].payTo,
        });
        setPhase("idle"); // no wallet-connect UI yet — surface the payment panel instead of faking a reveal
        return;
      }
      setError(data.message ?? "Could not start this pack opening.");
      setPhase("idle");
    } catch {
      setError("Network error creating pack offer.");
      setPhase("idle");
    }
  }

  function handleRevealSettled() {
    setPhase("resolved");
    if (Math.random() < BONUS_FLIP_CHANCE) {
      window.setTimeout(() => setShowCoinFlip(true), 500);
    }
  }

  function handleCoinFlipResult(heads: boolean) {
    setShowCoinFlip(false);
    if (heads) {
      // Cosmetic re-reveal flourish only — always lands back on the same real card.
      setWheelKey((k) => k + 1);
      setPhase("revealing");
    }
  }

  function resetOpeningState() {
    setPendingPayment(null);
    setError(null);
    setShowCoinFlip(false);
    setPhase("idle");
    setWheelKey((k) => k + 1);
  }

  return (
    <div>
      <h1 className="mb-2 text-center text-2xl font-semibold">Open a pack</h1>

      {hasSelectedPack && !locked ? (
        <>
          <p className="text-muted mb-6 text-center text-sm">
            Drag across the top to rip {selected.tierName} open.
          </p>

          <div className="mx-auto max-w-xs">
            <OpeningStage
              key={wheelKey}
              tierKey={selected.tierKey}
              tierName={selected.tierName}
              price={selected.price}
              phase={phase}
              cardName={cardName ?? undefined}
              resolvedImage={resolvedImage}
              onRipped={handleRipped}
              onSpinComplete={handleRevealSettled}
            />

            {showCoinFlip && <CoinFlip onResult={handleCoinFlipResult} className="mt-4" />}

            {error && (
              <div className="mt-4 text-center">
                <p className="text-sm text-red-400">{error}</p>
                {error.startsWith("Sign in") && signInSlot}
              </div>
            )}

            {pendingPayment && (
              <div className="border-border-subtle bg-surface mt-6 rounded-md border p-4 text-sm">
                <p className="font-semibold">Payment required</p>
                <p className="text-muted mt-1">
                  ${usdcBaseUnitsToDisplayString(Number(pendingPayment.amountBaseUnits))} USDC to{" "}
                  <span className="font-mono text-xs">{pendingPayment.payTo}</span>
                </p>
                <p className="text-muted mt-2 text-xs">
                  Wallet-connect UI isn&apos;t live yet during this beta, so payment can&apos;t be
                  completed from here — the offer above is real and expires shortly. Once a wallet
                  is connected, this same flow settles payment and reveals your actual card.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setHasSelectedPack(false);
                resetOpeningState();
              }}
              className="border-border-subtle text-muted hover:border-accent/50 mt-6 w-full rounded-md border px-4 py-2 text-xs"
            >
              Choose a different pack
            </button>
          </div>
        </>
      ) : (
        <p className="text-muted mb-6 text-center text-sm">
          Spin to a pack below, then tap it to select it.
        </p>
      )}

      {hasSelectedPack && locked && (
        <div className="border-border-subtle bg-surface text-muted mx-auto mb-8 max-w-xs rounded-md border p-4 text-center text-sm">
          {selected.tierName} is locked during beta and cannot be opened.
        </div>
      )}

      <PackCarousel
        items={tiers}
        initialIndex={Math.max(
          0,
          tiers.findIndex((t) => t.tierKey === selected.tierKey),
        )}
        onSelect={(item) => {
          setSelected(item);
          setLocked(item.locked ?? false);
          setHasSelectedPack(false);
          resetOpeningState();
        }}
        onActivate={(item) => {
          setSelected(item);
          setLocked(item.locked ?? false);
          setHasSelectedPack(true);
          resetOpeningState();
        }}
        className="mb-6"
      />

      <p className="text-muted mt-2 text-center text-xs">
        <Link href={`/packs/${selected.tierKey}`} className="text-accent hover:text-accent-strong">
          View pack details &amp; odds
        </Link>
      </p>
    </div>
  );
}
