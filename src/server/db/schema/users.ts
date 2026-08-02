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
import { authMethodEnum, chainEnum, sessionRevokedReasonEnum } from "./enums";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").unique(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    username: text("username").notNull(),
    passwordHash: text("password_hash"), // null when the account is wallet/passkey-only
    mfaEnabled: boolean("mfa_enabled").notNull().default(false),
    mfaSecretEncrypted: text("mfa_secret_encrypted"),
    primaryAuthMethod: authMethodEnum("primary_auth_method").notNull(),
    marketingConsent: boolean("marketing_consent").notNull().default(false),
    marketingConsentAt: timestamp("marketing_consent_at", { withTimezone: true }),
    termsAcceptedVersion: text("terms_accepted_version").notNull(),
    termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }).notNull(),
    privacyAcceptedVersion: text("privacy_accepted_version").notNull(),
    responsiblePurchasingAcceptedVersion: text("responsible_purchasing_accepted_version").notNull(),
    officialPackRulesAcceptedVersion: text("official_pack_rules_accepted_version").notNull(),
    country: text("country").notNull(),
    stateOrProvince: text("state_or_province"),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    suspendedReason: text("suspended_reason"),
    deletionRequestedAt: timestamp("deletion_requested_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_username_unique").on(t.username)],
);

export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  bannerUrl: text("banner_url"),
  bio: text("bio"),
  favoriteGames: jsonb("favorite_games").$type<string[]>().notNull().default([]),
  showWalletBadge: boolean("show_wallet_badge").notNull().default(false),
  showAffiliateBadge: boolean("show_affiliate_badge").notNull().default(false),
  showCollectionStats: boolean("show_collection_stats").notNull().default(false),
  isPublic: boolean("is_public").notNull().default(true),
  optOutOfLeaderboards: boolean("opt_out_of_leaderboards").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Append-only: every DOB/age/location eligibility acknowledgment is recorded, never overwritten.
export const eligibilityRecords = pgTable(
  "eligibility_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    sessionCorrelationId: text("session_correlation_id").notNull(),
    dateOfBirth: text("date_of_birth").notNull(), // ISO date, encrypted at rest by field-level encryption in the app layer
    ageAcknowledged18Plus: boolean("age_acknowledged_18_plus").notNull(),
    locationCountry: text("location_country").notNull(),
    locationStateOrProvince: text("location_state_or_province"),
    locationAllowed: boolean("location_allowed").notNull(),
    policyVersion: text("policy_version").notNull(),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }).notNull().defaultNow(),
    ipHash: text("ip_hash"), // hashed, never raw IP
  },
  (t) => [index("eligibility_records_user_id_idx").on(t.userId)],
);

export const walletIdentities = pgTable(
  "wallet_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chain: chainEnum("chain").notNull(),
    address: text("address").notNull(),
    networkMode: text("network_mode").notNull(), // testnet | mainnet, chain-specific label
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
    isPreferredPayment: boolean("is_preferred_payment").notNull().default(false),
    isPublic: boolean("is_public").notNull().default(false),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("wallet_identities_chain_address_unique").on(t.chain, t.address),
    index("wallet_identities_user_id_idx").on(t.userId),
  ],
);

// One row per linked OAuth identity (currently Google only). Keyed by (provider,
// providerAccountId) rather than email — a Google account's email can change, but its
// subject id (`sub`) never does. This is what makes Google sign-in idempotent across
// logins: the same Google account always resolves to the same PackX402 user.
export const oauthIdentities = pgTable(
  "oauth_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // "google"
    providerAccountId: text("provider_account_id").notNull(), // Google's `sub` claim
    email: text("email").notNull(), // email at time of linking, for display/support only
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("oauth_identities_provider_account_unique").on(t.provider, t.providerAccountId),
    index("oauth_identities_user_id_idx").on(t.userId),
  ],
);

// Short-lived single-use nonces for wallet-signature login (section 8/41).
export const authNonces = pgTable(
  "auth_nonces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nonce: text("nonce").notNull().unique(),
    chain: chainEnum("chain").notNull(),
    address: text("address").notNull(),
    domain: text("domain").notNull(),
    uri: text("uri").notNull(),
    purpose: text("purpose").notNull(), // e.g. "login", "wallet_link"
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
  },
  (t) => [index("auth_nonces_expires_at_idx").on(t.expiresAt)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(), // sha256 of the opaque session token; raw token never stored
    authMethod: authMethodEnum("auth_method").notNull(),
    userAgent: text("user_agent"),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedReason: sessionRevokedReasonEnum("revoked_reason"),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

export const recoveryCodes = pgTable(
  "recovery_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("recovery_codes_user_id_idx").on(t.userId)],
);

export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  purpose: text("purpose").notNull(), // "verify_email" | "password_reset" | "recovery"
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Encrypted at the field level in the app layer (never plaintext, never logged).
export const shippingAddresses = pgTable(
  "shipping_addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fullNameEncrypted: text("full_name_encrypted").notNull(),
    line1Encrypted: text("line1_encrypted").notNull(),
    line2Encrypted: text("line2_encrypted"),
    cityEncrypted: text("city_encrypted").notNull(),
    stateOrProvinceEncrypted: text("state_or_province_encrypted"),
    postalCodeEncrypted: text("postal_code_encrypted").notNull(),
    country: text("country").notNull(), // country code kept plaintext for shipping-eligibility queries
    phoneEncrypted: text("phone_encrypted"),
    isDefault: boolean("is_default").notNull().default(false),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("shipping_addresses_user_id_idx").on(t.userId)],
);
