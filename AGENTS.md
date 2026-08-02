<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# PackX402 — Agent Instructions

## Start every session by reading, in order

1. [PROJECT_STATUS.md](PROJECT_STATUS.md) — what's actually implemented vs. tested vs.
   stubbed vs. not started. This is the source of truth, not this file's memory of a past
   session.
2. `git log --oneline -20` and `git status` — what changed since PROJECT_STATUS.md was
   last updated.
3. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for module layout.

## Current project phase

Beta scaffold: core business logic (fairness, payments, supplier adapter, auth
primitives, responsible purchasing, loyalty) is implemented and unit-tested; most UI and
several orchestration layers (auth routes, admin, social, affiliate, the supplier-purchase
worker) are not yet built. See PROJECT_STATUS.md for the exact split — do not assume a
feature exists because its database schema does.

## Non-negotiable security requirements

- Never store wallet private keys or seed phrases, anywhere, for any reason.
- Never use `Math.random()` for pack selection — only `src/server/fairness/engine.ts`'s
  deterministic, committed algorithm.
- Never trust a client-supplied price, tier availability, or purchase-limit value — always
  re-derive from server/DB state (`createPackOffer()` is the reference pattern).
- Never enable `FEATURE_HIGH_VALUE_PACKS_ENABLED=true` or `ALGORAND_MAINNET_ENABLED=true`
  without the corresponding review in `docs/LEGAL_REVIEW_REQUIRED.md` being complete.
- Never set `CARDTRADER_MODE=live` or `X402_FACILITATOR_MODE=live` without a verified
  integration pass against real credentials — both are currently unverified (see
  PROJECT_STATUS.md).
- All money values are integer USDC base units (`src/shared/money.ts`) — never floats.

## Commands that must pass before committing

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

If you change `src/server/db/schema/`, also run `npm run db:generate` and commit the
resulting migration file under `drizzle/`.

## Prohibited without explicit instruction

- Committing secrets, `.env`/`.env.local`, or any file matching the sensitive patterns in
  `.gitignore`.
- Enabling MainNet or high-value packs (see above).
- Force-pushing, rewriting history on `main`, or merging your own draft PR.
- Adding a new third-party payment or supplier integration without first checking its
  package actually exists and matches the documented API (see `docs/DECISIONS.md` for the
  verification approach used for x402/CardTrader).

## Required after any change

Update `PROJECT_STATUS.md` if you've moved something from 🟡/⬜ to ✅, or discovered a new
gap. Update `docs/ROADMAP.md` if the phase sequencing changes. Do not leave
`PROJECT_STATUS.md` stale relative to what you actually built.

## Three-pass review procedure (spec section 52)

Before considering a change complete:

1. **Correctness**: format, lint, strict typecheck, unit tests, build all pass.
2. **Security**: re-read the threat model (`docs/THREAT_MODEL.md`) against your change —
   does it introduce a new client-trust boundary, a new unencrypted sensitive field, a new
   unauthenticated mutating endpoint?
3. **Product**: mobile + desktop layout, keyboard operability, reduced-motion support,
   empty/loading/error states.

## Pull-request and review process

Work happens on `beta/initial-packx402-build` (or a similarly named feature branch) against
`main`. Open a **draft** PR; do not self-merge. The PR description must summarize what was
implemented, what tests were run, and what remains — see the actual open PR for the
current template this repo uses.
