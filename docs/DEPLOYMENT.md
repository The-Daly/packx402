# Deployment

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in real values
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

## Environments

| Env        | `APP_ENV`     | Notes                                                                   |
| ---------- | ------------- | ----------------------------------------------------------------------- |
| Local      | `development` | Docker Compose Postgres/Redis, mock facilitator, mock supplier          |
| Staging    | `staging`     | Real Postgres/Redis, TestNet only, mock or sandbox facilitator/supplier |
| Production | `production`  | Real Postgres/Redis, `ALGORAND_MAINNET_ENABLED` only after full review  |

## Required before any production deploy

1. Provision Postgres (with connection pooling — e.g. PgBouncer or a managed pooled
   connection string) and Redis.
2. Set every secret in `.env.example` to a real, environment-specific value —
   `SESSION_SECRET` and `FIELD_ENCRYPTION_KEY` must be freshly generated per environment
   (`openssl rand -base64 32` / `openssl rand -hex 32`), never reused from `.env.local`.
3. Run `npm run db:migrate` against the target database as part of the deploy pipeline,
   before starting new application instances.
4. Confirm `FEATURE_HIGH_VALUE_PACKS_ENABLED=false` unless legal/financial/security review
   is complete (see `docs/LEGAL_REVIEW_REQUIRED.md`).
5. Confirm `ALGORAND_NETWORK=testnet` unless MainNet has been explicitly approved; if
   MainNet is enabled, `ALGORAND_MAINNET_ENABLED=true` must also be set — the app refuses
   to boot otherwise (`src/server/env.ts`).
6. Confirm `X402_FACILITATOR_MODE=mock` and `CARDTRADER_MODE=mock` unless the
   corresponding live integration has been verified against real credentials (see
   PROJECT_STATUS.md — neither has been, as of this build).
7. Point `S3_*` env vars at a real object store for uploads before enabling any upload
   feature (none exist yet in this codebase).

## Build

```bash
npm run build
npm run start
```

`npm run build` has been verified to succeed in this repository's build environment
(Next.js 16 + Turbopack, strict TypeScript, 11 routes). It has **not** been deployed to
any hosting platform in this session.

## Database migrations in CI/CD

`.github/workflows/ci.yml` validates that `drizzle-kit generate` produces no pending
schema changes (i.e. the checked-in migration matches the checked-in schema) — it does not
apply migrations to a live database as part of CI, since CI has no persistent database in
this repo's current workflow. Add a migration-apply step against a CI Postgres service
container as a follow-up if desired.

## Rollback

Standard blue/green or rolling deploy rollback applies at the application layer. Database
migrations in this repo are additive-only so far (new tables/columns); no destructive
migration has been generated. Before ever writing a destructive migration, add a reviewed
rollback migration alongside it.
