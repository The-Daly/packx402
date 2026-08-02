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
  asset: string;
  network: string;
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
  const [needsEligibility, setNeedsEligibility] = useState(false);
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
    setNeedsEligibility(false);
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
      if (res.status === 422 && data.error === "eligibility_required") {
        setError("Confirm your age and location before opening a pack.");
        setNeedsEligibility(true);
        setPhase("idle");
        return;
      }
      if (res.status === 402 && data.accepts?.[0]) {
        setPendingPayment({
          offerId: data.offerId,
          amountBaseUnits: data.accepts[0].amountBaseUnits ?? data.accepts[0].amount,
          payTo: data.accepts[0].payTo,
          asset: data.accepts[0].asset,
          network: data.accepts[0].network,
        });
        setPhase("idle"); // payment now happens via PaymentMethodPanel's connected wallet
        return;
      }
      if (res.ok && data.card) {
        applySettledResult(data);
        return;
      }
      setError(data.message ?? "Could not start this pack opening.");
      setPhase("idle");
    } catch {
      setError("Network error creating pack offer.");
      setPhase("idle");
    }
  }

  /** Shared by both the (rare) case where handleRipped's own request already settled and
   * PayWithWalletButton's onSettled callback after a real signed payment completes. Only
   * ever called with a genuine server response — never fabricates a card or bonus-flip
   * outcome client-side. */
  function applySettledResult(data: Record<string, unknown>) {
    const card = data.card as { name: string } | null | undefined;
    const bonusFlipData = data.bonusFlip as
      | { hit?: boolean; card?: { name: string }; resolvedImage?: ResolvedCardImage }
      | undefined;
    setCardName(card?.name ?? null);
    setResolvedImage((data.resolvedImage as ResolvedCardImage | null) ?? null);
    setBonusFlip({
      hit: Boolean(bonusFlipData?.hit),
      cardName: bonusFlipData?.card?.name ?? null,
      resolvedImage: bonusFlipData?.resolvedImage ?? null,
    });
    setPendingPayment(null);
    // Always show the torn-pack art for a beat before the reveal wheel spins — settling
    // via the deferred-payment path would otherwise jump straight to "revealing" and the
    // torn art would never appear at all; settling immediately would flash past it too
    // fast on a fast local network to actually register.
    setPhase("tearing");
    window.setTimeout(() => setPhase("revealing"), 900);
  }

  function handleRevealSettled() {
    setPhase("resolved");
    // Only ever show the coin-flip flourish on the small chance the bonus flip actually
    // hit (4% of opens, server-determined) — it must not appear on every spin.
    if (bonusFlip?.hit) {
      window.setTimeout(() => setShowCoinFlip(true), 500);
    }
  }

  function handleCoinFlipComplete() {
    setShowCoinFlip(false);
    setShowBonusCard(true);
  }

  function resetOpeningState() {
    setPendingPayment(null);
    setError(null);
    setNeedsEligibility(false);
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
                {needsEligibility && (
                  <Link
                    href="/eligibility"
                    className="text-accent hover:text-accent-strong mt-2 inline-block text-sm font-semibold"
                  >
                    Confirm eligibility →
                  </Link>
                )}
              </div>
            )}

            {pendingPayment && (
              <PaymentMethodPanel
                offerId={pendingPayment.offerId}
                amountBaseUnits={pendingPayment.amountBaseUnits}
                payTo={pendingPayment.payTo}
                asset={pendingPayment.asset}
                network={pendingPayment.network}
                onSettled={applySettledResult}
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
