# Contributing

## Getting started

See the [README](README.md) quick-start. Read [PROJECT_STATUS.md](PROJECT_STATUS.md)
before starting work — it's the authoritative list of what exists.

## Workflow

1. Branch from `main`.
2. Make focused commits.
3. Before opening a PR, run:
   ```bash
   npm run typecheck
   npm run lint
   npm run test
   npm run build
   ```
4. If you changed `src/server/db/schema/`, run `npm run db:generate` and commit the
   resulting migration.
5. Open a PR against `main`. Fill out the PR template completely, including test
   evidence.
6. Update `PROJECT_STATUS.md` if your change moves something from unverified/not-started
   to implemented-and-tested, or if it introduces a new gap.

## Code style

- Strict TypeScript; no `any` without a comment explaining why it's unavoidable.
- Prefer pure functions for anything safety-critical (fairness, purchase limits,
  eligibility) so it can be unit-tested without a database.
- Integer USDC base units for all money — never floating point.
- No comments explaining _what_ code does (names should do that); comments are for _why_
  — a non-obvious constraint, a workaround, or a trade-off.

## Security

Do not open a public issue for a security vulnerability — see [SECURITY.md](SECURITY.md).

## Commit messages

Short, present-tense, why-focused. No AI attribution requirements beyond what your tooling
adds automatically.
