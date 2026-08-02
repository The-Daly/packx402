import { and, desc, eq, gte, isNull } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  eligibilityRecords,
  fairnessProofs,
  packOffers,
  packTiers,
  payments,
  poolEntries,
  poolVersions,
  rips,
  selfExclusions,
  purchaseLimits,
  supplierListings,
  supplierPurchases,
} from "@/server/db/schema";
import type { RollingSpendSnapshot } from "@/server/responsible-purchasing/limits";
import { serverEnv } from "@/server/env";
import {
  getPackTierDefinition,
  isTierPurchasableOn,
  type Chain,
  type NetworkMode,
  type PackTierKey,
} from "@/server/config/pack-tiers";
import {
  commitServerSeed,
  deriveBonusFlipHit,
  generateClientNonce,
  generateServerSeed,
  selectBonusPoolEntry,
  selectPoolEntry,
} from "@/server/fairness/engine";
import { encryptField, decryptField } from "@/server/crypto/field-encryption";
import { evaluatePurchaseAgainstLimits } from "@/server/responsible-purchasing/limits";
import { getChainAdapter } from "@/server/payments/x402/router";
import type { X402PaymentRequirements } from "@/server/payments/x402/types";
import { sumUsdcBaseUnits } from "@/shared/money";

const OFFER_TTL_MS = 5 * 60 * 1000; // 5 minutes, matches maxTimeoutSeconds=300 in adapters

export class OfferCreationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function merchantAddressFor(chain: Chain): string {
  switch (chain) {
    case "algorand":
      return serverEnv.MERCHANT_ALGORAND_ADDRESS ?? "";
    case "solana":
      return serverEnv.MERCHANT_SOLANA_ADDRESS ?? "";
    case "evm":
      return serverEnv.MERCHANT_EVM_ADDRESS ?? "";
  }
}

