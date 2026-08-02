# Fairness Protocol

Reference implementation: `src/server/fairness/engine.ts` (dependency-free besides
Node's built-in `crypto` sha256 — deliberately, so it's easy to reimplement in another
language). Automated tests: `src/server/fairness/engine.test.ts` (12 tests, all passing).

## Algorithm

**Phase 1 — before payment (offer creation):**

1. Generate a random 32-byte server seed.
2. Commit to it publicly as `serverSeedCommitment = sha256(serverSeed)`, without revealing
   the seed.
3. Record the pool version's `poolHash` (sha256 of the canonical serialized pool entries)
   and `oddsHash` (sha256 of the published probability bands), the tier, price, network,
   a client nonce, and an expiration.

**Phase 2 — after payment settles:**

1. Reveal `serverSeed`.
2. Build the message:
   `serverSeed | clientNonce | paymentIdentifier | chainRandomnessInput | poolHash`
   (pipe-separated, UTF-8).
3. `combinedSeedHash = sha256(message)`.
4. Take the leading 16 hex characters (64 bits) of `combinedSeedHash`, interpret as an
   unsigned integer, and reduce modulo the pool's `totalWeight` → `selectionRoll`.
5. Sort pool entries by `id` ascending (a canonical order independent of insertion order
   or array shuffling) and walk them, accumulating `weight`, until the running total
   exceeds `selectionRoll`. That entry is the result.

`paymentIdentifier` is the settled on-chain transaction/payment id (only known after
payment). `chainRandomnessInput` is derived from post-settlement chain state — for
Algorand, the confirming block's sortition seed; for Solana, the transaction's recent
blockhash; for EVM, the confirming block's hash. No party, including PackX402, can predict
or choose any of these before the server seed commitment is published, so no party can
select a favorable outcome after the fact.

`Math.random` (or any non-cryptographic, non-committed source) is never used for a paid or
promotional physical-card result.

## Why modulo bias is not a practical concern here

Reducing a 64-bit value modulo a pool's total weight (packs have at most a few thousand
possible outcomes) introduces a bias on the order of `totalWeight / 2^64`, which is
astronomically smaller than any measurable statistical effect. This is a standard,
widely-used trade-off in provably-fair systems; a full rejection-sampling implementation
was not judged worth the added complexity for this use case.

## Fixed test vector

This exact vector is asserted in `engine.test.ts` — anyone can reimplement `sha256` and
this walk in any language and reproduce it exactly.

```
serverSeed          = 1111111111111111111111111111111111111111111111111111111111111111 (64 hex chars)
clientNonce          = nonce-fixture-0001
paymentIdentifier    = algorand-testnet:AAAABBBBCCCCDDDD1111
chainRandomnessInput = chainrand-fixture-block-99887766
poolHash             = poolhash-fixture-v1

pool entries (id, weight):
  entry-a, 700
  entry-b, 250
  entry-c, 50
  (totalWeight = 1000)

serverSeedCommitment = sha256(serverSeed)
                     = 3138bb9bc78df27c473ecfd1410f7bd45ebac1f59cf3ff9cfe4db77aab7aedd3

message = serverSeed + "|" + clientNonce + "|" + paymentIdentifier + "|" +
          chainRandomnessInput + "|" + poolHash

combinedSeedHash = sha256(message)
                 = 794aea81eee7d9d2ed1cf3e3f22621e445383493b8a1288fb373e06355126b6b

leading 16 hex chars of combinedSeedHash = 794aea81eee7d9d2
as unsigned 64-bit integer               = 8740055870645721554
selectionRoll = 8740055870645721554 mod 1000 = 554

Walking entries sorted by id ascending (entry-a, entry-b, entry-c):
  entry-a: cumulative weight 700  →  554 < 700  →  SELECTED

selectedEntryId = entry-a
```

## Independent verification

`POST /api/fairness/verify` with `{ "ripId": "<uuid>" }` looks up the published proof
bundle for a completed pull and recomputes the selection from scratch using
`verifySelection()`, returning both the stored claim and the recomputation. The
`/fairness` page provides a form UI over this endpoint. Because the recomputation uses the
exact same pure function as the original selection, a mismatch can only mean the stored
proof was tampered with or the revealed seed doesn't match its commitment — both are
explicitly checked and reported as separate failure reasons.

## Rip-ID lookup, pool hash, odds hash

Every `FairnessProof` row (keyed by `ripId`) stores the `poolHash`, `oddsHash`,
`serverSeedCommitment`, `revealedServerSeed`, `clientNonce`, `paymentIdentifier`,
`chainRandomnessInput`, `combinedSeedHash`, and `selectionRoll` — the full bundle needed
for reproduction, all copyable as JSON from the `/fairness` verifier UI.

## Bonus-flip addendum

Every completed pack opening also evaluates a fixed 4% chance of awarding a second card
from the same pool (see `deriveBonusFlipHit`/`selectBonusPoolEntry` in
`src/server/fairness/engine.ts`). Both the hit/miss determination and the bonus card pick
are derived from the exact same committed server seed as the primary pull — never
client-side randomness — via domain-separated string suffixes (`|bonus_flip_trigger` and
`|bonus_flip_pull`) so the two derivations are cryptographically independent despite
sharing one underlying seed. This produces a second, independent `FairnessProof` row (with
its own `ripId`, `combinedSeedHash`, and `selectionRoll`) whenever the bonus flip hits,
reproducible by anyone the same way as the primary pull. **Not yet reflected** in the
published probability-band table on the pack-detail page or disclosed pre-purchase — see
the note in `docs/LEGAL_REVIEW_REQUIRED.md`.
