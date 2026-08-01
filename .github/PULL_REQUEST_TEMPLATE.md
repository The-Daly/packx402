## Summary

<!-- What changed and why, in 2-4 bullets. -->

## Website areas / spec sections touched

<!-- List relevant sections from the product spec, e.g. "Section 41 (x402 payments)". -->

## Test evidence

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes (paste the summary line)
- [ ] `npm run build` passes
- [ ] If schema changed: `npm run db:generate` was run and the migration is committed
- [ ] Manually verified against a local database (`docker compose up -d && npm run
db:migrate && npm run dev`), if the change touches a DB-backed route or page

## Security checklist

- [ ] No secrets committed
- [ ] No new client-trusted value used for price/eligibility/limits without server
      re-derivation
- [ ] No new unencrypted sensitive field
- [ ] `PROJECT_STATUS.md` updated if this moves something from unverified/not-started to
      implemented-and-tested, or introduces a new gap

## Known limitations / follow-ups

<!-- What's still missing, stubbed, or unverified as a result of this change. -->

## Screenshots (if UI)
