# PackX402

A provably fair, supplier-backed trading-card pack platform powered by Algorand x402.

> **Beta status.** See [PROJECT_STATUS.md](PROJECT_STATUS.md) for exactly what is
> implemented, tested, or still scaffolding. Do not deploy to production without reading
> it and [docs/LEGAL_REVIEW_REQUIRED.md](docs/LEGAL_REVIEW_REQUIRED.md).

PackX402 lets users purchase digital pack-opening experiences and receive authentic
physical trading cards, supplied and shipped by approved third-party card marketplaces.
PackX402 never warehouses cards during beta — every card ships directly from the supplier
to the customer. Every opening is deterministically, publicly verifiable.

## Quick start

```bash
npm install
docker compose up -d          # Postgres + Redis
npm run db:migrate
npm run db:seed               # seeds pack tiers + a mock CardTrader catalog + sample pools
npm run dev
```

Copy `.env.example` to `.env.local` and fill in real values before running anything beyond
local dev — the checked-in defaults are safe local-only placeholders (mock payment
facilitator, mock supplier, TestNet only).

## Commands

| Command               | Purpose                                                |
| --------------------- | ------------------------------------------------------ |
| `npm run dev`         | Start the Next.js dev server                           |
| `npm run build`       | Production build                                       |
| `npm run lint`        | ESLint                                                 |
| `npm run typecheck`   | `tsc --noEmit`                                         |
| `npm run test`        | Vitest unit/integration tests                          |
| `npm run test:e2e`    | Playwright end-to-end tests                            |
| `npm run db:generate` | Generate a Drizzle migration from schema changes       |
| `npm run db:migrate`  | Apply migrations                                       |
| `npm run db:seed`     | Seed pack tiers, mock supplier inventory, sample pools |
| `npm run db:studio`   | Drizzle Studio DB browser                              |

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · strict TypeScript · Tailwind CSS 4 ·
Drizzle ORM · PostgreSQL · Redis (rate limiting) · Zod · Vitest · Playwright · Docker
Compose · algosdk / `@txnlab/use-wallet` (Algorand) · `@solana/web3.js` / `@phantom/react-sdk`
(Solana + EVM) · viem · `@x402/core` + `@x402/avm` + `x402`/`x402-next`.

## Documentation

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — system design and module layout
- [SECURITY.md](SECURITY.md) — security posture, reporting a vulnerability
- [THREAT_MODEL.md](docs/THREAT_MODEL.md)
- [FAIRNESS_PROTOCOL.md](docs/FAIRNESS_PROTOCOL.md) — the provably-fair algorithm + test vectors
- [SUPPLIER_INTEGRATION.md](docs/SUPPLIER_INTEGRATION.md) — CardTrader adapter, mock vs. live
- [RESPONSIBLE_PURCHASING.md](docs/RESPONSIBLE_PURCHASING.md)
- [LOYALTY_AND_FREE_PACKS.md](docs/LOYALTY_AND_FREE_PACKS.md)
- [AFFILIATE_PROGRAM.md](docs/AFFILIATE_PROGRAM.md)
- [SOCIAL_MODERATION.md](docs/SOCIAL_MODERATION.md)
- [PRIVACY_DATA_MAP.md](docs/PRIVACY_DATA_MAP.md)
- [DEPLOYMENT.md](docs/DEPLOYMENT.md)
- [LEGAL_REVIEW_REQUIRED.md](docs/LEGAL_REVIEW_REQUIRED.md)
- [ROADMAP.md](docs/ROADMAP.md) · [DECISIONS.md](docs/DECISIONS.md) · [RISKS.md](docs/RISKS.md)
- [COMPETITION_CHECKLIST.md](docs/COMPETITION_CHECKLIST.md)
- [INCIDENT_RESPONSE.md](docs/INCIDENT_RESPONSE.md)
- [CLAUDE.md](CLAUDE.md) / [AGENTS.md](AGENTS.md) — how an AI coding session should start here

## Beta restrictions (non-negotiable — see PROJECT_STATUS.md for enforcement)

No custodial wallets, no seed/private-key storage, no cash withdrawals, no internal
withdrawable currency, no P2P card marketplace, no user-to-user crypto transfers, no
spending/loss leaderboards, no "almost won" or loss-recovery messaging, no autoplay or
one-click repeat purchases, no direct messaging in this beta. High-value packs
(> $100) are disabled server-side pending legal/financial/security review.

## License

See [LICENSE](LICENSE).
