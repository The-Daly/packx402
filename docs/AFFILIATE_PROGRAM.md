# Affiliate Program

**Status: data model only.** `affiliate_applications`, `affiliate_accounts`,
`affiliate_campaigns`, `affiliate_commissions`, `affiliate_payouts` tables exist in the
schema (`src/server/db/schema/affiliate.ts`) with all the fields the spec requires
(attribution window, monthly caps, pending-through-fulfillment-window commissions, manual
payout approval). No application code, API routes, or UI exist yet.

## Design constraints already encoded in the schema

- `affiliateCommissions.pendingUntil` — commissions hold through the fulfillment and
  refund window before becoming payable.
- `affiliateCommissions.commissionUsdcBaseUnits` is a flat value computed from PackX402's
  margin, structurally separate from `packOffers`/`payments` — there is no schema
  relationship that could let a commission alter a customer's odds or awarded card.
  Affiliate commissions must never depend on customer losses (spec section 23) and, since
  PackX402 has no loss/win framing at all (spec section 30), there is no "loss" value for a
  commission to depend on even hypothetically.
- `affiliateAccounts.monthlyCommissionCapUsdcBaseUnits` and
  `affiliateCampaigns.monthlyCapUsdcBaseUnits` — caps at both account and campaign level.
- `affiliatePayouts.approvedByAdminId` is `NOT NULL` — a payout row cannot exist without a
  named manual approver.
- `affiliateAccounts.disclosureText` — every account carries required disclosure copy.

## Not yet implemented

Application form + review flow, self-referral/duplicate-wallet/velocity fraud detection,
conversion attribution logic, the affiliate dashboard, creative asset library, and
disclosure-label rendering on shared pull posts. See PROJECT_STATUS.md.
