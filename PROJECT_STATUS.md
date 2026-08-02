# PackX402 — Project Status

Last updated: 2026-08-01 (beta scaffold + PackArt visual system + auth API routes).

This document is the single source of truth for what is actually implemented, what is
scaffolded but unverified, and what has not been started. Do not trust marketing language
elsewhere in the repo over this file — if something here says "not built," it is not built.

## How to read this file

- ✅ **Implemented & tested** — real code, covered by passing automated tests (unit or
  integration), or verified against a real cryptographic primitive/keypair.
- 🟡 **Implemented, unverified** — real code that type-checks and builds, but has not been
  exercised against a live database, live network, or live third-party credential in this
  environment (none were available: no Docker/Postgres, no CardTrader token, no GoPlausible
  facilitator credentials).
- ⬜ **Not started** — schema/types may exist, but no business logic or UI.

## Environment constraints during this build

This repository was built in a sandboxed environment with **no Docker, no local
PostgreSQL, and no live third-party credentials** (CardTrader, GoPlausible/x402
facilitator). Everything that could be verified without those — TypeScript strict
typechecking against the full Drizzle schema, the production `next build`, and 86 Vitest
unit/integration tests including real generated-keypair signature verification for
Algorand/Solana/EVM — passes. Anything that requires a live database or live credentials
is marked 🟡 and needs to be verified by a human with `docker compose up -d` before
production use.

## What's implemented and tested (✅)

- **Data model**: full 59-table Drizzle/Postgres schema covering every entity in the spec
  (users, wallets, sessions, pack tiers, pools, suppliers, offers, payments, rips,
  fairness proofs, fulfillment, free packs, loyalty, referrals, affiliates, social,
  purchase controls, support, security/audit, feature flags). Generates a clean initial
  migration (`drizzle/0000_daffy_darkstar.sql`).
- **Pack tier config**: all 14 tiers (Spark–Genesis), integer USDC base units, server-side
  network/value gating (`src/server/config/pack-tiers.ts`).
- **Fairness engine** (`src/server/fairness/engine.ts`): deterministic server-seed-commit
  → reveal → sha256-combine → weighted selection algorithm. 12 unit tests including a
  **fixed, hand-computed test vector** (published in `docs/FAIRNESS_PROTOCOL.md`) so a
  third party can independently reproduce it in any language.
- **Field-level encryption** (AES-256-GCM) for sensitive columns, round-trip and
  tamper-detection tested.
- **Responsible-purchasing limit evaluation**: self-exclusion, cool-off, pause, daily/
  weekly/monthly limits, and the "decrease is immediate / increase is delayed" rule —
  pure logic, 15 unit tests.
- **Supplier eligibility rules** (spec section 38): pure rule evaluator, 8 unit tests.
- **CardTrader mock provider**: full `SupplierAdapter` interface implementation over
  deterministic fixtures — idempotent purchase (same idempotency key never double-charges),
  cart-safety abort on unexpected non-empty cart, 6 integration-style tests.
- **Loyalty calculation**: level determination, beta reward cap at Silver, eligible-spend
  arithmetic — 7 unit tests.
- **ISO week key** for the weekly free-pack one-claim-per-week rule — 5 unit tests,
  verified against a reference algorithm.
- **Eligibility/age-gate policy**: age calculation and full denial-reason evaluation — 10
  unit tests.
- **Wallet signature verification**: real per-chain crypto for Algorand (algosdk),
  Solana (tweetnacl), and EVM (viem) — **each verified against an actual generated
  keypair signing and verifying a real message**, including negative tests (wrong signer,
  tampered message). 8 tests.
- **Wallet signature message format**: SIWE-style canonical message with domain/URI/nonce/
  chain/purpose/issued/expiration, round-trip tested.
- **Production build**: `npm run build` succeeds (Next.js 16, Turbopack, strict
  TypeScript). All pages and API routes compile and are correctly typed against the live
  Drizzle schema.

## What's implemented but unverified against live infrastructure (🟡)

