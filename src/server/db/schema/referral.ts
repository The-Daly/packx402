import {
  bigint,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { referralAttributionStatusEnum } from "./enums";
import { users } from "./users";

export const referralCodes = pgTable("referral_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id)
    .unique(),
  code: text("code").notNull().unique(),
  clickCount: integer("click_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const referralAttributions = pgTable(
  "referral_attributions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    referralCodeId: uuid("referral_code_id")
      .notNull()
      .references(() => referralCodes.id),
    referredUserId: uuid("referred_user_id")
      .notNull()
      .references(() => users.id)
      .unique(),
    status: referralAttributionStatusEnum("status").notNull().default("pending"),
    rejectionReason: text("rejection_reason"), // self_referral | household_abuse | duplicate_wallet | other
    qualifyingOrderId: uuid("qualifying_order_id"), // set once the referred user's first order is FULFILLED
    rewardUsdcBaseUnits: bigint("reward_usdc_base_units", { mode: "number" }),
    rewardApprovedAt: timestamp("reward_approved_at", { withTimezone: true }),
    reversedAt: timestamp("reversed_at", { withTimezone: true }),
    reversedReason: text("reversed_reason"),
    requiresManualReview: text("requires_manual_review"), // threshold reason, null if not flagged
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("referral_attributions_referred_user_unique").on(t.referredUserId),
    index("referral_attributions_referral_code_id_idx").on(t.referralCodeId),
  ],
);
