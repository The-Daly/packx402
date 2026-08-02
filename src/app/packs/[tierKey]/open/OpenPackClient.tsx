"use client";

import { useState } from "react";
import Link from "next/link";
import { PackShelf, type PackShelfItem } from "@/components/pack-art/PackShelf";
import { OpeningStage, type OpeningPhase } from "@/components/pack-art/OpeningStage";
import { CoinFlip } from "@/components/pack-art/CoinFlip";
import { CardOverlaySlot } from "@/components/pack-art/CardOverlaySlot";
import type { SpinPossibleCard } from "@/components/pack-art/CardRevealWheel";
import { PaymentMethodPanel } from "@/components/payments/PaymentMethodPanel";
import type { PackTierKey } from "@/server/config/pack-tiers";
import type { ResolvedCardImage } from "@/shared/card-image";

export interface OpenPackClientProps {
  tiers: PackShelfItem[];
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

interface BonusFlipResult {
  hit: boolean;
  cardName: string | null;
  resolvedImage: ResolvedCardImage | null;
}

/**
 * Ties the pack-browsing shelf to the actual opening flow: pick a pack, drag-rip it open,
 * then either the real x402 payment requirement (no wallet connect UI exists yet — see
 * PROJECT_STATUS.md — so this is shown rather than faked) or, once a wallet flow supplies
 * a real X-PAYMENT header, settlement succeeds and the reveal wheel spins down to the
 * actual fairness-selected card plus the server's already-determined bonus-flip outcome
 * (a fixed 4% chance — see deriveBonusFlipHit in src/server/fairness/engine.ts). Never
 * fabricates a card outcome or a bonus-flip result client-side.
 */
export function OpenPackClient({
  tiers,
  initialTierKey,
  initialLocked,
  signInSlot,
}: OpenPackClientProps) {
  const [selected, setSelected] = useState<PackShelfItem>(
    tiers.find((t) => t.tierKey === initialTierKey) ?? tiers[0],
  );
  const [locked, setLocked] = useState(initialLocked);
  const [hasSelectedPack, setHasSelectedPack] = useState(false);
  const [phase, setPhase] = useState<OpeningPhase>("idle");
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wheelKey, setWheelKey] = useState(0);
  const [possibleCards, setPossibleCards] = useState<SpinPossibleCard[]>([]);
  const [cardName, setCardName] = useState<string | null>(null);
  const [resolvedImage, setResolvedImage] = useState<ResolvedCardImage | null>(null);
  const [bonusFlip, setBonusFlip] = useState<BonusFlipResult | null>(null);
  const [showCoinFlip, setShowCoinFlip] = useState(false);
  const [showBonusCard, setShowBonusCard] = useState(false);

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
      if (res.ok && data.card) {
        // Reachable once a real wallet flow supplies X-PAYMENT — not exercised in this
        // beta yet, but the response contract (including bonusFlip) is already real.
        setCardName(data.card.name);
        setResolvedImage(data.resolvedImage ?? null);
        setBonusFlip({
          hit: Boolean(data.bonusFlip?.hit),
          cardName: data.bonusFlip?.card?.name ?? null,
          resolvedImage: data.bonusFlip?.resolvedImage ?? null,
        });
        setPhase("revealing");
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
    if (bonusFlip) {
      window.setTimeout(() => setShowCoinFlip(true), 500);
    }
  }

  function handleCoinFlipComplete() {
    setShowCoinFlip(false);
    if (bonusFlip?.hit) {
      setShowBonusCard(true);
    }
  }

  function resetOpeningState() {
    setPendingPayment(null);
    setError(null);
    setPhase("idle");
    setWheelKey((k) => k + 1);
    setCardName(null);
    setResolvedImage(null);
    setBonusFlip(null);
    setShowCoinFlip(false);
    setShowBonusCard(false);
  }

  async function loadPossibleCards(tierKey: string) {
    setPossibleCards([]);
    try {
      const res = await fetch(`/api/packs/${tierKey}/spin-preview`);
      if (!res.ok) return;
      const data = await res.json();
      setPossibleCards(Array.isArray(data.cards) ? data.cards : []);
    } catch {
      // Non-critical — the wheel falls back to generic card backs when this is empty.
    }
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
              possibleCards={possibleCards}
              onRipped={handleRipped}
              onSpinComplete={handleRevealSettled}
            />

            {showCoinFlip && bonusFlip && (
              <CoinFlip hit={bonusFlip.hit} onComplete={handleCoinFlipComplete} className="mt-4" />
            )}

            {showBonusCard && bonusFlip?.hit && (
              <div className="mt-4">
                <p className="text-accent mb-2 text-center text-sm font-semibold">
                  Bonus flip hit! You also got:
                </p>
                <CardOverlaySlot
                  cardName={bonusFlip.cardName ?? "Bonus card"}
                  resolved={bonusFlip.resolvedImage}
                  className="mx-auto max-w-[160px]"
                />
              </div>
            )}

            {error && (
              <div className="mt-4 text-center">
                <p className="text-sm text-red-400">{error}</p>
                {error.startsWith("Sign in") && signInSlot}
              </div>
            )}

            {pendingPayment && (
              <PaymentMethodPanel
                amountBaseUnits={pendingPayment.amountBaseUnits}
                payTo={pendingPayment.payTo}
                className="mt-6"
              />
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

      <PackShelf
        items={tiers}
        selectedTierKey={hasSelectedPack ? selected.tierKey : undefined}
        onSelect={(item) => {
          setSelected(item);
          setLocked(item.locked ?? false);
          setHasSelectedPack(true);
          resetOpeningState();
          void loadPossibleCards(item.tierKey);
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
