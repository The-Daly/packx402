# Responsible Purchasing

Implementation: `src/server/responsible-purchasing/limits.ts` (pure decision logic, 15
passing tests) + `purchase_limits` / `self_exclusions` tables, enforced in
`createPackOffer()` before any offer is created.

## Rules implemented and tested

- Self-exclusion (indefinite or time-boxed) blocks all purchases; checked first, before
  any limit math.
- Account pause blocks purchases for a configured window.
- Cool-off period blocks purchases for a configured window, independent of a full pause.
- Daily / weekly / monthly spend limits: a purchase is denied if it would push rolling
  spend over any configured limit; `null` means unbounded.
- **Limit decreases apply immediately; limit increases apply only after a cooling
  period** (`scheduleLimitChange()`), tested for both directions and for "removing a limit
  entirely" being treated as an increase.

## Not yet implemented

- Rolling spend aggregation from real fulfilled orders (`offer-service.ts` currently
  passes zeros — see PROJECT_STATUS.md). The limit _check_ is fully correct; only the
  _input_ (actual spend-to-date) is not yet wired to live data.
- The settings UI for users to view/change their own limits.
- Cross-wallet self-exclusion enforcement (the schema supports it — `self_exclusions` is
  keyed by user, and all wallets belong to a user — but no code path currently checks it
  from a wallet-first purchase flow).
- Admin override with documented reason field (schema: `audit_events` supports it; no UI).

## Policy alignment with spec section 33

- Self-excluded users cannot claim randomized promotional packs — same check
  (`evaluatePurchaseAgainstLimits`) is intended to gate the free-pack claim path once that
  flow is built; not yet wired (see `docs/LOYALTY_AND_FREE_PACKS.md`).
- No "spend $X more today" countdown or targeted upsell messaging exists anywhere in this
  codebase — by omission, not by a suppressed feature.
