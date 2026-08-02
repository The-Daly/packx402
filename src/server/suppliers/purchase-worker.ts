import { and, asc, eq } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import {
  supplierPurchases,
  supplierListings,
  rips,
  packOffers,
  shippingAddresses,
  fulfillments,
} from "@/server/db/schema";
import { getCardTraderProvider } from "./cardtrader";
import { decryptField } from "@/server/crypto/field-encryption";
import type { SupplierShippingAddress } from "./types";

/**
 * Consumes the `supplier_purchases` queue (spec sections 39-40) — the piece
 * `offer-service.ts`'s comment calls out as not yet implemented. Only CardTrader exists
 * as a real adapter today (`getCardTraderProvider()`); a multi-supplier deployment would
 * resolve the adapter by `supplierPurchases.supplierId` -> `suppliers.key` instead of
 * hardcoding CardTrader here.
 *
 * Every function here takes a `db` instance rather than importing one at module scope —
 * this module runs both inside the Next.js server bundle (a future admin-triggered route)
 * and as a standalone `tsx` script (the actual worker process, run outside Next's
 * bundler). `src/server/db/client.ts` imports `env.ts`, whose `server-only` guard
 * misfires outside Next's bundler (see script-client.ts's own comment) — importing it at
 * module scope here would break the standalone script. Callers pass `db` (app runtime,
 * from client.ts) or `scriptDb` (standalone scripts, from script-client.ts).
 *
 * Concurrency: `claimNextQueuedPurchase` uses a conditional `UPDATE ... WHERE status =
 * 'queued'` as a row-level claim, so two workers racing on the same row is safe even
 * without external locking. What this does NOT provide is cross-account serialization
 * guarantees beyond that row lock — CardTrader's account-level cart (spec section 39)
 * still requires at most one in-flight add-to-cart→purchase sequence per supplier
 * account. This module processes one row fully (including the purchase call) before
 * claiming the next, which is correct for a single running worker instance; running more
 * than one worker process concurrently against the same supplier account needs an
 * external lock (e.g. Redis) not implemented here — documented, not solved, since no
 * live infrastructure was available to build and verify one in this environment.
 *
 * Substitution-on-unavailable (spec section 40: "if the winning listing becomes
 * unavailable, search for an exact match within a configured procurement-price increase")
 * is NOT implemented — there is no configured price-increase tolerance anywhere in this
 * codebase to drive that search. An unavailable listing is marked `failed` here rather
 * than silently rerolling (rerolling a fairness-selected card would violate the fairness
 * proof) — a human must resolve it. This is a documented follow-up, not a bug.
 */

export interface ProcessPurchaseResult {
  purchaseId: string;
  outcome: "purchased" | "failed" | "skipped_no_row";
  failureReason?: string;
}

/** Atomically claims the oldest still-queued row so concurrent workers never double-process one. */
async function claimNextQueuedPurchase(db: Database): Promise<{ id: string } | null> {
  const candidates = await db
    .select({ id: supplierPurchases.id })
    .from(supplierPurchases)
    .where(eq(supplierPurchases.status, "queued"))
    .orderBy(asc(supplierPurchases.queuedAt))
    .limit(1);
  const candidate = candidates[0];
  if (!candidate) return null;

  const claimed = await db
    .update(supplierPurchases)
    .set({ status: "cart_reserved" })
    .where(and(eq(supplierPurchases.id, candidate.id), eq(supplierPurchases.status, "queued")))
    .returning({ id: supplierPurchases.id });

  // Lost the race to another worker claiming the same row between select and update.
  return claimed[0] ?? null;
}

async function markFailed(db: Database, purchaseId: string, reason: string): Promise<void> {
  await db
    .update(supplierPurchases)
    .set({ status: "failed", failureReason: reason })
    .where(eq(supplierPurchases.id, purchaseId));
}

