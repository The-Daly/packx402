# Threat Model

Assumption: every client, supplier response, facilitator response, upload, webhook,
social post, and affiliate request is hostile.

## Assets

- User funds in transit (payment settlement correctness)
- Fairness integrity (a user or PackX402 insider rerolling/predicting an outcome)
- Shipping addresses and other PII
- Session tokens / account takeover
- Supplier-account funds (CardTrader spending)
- Platform integrity (referral/affiliate/loyalty abuse, self-exclusion bypass)

## Threats and mitigations

| Threat                                                 | Mitigation                                                                                                                                                                                                   |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Client reroll after seeing an unfavorable commitment   | Server seed is committed (hashed) before payment; revealed only after settlement; selection also depends on post-settlement chain randomness no party controls in advance.                                   |
| Replayed/duplicate payment credited twice              | `payments.tx_hash_or_payment_id` is DB-unique; `settleOfferAndOpen` checks for an existing payment before creating a new one.                                                                                |
| Duplicate supplier purchase (double order)             | `supplier_purchases.idempotency_key` is DB-unique; `SupplierAdapter.purchaseListing` in the mock/live providers replays the existing order for a repeated key instead of creating a new one.                 |
| Client-supplied tier price/availability trusted        | `isTierPurchasableOn()` and `createPackOffer()` re-derive price and eligibility from server/DB state on every request; a client can only supply a tier _key_.                                                |
| High-value pack purchased before legal review          | `requiresHighValueReleaseGate` + `FEATURE_HIGH_VALUE_PACKS_ENABLED` server flag; a locked/gated tier is rejected in `createPackOffer` regardless of client input.                                            |
| Self-excluded user purchases anyway                    | `evaluatePurchaseAgainstLimits()` checks self-exclusion before any limit math; enforced in `createPackOffer`.                                                                                                |
| Session token theft via DB leak                        | Only a sha256 hash of the token is stored; the raw token is never persisted.                                                                                                                                 |
| Wallet-signature replay                                | Nonces are single-use (`auth_nonces.consumed_at`), short-lived, and bound to domain/URI/chain/purpose in the signed message.                                                                                 |
| CSRF on state-changing requests                        | Double-submit cookie pattern (`src/proxy.ts` + `src/server/security/csrf.ts`).                                                                                                                               |
| XSS via stored content (comments, captions, usernames) | React's default escaping; CSP restricts script execution to same-origin + nonce; no `dangerouslySetInnerHTML` is used anywhere in this codebase.                                                             |
| SSRF via a supplier/webhook URL                        | Supplier base URLs are fixed server env config, never taken from request input.                                                                                                                              |
| Shipping address exposure                              | Encrypted at rest (AES-256-GCM); never included in any public/social API response — see `docs/PRIVACY_DATA_MAP.md`.                                                                                          |
| Malicious upload (profile image)                       | Not yet implemented — flagged in PROJECT_STATUS.md; must add MIME-signature verification + metadata stripping before shipping upload support.                                                                |
| Admin privilege escalation                             | `admin_users` is a separate table from `users` with no user-facing write path; sensitive admin actions are designed to require reauthentication (`ADMIN_REAUTH_TTL_SECONDS`) — enforcement UI not yet built. |
| Rate-limit bypass / brute force                        | `checkRateLimit()` (Redis fixed-window) — needs to be wired into auth and payment routes; currently implemented but not yet applied to every mutating route (see PROJECT_STATUS.md).                         |

## Explicitly out of scope for this beta (by design, see main spec)

Custodial wallets, cash withdrawals, P2P trading, user-to-user transfers — these attack
surfaces don't exist because the features don't exist.

## Residual risk / follow-up

See [docs/RISKS.md](RISKS.md) for the prioritized risk register, and
[PROJECT_STATUS.md](../PROJECT_STATUS.md) for what's unverified against live
infrastructure.
