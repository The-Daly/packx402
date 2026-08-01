import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  cardConditionEnum,
  cardFinishEnum,
  cardGameEnum,
  supplierPurchaseStatusEnum,
} from "./enums";

export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(), // "cardtrader"
  displayName: text("display_name").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(false),
  mode: text("mode").notNull().default("mock"), // "mock" | "live"
  healthStatus: text("health_status").notNull().default("unknown"), // "healthy" | "degraded" | "down" | "unknown"
  lastHealthCheckAt: timestamp("last_health_check_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const supplierListings = pgTable(
  "supplier_listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    externalListingId: text("external_listing_id").notNull(),
    externalSellerId: text("external_seller_id").notNull(),
    cardGame: cardGameEnum("card_game").notNull(),
    cardName: text("card_name").notNull(),
    setName: text("set_name").notNull(),
    cardNumber: text("card_number").notNull(),
    language: text("language").notNull(),
    finish: cardFinishEnum("finish").notNull(),
    condition: cardConditionEnum("condition").notNull(),
    gradeLabel: text("grade_label"),
    quantityAvailable: integer("quantity_available").notNull(),
    priceUsdcBaseUnits: bigint("price_usdc_base_units", { mode: "number" }).notNull(),
    sellerOnVacation: boolean("seller_on_vacation").notNull().default(false),
    shipsToCustomer: boolean("ships_to_customer").notNull().default(true),
    imageUsePermitted: boolean("image_use_permitted").notNull().default(false),
    sellerReliabilityScore: integer("seller_reliability_score"),
    lastRefreshedAt: timestamp("last_refreshed_at", { withTimezone: true }).notNull(),
    isEligible: boolean("is_eligible").notNull().default(false), // computed by eligibility rules (section 38)
    ineligibilityReasons: jsonb("ineligibility_reasons").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("supplier_listings_external_unique").on(t.supplierId, t.externalListingId),
    index("supplier_listings_supplier_id_idx").on(t.supplierId),
  ],
);

// Immutable point-in-time capture of a listing's terms, taken at offer-creation time.
export const supplierInventorySnapshots = pgTable(
  "supplier_inventory_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    supplierListingId: uuid("supplier_listing_id")
      .notNull()
      .references(() => supplierListings.id),
    snapshotHash: text("snapshot_hash").notNull(),
    priceUsdcBaseUnits: bigint("price_usdc_base_units", { mode: "number" }).notNull(),
    quantityAvailable: integer("quantity_available").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("supplier_inventory_snapshots_listing_id_idx").on(t.supplierListingId)],
);

// Serialized, idempotent supplier purchase job — one at a time per supplier account (section 39).
export const supplierPurchases = pgTable(
  "supplier_purchases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    supplierListingId: uuid("supplier_listing_id")
      .notNull()
      .references(() => supplierListings.id),
    ripId: uuid("rip_id").notNull(), // FK declared in offers.ts to avoid circular import; enforced at app layer + DB trigger-free by convention
    idempotencyKey: text("idempotency_key").notNull().unique(),
    status: supplierPurchaseStatusEnum("status").notNull().default("queued"),
    expectedPriceUsdcBaseUnits: bigint("expected_price_usdc_base_units", {
      mode: "number",
    }).notNull(),
    actualPriceUsdcBaseUnits: bigint("actual_price_usdc_base_units", { mode: "number" }),
    externalOrderId: text("external_order_id"),
    cartVerificationLog: jsonb("cart_verification_log")
      .$type<Record<string, unknown>[]>()
      .notNull()
      .default([]),
    failureReason: text("failure_reason"),
    queuedAt: timestamp("queued_at", { withTimezone: true }).notNull().defaultNow(),
    purchasedAt: timestamp("purchased_at", { withTimezone: true }),
  },
  (t) => [
    index("supplier_purchases_rip_id_idx").on(t.ripId),
    index("supplier_purchases_status_idx").on(t.status),
  ],
);