async function loadDefaultShippingAddress(
  db: Database,
  userId: string,
): Promise<(SupplierShippingAddress & { id: string }) | null> {
  const rows = await db
    .select()
    .from(shippingAddresses)
    .where(and(eq(shippingAddresses.userId, userId), eq(shippingAddresses.isDefault, true)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    fullName: decryptField(row.fullNameEncrypted),
    line1: decryptField(row.line1Encrypted),
    line2: row.line2Encrypted ? decryptField(row.line2Encrypted) : undefined,
    city: decryptField(row.cityEncrypted),
    stateOrProvince: row.stateOrProvinceEncrypted
      ? decryptField(row.stateOrProvinceEncrypted)
      : undefined,
    postalCode: decryptField(row.postalCodeEncrypted),
    country: row.country,
  };
}

/**
 * Processes exactly one already-claimed queued purchase through
 * validate → add-to-cart → confirm → purchase, then records the outcome. Never throws —
 * any failure at any step is recorded on the row as `status: "failed"` with a reason
 * instead of crashing the caller, so a bad row can't take down the worker loop.
 */
export async function processSupplierPurchase(
  db: Database,
  purchaseId: string,
): Promise<ProcessPurchaseResult> {
  const [purchase] = await db
    .select()
    .from(supplierPurchases)
    .where(eq(supplierPurchases.id, purchaseId))
    .limit(1);
  if (!purchase) return { purchaseId, outcome: "skipped_no_row" };

  try {
    const [listing] = await db
      .select({ externalListingId: supplierListings.externalListingId })
      .from(supplierListings)
      .where(eq(supplierListings.id, purchase.supplierListingId))
      .limit(1);
    if (!listing) {
      await markFailed(db, purchaseId, "supplier_listing_row_missing");
      return { purchaseId, outcome: "failed", failureReason: "supplier_listing_row_missing" };
    }

    const [rip] = await db
      .select({ ripId: rips.id, packOfferId: rips.packOfferId })
      .from(rips)
      .where(eq(rips.id, purchase.ripId))
      .limit(1);
    if (!rip) {
      await markFailed(db, purchaseId, "rip_row_missing");
      return { purchaseId, outcome: "failed", failureReason: "rip_row_missing" };
    }

    const [offer] = await db
      .select({ userId: packOffers.userId })
      .from(packOffers)
      .where(eq(packOffers.id, rip.packOfferId))
      .limit(1);
    if (!offer) {
      await markFailed(db, purchaseId, "pack_offer_row_missing");
      return { purchaseId, outcome: "failed", failureReason: "pack_offer_row_missing" };
    }

    const shippingAddress = await loadDefaultShippingAddress(db, offer.userId);
    if (!shippingAddress) {
      await markFailed(db, purchaseId, "no_shipping_address_on_file");
      return { purchaseId, outcome: "failed", failureReason: "no_shipping_address_on_file" };
    }

    const adapter = getCardTraderProvider();

    const validation = await adapter.validateListing(listing.externalListingId);
    if (!validation.valid) {
      const reason = `listing_unavailable:${validation.reason ?? "unknown"}`;
      await markFailed(db, purchaseId, reason);
      return { purchaseId, outcome: "failed", failureReason: reason };
    }

    await adapter.addToCart(listing.externalListingId, 1);
    const cart = await adapter.confirmCart();
    const order = await adapter.purchaseListing({
      idempotencyKey: purchase.idempotencyKey,
      shippingAddress,
    });

    await db
      .update(supplierPurchases)
      .set({
        status: "purchased",
        actualPriceUsdcBaseUnits: order.totalUsdcBaseUnits,
        externalOrderId: order.externalOrderId,
        purchasedAt: new Date(),
        cartVerificationLog: [
          ...purchase.cartVerificationLog,
          { at: new Date().toISOString(), cart, order },
        ],
      })
      .where(eq(supplierPurchases.id, purchaseId));

    await db
      .insert(fulfillments)
      .values({
        ripId: rip.ripId,
        supplierPurchaseId: purchaseId,
        shippingAddressId: shippingAddress.id,
        status: "supplier_order_submitted",
      })
      .onConflictDoNothing({ target: fulfillments.ripId });

    await db
      .update(packOffers)
      .set({ status: "SUPPLIER_PURCHASED" })
      .where(eq(packOffers.id, rip.packOfferId));

    return { purchaseId, outcome: "purchased" };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown_error";
    await markFailed(db, purchaseId, reason);
    return { purchaseId, outcome: "failed", failureReason: reason };
  }
}

/** Claims and processes exactly one queued row. Returns null if the queue was empty. */
export async function runSupplierPurchaseWorkerOnce(
  db: Database,
): Promise<ProcessPurchaseResult | null> {
  const claimed = await claimNextQueuedPurchase(db);
  if (!claimed) return null;
  return processSupplierPurchase(db, claimed.id);
}

/**
 * Long-running consumer loop — the actual "worker process" the roadmap calls for, as
 * opposed to a request handler. Intended entry point: `npm run worker:supplier-purchases`
 * (see scripts/run-supplier-purchase-worker.ts). Polls at `pollIntervalMs` when the queue
 * is empty; processes back-to-back with no delay while there's a backlog. Runs until the
 * process receives SIGINT/SIGTERM (handled by the calling script) — this function itself
 * has no exit condition by design.
 */
export async function runSupplierPurchaseWorkerLoop(
  db: Database,
  pollIntervalMs = 5000,
): Promise<never> {
  for (;;) {
    const result = await runSupplierPurchaseWorkerOnce(db);
    if (!result) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  }
}
