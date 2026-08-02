# Privacy Data Map

## Personal data collected and where it lives

| Data                                                            | Table                                                                     | Protection                                                                                                 |
| --------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Email                                                           | `users.email`                                                             | Plaintext (needed for login/lookup); unique index                                                          |
| Date of birth                                                   | `eligibility_records.dateOfBirth`                                         | Application-layer encryption intended (see note below)                                                     |
| Shipping address (name, lines, city, state, postal code, phone) | `shipping_addresses.*Encrypted`                                           | AES-256-GCM field encryption (`src/server/crypto/field-encryption.ts`)                                     |
| Wallet addresses                                                | `wallet_identities.address`                                               | Plaintext (public by nature of blockchain addresses); `isPublic` flag defaults `false` for profile display |
| IP address                                                      | `sessions.ipHash`, `security_events.ipHash`, `eligibility_records.ipHash` | Only a hash is ever stored, never a raw IP                                                                 |
| Session tokens                                                  | `sessions.tokenHash`                                                      | Only a sha256 hash is stored; raw token never persisted                                                    |
| Fairness server seed (pre-reveal)                               | `pack_offers.serverSeedEncrypted`                                         | AES-256-GCM field encryption                                                                               |

**Note**: `eligibility_records.dateOfBirth` is currently stored as plaintext ISO-date text
in the schema with a comment marking it for field-level encryption — this is a follow-up
item, not yet wired to `encryptField()`/`decryptField()`. Track in PROJECT_STATUS.md.

## What is never stored

- Wallet private keys or seed phrases — no column, anywhere, for any purpose.
- Supplier payment-card data — PackX402 never touches CardTrader's own payment
  instruments; only shipping-address data is sent to the supplier at purchase time.
- Plaintext session tokens, plaintext recovery codes (only `codeHash`), plaintext
  passwords where used (`users.passwordHash` — hashing algorithm to be finalized before
  password auth ships; email flows in this repo are currently magic-link/verification
  based, not password-based).

## What is never exposed in public/social API responses

Shipping addresses, exact wallet addresses (only an optional `isPublic` badge, never the
raw address, is intended for profile display), supplier order numbers, private payment
metadata, and a user's total spend or loss/profit estimate — none of these fields exist on
any of the social-facing tables (`pull_posts`, `showcases`, `social_posts`) by
construction; there is no column to leak.

## Data subject rights

Schema supports account deletion (`users.deletionRequestedAt`) and the security center
requirement to "download account data" (spec section 32) — no export/delete job is
implemented yet (see PROJECT_STATUS.md).

## Third parties data is shared with

- **CardTrader** (supplier): shipping address, at purchase time only, in live mode only.
- **Algorand/Solana/EVM networks**: payment transaction data is inherently public
  on-chain; PackX402 does not control this.
- **GoPlausible facilitator** (when live mode is enabled): payment verification data per
  the x402 protocol.

No analytics, advertising, or cross-site tracking integration exists in this codebase.
