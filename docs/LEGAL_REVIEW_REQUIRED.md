# Legal Review Required

This document lists items that require legal, compliance, or licensing review before
production launch or before enabling a currently-gated feature. Nothing in this list has
been reviewed by counsel as part of this build session — this is an engineering-generated
checklist, not a legal opinion.

## Before enabling high-value packs (Crown and above, > $250)

Locked during beta primarily because the current supplier-purchase bankroll doesn't cover
funding fulfillment above this price point — the items below are what's additionally
required before lifting the lock once that changes.

- Consumer-protection review of randomized physical-goods sales in every jurisdiction
  PackX402 operates in (loot-box-style regulation varies significantly by country and, in
  the US, by state).
- Confirm `BLOCKED_US_STATES` (`src/server/eligibility/policy.ts`, currently empty) is
  populated per counsel's guidance before launch, not left empty.
- Financial review of supplier-account funding at higher price points.
- Security review of the (not-yet-built) supplier-purchase worker at higher transaction
  values.
- Responsible-purchasing review of default limits at higher price points.

## Before enabling Algorand MainNet

- Confirm money-transmission / payment-processor licensing posture in each operating
  jurisdiction for real-value USDC settlement.
- Confirm merchant wallet custody and key-management procedures (outside this
  repository's scope — PackX402's own merchant keys, not customer keys, still require
  operational security review).

## IP / licensing

- **No Pokémon or Yu-Gi-Oh artwork, logos, or trademarks are used anywhere in this
  codebase.** Card _names_ used in seed fixtures (`src/server/suppliers/cardtrader/
fixtures.ts`) are factual identifiers of real, third-party-owned cards being resold by a
  supplier — this is the same descriptive-use pattern any card marketplace uses, not
  original artwork. Get trademark/fair-use counsel sign-off before any public marketing
  use of card names, and ensure all pack artwork is generated per
  `docs/HIGGSFIELD_PROMPTS.md` (no existing character likenesses).
- Confirm CardTrader's terms of service actually permit the direct-seller-fulfillment
  integration pattern implemented in `docs/SUPPLIER_INTEGRATION.md` before enabling live
  mode.
- Confirm the TCGplayer affiliate-link fallback (not yet implemented) complies with
  TCGplayer's affiliate program terms before building it.

## Responsible purchasing / gambling-adjacent regulation

- Have counsel confirm PackX402's specific mechanic (fixed-price purchase, published odds,
  guaranteed physical delivery of _something_ every time — no "nothing" outcome) falls
  outside gambling regulation in target jurisdictions, and confirm required disclosures.
- Confirm age-gate and self-exclusion mechanisms (`src/server/eligibility/policy.ts`,
  `self_exclusions` table) meet the jurisdiction-specific bar, not just the beta's
  18+/blocked-country baseline.
- **Bonus-flip mechanic** (`deriveBonusFlipHit`/`selectBonusPoolEntry` in
  `src/server/fairness/engine.ts`): a fixed 4% chance, evaluated on every completed pack
  opening, of awarding a second real card from the same pool alongside the one paid for.
  This changes the effective expected value/odds of every pack tier. The 4% figure is now
  disclosed on the pack-detail page (a "Bonus flip: 4% chance of a second card" line) and
  in `docs/FAIRNESS_PROTOCOL.md`'s addendum, both pre-purchase — but counsel should still
  confirm this doesn't change PackX402's gambling-regulation analysis (an "extra" reward on
  a fixed-price purchase, even disclosed, may read differently under some jurisdictions'
  rules than the base mechanic alone), and that the disclosure wording/placement meets
  whatever pre-purchase disclosure standard applies.

## Data protection

- GDPR/CCPA (or applicable regional) compliance review of `docs/PRIVACY_DATA_MAP.md`,
  especially the not-yet-encrypted `eligibility_records.dateOfBirth` field flagged there.
- Confirm data-retention periods for `security_events`, `audit_events`, and shipping
  address history.

## Affiliate program

- Confirm disclosure requirements (FTC endorsement guides or regional equivalent) are met
  by `affiliateAccounts.disclosureText` before the affiliate program (not yet built)
  launches.