- **x402 Algorand payment endpoint** (`/api/x402/algorand/v1/packs/open`): returns HTTP
  402 with PaymentRequirements when unpaid; verifies/settles via direct algod
  verification in live mode, or a deterministic mock in `X402_FACILITATOR_MODE=mock`
  (the default, and the only mode exercised so far). **Not tested against a real GoPlausible
  facilitator** — no credentials were available. The `ChainPaymentAdapter` interface is
  shaped so swapping in a real facilitator call is a single-file change; see
  `docs/DECISIONS.md`.
- **Solana / EVM x402 adapters**: same mock-default pattern, live-mode paths use direct
  RPC verification (web3.js / viem) but are unverified against real DevNet/TestNet
  transactions.
- **CardTrader live provider**: implemented against CardTrader's documented v2 API shape
  (`GET /marketplace/products`, `/cart`, `/cart/add`, `/cart/purchase`, etc.,
  `via_cardtrader_zero=false`), but **has not been run against a real CardTrader account**
  — no API token was available. Do not enable `CARDTRADER_MODE=live` without a
  verification pass against current CardTrader docs and a sandbox account.
- **Pack offer orchestration** (`src/server/packs/offer-service.ts`): the full
  create-offer → verify/settle payment → run fairness selection → create Rip +
  FairnessProof → queue supplier purchase flow. Type-checks cleanly against the live
  Drizzle schema (a strong signal — Drizzle's generated types catch field/type mismatches
  at compile time) but **has not been run end-to-end against a live Postgres database** in
  this environment.
- **Responsible-purchasing rolling-spend aggregation**: the limit _decision_ logic is
  fully tested; the query that aggregates a user's actual rolling daily/weekly/monthly
  spend from fulfilled orders is a documented follow-up (`offer-service.ts` currently
  passes zeros) — needs a live DB to build and validate correctly.
- **Supplier purchase queue**: `SupplierPurchase` rows are created with `status: "queued"`
  on a successful open; the actual serialized, one-at-a-time-per-account worker process
  that consumes this queue (spec section 39) is **not implemented** — this needs a
  long-running worker process (not just a route handler) and is the top follow-up item.
- **Migrations**: `drizzle-kit generate` produces a valid migration and Drizzle's schema
  graph validates cleanly, but the migration has not been _applied_ to a real Postgres
  instance in this environment (no Docker available). Run `docker compose up -d && npm
run db:migrate && npm run db:seed` to verify.

## What's scaffolded (schema only) or not started (⬜)

- **UI pages built**: landing page, pack marketplace, pack detail (now with per-card
  reference values and a "max obtainable card value" summary), provably-fair verifier
  (with a real working `/api/fairness/verify` endpoint), odds library + JSON download, and
  an opening-theater page at `/packs/[tierKey]/open` (see below).
- **Opening theater** (`/packs/[tierKey]/open`): real page, not a mock. Carousel to browse
  tiers → drag-to-rip gesture (`RipToOpen`) → calls the real
  `/api/x402/algorand/v1/packs/open` endpoint to create a pack offer → since there is
  still no wallet-connect UI, the real `PaymentRequirements` (amount, payTo) are displayed
  honestly instead of a fake reveal. If a wallet flow is added later and supplies a real
  `X-PAYMENT` header, `settleOfferAndOpen` already resolves the actual card, resolves its
  image via `src/server/card-images/resolver.ts`, and the reveal wheel
  (`CardRevealWheel`) spins down to and flips over that real card — this path is wired but
  not reachable end-to-end without wallet UI. A low-probability (15%), purely cosmetic
  coin-flip flourish (`CoinFlip.tsx`) can occasionally re-play the reveal spin after
  landing — it never changes the real fairness-selected card or its odds.
- **UI pages NOT built**: wallet-center UI (and any wallet-connect flow at all — the
  opening theater cannot complete a real purchase without this), signup/login forms,
  personal collection, shipping center, order tracking UI, weekly-free-pack claim UI,
  loyalty dashboard, referral dashboard, affiliate program UI, social
  profiles/feed/showcases/clubs/challenges, notifications center, security center,
  support/dispute UI, and the entire admin dashboard. The data model for all of these
  exists; the API routes and UI do not.
