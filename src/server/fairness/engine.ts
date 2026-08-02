import { createHash, randomBytes } from "node:crypto";

/**
 * PackX402 deterministic pack-selection algorithm ("packx402-fair-v1").
 *
 * This module is the reference implementation. It is intentionally dependency-free
 * (just node:crypto sha256) so it can be read end-to-end and reimplemented in any
 * language by a third party verifying a proof — see docs/FAIRNESS_PROTOCOL.md for the
 * spec and fixed test vectors. Never use Math.random for a paid or promotional
 * physical-card result (spec section 43).
 *
 * Selection is a two-phase commit:
 *
 * Phase 1 (before payment, at offer creation):
 *   - Generate a random 32-byte server seed.
 *   - Commit to it publicly as sha256(serverSeed) — the "server seed commitment" — without
 *     revealing the seed itself. The offer also carries a client-supplied (or client-visible)
 *     nonce, the pool version's poolHash/oddsHash, tier, price, network, and expiration.
 *
 * Phase 2 (after payment settles):
 *   - Reveal the server seed.
 *   - Combine: revealedServerSeed | clientNonce | paymentIdentifier | chainRandomnessInput | poolHash
 *     with "|" separators, sha256 it once -> combinedSeedHash.
 *   - Interpret the first 16 hex chars (64 bits) of combinedSeedHash as an unsigned integer,
 *     reduce it modulo the pool's totalWeight to get `selectionRoll`.
 *   - Walk the pool's entries in ascending id order, accumulating weight; the first entry whose
 *     cumulative weight exceeds selectionRoll is the result.
 *
 * The client cannot reroll: the server seed is committed before payment, the payment
 * identifier is only known once payment has actually settled on-chain, and
 * chainRandomnessInput is derived from post-settlement chain state (e.g. the settling
 * block's hash), so no party (including PackX402) can choose an outcome after seeing the
 * committed hash.
 */

export const FAIRNESS_ALGORITHM_VERSION = "packx402-fair-v1";

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function generateServerSeed(): string {
  return randomBytes(32).toString("hex");
}

export function commitServerSeed(serverSeed: string): string {
  return sha256Hex(serverSeed);
}

export function generateClientNonce(): string {
  return randomBytes(16).toString("hex");
}

export interface WeightedPoolEntry {
  id: string;
  weight: number; // positive integer
}

export interface SelectionInput {
  revealedServerSeed: string;
  clientNonce: string;
  paymentIdentifier: string;
  chainRandomnessInput: string;
  poolHash: string;
}

export interface SelectionResult {
  combinedSeedHash: string;
  selectionRoll: string; // decimal string, safe for storage/display regardless of bit width
  selectedEntryId: string;
}

function buildCombinedSeedMessage(input: SelectionInput): string {
  return [
    input.revealedServerSeed,
    input.clientNonce,
    input.paymentIdentifier,
    input.chainRandomnessInput,
    input.poolHash,
  ].join("|");
}

/**
 * Reduces the leading 64 bits of a hex digest modulo `totalWeight`, returned as a
 * decimal string. Using 64 bits against pool weights that are always far smaller
 * (packs have at most a few thousand possible outcomes) keeps modulo bias
 * cryptographically negligible.
 */
function rollFromHash(hashHex: string, totalWeight: bigint): bigint {
  const leading16Hex = hashHex.slice(0, 16);
  const asBigInt = BigInt(`0x${leading16Hex}`);
  return asBigInt % totalWeight;
}

/**
 * Walks entries in ascending `id` order (a stable, canonical, hash-independent order that
 * both PackX402 and an external verifier can reproduce without needing the original array
 * order) accumulating weight until the roll falls inside an entry's band.
 */
