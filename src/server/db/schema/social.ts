import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { reportStatusEnum, socialVisibilityEnum } from "./enums";
import { rips } from "./offers";
import { users } from "./users";

// A shared pull is an explicit, opt-in action — never generated automatically from a Rip.
export const pullPosts = pgTable(
  "pull_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    ripId: uuid("rip_id")
      .notNull()
      .references(() => rips.id),
    caption: text("caption"),
    includeAnimationReplay: boolean("include_animation_replay").notNull().default(false),
    affiliateDisclosure: boolean("affiliate_disclosure").notNull().default(false),
    visibility: socialVisibilityEnum("visibility").notNull().default("public"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("pull_posts_rip_id_unique").on(t.ripId),
    index("pull_posts_user_id_idx").on(t.userId),
  ],
);

export const showcases = pgTable(
  "showcases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    description: text("description"),
    coverImageUrl: text("cover_image_url"),
    visibility: socialVisibilityEnum("visibility").notNull().default("public"),
    commentsEnabled: boolean("comments_enabled").notNull().default(true),
    followable: boolean("followable").notNull().default(true),
    slug: text("slug").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("showcases_user_id_idx").on(t.userId)],
);

export const showcaseCards = pgTable(
  "showcase_cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    showcaseId: uuid("showcase_id")
      .notNull()
      .references(() => showcases.id, { onDelete: "cascade" }),
    ripId: uuid("rip_id")
      .notNull()
      .references(() => rips.id),
    sortOrder: text("sort_order").notNull().default("0"),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("showcase_cards_showcase_rip_unique").on(t.showcaseId, t.ripId)],
);

// Generic social post (announcements, challenge results, badge achievements) distinct from PullPost.
export const socialPosts = pgTable(
  "social_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id), // null for system/PackX402 announcements
    kind: text("kind").notNull(), // "announcement" | "badge_achievement" | "challenge_result" | "fairness_receipt" | "delivery_confirmation"
    body: text("body"),
    refId: uuid("ref_id"), // polymorphic pointer (showcase, badge, challenge completion, etc.)
    visibility: socialVisibilityEnum("visibility").notNull().default("public"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("social_posts_user_id_idx").on(t.userId)],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    targetType: text("target_type").notNull(), // "pull_post" | "showcase" | "social_post" | "club_post"
    targetId: uuid("target_id").notNull(),
    body: text("body").notNull(),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    removedReason: text("removed_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("comments_target_idx").on(t.targetType, t.targetId)],
);

export const reactions = pgTable(
  "reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    kind: text("kind").notNull().default("like"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("reactions_user_target_unique").on(t.userId, t.targetType, t.targetId, t.kind),
  ],
);

export const follows = pgTable(
  "follows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    followerId: uuid("follower_id")
      .notNull()
      .references(() => users.id),
    followingId: uuid("following_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("follows_follower_following_unique").on(t.followerId, t.followingId)],
);

export const blocks = pgTable(
  "blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => users.id),
    blockedId: uuid("blocked_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("blocks_blocker_blocked_unique").on(t.blockerId, t.blockedId)],
);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => users.id),
    targetType: text("target_type").notNull(), // "user" | "comment" | "pull_post" | "showcase" | "club"
    targetId: uuid("target_id").notNull(),
    reason: text("reason").notNull(),
    details: text("details"),
    status: reportStatusEnum("status").notNull().default("open"),
    resolvedByAdminId: uuid("resolved_by_admin_id"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("reports_target_idx").on(t.targetType, t.targetId),
    index("reports_status_idx").on(t.status),
  ],
);

export const badges = pgTable("badges", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  iconUrl: text("icon_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userBadges = pgTable(
  "user_badges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    badgeId: uuid("badge_id")
      .notNull()
      .references(() => badges.id),
    awardedAt: timestamp("awarded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("user_badges_user_badge_unique").on(t.userId, t.badgeId)],
);

export const clubs = pgTable("clubs", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // card_game | set | character | region | graded | beginner | announcements
  rules: text("rules"),
  requiresJoinApproval: boolean("requires_join_approval").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clubMembers = pgTable(
  "club_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: text("role").notNull().default("member"), // "member" | "moderator"
    status: text("status").notNull().default("active"), // "pending" | "active" | "removed"
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("club_members_club_user_unique").on(t.clubId, t.userId)],
);

export const challenges = pgTable("challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  requiresPaidPurchase: boolean("requires_paid_purchase").notNull().default(false), // must be reviewed+disclosed if true
  badgeRewardId: uuid("badge_reward_id").references(() => badges.id),
  freePackEntryRewardEligible: boolean("free_pack_entry_reward_eligible").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const challengeCompletions = pgTable(
  "challenge_completions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    challengeId: uuid("challenge_id")
      .notNull()
      .references(() => challenges.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("challenge_completions_challenge_user_unique").on(t.challengeId, t.userId)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    linkUrl: text("link_url"),
    readAt: timestamp("read_at", { withTimezone: true }),
    emailSent: boolean("email_sent").notNull().default(false),
    pushSent: boolean("push_sent").notNull().default(false),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("notifications_user_id_idx").on(t.userId),
    index("notifications_read_at_idx").on(t.readAt),
  ],
);

export const notificationPreferences = pgTable("notification_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id)
    .unique(),
  emailEnabled: jsonb("email_enabled").$type<Record<string, boolean>>().notNull().default({}),
  pushEnabled: jsonb("push_enabled").$type<Record<string, boolean>>().notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
