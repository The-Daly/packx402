CREATE TYPE "public"."affiliate_application_status" AS ENUM('pending', 'approved', 'rejected', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."affiliate_commission_status" AS ENUM('pending', 'approved', 'paid', 'reversed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."audit_event_actor_type" AS ENUM('user', 'admin', 'system', 'webhook');--> statement-breakpoint
CREATE TYPE "public"."auth_method" AS ENUM('email', 'wallet', 'passkey');--> statement-breakpoint
CREATE TYPE "public"."card_condition" AS ENUM('mint', 'near_mint', 'lightly_played', 'moderately_played', 'heavily_played', 'damaged');--> statement-breakpoint
CREATE TYPE "public"."card_finish" AS ENUM('normal', 'holofoil', 'reverse_holofoil', 'first_edition', 'other_foil');--> statement-breakpoint
CREATE TYPE "public"."card_game" AS ENUM('pokemon', 'yugioh', 'other');--> statement-breakpoint
CREATE TYPE "public"."chain" AS ENUM('algorand', 'solana', 'evm');--> statement-breakpoint
CREATE TYPE "public"."fulfillment_status" AS ENUM('opening_completed', 'supplier_purchase_queued', 'supplier_order_submitted', 'supplier_confirmed', 'preparing_shipment', 'shipped', 'tracking_available', 'delivered', 'problem_reported', 'refund_or_substitution_review');--> statement-breakpoint
CREATE TYPE "public"."loyalty_level_key" AS ENUM('member', 'copper', 'silver', 'gold', 'obsidian');--> statement-breakpoint
CREATE TYPE "public"."moderation_action_type" AS ENUM('comment_removed', 'post_removed', 'temporary_suspension', 'permanent_suspension', 'warning_issued', 'appeal_upheld', 'appeal_denied');--> statement-breakpoint
CREATE TYPE "public"."network_mode" AS ENUM('testnet', 'mainnet');--> statement-breakpoint
CREATE TYPE "public"."pack_offer_status" AS ENUM('DRAFT', 'ELIGIBILITY_CHECKED', 'INVENTORY_SNAPSHOTTED', 'RESULT_COMMITTED', 'OFFERED', 'PAYMENT_PENDING', 'PAID', 'OPENED', 'SUPPLIER_PURCHASE_QUEUED', 'SUPPLIER_PURCHASED', 'SHIPPED', 'DELIVERED', 'EXPIRED', 'PAYMENT_FAILED', 'PAYMENT_AMBIGUOUS', 'SECURITY_HOLD', 'SUPPLIER_FAILED', 'REFUND_REQUIRED', 'REFUNDED', 'CUSTOMER_SUBSTITUTION_REVIEW', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'settled', 'underpaid', 'wrong_network', 'wrong_token', 'wrong_recipient', 'duplicate', 'ambiguous', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."referral_attribution_status" AS ENUM('pending', 'qualified', 'rewarded', 'rejected', 'reversed');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'actioned', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."security_event_type" AS ENUM('login_success', 'login_failed', 'suspicious_login', 'session_revoked', 'wallet_linked', 'wallet_unlinked', 'mfa_enabled', 'mfa_disabled', 'password_reset_requested', 'account_locked', 'admin_reauth', 'self_exclusion_set', 'compromise_reported');--> statement-breakpoint
CREATE TYPE "public"."session_revoked_reason" AS ENUM('user_revoked', 'user_revoked_all', 'admin_revoked', 'suspicious_login', 'expired', 'password_reset');--> statement-breakpoint
CREATE TYPE "public"."shipping_treatment" AS ENUM('included', 'separately_charged', 'subsidized');--> statement-breakpoint
CREATE TYPE "public"."social_visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TYPE "public"."supplier_purchase_status" AS ENUM('queued', 'cart_reserved', 'purchased', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."support_case_status" AS ENUM('open', 'investigating', 'awaiting_customer', 'awaiting_supplier', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."support_case_type" AS ENUM('missing_order', 'incorrect_card', 'incorrect_condition', 'damaged_card', 'tracking_problem', 'supplier_cancellation', 'duplicate_payment', 'payment_settled_without_result', 'refund_required', 'account_security', 'affiliate_dispute', 'social_moderation_appeal');--> statement-breakpoint
CREATE TABLE "auth_nonces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nonce" text NOT NULL,
	"chain" "chain" NOT NULL,
	"address" text NOT NULL,
	"domain" text NOT NULL,
	"uri" text NOT NULL,
	"purpose" text NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	CONSTRAINT "auth_nonces_nonce_unique" UNIQUE("nonce")
);
--> statement-breakpoint
CREATE TABLE "eligibility_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"session_correlation_id" text NOT NULL,
	"date_of_birth" text NOT NULL,
	"age_acknowledged_18_plus" boolean NOT NULL,
	"location_country" text NOT NULL,
	"location_state_or_province" text,
	"location_allowed" boolean NOT NULL,
	"policy_version" text NOT NULL,
	"acknowledged_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_hash" text
);
--> statement-breakpoint
CREATE TABLE "email_verification_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"purpose" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_verification_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "recovery_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"auth_method" "auth_method" NOT NULL,
	"user_agent" text,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_reason" "session_revoked_reason",
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "shipping_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"full_name_encrypted" text NOT NULL,
	"line1_encrypted" text NOT NULL,
	"line2_encrypted" text,
	"city_encrypted" text NOT NULL,
	"state_or_province_encrypted" text,
	"postal_code_encrypted" text NOT NULL,
	"country" text NOT NULL,
	"phone_encrypted" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"banner_url" text,
	"bio" text,
	"favorite_games" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"show_wallet_badge" boolean DEFAULT false NOT NULL,
	"show_affiliate_badge" boolean DEFAULT false NOT NULL,
	"show_collection_stats" boolean DEFAULT false NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"opt_out_of_leaderboards" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"email_verified_at" timestamp with time zone,
	"username" text NOT NULL,
	"password_hash" text,
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"mfa_secret_encrypted" text,
	"primary_auth_method" "auth_method" NOT NULL,
	"marketing_consent" boolean DEFAULT false NOT NULL,
	"marketing_consent_at" timestamp with time zone,
	"terms_accepted_version" text NOT NULL,
	"terms_accepted_at" timestamp with time zone NOT NULL,
	"privacy_accepted_version" text NOT NULL,
	"responsible_purchasing_accepted_version" text NOT NULL,
	"official_pack_rules_accepted_version" text NOT NULL,
	"country" text NOT NULL,
	"state_or_province" text,
	"suspended_at" timestamp with time zone,
	"suspended_reason" text,
	"deletion_requested_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "wallet_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"chain" "chain" NOT NULL,
	"address" text NOT NULL,
	"network_mode" text NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"is_preferred_payment" boolean DEFAULT false NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pack_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"price_usdc_base_units" bigint NOT NULL,
	"sort_order" integer NOT NULL,
	"shipping_treatment" "shipping_treatment" NOT NULL,
	"estimated_shipping_usdc_base_units" bigint DEFAULT 0 NOT NULL,
	"card_games" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"min_disclosed_condition" text NOT NULL,
	"procurement_price_cap_usdc_base_units" bigint NOT NULL,
	"available_testnet" boolean DEFAULT false NOT NULL,
	"available_algorand_mainnet" boolean DEFAULT false NOT NULL,
	"available_solana" boolean DEFAULT false NOT NULL,
	"available_evm" boolean DEFAULT false NOT NULL,
	"requires_high_value_release_gate" boolean DEFAULT false NOT NULL,
	"locked" boolean DEFAULT false NOT NULL,
	"weekly_free_pack_eligible" boolean DEFAULT false NOT NULL,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pack_tiers_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "pool_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_version_id" uuid NOT NULL,
	"card_game" "card_game" NOT NULL,
	"card_name" text NOT NULL,
	"set_name" text NOT NULL,
	"card_number" text NOT NULL,
	"finish" text NOT NULL,
	"min_condition" text NOT NULL,
	"grade_label" text,
	"weight" bigint NOT NULL,
	"probability_band_label" text NOT NULL,
	"reference_value_usdc_base_units" bigint,
	"reference_value_as_of" timestamp with time zone,
	"supplier_listing_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pool_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pack_tier_id" uuid NOT NULL,
	"version_label" text NOT NULL,
	"is_promotional" boolean DEFAULT false NOT NULL,
	"pool_hash" text NOT NULL,
	"odds_hash" text NOT NULL,
	"supplier_snapshot_hash" text,
	"total_weight" bigint NOT NULL,
	"card_count_total" integer NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"is_immutable" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_inventory_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_listing_id" uuid NOT NULL,
	"snapshot_hash" text NOT NULL,
	"price_usdc_base_units" bigint NOT NULL,
	"quantity_available" integer NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"external_listing_id" text NOT NULL,
	"external_seller_id" text NOT NULL,
	"card_game" "card_game" NOT NULL,
	"card_name" text NOT NULL,
	"set_name" text NOT NULL,
	"card_number" text NOT NULL,
	"language" text NOT NULL,
	"finish" "card_finish" NOT NULL,
	"condition" "card_condition" NOT NULL,
	"grade_label" text,
	"quantity_available" integer NOT NULL,
	"price_usdc_base_units" bigint NOT NULL,
	"seller_on_vacation" boolean DEFAULT false NOT NULL,
	"ships_to_customer" boolean DEFAULT true NOT NULL,
	"image_use_permitted" boolean DEFAULT false NOT NULL,
	"seller_reliability_score" integer,
	"last_refreshed_at" timestamp with time zone NOT NULL,
	"is_eligible" boolean DEFAULT false NOT NULL,
	"ineligibility_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"supplier_listing_id" uuid NOT NULL,
	"rip_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" "supplier_purchase_status" DEFAULT 'queued' NOT NULL,
	"expected_price_usdc_base_units" bigint NOT NULL,
	"actual_price_usdc_base_units" bigint,
	"external_order_id" text,
	"cart_verification_log" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"failure_reason" text,
	"queued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"purchased_at" timestamp with time zone,
	CONSTRAINT "supplier_purchases_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"display_name" text NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"mode" text DEFAULT 'mock' NOT NULL,
	"health_status" text DEFAULT 'unknown' NOT NULL,
	"last_health_check_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "fairness_proofs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rip_id" uuid NOT NULL,
	"pool_version_id" uuid NOT NULL,
	"pool_hash" text NOT NULL,
	"odds_hash" text NOT NULL,
	"server_seed_commitment" text NOT NULL,
	"revealed_server_seed" text NOT NULL,
	"client_nonce" text NOT NULL,
	"payment_identifier" text NOT NULL,
	"chain_randomness_input" text NOT NULL,
	"combined_seed_hash" text NOT NULL,
	"selection_roll" text NOT NULL,
	"selected_pool_entry_id" uuid NOT NULL,
	"algorithm_version" text DEFAULT 'packx402-fair-v1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fairness_proofs_rip_id_unique" UNIQUE("rip_id")
);
--> statement-breakpoint
CREATE TABLE "pack_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"pack_tier_id" uuid NOT NULL,
	"pool_version_id" uuid NOT NULL,
	"status" "pack_offer_status" DEFAULT 'DRAFT' NOT NULL,
	"chain" "chain" NOT NULL,
	"network_mode" text NOT NULL,
	"price_usdc_base_units" bigint NOT NULL,
	"shipping_usdc_base_units" bigint DEFAULT 0 NOT NULL,
	"supplier_fees_usdc_base_units" bigint DEFAULT 0 NOT NULL,
	"total_usdc_base_units" bigint NOT NULL,
	"merchant_address" text NOT NULL,
	"supplier_snapshot_hash" text,
	"server_seed_commitment" text NOT NULL,
	"server_seed_encrypted" text NOT NULL,
	"client_nonce" text NOT NULL,
	"is_free_pack" boolean DEFAULT false NOT NULL,
	"free_pack_claim_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pack_offer_id" uuid NOT NULL,
	"chain" "chain" NOT NULL,
	"network_mode" text NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"expected_amount_usdc_base_units" bigint NOT NULL,
	"settled_amount_usdc_base_units" bigint,
	"payer_address" text,
	"recipient_address" text NOT NULL,
	"token_identifier" text NOT NULL,
	"tx_hash_or_payment_id" text,
	"facilitator_receipt_id" text,
	"idempotency_key" text NOT NULL,
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_tx_hash_or_payment_id_unique" UNIQUE("tx_hash_or_payment_id"),
	CONSTRAINT "payments_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "rips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pack_offer_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"pool_entry_id" uuid NOT NULL,
	"card_name" text NOT NULL,
	"set_name" text NOT NULL,
	"card_number" text NOT NULL,
	"finish" text NOT NULL,
	"condition" text NOT NULL,
	"grade_label" text,
	"reference_value_usdc_base_units" bigint,
	"reference_value_as_of" timestamp with time zone,
	"is_public" boolean DEFAULT false NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rips_pack_offer_id_unique" UNIQUE("pack_offer_id"),
	CONSTRAINT "rips_payment_id_unique" UNIQUE("payment_id")
);
--> statement-breakpoint
CREATE TABLE "fulfillments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rip_id" uuid NOT NULL,
	"supplier_purchase_id" uuid,
	"shipping_address_id" uuid NOT NULL,
	"status" "fulfillment_status" DEFAULT 'opening_completed' NOT NULL,
	"carrier" text,
	"tracking_number" text,
	"tracking_url" text,
	"estimated_delivery_start" timestamp with time zone,
	"estimated_delivery_end" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fulfillments_rip_id_unique" UNIQUE("rip_id")
);
--> statement-breakpoint
CREATE TABLE "tracking_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fulfillment_id" uuid NOT NULL,
	"status" "fulfillment_status" NOT NULL,
	"note" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "free_pack_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"free_pack_grant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"pack_offer_id" uuid,
	"shipping_acknowledged" boolean DEFAULT false NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "free_pack_claims_free_pack_grant_id_unique" UNIQUE("free_pack_grant_id")
);
--> statement-breakpoint
CREATE TABLE "free_pack_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"pack_tier_id" uuid NOT NULL,
	"promotional_pool_version_id" uuid NOT NULL,
	"week_key" text NOT NULL,
	"reason" text NOT NULL,
	"loyalty_level_key" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_calculations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"window_end" timestamp with time zone NOT NULL,
	"eligible_fulfilled_spend_usdc_base_units" bigint NOT NULL,
	"excluded_refunds_usdc_base_units" bigint DEFAULT 0 NOT NULL,
	"excluded_affiliate_or_self_referral_usdc_base_units" bigint DEFAULT 0 NOT NULL,
	"resulting_level_key" "loyalty_level_key" NOT NULL,
	"previous_level_key" "loyalty_level_key",
	"kill_switch_active" boolean DEFAULT false NOT NULL,
	"input_order_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" "loyalty_level_key" NOT NULL,
	"name" text NOT NULL,
	"min_spend_usdc_base_units" bigint NOT NULL,
	"max_spend_usdc_base_units" bigint,
	"weekly_reward_pack_tier_id" uuid,
	"sort_order" integer NOT NULL,
	"is_max_beta_level" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loyalty_levels_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "referral_attributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referral_code_id" uuid NOT NULL,
	"referred_user_id" uuid NOT NULL,
	"status" "referral_attribution_status" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"qualifying_order_id" uuid,
	"reward_usdc_base_units" bigint,
	"reward_approved_at" timestamp with time zone,
	"reversed_at" timestamp with time zone,
	"reversed_reason" text,
	"requires_manual_review" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_attributions_referred_user_id_unique" UNIQUE("referred_user_id")
);
--> statement-breakpoint
CREATE TABLE "referral_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code" text NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_codes_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "referral_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "affiliate_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"is_public_profile_enabled" boolean DEFAULT false NOT NULL,
	"disclosure_text" text DEFAULT 'Paid partner of PackX402.' NOT NULL,
	"suspended_at" timestamp with time zone,
	"suspended_reason" text,
	"monthly_commission_cap_usdc_base_units" bigint NOT NULL,
	"attribution_window_days" integer DEFAULT 30 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "affiliate_accounts_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "affiliate_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "affiliate_application_status" DEFAULT 'pending' NOT NULL,
	"platform_description" text NOT NULL,
	"audience_description" text NOT NULL,
	"tax_info_status" text DEFAULT 'not_submitted' NOT NULL,
	"reviewed_by_admin_id" uuid,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "affiliate_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"affiliate_account_id" uuid NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"monthly_cap_usdc_base_units" bigint,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "affiliate_campaigns_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "affiliate_commissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"affiliate_account_id" uuid NOT NULL,
	"affiliate_campaign_id" uuid,
	"order_id" uuid NOT NULL,
	"status" "affiliate_commission_status" DEFAULT 'pending' NOT NULL,
	"commission_usdc_base_units" bigint NOT NULL,
	"pending_until" timestamp with time zone NOT NULL,
	"approved_at" timestamp with time zone,
	"reversed_at" timestamp with time zone,
	"reversed_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "affiliate_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"affiliate_account_id" uuid NOT NULL,
	"total_usdc_base_units" bigint NOT NULL,
	"approved_by_admin_id" uuid NOT NULL,
	"payout_reference" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "badges_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "challenge_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"requires_paid_purchase" boolean DEFAULT false NOT NULL,
	"badge_reward_id" uuid,
	"free_pack_entry_reward_eligible" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "challenges_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "club_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clubs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"rules" text,
	"requires_join_approval" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clubs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"body" text NOT NULL,
	"removed_at" timestamp with time zone,
	"removed_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"follower_id" uuid NOT NULL,
	"following_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email_enabled" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"push_enabled" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link_url" text,
	"read_at" timestamp with time zone,
	"email_sent" boolean DEFAULT false NOT NULL,
	"push_sent" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pull_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"rip_id" uuid NOT NULL,
	"caption" text,
	"include_animation_replay" boolean DEFAULT false NOT NULL,
	"affiliate_disclosure" boolean DEFAULT false NOT NULL,
	"visibility" "social_visibility" DEFAULT 'public' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"kind" text DEFAULT 'like' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"resolved_by_admin_id" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "showcase_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"showcase_id" uuid NOT NULL,
	"rip_id" uuid NOT NULL,
	"sort_order" text DEFAULT '0' NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "showcases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"cover_image_url" text,
	"visibility" "social_visibility" DEFAULT 'public' NOT NULL,
	"comments_enabled" boolean DEFAULT true NOT NULL,
	"followable" boolean DEFAULT true NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "showcases_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "social_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"kind" text NOT NULL,
	"body" text,
	"ref_id" uuid,
	"visibility" "social_visibility" DEFAULT 'public' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"badge_id" uuid NOT NULL,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"daily_limit_usdc_base_units" bigint,
	"weekly_limit_usdc_base_units" bigint,
	"monthly_limit_usdc_base_units" bigint,
	"pending_daily_limit_usdc_base_units" bigint,
	"pending_weekly_limit_usdc_base_units" bigint,
	"pending_monthly_limit_usdc_base_units" bigint,
	"increase_effective_at" timestamp with time zone,
	"cool_off_until" timestamp with time zone,
	"paused_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_limits_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "self_exclusions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"reason" text,
	"started_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"lifted_by_admin_id" uuid,
	"lifted_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "self_exclusions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "support_case_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"support_case_id" uuid NOT NULL,
	"author_admin_id" uuid,
	"author_user_id" uuid,
	"is_internal" text DEFAULT 'false' NOT NULL,
	"body" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "support_case_type" NOT NULL,
	"status" "support_case_status" DEFAULT 'open' NOT NULL,
	"subject" text NOT NULL,
	"description" text NOT NULL,
	"linked_payment_id" uuid,
	"linked_supplier_order_id" uuid,
	"assigned_admin_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_type" "audit_event_actor_type" NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" uuid,
	"reason" text,
	"correlation_id" text NOT NULL,
	"before_state" jsonb,
	"after_state" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_user_id" uuid NOT NULL,
	"action_type" "moderation_action_type" NOT NULL,
	"reason" text NOT NULL,
	"report_id" uuid,
	"moderator_admin_id" uuid NOT NULL,
	"appeal_note" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"type" "security_event_type" NOT NULL,
	"ip_hash" text,
	"user_agent" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"reauthenticated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"description" text NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_by_admin_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feature_flags_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "eligibility_records" ADD CONSTRAINT "eligibility_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_codes" ADD CONSTRAINT "recovery_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_addresses" ADD CONSTRAINT "shipping_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_identities" ADD CONSTRAINT "wallet_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_entries" ADD CONSTRAINT "pool_entries_pool_version_id_pool_versions_id_fk" FOREIGN KEY ("pool_version_id") REFERENCES "public"."pool_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_entries" ADD CONSTRAINT "pool_entries_supplier_listing_id_supplier_listings_id_fk" FOREIGN KEY ("supplier_listing_id") REFERENCES "public"."supplier_listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_versions" ADD CONSTRAINT "pool_versions_pack_tier_id_pack_tiers_id_fk" FOREIGN KEY ("pack_tier_id") REFERENCES "public"."pack_tiers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_inventory_snapshots" ADD CONSTRAINT "supplier_inventory_snapshots_supplier_listing_id_supplier_listings_id_fk" FOREIGN KEY ("supplier_listing_id") REFERENCES "public"."supplier_listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_listings" ADD CONSTRAINT "supplier_listings_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_purchases" ADD CONSTRAINT "supplier_purchases_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_purchases" ADD CONSTRAINT "supplier_purchases_supplier_listing_id_supplier_listings_id_fk" FOREIGN KEY ("supplier_listing_id") REFERENCES "public"."supplier_listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fairness_proofs" ADD CONSTRAINT "fairness_proofs_rip_id_rips_id_fk" FOREIGN KEY ("rip_id") REFERENCES "public"."rips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fairness_proofs" ADD CONSTRAINT "fairness_proofs_pool_version_id_pool_versions_id_fk" FOREIGN KEY ("pool_version_id") REFERENCES "public"."pool_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fairness_proofs" ADD CONSTRAINT "fairness_proofs_selected_pool_entry_id_pool_entries_id_fk" FOREIGN KEY ("selected_pool_entry_id") REFERENCES "public"."pool_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pack_offers" ADD CONSTRAINT "pack_offers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pack_offers" ADD CONSTRAINT "pack_offers_pack_tier_id_pack_tiers_id_fk" FOREIGN KEY ("pack_tier_id") REFERENCES "public"."pack_tiers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pack_offers" ADD CONSTRAINT "pack_offers_pool_version_id_pool_versions_id_fk" FOREIGN KEY ("pool_version_id") REFERENCES "public"."pool_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_pack_offer_id_pack_offers_id_fk" FOREIGN KEY ("pack_offer_id") REFERENCES "public"."pack_offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rips" ADD CONSTRAINT "rips_pack_offer_id_pack_offers_id_fk" FOREIGN KEY ("pack_offer_id") REFERENCES "public"."pack_offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rips" ADD CONSTRAINT "rips_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rips" ADD CONSTRAINT "rips_pool_entry_id_pool_entries_id_fk" FOREIGN KEY ("pool_entry_id") REFERENCES "public"."pool_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillments" ADD CONSTRAINT "fulfillments_rip_id_rips_id_fk" FOREIGN KEY ("rip_id") REFERENCES "public"."rips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillments" ADD CONSTRAINT "fulfillments_supplier_purchase_id_supplier_purchases_id_fk" FOREIGN KEY ("supplier_purchase_id") REFERENCES "public"."supplier_purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_fulfillment_id_fulfillments_id_fk" FOREIGN KEY ("fulfillment_id") REFERENCES "public"."fulfillments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "free_pack_claims" ADD CONSTRAINT "free_pack_claims_free_pack_grant_id_free_pack_grants_id_fk" FOREIGN KEY ("free_pack_grant_id") REFERENCES "public"."free_pack_grants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "free_pack_claims" ADD CONSTRAINT "free_pack_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "free_pack_grants" ADD CONSTRAINT "free_pack_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "free_pack_grants" ADD CONSTRAINT "free_pack_grants_pack_tier_id_pack_tiers_id_fk" FOREIGN KEY ("pack_tier_id") REFERENCES "public"."pack_tiers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "free_pack_grants" ADD CONSTRAINT "free_pack_grants_promotional_pool_version_id_pool_versions_id_fk" FOREIGN KEY ("promotional_pool_version_id") REFERENCES "public"."pool_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_calculations" ADD CONSTRAINT "loyalty_calculations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_levels" ADD CONSTRAINT "loyalty_levels_weekly_reward_pack_tier_id_pack_tiers_id_fk" FOREIGN KEY ("weekly_reward_pack_tier_id") REFERENCES "public"."pack_tiers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_attributions" ADD CONSTRAINT "referral_attributions_referral_code_id_referral_codes_id_fk" FOREIGN KEY ("referral_code_id") REFERENCES "public"."referral_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_attributions" ADD CONSTRAINT "referral_attributions_referred_user_id_users_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_accounts" ADD CONSTRAINT "affiliate_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_accounts" ADD CONSTRAINT "affiliate_accounts_application_id_affiliate_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."affiliate_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_applications" ADD CONSTRAINT "affiliate_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_campaigns" ADD CONSTRAINT "affiliate_campaigns_affiliate_account_id_affiliate_accounts_id_fk" FOREIGN KEY ("affiliate_account_id") REFERENCES "public"."affiliate_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_affiliate_account_id_affiliate_accounts_id_fk" FOREIGN KEY ("affiliate_account_id") REFERENCES "public"."affiliate_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_affiliate_campaign_id_affiliate_campaigns_id_fk" FOREIGN KEY ("affiliate_campaign_id") REFERENCES "public"."affiliate_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_payouts" ADD CONSTRAINT "affiliate_payouts_affiliate_account_id_affiliate_accounts_id_fk" FOREIGN KEY ("affiliate_account_id") REFERENCES "public"."affiliate_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_id_users_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_id_users_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_completions" ADD CONSTRAINT "challenge_completions_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_completions" ADD CONSTRAINT "challenge_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_badge_reward_id_badges_id_fk" FOREIGN KEY ("badge_reward_id") REFERENCES "public"."badges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_posts" ADD CONSTRAINT "pull_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_posts" ADD CONSTRAINT "pull_posts_rip_id_rips_id_fk" FOREIGN KEY ("rip_id") REFERENCES "public"."rips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showcase_cards" ADD CONSTRAINT "showcase_cards_showcase_id_showcases_id_fk" FOREIGN KEY ("showcase_id") REFERENCES "public"."showcases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showcase_cards" ADD CONSTRAINT "showcase_cards_rip_id_rips_id_fk" FOREIGN KEY ("rip_id") REFERENCES "public"."rips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showcases" ADD CONSTRAINT "showcases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_limits" ADD CONSTRAINT "purchase_limits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "self_exclusions" ADD CONSTRAINT "self_exclusions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_case_events" ADD CONSTRAINT "support_case_events_support_case_id_support_cases_id_fk" FOREIGN KEY ("support_case_id") REFERENCES "public"."support_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_cases" ADD CONSTRAINT "support_cases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_nonces_expires_at_idx" ON "auth_nonces" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "eligibility_records_user_id_idx" ON "eligibility_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recovery_codes_user_id_idx" ON "recovery_codes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "shipping_addresses_user_id_idx" ON "shipping_addresses" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_unique" ON "users" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_identities_chain_address_unique" ON "wallet_identities" USING btree ("chain","address");--> statement-breakpoint
