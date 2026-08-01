import { describe, expect, it } from "vitest";
import {
  commitServerSeed,
  selectPoolEntry,
  sha256Hex,
  verifySelection,
  type WeightedPoolEntry,
} from "./engine";

// Fixed test vector — also published in docs/FAIRNESS_PROTOCOL.md so a third party can
// reimplement the algorithm in any language and reproduce this exact result.
const VECTOR_1 = {
  serverSeed: "1111111111111111111111111111111111111111111111111111111111111111".slice(0, 64),
  clientNonce: "nonce-fixture-0001",
  paymentIdentifier: "algorand-testnet:AAAABBBBCCCCDDDD1111",
  chainRandomnessInput: "chainrand-fixture-block-99887766",
  poolHash: "poolhash-fixture-v1",
  entries: [
    { id: "entry-a", weight: 700 },
    { id: "entry-b", weight: 250 },
    { id: "entry-c", weight: 50 },
  ] satisfies WeightedPoolEntry[],
  expectedCommitment: "3138bb9bc78df27c473ecfd1410f7bd45ebac1f59cf3ff9cfe4db77aab7aedd3",
  expectedCombinedSeedHash: "794aea81eee7d9d2ed1cf3e3f22621e445383493b8a1288fb373e06355126b6b",
  expectedSelectionRoll: "554",
  expectedSelectedEntryId: "entry-a",
};

