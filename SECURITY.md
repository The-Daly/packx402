# Security Policy

## Reporting a vulnerability

Please report suspected security vulnerabilities privately — **do not open a public GitHub
issue**. Email the security contact listed on the repository (see GitHub repo "About"
section) or use GitHub's private vulnerability reporting (Security tab → "Report a
vulnerability"). Include reproduction steps, affected endpoint/component, and impact.

We aim to acknowledge reports within 3 business days. This is a beta project without a
formal bug-bounty program at this time.

## Scope

In scope: the application in this repository (`src/`), its API routes, its database
schema, and its supplier/payment adapters. Out of scope: third-party services it
integrates with (Algorand network, CardTrader, GoPlausible, Phantom, wallet apps) — report
those to their respective maintainers.

## What PackX402 staff will never do

PackX402 staff will **never** ask for your wallet seed phrase, private key, or password via
email, chat, or support ticket. Any such request is a phishing attempt.

## Security posture summary

See [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) for the full threat model. Highlights:

- No custodial wallets or private-key/seed storage anywhere in the system.
- All monetary values are integer USDC base units — no floating-point money math.
- Card selection is a committed-then-revealed sha256 process; `Math.random` is never used
  for a paid or promotional physical-card result.
- Sensitive fields (shipping addresses, the fairness server seed pre-reveal) are encrypted
  at rest with AES-256-GCM (`src/server/crypto/field-encryption.ts`).
- Session tokens are opaque and stored only as a sha256 hash — a DB leak does not yield
  usable session tokens.
- Wallet login uses a SIWE-style signed message with domain/URI/nonce/chain/purpose/
  issued/expiration, verified with real per-chain cryptography (algosdk / tweetnacl /
  viem), not a bearer-token handoff.
- CSP, HSTS, and other secure headers are set globally in `src/proxy.ts`.
- Payment settlement is idempotent on the on-chain payment identifier; supplier purchases
  are idempotent on a database-unique idempotency key.
- High-value pack tiers are gated **server-side** by a feature flag, never trusting a
  client-supplied value.

## Dependency and secret hygiene

- Renovate/Dependabot configuration lives in `.github/`.
- `.gitignore` excludes `.env*` (except `.env.example`), key/credential file patterns,
  database exports, and logs. Run a secret scan before every push (see
  `.github/workflows/ci.yml`).
- `src/server/env.ts` validates all required environment variables with Zod at process
  start and refuses to boot with an invalid or missing configuration.
