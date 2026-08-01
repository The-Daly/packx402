import { boolean, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const featureFlags = pgTable("feature_flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  description: text("description").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(false),
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  updatedByAdminId: uuid("updated_by_admin_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Role-based admin authorization. Kept separate from `users` so no consumer path can self-grant admin.
export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique(),
  role: text("role").notNull(), // "superadmin" | "ops" | "support" | "moderation" | "finance" | "readonly"
  reauthenticatedAt: timestamp("reauthenticated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
