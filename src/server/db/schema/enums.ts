import { pgEnum } from "drizzle-orm/pg-core";

export const chainEnum = pgEnum("chain", ["algorand", "solana", "evm"]);

export const networkModeEnum = pgEnum("network_mode", ["testnet", "mainnet"]);

export const authMethodEnum = pgEnum("auth_method", ["email", "wallet", "passkey", "google"]);

// "primary" is the card the user actually paid for; "bonus_flip" is the extra card awarded
// on the rare (4%) bonus-flip hit — see src/server/fairness/engine.ts's deriveBonusFlipHit.
// Both are independently fairness-proven; the bonus flip's own hit/miss determination is
// itself derived from the committed seed, never client-side randomness.
export const ripKindEnum = pgEnum("rip_kind", ["primary", "bonus_flip"]);

export const sessionRevokedReasonEnum = pgEnum("session_revoked_reason", [
  "user_revoked",
  "user_revoked_all",
  "admin_revoked",
  "suspicious_login",
  "expired",
  "password_reset",
]);

export const cardGameEnum = pgEnum("card_game", ["pokemon", "yugioh", "other"]);

export const cardConditionEnum = pgEnum("card_condition", [
  "mint",
  "near_mint",
  "lightly_played",
  "moderately_played",
  "heavily_played",
  "damaged",
]);

export const cardFinishEnum = pgEnum("card_finish", [
  "normal",
  "holofoil",
  "reverse_holofoil",
  "first_edition",
  "other_foil",
]);

// Pack-offer lifecycle, section 42.
export const packOfferStatusEnum = pgEnum("pack_offer_status", [
  "DRAFT",
  "ELIGIBILITY_CHECKED",
  "INVENTORY_SNAPSHOTTED",
  "RESULT_COMMITTED",
  "OFFERED",
  "PAYMENT_PENDING",
  "PAID",
  "OPENED",
  "SUPPLIER_PURCHASE_QUEUED",
  "SUPPLIER_PURCHASED",
  "SHIPPED",
  "DELIVERED",
  "EXPIRED",
  "PAYMENT_FAILED",
  "PAYMENT_AMBIGUOUS",
  "SECURITY_HOLD",
  "SUPPLIER_FAILED",
  "REFUND_REQUIRED",
  "REFUNDED",
  "CUSTOMER_SUBSTITUTION_REVIEW",
  "CANCELLED",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "settled",
  "underpaid",
  "wrong_network",
  "wrong_token",
  "wrong_recipient",
  "duplicate",
  "ambiguous",
  "failed",
  "refunded",
]);

export const supplierPurchaseStatusEnum = pgEnum("supplier_purchase_status", [
  "queued",
  "cart_reserved",
  "purchased",
  "failed",
  "cancelled",
]);

export const fulfillmentStatusEnum = pgEnum("fulfillment_status", [
  "opening_completed",
  "supplier_purchase_queued",
  "supplier_order_submitted",
  "supplier_confirmed",
  "preparing_shipment",
  "shipped",
  "tracking_available",
  "delivered",
  "problem_reported",
  "refund_or_substitution_review",
]);

export const shippingTreatmentEnum = pgEnum("shipping_treatment", [
  "included",
  "separately_charged",
  "subsidized",
]);

export const loyaltyLevelKeyEnum = pgEnum("loyalty_level_key", [
  "member",
  "copper",
  "silver",
  "gold",
  "obsidian",
]);

export const referralAttributionStatusEnum = pgEnum("referral_attribution_status", [
  "pending",
  "qualified",
  "rewarded",
  "rejected",
  "reversed",
]);

export const affiliateApplicationStatusEnum = pgEnum("affiliate_application_status", [
  "pending",
  "approved",
  "rejected",
  "suspended",
]);

export const affiliateCommissionStatusEnum = pgEnum("affiliate_commission_status", [
  "pending",
  "approved",
  "paid",
  "reversed",
  "rejected",
]);

export const socialVisibilityEnum = pgEnum("social_visibility", ["public", "private"]);

export const reportStatusEnum = pgEnum("report_status", ["open", "actioned", "dismissed"]);

export const moderationActionTypeEnum = pgEnum("moderation_action_type", [
  "comment_removed",
  "post_removed",
  "temporary_suspension",
  "permanent_suspension",
  "warning_issued",
  "appeal_upheld",
  "appeal_denied",
]);

export const supportCaseTypeEnum = pgEnum("support_case_type", [
  "missing_order",
  "incorrect_card",
  "incorrect_condition",
  "damaged_card",
  "tracking_problem",
  "supplier_cancellation",
  "duplicate_payment",
  "payment_settled_without_result",
  "refund_required",
  "account_security",
  "affiliate_dispute",
  "social_moderation_appeal",
]);

export const supportCaseStatusEnum = pgEnum("support_case_status", [
  "open",
  "investigating",
  "awaiting_customer",
  "awaiting_supplier",
  "resolved",
  "closed",
]);

export const securityEventTypeEnum = pgEnum("security_event_type", [
  "login_success",
  "login_failed",
  "suspicious_login",
  "session_revoked",
  "wallet_linked",
  "wallet_unlinked",
  "mfa_enabled",
  "mfa_disabled",
  "password_reset_requested",
  "account_locked",
  "admin_reauth",
  "self_exclusion_set",
  "compromise_reported",
]);

export const auditEventActorTypeEnum = pgEnum("audit_event_actor_type", [
  "user",
  "admin",
  "system",
  "webhook",
]);
