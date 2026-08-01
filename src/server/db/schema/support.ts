import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { supportCaseStatusEnum, supportCaseTypeEnum } from "./enums";
import { users } from "./users";

export const supportCases = pgTable(
  "support_cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    type: supportCaseTypeEnum("type").notNull(),
    status: supportCaseStatusEnum("status").notNull().default("open"),
    subject: text("subject").notNull(),
    description: text("description").notNull(),
    linkedPaymentId: uuid("linked_payment_id"),
    linkedSupplierOrderId: uuid("linked_supplier_order_id"),
    assignedAdminId: uuid("assigned_admin_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (t) => [
    index("support_cases_user_id_idx").on(t.userId),
    index("support_cases_status_idx").on(t.status),
  ],
);

// User-visible + internal updates on a case, distinguished by isInternal.
export const supportCaseEvents = pgTable(
  "support_case_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    supportCaseId: uuid("support_case_id")
      .notNull()
      .references(() => supportCases.id, { onDelete: "cascade" }),
    authorAdminId: uuid("author_admin_id"),
    authorUserId: uuid("author_user_id"),
    isInternal: text("is_internal").notNull().default("false"),
    body: text("body").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("support_case_events_support_case_id_idx").on(t.supportCaseId)],
);
