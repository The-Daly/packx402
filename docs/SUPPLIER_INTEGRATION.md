# Supplier Integration

## Interface

`src/server/suppliers/types.ts` defines `SupplierAdapter` — provider-neutral, with
`searchEligibleListings`, `getLiveQuote`, `validateListing`, `addToCart`, `confirmCart`,
`purchaseListing`, `removeFromCart`, `getOrder`, `getTracking`, `requestCancellation`,
`healthCheck`. Any future marketplace integration must implement this same interface.

## CardTrader (first and only beta implementation)

- **Mock** (`src/server/suppliers/cardtrader/mock-provider.ts`, `CARDTRADER_MODE=mock`,
  the default): in-memory, deterministic fixture inventory
  (`src/server/suppliers/cardtrader/fixtures.ts`), 6 passing integration-style tests
  covering idempotent purchase and cart-safety abort behavior.
- **Live** (`src/server/suppliers/cardtrader/live-provider.ts`, `CARDTRADER_MODE=live`):
  implements the documented v2 API shape — `GET /marketplace/products`, `GET /cart`,
  `POST /cart/add`, `POST /cart/remove`, `POST /cart/purchase`, order/tracking endpoints,
  `via_cardtrader_zero=false` (direct seller fulfillment, per spec). **Has not been run
  against a real CardTrader account** — no API token was available in the build
  environment. Verify against current CardTrader API docs and a sandbox account before
  ever setting `CARDTRADER_MODE=live`.

TCGplayer is explicitly **not** an automated provider — it remains a disabled future
provider / approved affiliate-link fallback / manual admin source only, per spec section 37. No TCGplayer scraping exists anywhere in this codebase.

## Eligibility rules (spec section 38)

`src/server/suppliers/eligibility.ts` — a pure function checking quantity, seller
vacation status, shipping capability, full card identity (game/set/number/condition/
language/finish/grade), tier procurement price cap, seller reliability score, inventory
freshness, shipping estimability, and image-use permission. 8 passing tests.

## Cart concurrency (spec section 39)

CardTrader uses an **account-level cart** — PackX402 must never have two purchase jobs
racing on the same account cart. The schema (`supplier_purchases`) is designed for a
serialized queue: one `queued` row per rip, unique on `idempotencyKey`. Both providers'
`addToCart()` **abort if the cart already has contents** rather than assuming it's empty
(tested in the mock provider). `purchaseListing()` is idempotent: replaying the same
idempotency key returns the original order instead of creating a duplicate (tested).

**Not yet implemented**: the actual worker process that consumes the `supplier_purchases`
queue one row at a time per supplier account. Today, `offer-service.ts` only _enqueues_ a
row with `status: "queued"` — nothing processes it yet. This is the top follow-up item in
PROJECT_STATUS.md. A production implementation needs a long-running worker (not a request
handler) holding a Redis-based lock per supplier account for the duration of each
add-to-cart → confirm → purchase sequence.

## Failure process (spec section 40)

Documented target behavior (not yet coded — depends on the worker above): if the winning
listing becomes unavailable, search for an exact match (same set/number/language/finish/
condition/grade) within a configured procurement-price increase; never reroll; if no exact
match exists, transition to `FULFILLMENT_FAILED_REFUND_REQUIRED`; allow a
customer-approved equal-or-better substitution; always preserve the original fairness
proof; record the full decision trail in `audit_events`.
