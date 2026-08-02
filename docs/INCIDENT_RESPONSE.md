# Incident Response

## Severity levels

- **SEV1** — funds at risk, fairness integrity compromised, or full outage.
- **SEV2** — a single subsystem down (e.g. supplier purchasing) with a workaround.
- **SEV3** — degraded but functional (e.g. elevated latency).

## Immediate actions by incident type

### Suspected fairness compromise (a server seed leaked before payment, or selection

manipulated)

1. Immediately set `FEATURE_HIGH_VALUE_PACKS_ENABLED=false` and consider disabling new
   offer creation entirely (kill switch — not yet implemented as a single flag; today this
   means stopping the application or blocking `/api/x402/*` at the edge/load balancer).
2. Freeze the affected pool version (`poolVersions.archivedAt`) so no further offers use it.
3. Pull every `FairnessProof` row for the affected pool version and independently
   re-verify each one via `verifySelection()`.
4. Do not reroll or retroactively change any already-revealed result — the commitment
   model means a past reveal is either valid or it isn't; if it isn't, that is a
   fulfillment/refund matter for the affected users, not a "redo."

### Duplicate or ambiguous payment

`payments.txHashOrPaymentId` is DB-unique, so a true duplicate insert cannot happen. An
"ambiguous" payment (e.g. correct amount but from an unexpected address, or a
partial/overpayment) surfaces as a `payment_invalid`/`payment_ambiguous` state from
`settleOfferAndOpen()`. Manually review via the transaction hash on-chain before taking
any refund action.

### Supplier account compromise or unexpected cart contents

Both the mock and live CardTrader providers **abort `addToCart()` if the account cart is
already non-empty** rather than assuming it's empty — this is the primary automated
defense. If it fires unexpectedly in production, treat it as a signal of either a bug in
the (not-yet-built) serialization worker or genuine account compromise; do not manually
clear the cart without confirming which.

### Database compromise

Session tokens, recovery codes, and the fairness server seed are stored only as hashes/
ciphertext — a raw DB dump does not yield usable session tokens or pre-reveal fairness
secrets. Shipping addresses are AES-256-GCM encrypted. Rotate `SESSION_SECRET` and
`FIELD_ENCRYPTION_KEY` immediately (this invalidates all existing sessions and makes
existing encrypted fields unreadable — only do this as part of a real compromise
response, with a plan for re-encrypting live data under the new key first if data must be
preserved).

## Postmortem

Every SEV1/SEV2 incident gets a written postmortem: timeline, root cause, what
`audit_events`/`security_events` rows show, what was fixed, and what monitoring/test gap
allowed it. File it under `docs/incidents/` (directory not yet created — create on first
real incident).

## Contacts

See the repository's Security tab / `SECURITY.md` for the reporting channel. This beta has
no formal on-call rotation defined yet.
