# PackX402 — Handoff Prompt

Paste this at the start of a new session to resume work with full context.

---

## Copy-paste handoff prompt

```
I'm continuing work on PackX402 (repo: The-Daly/packx402, branch
beta/initial-packx402-build, draft PR #1) — a wallet-native trading-card
pack-opening platform on Algorand using the x402 payment protocol.

Start by reading, in order:
1. PROJECT_STATUS.md — the real source of truth for what's implemented vs.
   tested vs. stubbed vs. not started. Don't assume a feature exists just
   because its DB schema does.
2. `git log --oneline -20` and `git status` — what's changed since
   PROJECT_STATUS.md was last touched.
3. docs/ARCHITECTURE.md for module layout.
4. AGENTS.md for the non-negotiable rules (never Math.random() for card
   selection, never trust client-supplied price/tier data, integer USDC
   base units only, no MainNet/high-value packs without legal review, run
   typecheck/lint/test/build before every commit).

Current state as of the last session:
- Real provably-fair engine (commit-reveal + sha256 roll) is implemented
  and unit-tested, including a REAL 4% bonus-flip mechanic (second card on
  a hit, not cosmetic) and a six-rarity odds/price-band structure
  (common/uncommon/rare/epic/legendary/grail) applied proportionally
  across all 14 pack tiers.
- Real card images (Pokemon TCG API + YGOPRODeck API) are wired into both
  the spin animation and the final reveal, through a domain-allowlisted
  resolver (src/server/card-images/resolver.ts).
- Pack-opening history is user-scoped (/api/packs/openings,
  /app/collection) — the fairness *verify* endpoint stays public by
  ripId on purpose, per explicit user decision.
- Rip gesture works from anywhere on the pack (not just a handle), with a
  jagged interlocking clip-path so the torn piece and remaining pack don't
  show a duplicated top.
- Pack selection UI is a price-ordered, uniform-size horizontal shelf
  (PackShelf component) — inspired by a competitor reference app but
  deliberately not a copy.
- Apple Pay / PayPal show as visible-but-disabled payment options, clearly
  marked unverified in PROJECT_STATUS.md / docs/LEGAL_REVIEW_REQUIRED.md.
- Pera Wallet is really wired up: @txnlab/use-wallet-react +
  @perawallet/connect (all real installed packages, including the other
  connectors' peer deps this library unconditionally imports — see the
  "@txnlab/use-wallet build failure" note in PROJECT_STATUS.md/git history
  if you touch next.config.ts or package.json around wallets). Connect,
  build-ASA-transfer, sign, submit, wait-for-confirmation, and re-POST
  with a real X-PAYMENT header are all implemented against the documented
  adapter contract — NOT yet verified end-to-end with a funded TestNet
  wallet in this environment.
- The landing page (src/app/page.tsx) now has an interactive, no-DB,
  no-wallet demo (InteractivePackDemo component, also used at
  /dev/rip-preview) of the full carousel-select → rip → spin → reveal →
  bonus-flip sequence, plus a 4-step plain-language walkthrough of the
  commit-reveal algorithm. Verified live in-browser that pack selection
  and rip progression both work correctly.

Known gaps / not-yet-done (see PROJECT_STATUS.md for the authoritative,
up-to-date list):
- No Docker/Postgres available in this dev environment — DB-backed pages
  (marketplace, pack detail with real tiers, opening theater, collection)
  cannot be exercised live here; only /dev/rip-preview and the new
  landing-page demo work without a DB.
- No real Google OAuth credentials for end-to-end auth testing.
- No funded TestNet Pera wallet to click through connect → sign → submit
  → settle for real.
- Defly / Phantom (Solana, EVM) wallets are not yet integrated — only Pera
  is wired.
- The supplier-purchase worker process (consumes the `queued`
  SupplierPurchase rows) is not implemented — currently just enqueues.
- CardTrader and x402 facilitator are both in mock mode; live mode needs a
  verified integration pass against real credentials before flipping
  CARDTRADER_MODE=live / X402_FACILITATOR_MODE=live.
- The "volatility level" (Normal/High/Max) odds selector from the
  reference competitor app has been discussed but not built.

Before committing anything, run:
  npm run typecheck && npm run lint && npm run test && npm run build
and update PROJECT_STATUS.md (and docs/LEGAL_REVIEW_REQUIRED.md /
docs/FAIRNESS_PROTOCOL.md if relevant) per AGENTS.md's "Required after any
change" section. Work stays on beta/initial-packx402-build against main;
PR #1 is a draft — don't self-merge.

Ask me what to pick up next, or if I've already told you, start there.
```

## Notes for whoever pastes this

- This file (`HANDOFF.md`) is a point-in-time snapshot from the session
  that added the landing-page interactive demo. Treat PROJECT_STATUS.md,
  not this file, as authoritative for anything that may have changed
  since — this file itself is not a durable memory and can drift.
- Delete or update this file once its contents are stale rather than
  letting two conflicting status documents accumulate.
