# Loyalty Levels & Weekly Free Packs

## Loyalty levels

Implementation: `src/server/loyalty/calculate.ts` (7 passing tests) +
`loyalty_levels`/`loyalty_calculations` tables.

| Level    | Rolling 30-day eligible spend | Weekly reward pack |
| -------- | ----------------------------- | ------------------ |
| Member   | $0 – $24.99                   | Spark              |
| Copper   | $25 – $99.99                  | Starter            |
| Silver   | $100 – $249.99                | Scout              |
| Gold     | $250 – $499.99                | Bronze             |
| Obsidian | $500+                         | Silver             |

**Maximum reward level during beta is Silver** — `determineCappedRewardLevel()` computes
the true spend-based level but always caps the _granted reward_ at Silver, tested
explicitly for Gold- and Obsidian-tier spend. `MAX_BETA_REWARD_LEVEL` is the single
constant controlling this cap.

`computeEligibleSpend()` subtracts refunds, affiliate-attributed spend, and self-referral
spend from fulfilled-order totals — never based on losses, never personalized to "recover"
a loss (no such code path exists).

**Not yet implemented**: the scheduled job that actually recomputes a user's level from
real order history and writes a `loyalty_calculations` audit row; a global kill switch
flag exists in the schema (`feature_flags` / `FEATURE_LOYALTY_KILL_SWITCH` env var) but no
code currently reads it in a loyalty code path (there is no loyalty code path yet beyond
the pure calculation).

## Weekly free packs

Implementation: `src/server/free-packs/week-key.ts` (ISO week key, 5 passing tests,
verified against a reference algorithm) + `free_pack_grants`/`free_pack_claims` tables.

- `free_pack_grants` is unique on `(userId, weekKey, reason)` — the database itself
  prevents a second grant for the same user/week/reason, not just application logic.
- `FreePackGrant` and `FreePackClaim` are separate tables/records per spec: a grant
  existing does not imply a claim. Claiming is a distinct, explicit user action.
- Free-pack pools are separately published promotional pool versions
  (`pool_versions.isPromotional = true`), never mixed with a tier's paid pool.

**Not yet implemented**: the API route/UI for claiming a free pack, the job that issues
weekly grants to eligible verified users, and the enforcement that self-excluded/paused
accounts cannot claim (the underlying self-exclusion check exists and is tested — it just
isn't called from a free-pack code path yet, because that code path doesn't exist yet).
