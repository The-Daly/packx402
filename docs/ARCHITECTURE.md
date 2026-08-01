# Architecture

## Layers

```
src/
  app/                    Next.js App Router — pages + API route handlers
    api/                  Route handlers (server-only, never bundled to the client)
  server/                 Server-only business logic, imported by app/ code
    auth/                 Sessions, tokens, wallet-signature message + verification
    config/               Static config (pack tiers)
    crypto/               Field-level encryption
    db/                   Drizzle schema, client, migration + seed scripts
    eligibility/          Age-gate / blocked-location policy
    fairness/             The provably-fair selection algorithm (docs/FAIRNESS_PROTOCOL.md)
    free-packs/           ISO week-key helpers for the weekly claim rule
    loyalty/              Loyalty level calculation
    packs/                Pack-offer orchestration (offer creation, payment settlement)
    payments/x402/        Per-chain x402 payment adapters (Algorand/Solana/EVM)
    responsible-purchasing/  Purchase-limit evaluation
    security/             CSRF + rate limiting
    suppliers/            Provider-neutral SupplierAdapter + CardTrader implementation
  shared/                 Pure helpers usable by both server and (future) client code
  proxy.ts                Global security headers + CSRF cookie (Next.js "proxy"/middleware)
```

## Design principles

1. **Server-side is the only source of truth.** Tier availability, pricing, purchase
   limits, and fairness selection are never trusted from the client — every check is
   re-run server-side against DB/config state on every request.
2. **Mock-by-default external integrations.** Every third-party integration (x402
   facilitator, CardTrader) has a mock mode that is the default and the only mode
   exercised by automated tests. Live mode is opt-in via environment variables and is
   explicitly flagged as unverified in PROJECT_STATUS.md until tested against real
   credentials.
3. **Pure functions for anything safety-critical.** Fairness selection, purchase-limit
   evaluation, eligibility, loyalty calculation, and supplier-listing eligibility are all
   implemented as pure functions with no DB/network dependency, so they can be
   unit-tested directly and reasoned about in isolation.
4. **Idempotency at the database layer**, not just in application logic: payments are
   unique on their on-chain transaction identifier, supplier purchases are unique on a
   derived idempotency key, free-pack grants are unique on `(userId, weekKey, reason)`.
5. **Append-only audit trail** for anything sensitive: `audit_events`, `security_events`,
   `loyalty_calculations`, `tracking_events` are insert-only tables with no application
   code path that updates or deletes a row.

## Request flow: opening a pack (Algorand)

1. Client `POST /api/x402/algorand/v1/packs/open` with `{ tierKey, network }` and a
   session cookie.
2. `createPackOffer()` runs the full gate sequence (tier availability, self-exclusion,
   purchase limits, active pool lookup), generates a server seed + commitment, and
   persists an `OFFERED` `pack_offers` row. The route returns HTTP 402 with
   `PaymentRequirements` and the `offerId`.
3. Client obtains payment (wallet flow, out of scope for this repo — see
   `@txnlab/use-wallet` docs) and retries the same endpoint with `?offerId=...` and an
   `X-PAYMENT` header.
4. `settleOfferAndOpen()` verifies the payment against the chain adapter, settles it,
   fetches post-settlement chain randomness, runs `selectPoolEntry()`, creates the `Rip`
   and `FairnessProof` rows, and queues a `SupplierPurchase`.
5. Response includes the card and the full fairness proof bundle.

See [docs/FAIRNESS_PROTOCOL.md](FAIRNESS_PROTOCOL.md) for the selection algorithm and
[docs/SUPPLIER_INTEGRATION.md](SUPPLIER_INTEGRATION.md) for what happens after step 5.

## Not yet built

See [PROJECT_STATUS.md](../PROJECT_STATUS.md) for the authoritative list — most UI pages,
the supplier-purchase worker process, auth route handlers, and the admin dashboard are not
implemented yet.
