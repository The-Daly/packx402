import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { loyaltyLevelKeyEnum } from "./enums";
import { packTiers } from "./packs";
import { users } from "./users";

// Configurable without code changes — thresholds and reward tiers live here, not in source.
export const loyaltyLevels = pgTable("loyalty_levels", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: loyaltyLevelKeyEnum("key").notNull().unique(),
  name: text("name").notNull(),
  minSpendUsdcBaseUnits: bigint("min_spend_usdc_base_units", { mode: "number" }).notNull(),
  maxSpendUsdcBaseUnits: bigint("max_spend_usdc_base_units", { mode: "number" }), // null = no upper bound
  weeklyRewardPackTierId: uuid("weekly_reward_pack_tier_id").references(() => packTiers.id),
  sortOrder: integer("sort_order").notNull(),
  isMaxBetaLevel: boolean("is_max_beta_level").notNull().default(false), // Silver is the beta ceiling
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Append-only audit trail: one row per rolling-window recalculation for a user.
export const loyaltyCalculations = pgTable(
  "loyalty_calculations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    windowEnd: timestamp("window_end", { withTimezone: true }).notNull(),
    eligibleFulfilledSpendUsdcBaseUnits: bigint("eligible_fulfilled_spend_usdc_base_units", {
      mode: "number",
    }).notNull(),
    excludedRefundsUsdcBaseUnits: bigint("excluded_refunds_usdc_base_units", { mode: "number" })
      .notNull()
      .default(0),
    excludedAffiliateOrSelfReferralUsdcBaseUnits: bigint(
      "excluded_affiliate_or_self_referral_usdc_base_units",
      { mode: "number" },
    )
      .notNull()
      .default(0),
    resultingLevelKey: loyaltyLevelKeyEnum("resulting_level_key").notNull(),
    previousLevelKey: loyaltyLevelKeyEnum("previous_level_key"),
    killSwitchActive: boolean("kill_switch_active").notNull().default(false),
    inputOrderIds: jsonb("input_order_ids").$type<string[]>().notNull().default([]),
    calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("loyalty_calculations_user_id_idx").on(t.userId),
    index("loyalty_calculations_calculated_at_idx").on(t.calculatedAt),
  ],
);
