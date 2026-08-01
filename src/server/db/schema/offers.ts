import {
  bigint,
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { chainEnum, packOfferStatusEnum, paymentStatusEnum } from "./enums";
import { packTiers, poolEntries, poolVersions } from "./packs";
import { users } from "./users";

// The pre-payment commitment: everything a buyer needs to independently verify fairness later.
export const packOffers = pgTable(
  "pack_offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    packTierId: uuid("pack_tier_id")
      .notNull()
      .references(() => packTiers.id),
    poolVersionId: uuid("pool_version_id")
      .notNull()
      .references(() => poolVersions.id),
    status: packOfferStatusEnum("status").notNull().default("DRAFT"),
    chain: chainEnum("chain").notNull(),
    networkMode: text("network_mode").notNull(), // "testnet" | "mainnet"
    priceUsdcBaseUnits: bigint("price_usdc_base_units", { mode: "number" }).notNull(),
    shippingUsdcBaseUnits: bigint("shipping_usdc_base_units", { mode: "number" })
      .notNull()
      .default(0),
    supplierFeesUsdcBaseUnits: bigint("supplier_fees_usdc_base_units", { mode: "number" })
      .notNull()
      .default(0),
    totalUsdcBaseUnits: bigint("total_usdc_base_units", { mode: "number" }).notNull(),
    merchantAddress: text("merchant_address").notNull(),
    supplierSnapshotHash: text("supplier_snapshot_hash"),
    serverSeedCommitment: text("server_seed_commitment").notNull(), // sha256(serverSeed)
    serverSeedEncrypted: text("server_seed_encrypted").notNull(), // revealed only after settlement
    clientNonce: text("client_nonce").notNull(),
    isFreePack: boolean("is_free_pack").notNull().default(false),
    freePackClaimId: uuid("free_pack_claim_id"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("pack_offers_user_id_idx").on(t.userId),
    index("pack_offers_status_idx").on(t.status),
    index("pack_offers_expires_at_idx").on(t.expiresAt),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    packOfferId: uuid("pack_offer_id")
      .notNull()
      .references(() => packOffers.id),
    chain: chainEnum("chain").notNull(),
    networkMode: text("network_mode").notNull(),
    status: paymentStatusEnum("status").notNull().default("pending"),
    expectedAmountUsdcBaseUnits: bigint("expected_amount_usdc_base_units", {
      mode: "number",
    }).notNull(),
    settledAmountUsdcBaseUnits: bigint("settled_amount_usdc_base_units", { mode: "number" }),
    payerAddress: text("payer_address"),
    recipientAddress: text("recipient_address").notNull(),
    tokenIdentifier: text("token_identifier").notNull(), // ASA id / mint / contract address
    txHashOrPaymentId: text("tx_hash_or_payment_id").unique(),
    facilitatorReceiptId: text("facilitator_receipt_id"),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("payments_pack_offer_id_idx").on(t.packOfferId),
    index("payments_status_idx").on(t.status),
  ],
);

// A "Rip" is one completed, paid pack opening — the durable record of what the buyer received.
export const rips = pgTable(
  "rips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    packOfferId: uuid("pack_offer_id")
      .notNull()
      .references(() => packOffers.id)
      .unique(),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id)
      .unique(),
    poolEntryId: uuid("pool_entry_id")
      .notNull()
      .references(() => poolEntries.id),
    cardName: text("card_name").notNull(),
    setName: text("set_name").notNull(),
    cardNumber: text("card_number").notNull(),
    finish: text("finish").notNull(),
    condition: text("condition").notNull(),
    gradeLabel: text("grade_label"),
    referenceValueUsdcBaseUnits: bigint("reference_value_usdc_base_units", { mode: "number" }),
    referenceValueAsOf: timestamp("reference_value_as_of", { withTimezone: true }),
    isPublic: boolean("is_public").notNull().default(false),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("rips_pool_entry_id_idx").on(t.poolEntryId)],
);

// Everything needed to independently reproduce the deterministic selection (section 43).
export const fairnessProofs = pgTable(
  "fairness_proofs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ripId: uuid("rip_id")
      .notNull()
      .references(() => rips.id)
      .unique(),
    poolVersionId: uuid("pool_version_id")
      .notNull()
      .references(() => poolVersions.id),
    poolHash: text("pool_hash").notNull(),
    oddsHash: text("odds_hash").notNull(),
    serverSeedCommitment: text("server_seed_commitment").notNull(),
    revealedServerSeed: text("revealed_server_seed").notNull(),
    clientNonce: text("client_nonce").notNull(),
    paymentIdentifier: text("payment_identifier").notNull(),
    chainRandomnessInput: text("chain_randomness_input").notNull(),
    combinedSeedHash: text("combined_seed_hash").notNull(), // sha256(seed || nonce || paymentId || chainRandomness || poolHash)
    selectionRoll: text("selection_roll").notNull(), // decimal string derived from combinedSeedHash, used to walk pool weights
    selectedPoolEntryId: uuid("selected_pool_entry_id")
      .notNull()
      .references(() => poolEntries.id),
    algorithmVersion: text("algorithm_version").notNull().default("packx402-fair-v1"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("fairness_proofs_rip_id_unique").on(t.ripId)],
);
