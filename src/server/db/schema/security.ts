import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { auditEventActorTypeEnum, moderationActionTypeEnum, securityEventTypeEnum } from "./enums";
import { users } from "./users";

export const securityEvents = pgTable(
  "security_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    type: securityEventTypeEnum("type").notNull(),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("security_events_user_id_idx").on(t.userId),
    index("security_events_type_idx").on(t.type),
  ],
);

export const moderationActions = pgTable(
  "moderation_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    targetUserId: uuid("target_user_id")
      .notNull()
      .references(() => users.id),
    actionType: moderationActionTypeEnum("action_type").notNull(),
    reason: text("reason").notNull(),
    reportId: uuid("report_id"),
    moderatorAdminId: uuid("moderator_admin_id").notNull(),
    appealNote: text("appeal_note"),
    expiresAt: timestamp("expires_at", { withTimezone: true }), // for temporary_suspension
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("moderation_actions_target_user_id_idx").on(t.targetUserId)],
);

// Append-only. No update or delete path exists at the application layer.
export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorType: auditEventActorTypeEnum("actor_type").notNull(),
    actorId: uuid("actor_id"),
    action: text("action").notNull(), // e.g. "admin.pool_version.publish", "admin.refund.approve"
    targetType: text("target_type"),
    targetId: uuid("target_id"),
    reason: text("reason"), // required for sensitive admin actions
    correlationId: text("correlation_id").notNull(),
    beforeState: jsonb("before_state").$type<Record<string, unknown>>(),
    afterState: jsonb("after_state").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_events_actor_idx").on(t.actorType, t.actorId),
    index("audit_events_target_idx").on(t.targetType, t.targetId),
    index("audit_events_correlation_id_idx").on(t.correlationId),
  ],
);
