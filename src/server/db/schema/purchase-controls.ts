import { bigint, boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

// One active row per user; changes are tracked via increase/decrease timing rules in the app layer.
export const purchaseLimits = pgTable("purchase_limits", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id)
    .unique(),
  dailyLimitUsdcBaseUnits: bigint("daily_limit_usdc_base_units", { mode: "number" }),
  weeklyLimitUsdcBaseUnits: bigint("weekly_limit_usdc_base_units", { mode: "number" }),
  monthlyLimitUsdcBaseUnits: bigint("monthly_limit_usdc_base_units", { mode: "number" }),
  pendingDailyLimitUsdcBaseUnits: bigint("pending_daily_limit_usdc_base_units", { mode: "number" }),
  pendingWeeklyLimitUsdcBaseUnits: bigint("pending_weekly_limit_usdc_base_units", {
    mode: "number",
  }),
  pendingMonthlyLimitUsdcBaseUnits: bigint("pending_monthly_limit_usdc_base_units", {
    mode: "number",
  }),
  increaseEffectiveAt: timestamp("increase_effective_at", { withTimezone: true }), // cooling-period gate
  coolOffUntil: timestamp("cool_off_until", { withTimezone: true }),
  pausedUntil: timestamp("paused_until", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Applies across all connected wallets and verified accounts for the user.
export const selfExclusions = pgTable(
  "self_exclusions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id)
      .unique(),
    isActive: boolean("is_active").notNull().default(false),
    reason: text("reason"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }), // null = indefinite
    liftedByAdminId: uuid("lifted_by_admin_id"),
    liftedReason: text("lifted_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("self_exclusions_user_id_idx").on(t.userId)],
);