- **Free-pack claim / loyalty recalculation jobs**: pure calculation logic exists and is
  tested; there is no scheduled job or API route that actually grants/claims a weekly pack
  or recalculates a user's loyalty level.
- **Referral & affiliate business logic**: only the data model exists. No code.
- **Social moderation**: only the data model exists. No code.
- **Admin dashboard**: only the data model (`admin_users`, `audit_events`, etc.) exists.
  No RBAC enforcement code or UI.
- **CardImageResolver** (`src/server/card-images/resolver.ts`): implements the documented
  priority chain (supplier photo → PSA graded scan → CardTrader catalog → public catalog
  APIs → PackX402 fallback) with a domain-allowlist/SSRF guard on any resolved URL. Every
  provider except the final fallback returns `null` in this environment — none of
  CardTrader photo access, PSA cert lookup, or outbound network fetches are available
  here — so it currently always resolves to the generic card-back PLACEHOLDER. The chain,
  types, and guard are real and tested (`resolver.test.ts`); only the live provider calls
  are unimplemented stubs, consistent with this repo's mock-default pattern elsewhere.
- **Pack artwork**: real Higgsfield-generated cartoon-style art (cel-shaded, "PackX402"
  wordmark, transparent-background cutouts) installed for all 10 unlocked tiers at
  `public/packs/*.png` — see `docs/HIGGSFIELD_PROMPTS.md`. Crown/Vault/Grail/Genesis
  remain CSS placeholders (locked tiers).
- **Max-obtainable-value cap**: `src/server/config/pack-tiers.ts`'s
  `procurementPriceCapUsdcBaseUnits` now follows a tapering per-tier multiplier
  (`MAX_OBTAINABLE_VALUE_MULTIPLIER`) instead of a flat 1.15x — e.g. Spark ($0.50) caps at
  $25 (50x), Genesis ($10,000) caps at $20,000 (2x). This is a deliberate EV/odds design
  choice; see `docs/LEGAL_REVIEW_REQUIRED.md` for the responsible-purchasing disclosure
  implications before this ships beyond beta.
- **Playwright e2e tests**: not written. Only Vitest unit/integration tests exist.
- **GitHub Actions CI / issue templates / CODEOWNERS**: see `docs/` and `.github/` — being
  added in this same pass; check their presence directly rather than trusting this
  sentence after further commits.

## Immediate next steps (in priority order)

1. Build a real wallet-connect flow (Pera/Defly for Algorand, Phantom for Solana/EVM) —
   this is now the single blocker keeping the opening theater from completing a real
   purchase end to end; everything past payment (settlement, fairness reveal, card image
   resolution, reveal animation) is already wired and ready to receive it.
2. `docker compose up -d && npm run db:migrate && npm run db:seed`, then `npm run dev` and
   manually click through the marketplace/pack-detail/opening-theater pages to catch
   anything a live DB surfaces that type-checking couldn't.
3. Build the supplier-purchase worker process (a long-running consumer of the
   `supplier_purchases` queue) — currently only enqueues, never processes.
4. Wire real rolling-spend aggregation into `offer-service.ts`'s limit check.
5. Wire a live CardTrader photo/catalog credential (or PSA/public-catalog credential) into
   `src/server/card-images/resolver.ts`'s provider stubs so real card images resolve
   instead of always falling back to the placeholder.
6. Obtain CardTrader and GoPlausible sandbox credentials and run an actual integration
   test pass before ever setting `CARDTRADER_MODE=live` or
   `X402_FACILITATOR_MODE=live` outside of TestNet dry runs.

## Beta restrictions verified present in code

- No custodial wallets, no private-key/seed storage anywhere in the schema or code
  (`WalletIdentity` stores only public addresses).
- High-value tiers (`requiresHighValueReleaseGate`) are gated by a **server-side** feature
  flag (`FEATURE_HIGH_VALUE_PACKS_ENABLED`), checked in `isTierPurchasableOn()` and
  enforced in `offer-service.ts` — a client can request any tier key and will still be
  rejected server-side.
- `Math.random` is never used for card selection — `selectPoolEntry()` uses only sha256
  over committed/revealed/on-chain values.