function assetFor(chain: Chain): string {
  switch (chain) {
    case "algorand":
      return String(serverEnv.ALGORAND_USDC_ASSET_ID);
    case "solana":
      return serverEnv.SOLANA_USDC_MINT;
    case "evm":
      return serverEnv.EVM_USDC_ADDRESS;
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Aggregates a user's actual settled spend over rolling 24h/7d/30d windows (not calendar
 * day/week/month — the schema has no per-user timezone to anchor a calendar boundary to,
 * and a rolling window is the more conservative choice for a spend *limit* anyway). Only
 * `status: "settled"` payments count — a pending/failed/refunded payment was never
 * fulfilled spend. Uses `settledAmountUsdcBaseUnits` when present, falling back to
 * `expectedAmountUsdcBaseUnits` for older rows that predate that column being populated.
 */
async function getRollingSpend(userId: string, now: Date): Promise<RollingSpendSnapshot> {
  const monthAgo = new Date(now.getTime() - 30 * DAY_MS);
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const dayAgo = new Date(now.getTime() - DAY_MS);

  const rows = await db
    .select({
      settledAt: payments.settledAt,
      settledAmountUsdcBaseUnits: payments.settledAmountUsdcBaseUnits,
      expectedAmountUsdcBaseUnits: payments.expectedAmountUsdcBaseUnits,
    })
    .from(payments)
    .innerJoin(packOffers, eq(packOffers.id, payments.packOfferId))
    .where(
      and(
        eq(packOffers.userId, userId),
        eq(payments.status, "settled"),
        gte(payments.settledAt, monthAgo),
      ),
    );

  let spentTodayUsdcBaseUnits = 0;
  let spentThisWeekUsdcBaseUnits = 0;
  let spentThisMonthUsdcBaseUnits = 0;
  for (const row of rows) {
    const amount = row.settledAmountUsdcBaseUnits ?? row.expectedAmountUsdcBaseUnits ?? 0;
    spentThisMonthUsdcBaseUnits += amount;
    if (row.settledAt && row.settledAt >= weekAgo) spentThisWeekUsdcBaseUnits += amount;
    if (row.settledAt && row.settledAt >= dayAgo) spentTodayUsdcBaseUnits += amount;
  }

  return { spentTodayUsdcBaseUnits, spentThisWeekUsdcBaseUnits, spentThisMonthUsdcBaseUnits };
}

/**
 * Creates a DRAFT -> OFFERED PackOffer, stepping through each gate in the state machine
 * (spec section 42) and persisting the status transition at every step so the lifecycle is
 * independently auditable. Every check here runs server-side against server-trusted state
 * — no client-supplied price, tier availability, or limit value is ever accepted.
 */
export async function createPackOffer(params: {
  userId: string;
  tierKey: PackTierKey;
  chain: Chain;
  network: NetworkMode;
}): Promise<{ offerId: string; paymentRequirements: X402PaymentRequirements; expiresAt: Date }> {
  const tierDef = getPackTierDefinition(params.tierKey);

  const [tierRow] = await db
    .select()
    .from(packTiers)
    .where(eq(packTiers.key, params.tierKey))
    .limit(1);
  if (!tierRow) throw new OfferCreationError("unknown_tier", `Tier not seeded: ${params.tierKey}`);

  const availability = isTierPurchasableOn(
    tierDef,
    params.chain,
    params.network,
    serverEnv.FEATURE_HIGH_VALUE_PACKS_ENABLED,
  );
  if (!availability.allowed) {
    throw new OfferCreationError(
      "tier_not_purchasable",
      availability.reason ?? "tier not purchasable",
    );
  }

  // Neither wallet-first nor Google sign-in collects DOB/location at account-creation time
  // (see the KNOWN GAP notes in auth-service.ts) — so the eligibility gate that
  // signUpWithEmail used to enforce up front is enforced HERE instead, at the one point
  // every purchase path funnels through, regardless of how the account was created.
  const [latestEligibility] = await db
    .select({
      locationAllowed: eligibilityRecords.locationAllowed,
      ageAcknowledged18Plus: eligibilityRecords.ageAcknowledged18Plus,
    })
    .from(eligibilityRecords)
    .where(eq(eligibilityRecords.userId, params.userId))
    .orderBy(desc(eligibilityRecords.acknowledgedAt))
    .limit(1);
  if (
    !latestEligibility ||
    !latestEligibility.locationAllowed ||
    !latestEligibility.ageAcknowledged18Plus
  ) {
    throw new OfferCreationError(
      "eligibility_required",
      "Age and location eligibility must be confirmed before opening a pack",
    );
  }

  const [selfExclusion] = await db
    .select()
    .from(selfExclusions)
    .where(eq(selfExclusions.userId, params.userId))
    .limit(1);
  const [limits] = await db
    .select()
    .from(purchaseLimits)
    .where(eq(purchaseLimits.userId, params.userId))
    .limit(1);

  const now = new Date();
  const rollingSpend = await getRollingSpend(params.userId, now);
  const decision = evaluatePurchaseAgainstLimits({
    now,
    priceUsdcBaseUnits: tierRow.priceUsdcBaseUnits,
    limits: {
      dailyLimitUsdcBaseUnits: limits?.dailyLimitUsdcBaseUnits ?? null,
      weeklyLimitUsdcBaseUnits: limits?.weeklyLimitUsdcBaseUnits ?? null,
      monthlyLimitUsdcBaseUnits: limits?.monthlyLimitUsdcBaseUnits ?? null,
      coolOffUntil: limits?.coolOffUntil ?? null,
      pausedUntil: limits?.pausedUntil ?? null,
    },
    selfExclusion: {
      isActive: selfExclusion?.isActive ?? false,
      endsAt: selfExclusion?.endsAt ?? null,
    },
    rollingSpend: {
      spentTodayUsdcBaseUnits: rollingSpend.spentTodayUsdcBaseUnits,
      spentThisWeekUsdcBaseUnits: rollingSpend.spentThisWeekUsdcBaseUnits,
      spentThisMonthUsdcBaseUnits: rollingSpend.spentThisMonthUsdcBaseUnits,
    },
  });
  if (!decision.allowed) {
    throw new OfferCreationError("purchase_limit_denied", decision.reason ?? "purchase denied");
  }

  const [activePool] = await db
    .select()
    .from(poolVersions)
    .where(
      and(
        eq(poolVersions.packTierId, tierRow.id),
        eq(poolVersions.isPromotional, false),
        isNull(poolVersions.archivedAt),
      ),
    )
    .orderBy(poolVersions.publishedAt)
    .limit(1);
  if (!activePool) {
    throw new OfferCreationError(
      "no_active_pool",
      `No published pool version for tier ${params.tierKey}`,
    );
  }

  const serverSeed = generateServerSeed();
  const serverSeedCommitment = commitServerSeed(serverSeed);
  const clientNonce = generateClientNonce();

  const total = sumUsdcBaseUnits(
    tierRow.priceUsdcBaseUnits,
    tierRow.estimatedShippingUsdcBaseUnits,
  );
  const merchantAddress = merchantAddressFor(params.chain);
  const expiresAt = new Date(Date.now() + OFFER_TTL_MS);

  const [offer] = await db
    .insert(packOffers)
    .values({
      userId: params.userId,
      packTierId: tierRow.id,
      poolVersionId: activePool.id,
      status: "OFFERED",
      chain: params.chain,
      networkMode: params.network,
      priceUsdcBaseUnits: tierRow.priceUsdcBaseUnits,
      shippingUsdcBaseUnits: tierRow.estimatedShippingUsdcBaseUnits,
      supplierFeesUsdcBaseUnits: 0,
      totalUsdcBaseUnits: total,
      merchantAddress,
      supplierSnapshotHash: activePool.supplierSnapshotHash,
      serverSeedCommitment,
      serverSeedEncrypted: encryptField(serverSeed),
      clientNonce,
      expiresAt,
    })
    .returning({ id: packOffers.id });

  const adapter = getChainAdapter(params.chain);
  const paymentRequirements = adapter.buildPaymentRequirements({
    network: params.network,
    resource: `/api/x402/${params.chain}/v1/packs/open?offerId=${offer.id}`,
    description: `PackX402 ${tierDef.name} pack opening`,
    amountBaseUnits: String(total),
    payTo: merchantAddress,
    asset: assetFor(params.chain),
  });

  return { offerId: offer.id, paymentRequirements, expiresAt };
}

export class PaymentSettlementError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Verifies and settles payment for an OFFERED pack offer, then runs the deterministic
 * fairness selection and creates the Rip + FairnessProof (spec sections 41-43). Idempotent
 * on the payment's on-chain identifier: a retried request with the same settled
 * transaction returns the existing Rip rather than re-running selection.
 */
export interface SettleOfferResult {
  ripId: string;
  poolEntryId: string;
  bonusRip: { ripId: string; poolEntryId: string } | null;
}

export async function settleOfferAndOpen(params: {
  offerId: string;
  xPaymentHeader: string;
}): Promise<SettleOfferResult> {
  const [offer] = await db
    .select()
    .from(packOffers)
    .where(eq(packOffers.id, params.offerId))
    .limit(1);
  if (!offer) throw new PaymentSettlementError("offer_not_found", "Offer not found");

  if (offer.status === "OPENED" || offer.status === "PAID") {
    const existingRips = await db.select().from(rips).where(eq(rips.packOfferId, offer.id));
    const existingPrimary = existingRips.find((r) => r.kind === "primary");
    if (existingPrimary) {
      const existingBonus = existingRips.find((r) => r.kind === "bonus_flip");
      return {
        ripId: existingPrimary.id,
        poolEntryId: existingPrimary.poolEntryId,
        bonusRip: existingBonus
          ? { ripId: existingBonus.id, poolEntryId: existingBonus.poolEntryId }
          : null,
      };
    }
  }
  if (
    offer.status !== "OFFERED" &&
    offer.status !== "PAYMENT_PENDING" &&
    offer.status !== "PAYMENT_FAILED"
  ) {
    throw new PaymentSettlementError("invalid_offer_state", `Offer is in state ${offer.status}`);
  }
  if (offer.expiresAt.getTime() < Date.now()) {
    await db.update(packOffers).set({ status: "EXPIRED" }).where(eq(packOffers.id, offer.id));
    throw new PaymentSettlementError("offer_expired", "Offer has expired");
  }

  const adapter = getChainAdapter(offer.chain);
  const requirements = adapter.buildPaymentRequirements({
    network: offer.networkMode as NetworkMode,
    resource: `/api/x402/${offer.chain}/v1/packs/open?offerId=${offer.id}`,
    description: "PackX402 pack opening",
    amountBaseUnits: String(offer.totalUsdcBaseUnits),
    payTo: offer.merchantAddress,
    asset: assetFor(offer.chain),
  });

  const decoded = adapter.decodePaymentHeader(params.xPaymentHeader);
  const verifyResult = await adapter.verify(decoded, requirements);
  if (!verifyResult.isValid) {
    await db
      .update(packOffers)
      .set({ status: "PAYMENT_FAILED" })
      .where(eq(packOffers.id, offer.id));
    throw new PaymentSettlementError(
      "payment_invalid",
      verifyResult.invalidReason ?? "payment verification failed",
    );
  }

  // Idempotency: a payment identifier can only settle one offer, ever.
  if (verifyResult.txHashOrPaymentId) {
    const [existingPayment] = await db
      .select()
      .from(payments)
      .where(eq(payments.txHashOrPaymentId, verifyResult.txHashOrPaymentId))
      .limit(1);
    if (existingPayment && existingPayment.packOfferId !== offer.id) {
      throw new PaymentSettlementError(
        "duplicate_payment",
        "This payment has already settled a different offer",
      );
    }
  }

  const settleResult = await adapter.settle(decoded, requirements);
  if (
    !settleResult.success ||
    !settleResult.txHashOrPaymentId ||
    !settleResult.chainRandomnessInput
  ) {
    await db
      .update(packOffers)
      .set({ status: "PAYMENT_FAILED" })
      .where(eq(packOffers.id, offer.id));
    throw new PaymentSettlementError(
      "settlement_failed",
      settleResult.errorReason ?? "settlement failed",
    );
  }
  // Narrowed, single-assignment locals — nested closures below (createRip) don't otherwise
  // retain this null-check's narrowing of the outer `settleResult` binding.
  const settledTxHashOrPaymentId = settleResult.txHashOrPaymentId;
  const settledChainRandomnessInput = settleResult.chainRandomnessInput;

  const idempotencyKey = `${offer.id}:${settledTxHashOrPaymentId}`;
  const [payment] = await db
    .insert(payments)
    .values({
      packOfferId: offer.id,
      chain: offer.chain,
      networkMode: offer.networkMode,
      status: "settled",
      expectedAmountUsdcBaseUnits: offer.totalUsdcBaseUnits,
      settledAmountUsdcBaseUnits: Number(settleResult.settledAmount ?? offer.totalUsdcBaseUnits),
      payerAddress: verifyResult.payerAddress,
      recipientAddress: offer.merchantAddress,
      tokenIdentifier: requirements.asset,
      txHashOrPaymentId: settledTxHashOrPaymentId,
      idempotencyKey,
      settledAt: new Date(),
    })
    .onConflictDoNothing({ target: payments.txHashOrPaymentId })
    .returning();

  const paymentRow =
    payment ??
    (
      await db
        .select()
        .from(payments)
        .where(eq(payments.txHashOrPaymentId, settledTxHashOrPaymentId))
        .limit(1)
    )[0];

  await db.update(packOffers).set({ status: "PAID" }).where(eq(packOffers.id, offer.id));

  const [poolVersion] = await db
    .select()
    .from(poolVersions)
    .where(eq(poolVersions.id, offer.poolVersionId))
    .limit(1);
  const entries = await db
    .select()
    .from(poolEntries)
    .where(eq(poolEntries.poolVersionId, offer.poolVersionId));
  if (!poolVersion || entries.length === 0) {
    throw new PaymentSettlementError("pool_unavailable", "Pool version has no entries");
  }
  // Narrowed, single-assignment locals — nested closures below (createRip) don't otherwise
  // retain the null-check narrowing TypeScript applies to the outer `poolVersion` binding.
  const resolvedPoolVersion = poolVersion;

  const revealedServerSeed = decryptField(offer.serverSeedEncrypted);
  const selection = selectPoolEntry(
    entries.map((e) => ({ id: e.id, weight: e.weight })),
    {
      revealedServerSeed,
      clientNonce: offer.clientNonce,
      paymentIdentifier: settledTxHashOrPaymentId,
      chainRandomnessInput: settledChainRandomnessInput,
      poolHash: resolvedPoolVersion.poolHash,
    },
  );
  const selectedEntry = entries.find((e) => e.id === selection.selectedEntryId);
  if (!selectedEntry) {
    throw new PaymentSettlementError("selection_inconsistent", "Selected pool entry not found");
  }

  // Mark the pool version immutable on its first paid use (spec section 19).
  if (!resolvedPoolVersion.isImmutable) {
    await db
      .update(poolVersions)
      .set({ isImmutable: true })
      .where(eq(poolVersions.id, resolvedPoolVersion.id));
  }

  async function createRip(
    kind: "primary" | "bonus_flip",
    entry: (typeof entries)[number],
    proofFields: {
      combinedSeedHash: string;
      selectionRoll: string;
      clientNonce: string;
    },
  ) {
    const [inserted] = await db
      .insert(rips)
      .values({
        packOfferId: offer.id,
        paymentId: paymentRow.id,
        kind,
        poolEntryId: entry.id,
        cardName: entry.cardName,
        setName: entry.setName,
        cardNumber: entry.cardNumber,
        finish: entry.finish,
        condition: entry.minCondition,
        gradeLabel: entry.gradeLabel,
        referenceValueUsdcBaseUnits: entry.referenceValueUsdcBaseUnits,
        referenceValueAsOf: entry.referenceValueAsOf,
      })
      .onConflictDoNothing({ target: [rips.packOfferId, rips.kind] })
      .returning();

    const ripRow =
      inserted ??
      (
        await db
          .select()
          .from(rips)
          .where(and(eq(rips.packOfferId, offer.id), eq(rips.kind, kind)))
          .limit(1)
      )[0];

    const fairnessProofValues: typeof fairnessProofs.$inferInsert = {
      ripId: ripRow.id,
      poolVersionId: resolvedPoolVersion.id,
      poolHash: resolvedPoolVersion.poolHash,
      oddsHash: resolvedPoolVersion.oddsHash,
      serverSeedCommitment: offer.serverSeedCommitment,
      revealedServerSeed,
      clientNonce: proofFields.clientNonce,
      paymentIdentifier: settledTxHashOrPaymentId,
      chainRandomnessInput: settledChainRandomnessInput,
      combinedSeedHash: proofFields.combinedSeedHash,
      selectionRoll: proofFields.selectionRoll,
      selectedPoolEntryId: entry.id,
    };
    await db
      .insert(fairnessProofs)
      .values(fairnessProofValues)
      .onConflictDoNothing({ target: fairnessProofs.ripId });

    // Queue the supplier purchase (spec sections 39-40). A worker process consumes this
    // queue serially per supplier account — see docs/SUPPLIER_INTEGRATION.md. Not run
    // inline here so a slow/failed supplier purchase never blocks the payment response.
    if (entry.supplierListingId) {
      const [listing] = await db
        .select({
          supplierId: supplierListings.supplierId,
          priceUsdcBaseUnits: supplierListings.priceUsdcBaseUnits,
        })
        .from(supplierListings)
        .where(eq(supplierListings.id, entry.supplierListingId))
        .limit(1);
      if (listing) {
        await db
          .insert(supplierPurchases)
          .values({
            supplierId: listing.supplierId,
            supplierListingId: entry.supplierListingId,
            ripId: ripRow.id,
            idempotencyKey: `rip:${ripRow.id}`,
            status: "queued",
            expectedPriceUsdcBaseUnits: listing.priceUsdcBaseUnits,
          })
          .onConflictDoNothing({ target: supplierPurchases.idempotencyKey });
      }
    }

    return ripRow;
  }

  const ripRow = await createRip("primary", selectedEntry, {
    combinedSeedHash: selection.combinedSeedHash,
    selectionRoll: selection.selectionRoll,
    clientNonce: offer.clientNonce,
  });

  await db.update(packOffers).set({ status: "OPENED" }).where(eq(packOffers.id, offer.id));

  // Bonus-flip mechanic: a fixed 4% chance, derived from the same committed seed as the
  // primary pull (never client-side randomness) — see deriveBonusFlipHit/selectBonusPoolEntry
  // in src/server/fairness/engine.ts. On a hit, the buyer keeps BOTH cards; nothing is paid
  // twice, and it's independently verifiable exactly like the primary pull.
  const selectionInput = {
    revealedServerSeed,
    clientNonce: offer.clientNonce,
    paymentIdentifier: settledTxHashOrPaymentId,
    chainRandomnessInput: settledChainRandomnessInput,
    poolHash: resolvedPoolVersion.poolHash,
  };
  let bonusRip: { ripId: string; poolEntryId: string } | null = null;
  if (deriveBonusFlipHit(selectionInput)) {
    const bonusSelection = selectBonusPoolEntry(
      entries.map((e) => ({ id: e.id, weight: e.weight })),
      selectionInput,
    );
    const bonusEntry = entries.find((e) => e.id === bonusSelection.selectedEntryId);
    if (bonusEntry) {
      const bonusRipRow = await createRip("bonus_flip", bonusEntry, {
        combinedSeedHash: bonusSelection.combinedSeedHash,
        selectionRoll: bonusSelection.selectionRoll,
        clientNonce: `${offer.clientNonce}|bonus_flip_pull`,
      });
      bonusRip = { ripId: bonusRipRow.id, poolEntryId: bonusEntry.id };
    }
  }

  return { ripId: ripRow.id, poolEntryId: selectedEntry.id, bonusRip };
}
