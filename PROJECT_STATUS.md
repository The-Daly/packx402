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
typechecking against the full Drizzle schema, the production `next build`, and 77 Vitest
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

- **UI pages built**: landing page, pack marketplace, pack detail, provably-fair verifier
  (with a real working `/api/fairness/verify` endpoint), odds library + JSON download.
- **UI pages NOT built**: signup/login forms, wallet-center UI, purchase-confirmation
  screen, the animated opening theater, pull result page, personal collection, shipping
  center, order tracking UI, weekly-free-pack claim UI, loyalty dashboard, referral
  dashboard, affiliate program UI, social profiles/feed/showcases/clubs/challenges,
  notifications center, security center, support/dispute UI, and the entire admin
  dashboard. The data model for all of these exists; the API routes and UI do not.
- **Auth API routes**: session/token/wallet-verification _logic_ is implemented and
  tested (see above), but there are no `/api/auth/*` route handlers wiring them up yet
  (signup, login, wallet-link, logout, session listing/revocation endpoints).
- **Free-pack claim / loyalty recalculation jobs**: pure calculation logic exists and is
  tested; there is no scheduled job or API route that actually grants/claims a weekly pack
  or recalculates a user's loyalty level.
- **Referral & affiliate business logic**: only the data model exists. No code.
- **Social moderation**: only the data model exists. No code.
- **Admin dashboard**: only the data model (`admin_users`, `audit_events`, etc.) exists.
  No RBAC enforcement code or UI.
- **Higgsfield pack artwork prompts**: not generated — see `docs/HIGGSFIELD_PROMPTS.md` for
  the prompt spec to use with an image-generation tool; no images were produced in this
  session.
- **Playwright e2e tests**: not written. Only Vitest unit/integration tests exist.
- **GitHub Actions CI / issue templates / CODEOWNERS**: see `docs/` and `.github/` — being
  added in this same pass; check their presence directly rather than trusting this
  sentence after further commits.

## Immediate next steps (in priority order)

1. `docker compose up -d && npm run db:migrate && npm run db:seed`, then `npm run dev` and
   manually click through the marketplace/pack-detail pages to catch anything a live DB
   surfaces that type-checking couldn't.
2. Build `/api/auth/*` routes on top of the already-tested session/wallet-verification
   logic, plus signup/login UI.
3. Build the supplier-purchase worker process (a long-running consumer of the
   `supplier_purchases` queue) — currently only enqueues, never processes.
4. Wire real rolling-spend aggregation into `offer-service.ts`'s limit check.
5. Build the opening-theater UI and wire it to the now-working x402 endpoint.
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