describe("fairness engine", () => {
  it("sha256Hex matches a known digest", () => {
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("commitServerSeed(seed) === sha256Hex(seed)", () => {
    expect(commitServerSeed(VECTOR_1.serverSeed)).toBe(sha256Hex(VECTOR_1.serverSeed));
  });

  it("reproduces the fixed test vector exactly", () => {
    expect(commitServerSeed(VECTOR_1.serverSeed)).toBe(VECTOR_1.expectedCommitment);

    const result = selectPoolEntry(VECTOR_1.entries, {
      revealedServerSeed: VECTOR_1.serverSeed,
      clientNonce: VECTOR_1.clientNonce,
      paymentIdentifier: VECTOR_1.paymentIdentifier,
      chainRandomnessInput: VECTOR_1.chainRandomnessInput,
      poolHash: VECTOR_1.poolHash,
    });

    expect(result.combinedSeedHash).toBe(VECTOR_1.expectedCombinedSeedHash);
    expect(result.selectionRoll).toBe(VECTOR_1.expectedSelectionRoll);
    expect(result.selectedEntryId).toBe(VECTOR_1.expectedSelectedEntryId);
  });

  it("is deterministic: identical inputs always produce identical outputs", () => {
    const input = {
      revealedServerSeed: VECTOR_1.serverSeed,
      clientNonce: VECTOR_1.clientNonce,
      paymentIdentifier: VECTOR_1.paymentIdentifier,
      chainRandomnessInput: VECTOR_1.chainRandomnessInput,
      poolHash: VECTOR_1.poolHash,
    };
    const a = selectPoolEntry(VECTOR_1.entries, input);
    const b = selectPoolEntry(VECTOR_1.entries, input);
    expect(a).toEqual(b);
  });

  it("is independent of the input array order (canonical id-sorted walk)", () => {
    const input = {
      revealedServerSeed: VECTOR_1.serverSeed,
      clientNonce: VECTOR_1.clientNonce,
      paymentIdentifier: VECTOR_1.paymentIdentifier,
      chainRandomnessInput: VECTOR_1.chainRandomnessInput,
      poolHash: VECTOR_1.poolHash,
    };
    const forward = selectPoolEntry(VECTOR_1.entries, input);
    const reversed = selectPoolEntry([...VECTOR_1.entries].reverse(), input);
    expect(reversed).toEqual(forward);
  });

  it("changing any single input changes the result (avalanche via sha256)", () => {
    const base = {
      revealedServerSeed: VECTOR_1.serverSeed,
      clientNonce: VECTOR_1.clientNonce,
      paymentIdentifier: VECTOR_1.paymentIdentifier,
      chainRandomnessInput: VECTOR_1.chainRandomnessInput,
      poolHash: VECTOR_1.poolHash,
    };
    const withDifferentNonce = selectPoolEntry(VECTOR_1.entries, {
      ...base,
      clientNonce: "different-nonce",
    });
    const original = selectPoolEntry(VECTOR_1.entries, base);
    expect(withDifferentNonce.combinedSeedHash).not.toBe(original.combinedSeedHash);
  });

  it("rejects an empty pool", () => {
    expect(() =>
      selectPoolEntry([], {
        revealedServerSeed: VECTOR_1.serverSeed,
        clientNonce: VECTOR_1.clientNonce,
        paymentIdentifier: VECTOR_1.paymentIdentifier,
        chainRandomnessInput: VECTOR_1.chainRandomnessInput,
        poolHash: VECTOR_1.poolHash,
      }),
    ).toThrow(/empty pool/);
  });

  it("rejects non-positive weights", () => {
    expect(() =>
      selectPoolEntry([{ id: "x", weight: 0 }], {
        revealedServerSeed: VECTOR_1.serverSeed,
        clientNonce: VECTOR_1.clientNonce,
        paymentIdentifier: VECTOR_1.paymentIdentifier,
        chainRandomnessInput: VECTOR_1.chainRandomnessInput,
        poolHash: VECTOR_1.poolHash,
      }),
    ).toThrow(/non-positive/);
  });

  it("verifySelection succeeds for a genuine proof", () => {
    const result = selectPoolEntry(VECTOR_1.entries, {
      revealedServerSeed: VECTOR_1.serverSeed,
      clientNonce: VECTOR_1.clientNonce,
      paymentIdentifier: VECTOR_1.paymentIdentifier,
      chainRandomnessInput: VECTOR_1.chainRandomnessInput,
      poolHash: VECTOR_1.poolHash,
    });

    const verdict = verifySelection({
      serverSeedCommitment: VECTOR_1.expectedCommitment,
      revealedServerSeed: VECTOR_1.serverSeed,
      clientNonce: VECTOR_1.clientNonce,
      paymentIdentifier: VECTOR_1.paymentIdentifier,
      chainRandomnessInput: VECTOR_1.chainRandomnessInput,
      poolHash: VECTOR_1.poolHash,
      entries: VECTOR_1.entries,
      claimedCombinedSeedHash: result.combinedSeedHash,
      claimedSelectionRoll: result.selectionRoll,
      claimedSelectedEntryId: result.selectedEntryId,
    });

    expect(verdict.valid).toBe(true);
    expect(verdict.failures).toEqual([]);
  });

  it("verifySelection fails when the revealed seed does not match the commitment", () => {
    const result = selectPoolEntry(VECTOR_1.entries, {
      revealedServerSeed: VECTOR_1.serverSeed,
      clientNonce: VECTOR_1.clientNonce,
      paymentIdentifier: VECTOR_1.paymentIdentifier,
      chainRandomnessInput: VECTOR_1.chainRandomnessInput,
      poolHash: VECTOR_1.poolHash,
    });

    const verdict = verifySelection({
      serverSeedCommitment: "0".repeat(64), // wrong commitment
      revealedServerSeed: VECTOR_1.serverSeed,
      clientNonce: VECTOR_1.clientNonce,
      paymentIdentifier: VECTOR_1.paymentIdentifier,
      chainRandomnessInput: VECTOR_1.chainRandomnessInput,
      poolHash: VECTOR_1.poolHash,
      entries: VECTOR_1.entries,
      claimedCombinedSeedHash: result.combinedSeedHash,
      claimedSelectionRoll: result.selectionRoll,
      claimedSelectedEntryId: result.selectedEntryId,
    });

    expect(verdict.valid).toBe(false);
    expect(verdict.failures.length).toBeGreaterThan(0);
  });

  it("verifySelection fails when a claimed result is tampered with", () => {
    const result = selectPoolEntry(VECTOR_1.entries, {
      revealedServerSeed: VECTOR_1.serverSeed,
      clientNonce: VECTOR_1.clientNonce,
      paymentIdentifier: VECTOR_1.paymentIdentifier,
      chainRandomnessInput: VECTOR_1.chainRandomnessInput,
      poolHash: VECTOR_1.poolHash,
    });

    const tamperedEntryId = result.selectedEntryId === "entry-a" ? "entry-b" : "entry-a";

    const verdict = verifySelection({
      serverSeedCommitment: VECTOR_1.expectedCommitment,
      revealedServerSeed: VECTOR_1.serverSeed,
      clientNonce: VECTOR_1.clientNonce,
      paymentIdentifier: VECTOR_1.paymentIdentifier,
      chainRandomnessInput: VECTOR_1.chainRandomnessInput,
      poolHash: VECTOR_1.poolHash,
      entries: VECTOR_1.entries,
      claimedCombinedSeedHash: result.combinedSeedHash,
      claimedSelectionRoll: result.selectionRoll,
      claimedSelectedEntryId: tamperedEntryId,
    });

    expect(verdict.valid).toBe(false);
  });

  it("distributes selections roughly proportional to weight over many trials", () => {
    const counts: Record<string, number> = { "entry-a": 0, "entry-b": 0, "entry-c": 0 };
    const trials = 2000;
    for (let i = 0; i < trials; i++) {
      const result = selectPoolEntry(VECTOR_1.entries, {
        revealedServerSeed: sha256Hex(`seed-${i}`),
        clientNonce: `nonce-${i}`,
        paymentIdentifier: `payment-${i}`,
        chainRandomnessInput: `rand-${i}`,
        poolHash: VECTOR_1.poolHash,
      });
      counts[result.selectedEntryId] += 1;
    }
    // Weights are 700/250/50 out of 1000; allow generous tolerance for randomness.
    expect(counts["entry-a"] / trials).toBeGreaterThan(0.6);
    expect(counts["entry-a"] / trials).toBeLessThan(0.8);
    expect(counts["entry-c"] / trials).toBeGreaterThan(0.02);
    expect(counts["entry-c"] / trials).toBeLessThan(0.08);
  });
});
