# PackX402 — Project Status

Last updated: 2026-08-02 (beta scaffold + PackArt visual system + opening theater +
Google-only OAuth + real bonus-flip mechanic + pack shelf).

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
- **Rarity-band pool structure** (`src/server/packs/rarity-bands.ts`): a fixed six-rarity
  odds table (Common 25% / Uncommon 24.8% / Rare 16.1% / Epic 16.1% / Legendary 14% /
  Grail 4%, summing to exactly 100.00%) applied uniformly to all 14 tiers, with each
  rarity's price band scaled proportionally to that tier's own price (e.g. a $5 pack's
  Grail band is $9–$100). The tier's `procurementPriceCapUsdcBaseUnits` is now derived
  directly from the Grail band's upper bound (20x price) rather than a separate schedule.
  8 unit tests, including an exact reproduction of the $5-tier example this was specified
  against. `src/server/db/seed.ts` picks one representative fixture per rarity band from
  the mock CardTrader ladder — a stand-in given the mock ladder's ~20 fixtures, not a claim
  about real supplier inventory depth. Structurally inspired by a reference competitor
  app's odds-breakdown UI, not its branding or its real-money cash-out mechanic (which
  PackX402 does not have). A user-selectable "volatility level" that reshapes these odds
  (also seen in that reference app) is **not implemented**.
- **User-scoped pack-opening history** (`GET /api/packs/openings`): returns only the
  authenticated user's own rips (joined through `packOffers.userId`), never a cross-user
  listing. Deliberately separate from `/api/fairness/verify`, which stays public-by-ripId
  on purpose — that's what makes fairness independently verifiable by any third party, not
  just the pack's owner (see docs/FAIRNESS_PROTOCOL.md). No UI page consumes this endpoint
  yet.
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
- **Account creation/login model**: PackX402 has exactly two ways into an account —
  **Google sign-in** (Auth.js/NextAuth v5, `src/server/auth/google-oauth.ts`, mounted at
  `/api/oauth/[...nextauth]`) and **direct wallet signature**
  (`completeWalletAuth` in `src/server/auth/auth-service.ts`, unchanged). The previous
  passwordless-email signup/login has been **removed entirely** — the routes
  (`/api/auth/signup`, `/api/auth/login/*`, `/api/auth/verify-email`) and their
  auth-service functions no longer exist. See `docs/GOOGLE_OAUTH_SETUP.md` for the exact
  Google Cloud Console steps and required env vars (`GOOGLE_CLIENT_ID`/
  `GOOGLE_CLIENT_SECRET`) — no real Google credentials were available in this
  environment, so the OAuth handshake is implemented against Auth.js's documented Google
  provider but unverified against a real Google account.