export function selectPoolEntry(
  entries: WeightedPoolEntry[],
  input: SelectionInput,
): SelectionResult {
  if (entries.length === 0) {
    throw new Error("Cannot select from an empty pool");
  }
  for (const e of entries) {
    if (!Number.isInteger(e.weight) || e.weight <= 0) {
      throw new Error(`Pool entry ${e.id} has a non-positive integer weight: ${e.weight}`);
    }
  }

  const sorted = [...entries].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const totalWeight = sorted.reduce((acc, e) => acc + BigInt(e.weight), 0n);

  const combinedSeedMessage = buildCombinedSeedMessage(input);
  const combinedSeedHash = sha256Hex(combinedSeedMessage);
  const roll = rollFromHash(combinedSeedHash, totalWeight);

  let cumulative = 0n;
  for (const entry of sorted) {
    cumulative += BigInt(entry.weight);
    if (roll < cumulative) {
      return {
        combinedSeedHash,
        selectionRoll: roll.toString(),
        selectedEntryId: entry.id,
      };
    }
  }

  // Unreachable if totalWeight was computed correctly from the same entries, but fail loudly
  // rather than silently picking the last entry if pool data is ever inconsistent.
  throw new Error("Selection roll exceeded total pool weight — pool data is inconsistent");
}

// Bonus-flip mechanic (spec addendum): a small, fixed 4% chance, evaluated on every
// completed pack opening, of awarding a second card from the same pool alongside the one
// actually paid for. Both the hit/miss determination itself AND the bonus card pick (if
// any) are derived from the same committed server seed as the primary selection — never
// client-side randomness — so the whole thing stays independently verifiable exactly like
// the primary pull. Domain-separated via string suffixes so the two derivations are
// cryptographically independent of each other despite sharing the same underlying seed.
export const BONUS_FLIP_CHANCE_PER_MILLION = 40_000n; // 40,000 / 1,000,000 = 4%

/**
 * Deterministically decides whether this opening's bonus flip hits. Reproducible by
 * anyone holding the revealed proof bundle, exactly like `selectPoolEntry`.
 */
export function deriveBonusFlipHit(input: SelectionInput): boolean {
  const message = `${buildCombinedSeedMessage(input)}|bonus_flip_trigger`;
  const hash = sha256Hex(message);
  const roll = rollFromHash(hash, 1_000_000n);
  return roll < BONUS_FLIP_CHANCE_PER_MILLION;
}

/**
 * Picks the bonus card from the same pool as the primary pull, using a domain-separated
 * variant of the same committed inputs so it's an independent draw rather than always
 * matching the primary result.
 */
export function selectBonusPoolEntry(
  entries: WeightedPoolEntry[],
  input: SelectionInput,
): SelectionResult {
  return selectPoolEntry(entries, {
    ...input,
    clientNonce: `${input.clientNonce}|bonus_flip_pull`,
  });
}

/**
 * Independently verifies a completed selection by recomputing it from the revealed proof
 * bundle and checking every claim. Used by both the internal verifier and the public
 * /api/fairness/verify endpoint — the same function a third party would reimplement.
 */
export function verifySelection(params: {
  serverSeedCommitment: string;
  revealedServerSeed: string;
  clientNonce: string;
  paymentIdentifier: string;
  chainRandomnessInput: string;
  poolHash: string;
  entries: WeightedPoolEntry[];
  claimedCombinedSeedHash: string;
  claimedSelectionRoll: string;
  claimedSelectedEntryId: string;
}): { valid: boolean; failures: string[] } {
  const failures: string[] = [];

  if (commitServerSeed(params.revealedServerSeed) !== params.serverSeedCommitment) {
    failures.push("revealed server seed does not match the pre-payment commitment");
  }

  const recomputed = selectPoolEntry(params.entries, {
    revealedServerSeed: params.revealedServerSeed,
    clientNonce: params.clientNonce,
    paymentIdentifier: params.paymentIdentifier,
    chainRandomnessInput: params.chainRandomnessInput,
    poolHash: params.poolHash,
  });

  if (recomputed.combinedSeedHash !== params.claimedCombinedSeedHash) {
    failures.push("combined seed hash does not match recomputed value");
  }
  if (recomputed.selectionRoll !== params.claimedSelectionRoll) {
    failures.push("selection roll does not match recomputed value");
  }
  if (recomputed.selectedEntryId !== params.claimedSelectedEntryId) {
    failures.push("selected entry does not match recomputed value");
  }

  return { valid: failures.length === 0, failures };
}
