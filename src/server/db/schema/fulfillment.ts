import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { fulfillmentStatusEnum } from "./enums";
import { rips } from "./offers";
import { supplierPurchases } from "./suppliers";

export const fulfillments = pgTable(
  "fulfillments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ripId: uuid("rip_id")
      .notNull()
      .references(() => rips.id)
      .unique(),
    supplierPurchaseId: uuid("supplier_purchase_id").references(() => supplierPurchases.id),
    shippingAddressId: uuid("shipping_address_id").notNull(),
    status: fulfillmentStatusEnum("status").notNull().default("opening_completed"),
    carrier: text("carrier"),
    trackingNumber: text("tracking_number"),
    trackingUrl: text("tracking_url"),
    estimatedDeliveryStart: timestamp("estimated_delivery_start", { withTimezone: true }),
    estimatedDeliveryEnd: timestamp("estimated_delivery_end", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("fulfillments_rip_id_idx").on(t.ripId),
    index("fulfillments_status_idx").on(t.status),
  ],
);

// Append-only audit trail of every status transition — never mutate, only insert.
export const trackingEvents = pgTable(
  "tracking_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fulfillmentId: uuid("fulfillment_id")
      .notNull()
      .references(() => fulfillments.id),
    status: fulfillmentStatusEnum("status").notNull(),
    note: text("note"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("tracking_events_fulfillment_id_idx").on(t.fulfillmentId)],
);
