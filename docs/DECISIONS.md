# Decisions

Architecture-decision log, newest first.

## 2026-08-01 — Live x402/CardTrader verification via direct chain/API calls, not through a facilitator SDK call graph we can't test

**Context**: no GoPlausible facilitator credentials or CardTrader API token were available
in the build environment.

**Decision**: implement live-mode payment verification via direct RPC calls to each
chain (algod for Algorand, web3.js for Solana, viem for EVM) rather than guessing at the
GoPlausible facilitator's exact HTTP contract. Implement the CardTrader live provider
against its documented v2 REST shape, clearly flagged as unverified.

**Consequence**: the `ChainPaymentAdapter` and `SupplierAdapter` interfaces are the real
integration seam — swapping in a verified facilitator call or corrected CardTrader
request shape is a change scoped to `algorand-adapter.ts`/`solana-adapter.ts`/
`evm-adapter.ts` and `live-provider.ts` respectively, not a schema or orchestration change.
Someone with real credentials must run an integration pass before `X402_FACILITATOR_MODE=live`
or `CARDTRADER_MODE=live` is ever used.

## 2026-08-01 — `server-only` package import boundary

**Context**: the `server-only` npm package only no-ops under Next.js's RSC
`"react-server"` module-resolution condition; under any other runner (Vitest, drizzle-kit,
`tsx`) it unconditionally throws.

**Decision**: split environment loading into `src/server/env.core.ts` (unguarded, used by
CLI scripts: `drizzle.config.ts`, `migrate.ts`, `seed.ts`) and `src/server/env.ts`
(`server-only`-guarded, re-exports from `env.core.ts`, used by actual app runtime code).
For Vitest specifically, `server-only` is aliased to a no-op shim
(`vitest/shims/server-only.ts`) so app code that legitimately imports the guarded
`env.ts` can still be unit-tested directly, rather than forking a second unguarded copy of
every module that needs testing.

## 2026-08-01 — Vitest default environment is `node`, not `jsdom`

**Context**: jsdom replaces global typed-array constructors (`Uint8Array` etc.) in its
realm; `algosdk` and `tweetnacl` do `instanceof`-style checks against the _global_
`Uint8Array`, which silently fail or throw when a Node `Buffer` (built against Node's
realm) crosses into jsdom's realm. This was caught by a real failing test, not discovered
by inspection — see the wallet-signature test suite.

**Decision**: default `vitest.config.ts` to `environment: "node"`; future component tests
opt into jsdom per-file via a `// @vitest-environment jsdom` docblock.

## 2026-08-01 — Money as integer USDC base units everywhere

Per spec section 3. All price/limit/commission columns are `bigint` (mode `"number"`,
values fit safely under `Number.MAX_SAFE_INTEGER` even at the $10,000 Genesis tier in
6-decimal base units). `src/shared/money.ts` centralizes display formatting so no call
site does its own division/rounding.

## 2026-08-01 — Opaque, hashed session tokens over JWTs

**Context**: spec requires device/session listing and a "revoke all sessions" control.

**Decision**: DB-backed opaque session tokens (sha256-hashed at rest), not stateless JWTs
— revocation is a single `UPDATE`, and a DB leak yields no usable tokens. Trade-off:
every request needs a DB round-trip to validate a session (acceptable for this
application's traffic profile; would need a cache layer at much higher scale).
