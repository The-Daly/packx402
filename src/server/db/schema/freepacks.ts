import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { packTiers, poolVersions } from "./packs";
import { users } from "./users";

// One grant is issued per eligible user per weekly period (computed, not stored redundantly).
export const freePackGrants = pgTable(
  "free_pack_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    packTierId: uuid("pack_tier_id")
      .notNull()
      .references(() => packTiers.id),
    promotionalPoolVersionId: uuid("promotional_pool_version_id")
      .notNull()
      .references(() => poolVersions.id),
    weekKey: text("week_key").notNull(), // ISO week, e.g. "2026-W31" — anchors the one-per-week rule
    reason: text("reason").notNull(), // "weekly_free" | "loyalty_reward"
    loyaltyLevelKey: text("loyalty_level_key"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("free_pack_grants_user_week_unique").on(t.userId, t.weekKey, t.reason),
    index("free_pack_grants_user_id_idx").on(t.userId),
  ],
);

// Explicit user action — a grant existing does NOT imply a claim; claiming is never automatic.
export const freePackClaims = pgTable(
  "free_pack_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    freePackGrantId: uuid("free_pack_grant_id")
      .notNull()
      .references(() => freePackGrants.id)
      .unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    packOfferId: uuid("pack_offer_id"), // set once the claim creates its DRAFT offer
    shippingAcknowledged: boolean("shipping_acknowledged").notNull().default(false),
    claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("free_pack_claims_user_id_idx").on(t.userId)],
);
