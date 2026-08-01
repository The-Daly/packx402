# Roadmap

See [PROJECT_STATUS.md](../PROJECT_STATUS.md) for the authoritative done/not-done split.
This file is the forward-looking sequencing.

## Phase 0 — this build (complete)

Data model, fairness engine, pack-tier config, x402 payment adapters (mock-default),
CardTrader adapter (mock-default), auth primitives (sessions, wallet-signature crypto),
eligibility/responsible-purchasing/loyalty pure logic, landing/marketplace/pack-detail/
fairness-center/odds-library pages, security headers + CSRF + rate-limit primitives, CI,
docs.

## Phase 1 — golden path to a real TestNet opening

1. `/api/auth/*` route handlers (signup, login, wallet-link, logout, session management)
   on top of the already-tested session/crypto logic.
2. Signup/login/wallet-center UI.
3. Purchase-confirmation screen + animated opening theater UI wired to the working
   `/api/x402/algorand/v1/packs/open` endpoint.
4. Pull result page + personal collection (read-only first).
5. Supplier-purchase worker process (currently only enqueues, never processes).
6. Verify the whole flow against a real Algorand TestNet transaction end-to-end.

## Phase 2 — retention mechanics

Weekly free-pack claim flow, loyalty recalculation job, shipping center, order tracking
UI, notifications center.

## Phase 3 — community

Social profiles/feed, pull sharing, showcases, follow/block/report, clubs, challenges,
opt-in leaderboards, referral dashboard.

## Phase 4 — growth & admin

Affiliate program (application → payout), admin dashboard (RBAC across all 20 areas in
spec section 35), support/dispute case management UI, transparency/status pages.

## Phase 5 — production hardening

Live CardTrader + live GoPlausible facilitator integration testing with real credentials,
Playwright e2e suite, load testing the supplier-purchase queue, full accessibility audit,
legal review sign-off (`docs/LEGAL_REVIEW_REQUIRED.md`), then and only then consider
enabling MainNet or high-value tiers.