CREATE INDEX "wallet_identities_user_id_idx" ON "wallet_identities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pool_entries_pool_version_id_idx" ON "pool_entries" USING btree ("pool_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pool_versions_tier_label_unique" ON "pool_versions" USING btree ("pack_tier_id","version_label");--> statement-breakpoint
CREATE INDEX "pool_versions_pack_tier_id_idx" ON "pool_versions" USING btree ("pack_tier_id");--> statement-breakpoint
CREATE INDEX "supplier_inventory_snapshots_listing_id_idx" ON "supplier_inventory_snapshots" USING btree ("supplier_listing_id");--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_listings_external_unique" ON "supplier_listings" USING btree ("supplier_id","external_listing_id");--> statement-breakpoint
CREATE INDEX "supplier_listings_supplier_id_idx" ON "supplier_listings" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "supplier_purchases_rip_id_idx" ON "supplier_purchases" USING btree ("rip_id");--> statement-breakpoint
CREATE INDEX "supplier_purchases_status_idx" ON "supplier_purchases" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "fairness_proofs_rip_id_unique" ON "fairness_proofs" USING btree ("rip_id");--> statement-breakpoint
CREATE INDEX "pack_offers_user_id_idx" ON "pack_offers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pack_offers_status_idx" ON "pack_offers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pack_offers_expires_at_idx" ON "pack_offers" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "payments_pack_offer_id_idx" ON "payments" USING btree ("pack_offer_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rips_pool_entry_id_idx" ON "rips" USING btree ("pool_entry_id");--> statement-breakpoint
CREATE INDEX "fulfillments_rip_id_idx" ON "fulfillments" USING btree ("rip_id");--> statement-breakpoint
CREATE INDEX "fulfillments_status_idx" ON "fulfillments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tracking_events_fulfillment_id_idx" ON "tracking_events" USING btree ("fulfillment_id");--> statement-breakpoint
CREATE INDEX "free_pack_claims_user_id_idx" ON "free_pack_claims" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "free_pack_grants_user_week_unique" ON "free_pack_grants" USING btree ("user_id","week_key","reason");--> statement-breakpoint
CREATE INDEX "free_pack_grants_user_id_idx" ON "free_pack_grants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "loyalty_calculations_user_id_idx" ON "loyalty_calculations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "loyalty_calculations_calculated_at_idx" ON "loyalty_calculations" USING btree ("calculated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_attributions_referred_user_unique" ON "referral_attributions" USING btree ("referred_user_id");--> statement-breakpoint
CREATE INDEX "referral_attributions_referral_code_id_idx" ON "referral_attributions" USING btree ("referral_code_id");--> statement-breakpoint
CREATE INDEX "affiliate_campaigns_affiliate_account_id_idx" ON "affiliate_campaigns" USING btree ("affiliate_account_id");--> statement-breakpoint
CREATE INDEX "affiliate_commissions_affiliate_account_id_idx" ON "affiliate_commissions" USING btree ("affiliate_account_id");--> statement-breakpoint
CREATE INDEX "affiliate_commissions_status_idx" ON "affiliate_commissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "affiliate_payouts_affiliate_account_id_idx" ON "affiliate_payouts" USING btree ("affiliate_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "blocks_blocker_blocked_unique" ON "blocks" USING btree ("blocker_id","blocked_id");--> statement-breakpoint
CREATE UNIQUE INDEX "challenge_completions_challenge_user_unique" ON "challenge_completions" USING btree ("challenge_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "club_members_club_user_unique" ON "club_members" USING btree ("club_id","user_id");--> statement-breakpoint
CREATE INDEX "comments_target_idx" ON "comments" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "follows_follower_following_unique" ON "follows" USING btree ("follower_id","following_id");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_read_at_idx" ON "notifications" USING btree ("read_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pull_posts_rip_id_unique" ON "pull_posts" USING btree ("rip_id");--> statement-breakpoint
CREATE INDEX "pull_posts_user_id_idx" ON "pull_posts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reactions_user_target_unique" ON "reactions" USING btree ("user_id","target_type","target_id","kind");--> statement-breakpoint
CREATE INDEX "reports_target_idx" ON "reports" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "showcase_cards_showcase_rip_unique" ON "showcase_cards" USING btree ("showcase_id","rip_id");--> statement-breakpoint
CREATE INDEX "showcases_user_id_idx" ON "showcases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "social_posts_user_id_idx" ON "social_posts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_badges_user_badge_unique" ON "user_badges" USING btree ("user_id","badge_id");--> statement-breakpoint
CREATE INDEX "self_exclusions_user_id_idx" ON "self_exclusions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "support_case_events_support_case_id_idx" ON "support_case_events" USING btree ("support_case_id");--> statement-breakpoint
CREATE INDEX "support_cases_user_id_idx" ON "support_cases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "support_cases_status_idx" ON "support_cases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_events_actor_idx" ON "audit_events" USING btree ("actor_type","actor_id");--> statement-breakpoint
CREATE INDEX "audit_events_target_idx" ON "audit_events" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "audit_events_correlation_id_idx" ON "audit_events" USING btree ("correlation_id");--> statement-breakpoint
CREATE INDEX "moderation_actions_target_user_id_idx" ON "moderation_actions" USING btree ("target_user_id");--> statement-breakpoint
CREATE INDEX "security_events_user_id_idx" ON "security_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "security_events_type_idx" ON "security_events" USING btree ("type");