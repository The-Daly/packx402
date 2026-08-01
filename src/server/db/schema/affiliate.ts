import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { affiliateApplicationStatusEnum, affiliateCommissionStatusEnum } from "./enums";
import { users } from "./users";

export const affiliateApplications = pgTable("affiliate_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  status: affiliateApplicationStatusEnum("status").notNull().default("pending"),
  platformDescription: text("platform_description").notNull(),
  audienceDescription: text("audience_description").notNull(),
  taxInfoStatus: text("tax_info_status").notNull().default("not_submitted"), // not_submitted | submitted | verified
  reviewedByAdminId: uuid("reviewed_by_admin_id"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
});

export const affiliateAccounts = pgTable("affiliate_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id)
    .unique(),
  applicationId: uuid("application_id")
    .notNull()
    .references(() => affiliateApplications.id),
  isPublicProfileEnabled: boolean("is_public_profile_enabled").notNull().default(false),
  disclosureText: text("disclosure_text").notNull().default("Paid partner of PackX402."),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  suspendedReason: text("suspended_reason"),
  monthlyCommissionCapUsdcBaseUnits: bigint("monthly_commission_cap_usdc_base_units", {
    mode: "number",
  }).notNull(),
  attributionWindowDays: integer("attribution_window_days").notNull().default(30),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const affiliateCampaigns = pgTable(
  "affiliate_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    affiliateAccountId: uuid("affiliate_account_id")
      .notNull()
      .references(() => affiliateAccounts.id),
    code: text("code").notNull().unique(),
    label: text("label").notNull(),
    monthlyCapUsdcBaseUnits: bigint("monthly_cap_usdc_base_units", { mode: "number" }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("affiliate_campaigns_affiliate_account_id_idx").on(t.affiliateAccountId)],
);

export const affiliateCommissions = pgTable(
  "affiliate_commissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    affiliateAccountId: uuid("affiliate_account_id")
      .notNull()
      .references(() => affiliateAccounts.id),
    affiliateCampaignId: uuid("affiliate_campaign_id").references(() => affiliateCampaigns.id),
    orderId: uuid("order_id").notNull(), // pack_offers.id of the converted order
    status: affiliateCommissionStatusEnum("status").notNull().default("pending"),
    commissionUsdcBaseUnits: bigint("commission_usdc_base_units", { mode: "number" }).notNull(), // paid from PackX402 margin only
    pendingUntil: timestamp("pending_until", { withTimezone: true }).notNull(), // holds through fulfillment + refund window
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    reversedAt: timestamp("reversed_at", { withTimezone: true }),
    reversedReason: text("reversed_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("affiliate_commissions_affiliate_account_id_idx").on(t.affiliateAccountId),
    index("affiliate_commissions_status_idx").on(t.status),
  ],
);

export const affiliatePayouts = pgTable(
  "affiliate_payouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    affiliateAccountId: uuid("affiliate_account_id")
      .notNull()
      .references(() => affiliateAccounts.id),
    totalUsdcBaseUnits: bigint("total_usdc_base_units", { mode: "number" }).notNull(),
    approvedByAdminId: uuid("approved_by_admin_id").notNull(), // manual approval required, section 23
    payoutReference: text("payout_reference"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("affiliate_payouts_affiliate_account_id_idx").on(t.affiliateAccountId)],
);