- **Eligibility gate enforced at the point of purchase**: neither Google nor wallet
  sign-in collects DOB/location at account-creation time (Google's basic profile scope
  has no birthdate; wallet-first never has). Previously this meant NO eligibility check
  happened anywhere for wallet accounts — a real gap. `createPackOffer()` in
  `offer-service.ts` now rejects any offer for a user with no passing eligibility record
  (`error: "eligibility_required"`), and `POST /api/auth/oauth/complete-eligibility`
  (tested indirectly via evaluateEligibility's existing 10 unit tests) is what a client
  calls to satisfy it. There is still no UI page for this — see next steps.
- **Bonus-flip mechanic** (`deriveBonusFlipHit`/`selectBonusPoolEntry` in
  `src/server/fairness/engine.ts`, wired into `settleOfferAndOpen`): a fixed 4% chance,
  evaluated server-side on every completed pack opening from the same committed fairness
  seed as the primary pull (never client-side randomness), of awarding a second real card
  from the same pool. Real money/EV impact — see `docs/LEGAL_REVIEW_REQUIRED.md`'s note
  and `docs/FAIRNESS_PROTOCOL.md`'s bonus-flip addendum. **Now disclosed** on the
  pack-detail page (a "Bonus flip: 4% chance of a second card" line) — still needs
  counsel sign-off per the updated legal-review note, disclosure isn't the same as
  clearance. Tested (4 new unit tests including a ~4%
  distribution check over 5000 trials); the DB schema change (`rips.kind` +
  `(packOfferId, kind)` composite unique index replacing the old single-column uniques) is
  captured in `drizzle/0002_sturdy_synch.sql`, unverified against a live Postgres.
- **Pack shelf** (`PackShelf.tsx`, replacing the old infinite carousel on the opening
  page): uniform-size packs in a horizontally scrollable row, sorted ascending by price
  left to right, each with its own price/pay button feeding into `PaymentMethodPanel`
  (wallet — the one real, functional method — plus Apple Pay/PayPal shown realistically
  but disabled, no merchant credentials configured for either).

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
- **Responsible-purchasing rolling-spend aggregation**: `getRollingSpend()` in
  `offer-service.ts` now sums real settled payments (`payments.status = "settled"`, joined
  through `pack_offers.userId`) over rolling 24h/7d/30d windows — replacing the previous
  `passes zeros` stub — and feeds directly into `evaluatePurchaseAgainstLimits()`. Uses
  rolling windows, not calendar day/week/month, since no per-user timezone exists in the
  schema. Type-checks cleanly; unverified against a live DB like everything else here.
- **Supplier purchase queue worker**: `src/server/suppliers/purchase-worker.ts` now
  consumes the `supplier_purchases` queue (spec sections 39-40) — a real long-running
  process (`npm run worker:supplier-purchases`, not a request handler), with a row-level
  claim (conditional `UPDATE ... WHERE status = 'queued'`) so concurrent workers can't
  double-process one row. Runs validate → add-to-cart → confirm → purchase against
  `getCardTraderProvider()`, records a `fulfillments` row and `pack_offers.status` update
  on success. **Documented gaps, not silently solved**: no cross-*process* lock for
  multiple workers against the same supplier account (needs Redis, not built — no live
  infra available); no substitution-search-on-unavailable per spec section 40 (no
  configured price-increase tolerance exists to drive it — marks the row `failed` instead
  of rerolling, which would violate the fairness proof); fails clearly with
  `no_shipping_address_on_file` since there's no UI yet to add one. See
  `docs/SUPPLIER_INTEGRATION.md`.
- **Migrations**: `drizzle-kit generate` produces a valid migration and Drizzle's schema
  graph validates cleanly, but the migration has not been _applied_ to a real Postgres
  instance in this environment (no Docker available). Run `docker compose up -d && npm
run db:migrate && npm run db:seed` to verify.

## What's scaffolded (schema only) or not started (⬜)

- **UI pages built**: landing page (now with an interactive, no-DB, no-wallet demo of the
  full carousel-select → rip → spin → reveal → bonus-flip sequence via the shared
  `InteractivePackDemo` component, plus a plain-language 4-step walkthrough of the
  commit-reveal fairness algorithm — verified live in-browser that pack selection and rip
  progression both work), pack marketplace, pack detail (now with per-card reference
  values and a "max obtainable card value" summary), provably-fair verifier (with a real
  working `/api/fairness/verify` endpoint), odds library + JSON download, and an
  opening-theater page at `/packs/[tierKey]/open` (see below). The same `InteractivePackDemo`
  also powers the dev-only `/dev/rip-preview` page (useful when Postgres isn't running).
- **Bonus-flip mechanic verified correct**: confirmed the coin-flip visual (`CoinFlip.tsx`)
  never rolls its own odds — it only animates the server's already-determined 4% result
  (`deriveBonusFlipHit` in `engine.ts`). The only place a different rate shows is the
  landing-page demo, which intentionally uses ~40% (clearly commented as demo-only) so the
  flourish is visible while clicking around instead of a 1-in-25 real rate.
- **Torn-open pack art**: 4 of 14 tiers (Spark, Scout, Obsidian, Mythic — the tiers used in
  the landing-page demo) now have a real Higgsfield-generated torn-pack render at
  `public/packs/{tier}-torn.png`, shown briefly during the `"tearing"` phase right after the
  rip gesture commits, before the reveal wheel spins (see `docs/ASSET_MANIFEST.md` and
  `docs/HIGGSFIELD_PROMPTS.md`). Uses a clean straight tear line (not jagged) per explicit
  direction. `PackArt`'s new `torn` prop falls back to the closed-pack art for any tier
  without one yet — the remaining 10 tiers are a drop-in follow-up, zero code changes
  needed. Verified the asset request succeeds (200 OK network log) during a live rip on the
  landing-page demo; the CSS-only rip gesture animation itself (`RipToOpen.tsx`) was also
  switched from a jagged zigzag clip-path to a single straight seam line, per the same
  feedback.
- **Mock CardTrader fixture ladder refreshed with live market data**: replaced the
  ~20-card hand-authored mock inventory (`src/server/suppliers/cardtrader/fixtures.ts`)
  with 110 real cards — 90 Pokemon (Base Set/Gym Heroes/Neo Genesis via api.pokemontcg.io)
  and 20 Yu-Gi-Oh (via db.ygoprodeck.com), each carrying that card's real market price at
  fetch time (2026-08-02 snapshot), spanning $0.08-$1,300. CardTrader itself is still mock
  mode (see AGENTS.md) — only the card identity/pricing is now real instead of invented.
  `db:seed`'s pool-version label bumped to `2026-08-02.2` to reflect the refresh.
- **Opening theater** (`/packs/[tierKey]/open`): real page, not a mock. Pack shelf →
  drag-to-rip gesture (`RipToOpen`) → calls the real `/api/x402/algorand/v1/packs/open`
  endpoint to create a pack offer → **Pera Wallet is now really wired up**
  (`@txnlab/use-wallet-react` + `@perawallet/connect`, both real installed packages, no
  stubs — `WalletManagerProvider`, `ConnectPeraButton`, `PayWithWalletButton`). Connecting
  Pera, building a real Algorand ASA-transfer transaction from the server's own
  `PaymentRequirements`, signing it via `transactionSigner`, submitting to algod, waiting
  for confirmation, and re-POSTing with a real `X-PAYMENT` header are all implemented per
  the documented adapter contract (`algorand-adapter.ts`'s `decodePaymentHeader`). What's
  **not verified in this environment**: no funded TestNet Pera wallet was available here to
  actually click through connect → sign → submit → settle end to end, and the DB-backed
  page itself needs Postgres to load at all (see next steps) — this is the same
  "implemented against the documented contract, unverified live" status as CardTrader/x402
  live mode elsewhere in this repo. `settleOfferAndOpen` resolves the actual card, resolves
  its image via `src/server/card-images/resolver.ts`, and the reveal wheel
  (`CardRevealWheel`) spins down to and flips over that real card. A real 4% bonus-flip
  mechanic (not the cosmetic version originally shipped — see the "Bonus-flip mechanic"
  entry above) can award a second card alongside the primary pull, animated via
  `CoinFlip.tsx` once the server has already determined the real outcome.
- **Personal opening history** (`/collection` page + `GET /api/packs/openings`): now
  built — a simple table of the signed-in user's own past pulls (card, set, tier, value,
  date, a link into the fairness verifier). Not the fuller "personal collection" experience
  described in the original spec (no shipping status, no showcase/social integration).
- **Header sign-in** (`layout.tsx`): now real — "Sign in with Google" / "Log out" replace
  the previous dead `/login`/`/signup` links (those pages never existed). Auth state is
  checked client-side via `/api/auth/session` after mount rather than in the root layout
  via `cookies()`, specifically so the rest of the site keeps static generation (checking
  cookies() in the layout previously forced every single page to render dynamically).
- **Eligibility completion page** (`/eligibility`): now built — collects DOB, country
  (+US state), and the 18+ acknowledgment via `POST /api/auth/oauth/complete-eligibility`
  (now CSRF-protected, matching its sibling mutating routes). `OpenPackClient` links here
  automatically when pack-offer creation fails with `eligibility_required`. This is a UX
  convenience only — `createPackOffer()` remains the real, unbypassable server-side gate.
- **Shipping-address management** (`/shipping-addresses` + `GET/POST /api/shipping-
  addresses`, `DELETE /api/shipping-addresses/:id`, `POST /api/shipping-addresses/:id/
  default`): add/list/remove/set-default, every free-text field encrypted at rest
  (existing `encryptField`/`decryptField`, same as elsewhere in the schema), first address
  added is auto-default, deleting the default promotes the next-oldest one so there's
  always a clear default whenever at least one address exists. This is what the
  supplier-purchase worker needs on file before it can complete a real purchase — linked
  to from `/collection`. CSRF-protected like every other mutating route.
- **UI pages NOT built**: a dedicated wallet-center/account page (connect/disconnect is
  available inline wherever `ConnectPeraButton` is used, but there's no standalone wallet
  management page), Defly/Phantom for Solana+EVM (Pera/Algorand only for now), shipping
  center, order tracking UI, weekly-free-pack claim UI, loyalty dashboard, referral
  dashboard, affiliate program UI, social profiles/feed/showcases/clubs/challenges,
  notifications center, security center, support/dispute UI, and the entire admin
  dashboard. The data model for all of these exists; the API routes and UI do not.
- **Free-pack claim / loyalty recalculation jobs**: pure calculation logic exists and is
  tested; there is no scheduled job or API route that actually grants/claims a weekly pack
  or recalculates a user's loyalty level.
- **Referral & affiliate business logic**: only the data model exists. No code.
- **Social moderation**: only the data model exists. No code.
- **Admin dashboard**: only the data model (`admin_users`, `audit_events`, etc.) exists.
  No RBAC enforcement code or UI.
- **CardImageResolver** (`src/server/card-images/resolver.ts`): implements the documented
  priority chain (supplier photo → PSA graded scan → CardTrader catalog → public catalog
  APIs → PackX402 fallback) with a domain-allowlist/SSRF guard on any resolved URL.
  Providers 1–3 (CardTrader photo, PSA cert lookup, CardTrader catalog) still return
  `null` — no credential available for any of them. **Provider 4 makes real live calls**
  to the public, keyless Pokémon TCG API (pokemontcg.io) and YGOPRODeck API
  (ygoprodeck.com) — confirmed working from this environment — and resolves an actual
  CATALOG_RENDER card image by name for both games. Only falls back to the generic
  card-back PLACEHOLDER when a card name has no match, the API is unreachable, or the
  returned URL isn't on the allowlist. Tested with mocked `fetch` for determinism
  (`resolver.test.ts`); the live network path itself was manually verified against both
  real APIs but is not covered by an automated live-network test.
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

1. Install Docker Desktop (this dev machine doesn't have it) and run
   `docker compose up -d && npm run db:migrate && npm run db:seed`, then `npm run dev` —
   this is the single blocker keeping the pack-detail and opening-theater pages from
   rendering at all right now (they 404 without a live Postgres). A no-DB animation
   preview exists at `/dev/rip-preview` in the meantime (see below).
2. Create a real Google OAuth client (see `docs/GOOGLE_OAUTH_SETUP.md`) and set
   `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` in `.env.local` to actually test Google
   sign-in end to end.
3. ~~Build a UI page for `POST /api/auth/oauth/complete-eligibility`~~ — done, see
   `/eligibility` above.
4. Pera Wallet (Algorand) is now wired up for real — get a funded TestNet account into
   Pera and click through connect → sign → submit → settle end to end for the first time;
   nothing in this environment could exercise that live. Defly and Phantom (Solana/EVM)
   still need their own connect flows built the same way.
5. ~~Build the supplier-purchase worker process~~ — done, see
   `src/server/suppliers/purchase-worker.ts` above. Still needs: a cross-process lock if
   ever running more than one worker instance against the same supplier account, and the
   spec-section-40 substitution search (no configured price tolerance exists yet).
6. ~~Wire real rolling-spend aggregation into `offer-service.ts`'s limit check~~ — done,
   see `getRollingSpend()` above.
7. Wire a live CardTrader photo/catalog credential (or PSA/public-catalog credential) into
   `src/server/card-images/resolver.ts`'s provider stubs so real card images resolve
   instead of always falling back to the placeholder.
8. Obtain CardTrader and GoPlausible sandbox credentials and run an actual integration
   test pass before ever setting `CARDTRADER_MODE=live` or
   `X402_FACILITATOR_MODE=live` outside of TestNet dry runs.
9. ~~Build a shipping-address UI~~ — done, see `/shipping-addresses` above.

## Beta restrictions verified present in code

- No custodial wallets, no private-key/seed storage anywhere in the schema or code
  (`WalletIdentity` stores only public addresses).
- High-value tiers (`requiresHighValueReleaseGate`) are gated by a **server-side** feature
  flag (`FEATURE_HIGH_VALUE_PACKS_ENABLED`), checked in `isTierPurchasableOn()` and
  enforced in `offer-service.ts` — a client can request any tier key and will still be
  rejected server-side.
- `Math.random` is never used for card selection — `selectPoolEntry()` uses only sha256
  over committed/revealed/on-chain values.
