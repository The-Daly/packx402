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
import { cardGameEnum, shippingTreatmentEnum } from "./enums";
import { supplierListings } from "./suppliers";

// Configuration-driven pack tier. Prices are integer USDC base units (6 decimals) — never floats.
export const packTiers = pgTable("pack_tiers", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(), // "spark" .. "genesis"
  name: text("name").notNull(),
  priceUsdcBaseUnits: bigint("price_usdc_base_units", { mode: "number" }).notNull(),
  sortOrder: integer("sort_order").notNull(),
  shippingTreatment: shippingTreatmentEnum("shipping_treatment").notNull(),
  estimatedShippingUsdcBaseUnits: bigint("estimated_shipping_usdc_base_units", { mode: "number" })
    .notNull()
    .default(0),
  cardGames: jsonb("card_games").$type<string[]>().notNull().default([]),
  minDisclosedCondition: text("min_disclosed_condition").notNull(),
  procurementPriceCapUsdcBaseUnits: bigint("procurement_price_cap_usdc_base_units", {
    mode: "number",
  }).notNull(),
  // Server-side availability gates — the ONLY source of truth for what a network may sell.
  availableTestnet: boolean("available_testnet").notNull().default(false),
  availableAlgorandMainnet: boolean("available_algorand_mainnet").notNull().default(false),
  availableSolana: boolean("available_solana").notNull().default(false), // testnet only per policy
  availableEvm: boolean("available_evm").notNull().default(false), // testnet only per policy
  requiresHighValueReleaseGate: boolean("requires_high_value_release_gate")
    .notNull()
    .default(false), // > $250 (Crown+) — current beta bankroll can't fund fulfillment above this
  locked: boolean("locked").notNull().default(false), // visible-but-locked (> $250 during beta by default)
  weeklyFreePackEligible: boolean("weekly_free_pack_eligible").notNull().default(false),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Immutable once referenced by a paid PackOffer (enforced at the application layer).
export const poolVersions = pgTable(
  "pool_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    packTierId: uuid("pack_tier_id")
      .notNull()
      .references(() => packTiers.id),
    versionLabel: text("version_label").notNull(), // e.g. "2026-08-01.1"
    isPromotional: boolean("is_promotional").notNull().default(false), // weekly free-pack pools are separate & never paid
    poolHash: text("pool_hash").notNull(), // sha256 of the canonical serialized pool entries
    oddsHash: text("odds_hash").notNull(), // sha256 of the published probability bands
    supplierSnapshotHash: text("supplier_snapshot_hash"),
    totalWeight: bigint("total_weight", { mode: "number" }).notNull(),
    cardCountTotal: integer("card_count_total").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    isImmutable: boolean("is_immutable").notNull().default(false), // flips true on first paid usage; app layer blocks further writes
  },
  (t) => [
    uniqueIndex("pool_versions_tier_label_unique").on(t.packTierId, t.versionLabel),
    index("pool_versions_pack_tier_id_idx").on(t.packTierId),
  ],
);

// One row per possible pull outcome in a pool version, with its selection weight (probability band).
export const poolEntries = pgTable(
  "pool_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    poolVersionId: uuid("pool_version_id")
      .notNull()
      .references(() => poolVersions.id),
    cardGame: cardGameEnum("card_game").notNull(),
    cardName: text("card_name").notNull(),
    setName: text("set_name").notNull(),
    cardNumber: text("card_number").notNull(),
    finish: text("finish").notNull(),
    minCondition: text("min_condition").notNull(),
    gradeLabel: text("grade_label"),
    weight: bigint("weight", { mode: "number" }).notNull(), // relative selection weight within totalWeight
    probabilityBandLabel: text("probability_band_label").notNull(), // e.g. "1 in 500 - 1 in 1000"
    referenceValueUsdcBaseUnits: bigint("reference_value_usdc_base_units", { mode: "number" }),
    referenceValueAsOf: timestamp("reference_value_as_of", { withTimezone: true }),
    supplierListingId: uuid("supplier_listing_id").references(() => supplierListings.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pool_entries_pool_version_id_idx").on(t.poolVersionId)],
);
