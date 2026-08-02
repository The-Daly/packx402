CREATE TYPE "public"."rip_kind" AS ENUM('primary', 'bonus_flip');--> statement-breakpoint
ALTER TABLE "rips" DROP CONSTRAINT "rips_pack_offer_id_unique";--> statement-breakpoint
ALTER TABLE "rips" DROP CONSTRAINT "rips_payment_id_unique";--> statement-breakpoint
ALTER TABLE "rips" ADD COLUMN "kind" "rip_kind" DEFAULT 'primary' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "rips_pack_offer_id_kind_unique" ON "rips" USING btree ("pack_offer_id","kind");