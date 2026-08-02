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

**Now implemented**: `src/server/suppliers/purchase-worker.ts` consumes the
`supplier_purchases` queue — `runSupplierPurchaseWorkerLoop()` polls for the oldest
`queued` row (claimed via a conditional `UPDATE ... WHERE status = 'queued'`, safe against
two workers racing the same row), then runs validate → add-to-cart → confirm → purchase
against `getCardTraderProvider()`, records the outcome (`purchased` + a `fulfillments` row,
or `failed` + a reason), and updates the parent `pack_offers.status`. Run it with `npm run
worker:supplier-purchases` (entry point: `src/server/suppliers/run-worker.ts`) as its own
long-running process — not a request handler, not a cron job.

**Known gaps in the worker, left as documented follow-ups** (not silently solved):
- **Cross-account serialization**: the row-level claim prevents double-processing one row,
  but running more than one worker *process* against the same supplier account still needs
  an external lock (e.g. Redis) — not implemented, no live infrastructure was available to
  build and verify one.
- **Substitution-on-unavailable (spec section 40)**: if a listing is out of stock/removed,
  the worker marks the row `failed` rather than searching for a substitute — there is no
  configured procurement-price-increase tolerance anywhere in this codebase to drive that
  search, and rerolling would violate the fairness proof. A human resolves it manually today.
- **No shipping address on file**: marks the row `failed` with `no_shipping_address_on_file`
  — there is no UI yet for a user to add one (see PROJECT_STATUS.md's UI gaps list).
- Unverified against a live Postgres/CardTrader account, like everything else DB-dependent
  in this repo (see PROJECT_STATUS.md's environment-constraints note).

## Failure process (spec section 40)

Documented target behavior (not yet coded — depends on the worker above): if the winning
listing becomes unavailable, search for an exact match (same set/number/language/finish/
condition/grade) within a configured procurement-price increase; never reroll; if no exact
match exists, transition to `FULFILLMENT_FAILED_REFUND_REQUIRED`; allow a
customer-approved equal-or-better substitution; always preserve the original fairness
proof; record the full decision trail in `audit_events`.
