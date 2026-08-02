# Changelog

All notable changes to this project are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/).

## [Unreleased] — 2026-08-01

### Added

- Initial project scaffold: Next.js 16 (App Router, Turbopack), strict TypeScript,
  Tailwind CSS 4, Drizzle ORM + PostgreSQL, Docker Compose (Postgres + Redis).
- Full 59-table data model covering every entity in the product spec.
- Configuration-driven pack tier catalog (Spark–Genesis) with server-side network/value
  gating.
- Deterministic provably-fair selection engine with a published, hand-verified test
  vector.
- x402 Algorand/Solana/EVM payment adapters (mock-mode default; live-mode direct
  chain-verification paths implemented but unverified against real credentials).
- CardTrader supplier adapter (mock-mode default; live-mode implemented but unverified).
- Auth primitives: opaque hashed sessions, SIWE-style wallet-signature messages, and real
  per-chain signature verification (Algorand/Solana/EVM), each tested against a real
  generated keypair.
- Server-side age-gate/eligibility policy and responsible-purchasing limit evaluation.
- Loyalty-level calculation with a beta reward cap.
- Landing page, pack marketplace, pack detail, provably-fair verifier, and odds-library
  pages.
- Global security headers (CSP/HSTS/etc.) + CSRF double-submit cookie + Redis rate-limit
  helper.
- 77 passing Vitest unit/integration tests; clean `npm run build`.
- Full documentation set (`docs/`), GitHub Actions CI, issue/PR templates.

### Known gaps

See [PROJECT_STATUS.md](PROJECT_STATUS.md) — most UI, auth API routes, the
supplier-purchase worker, admin dashboard, and social/affiliate/referral logic are not
yet built.
