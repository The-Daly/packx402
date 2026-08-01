# Competition / x402 Checklist

Tracking the spec's "Definition of Done" (section 53) items literally.

- [x] The application runs from documented commands (`README.md` quick start).
- [x] Migrations create the database schema (`drizzle-kit generate` produces a valid
      migration; **not yet applied to a live Postgres** in this environment — no Docker
      available. Apply with `npm run db:migrate`.)
- [x] Fictional data can be seeded (`npm run db:seed`).
- [ ] Signup and login work — auth _logic_ is implemented and tested; the `/api/auth/*`
      routes and UI are not yet built.
- [ ] Algorand wallet connection works — not yet built (wallet-signature _verification_ is
      implemented and tested; the connect UI using `@txnlab/use-wallet-react` is not).
- [ ] Phantom exposes separate Solana and EVM identities — not yet built.
- [x] Pack marketplace works (`/packs`, `/packs/[tierKey]`).
- [ ] Opening animation works — not yet built.
- [x] x402 endpoint returns HTTP 402 (`/api/x402/algorand/v1/packs/open`, verified via
      `npm run build` type-checking the full route; not yet exercised against a live
      request in this environment).
- [ ] TestNet payment or documented payment harness creates one opening — the full
      settlement→fairness→Rip pipeline is implemented (`offer-service.ts`) and type-checks
      against the live schema, but has not been run end-to-end against a live database or
      a real TestNet transaction.
- [x] Fairness proof is independently reproducible — yes, with a fixed test vector
      (`docs/FAIRNESS_PROTOCOL.md`) and a public `/api/fairness/verify` endpoint + UI.
- [ ] CardTrader adapter works in configured mode — mock mode is implemented and tested;
      live mode is implemented but unverified against a real account.
- [x] Supplier purchases are idempotent — tested in the mock provider (duplicate
      idempotency key never double-charges).
- [x] High-value packs remain server-locked — `requiresHighValueReleaseGate` +
      `FEATURE_HIGH_VALUE_PACKS_ENABLED`, checked server-side in `createPackOffer()`.
- [ ] Weekly free packs cannot be double-claimed — the DB unique constraint
      (`free_pack_grants` unique on `userId, weekKey, reason`) exists and the ISO
      week-key logic is tested, but no claim API route exists yet to exercise it.
- [ ] Loyalty levels are audited and capped — calculation + beta cap logic is implemented
      and tested; no audited recalculation job/route exists yet.
- [ ] Referral and affiliate abuse controls work — schema only, no logic yet.
- [ ] Social sharing is opt-in — schema enforces it by construction (no auto-post trigger
      exists), but no social feature is built yet to actually demonstrate this end to end.
- [ ] Blocking and reporting work — schema only, no logic yet.
- [x] Shipping addresses never appear publicly — no social/public-facing table or API
      response includes a shipping-address field; addresses are also field-encrypted at
      rest.
- [ ] Self-exclusion prevents paid and promotional openings — prevents _paid_ openings
      (enforced in `createPackOffer`); promotional/free-pack enforcement not yet wired
      since the free-pack claim flow doesn't exist yet.
- [x] All tests and the production build pass — 77 Vitest tests, `npm run build` succeeds,
      `tsc --noEmit` is clean.
- [x] Remaining legal, credential, and production requirements are explicitly documented
      (`PROJECT_STATUS.md`, `docs/LEGAL_REVIEW_REQUIRED.md`, `docs/RISKS.md`).
