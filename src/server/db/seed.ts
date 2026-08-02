import { scriptDb as db, closeScriptDb } from "./script-client";
import { packTiers, poolVersions, poolEntries, suppliers, supplierListings } from "./schema";
import { PACK_TIERS } from "@/server/config/pack-tiers";
import { sha256Hex } from "@/server/fairness/engine";
import { MOCK_CARDTRADER_INVENTORY } from "@/server/suppliers/cardtrader/fixtures";
import { rarityBandsForTierPrice, pickFixtureForBand } from "@/server/packs/rarity-bands";
import { eq } from "drizzle-orm";

/**
 * Seeds the fixed pack tier catalog, one CardTrader mock-mode supplier, its fixture
 * listings, and a published pool version + entries for every one of the 14 pack tiers so
 * the marketplace, pack-detail odds table, and opening flow are demoable end to end in
 * mock/testnet mode for every tier, not just a couple.
 *
 * Pool entries follow the six-rarity structure in
 * src/server/packs/rarity-bands.ts (Common/Uncommon/Rare/Epic/Legendary/Grail, fixed odds,
 * price bands scaled to each tier's own price) — one representative fixture per rarity,
 * picked from the mock fixture ladder via `pickFixtureForBand`, which now also enforces a
 * HARD absolute price cap (the tier's own `procurementPriceCapUsdcBaseUnits`) so a cheap
 * tier can never fall back onto a wildly expensive fixture just because its band has no
 * in-range candidate. The ladder (src/server/suppliers/cardtrader/fixtures.ts) is 180 real
 * Pokemon cards + 20 real Yu-Gi-Oh cards with real 2026-08-02 tcgplayer market prices,
 * spanning $0.05-$1,300 — still a mock CardTrader listing (see AGENTS.md), but card
 * identity/pricing is real, not hand-invented. A real supplier catalog would curate
 * multiple listings per band; this is a simple, transparent stand-in, not a claim about
 * real-world pull rates.
 *
 * Run with: npm run db:seed (requires `docker compose up -d && npm run db:migrate` first).
 */

function buildPoolEntriesForTier(
  tierPriceUsdcBaseUnits: number,
  procurementPriceCapUsdcBaseUnits: number,
) {
  const bands = rarityBandsForTierPrice(tierPriceUsdcBaseUnits);

  return bands
    .map((band) => {
      // Hard absolute cap — never just the band's own max — so a cheap tier can never
      // fall back onto a wildly expensive fixture if its band has no in-range candidate.
      const fixture = pickFixtureForBand(
        MOCK_CARDTRADER_INVENTORY,
        band,
        procurementPriceCapUsdcBaseUnits,
      );
      if (!fixture) return null;
      return {
        fixture,
        weight: band.oddsPer10000,
        probabilityBandLabel: `${band.label} (~${(band.oddsPer10000 / 100).toFixed(2)}%)`,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);
}

async function main() {
  console.log("Seeding pack tiers...");
  for (const tier of PACK_TIERS) {
    await db
      .insert(packTiers)
      .values({
        key: tier.key,
        name: tier.name,
        priceUsdcBaseUnits: tier.priceUsdcBaseUnits,
        sortOrder: tier.sortOrder,
        shippingTreatment: tier.shippingTreatment,
        estimatedShippingUsdcBaseUnits: tier.estimatedShippingUsdcBaseUnits,
        cardGames: tier.cardGames,
        minDisclosedCondition: tier.minDisclosedCondition,
        procurementPriceCapUsdcBaseUnits: tier.procurementPriceCapUsdcBaseUnits,
        availableTestnet: tier.availableTestnet,
        availableAlgorandMainnet: tier.availableAlgorandMainnet,
        availableSolana: tier.availableSolana,
        availableEvm: tier.availableEvm,
        requiresHighValueReleaseGate: tier.requiresHighValueReleaseGate,
        locked: tier.locked,
        weeklyFreePackEligible: tier.weeklyFreePackEligible,
      })
      .onConflictDoUpdate({
        target: packTiers.key,
        set: { priceUsdcBaseUnits: tier.priceUsdcBaseUnits, updatedAt: new Date() },
      });
  }

  console.log("Seeding CardTrader (mock) supplier + listings...");
  const [supplier] = await db
    .insert(suppliers)
    .values({
      key: "cardtrader",
      displayName: "CardTrader",
      isEnabled: true,
      mode: "mock",
      healthStatus: "healthy",
    })
    .onConflictDoUpdate({ target: suppliers.key, set: { healthStatus: "healthy" } })
    .returning();

  const listingIds: Record<string, string> = {};
  for (const fixture of MOCK_CARDTRADER_INVENTORY) {
    const [row] = await db
      .insert(supplierListings)
      .values({
        supplierId: supplier.id,
        externalListingId: fixture.externalListingId,
        externalSellerId: fixture.externalSellerId,
        cardGame: fixture.cardGame,
        cardName: fixture.cardName,
        setName: fixture.setName,
        cardNumber: fixture.cardNumber,
        language: fixture.language,
        finish: fixture.finish as
          "normal" | "holofoil" | "reverse_holofoil" | "first_edition" | "other_foil",
        condition: fixture.condition as
          | "mint"
          | "near_mint"
          | "lightly_played"
          | "moderately_played"
          | "heavily_played"
          | "damaged",
        quantityAvailable: fixture.quantityAvailable,
        priceUsdcBaseUnits: fixture.priceUsdcBaseUnits,
        shipsToCustomer: fixture.shipsToCustomer,
        imageUsePermitted: fixture.imageUsePermitted,
        sellerReliabilityScore: fixture.sellerReliabilityScore,
        lastRefreshedAt: fixture.lastRefreshedAt,
        isEligible: true,
      })
      .onConflictDoUpdate({
        target: [supplierListings.supplierId, supplierListings.externalListingId],
        set: { lastRefreshedAt: new Date() },
      })
      .returning({ id: supplierListings.id });
    listingIds[fixture.externalListingId] = row.id;
  }

  console.log("Publishing pool versions for all 14 tiers...");
  for (const tierDef of PACK_TIERS) {
    const [tierRow] = await db
      .select()
      .from(packTiers)
      .where(eq(packTiers.key, tierDef.key))
      .limit(1);
    if (!tierRow) continue;

    const entriesSpec = buildPoolEntriesForTier(
      tierRow.priceUsdcBaseUnits,
      tierRow.procurementPriceCapUsdcBaseUnits,
    );
    if (entriesSpec.length === 0) {
      console.log(`  ${tierDef.key}: no fixtures available, skipping`);
      continue;
    }

    const poolHash = sha256Hex(
      `${tierDef.key}:${entriesSpec.map((e) => e.fixture.externalListingId).join(",")}`,
    );
    const oddsHash = sha256Hex(`${tierDef.key}:odds:${entriesSpec.map((e) => e.weight).join(",")}`);
    const totalWeight = entriesSpec.reduce((acc, e) => acc + e.weight, 0);

    const [pool] = await db
      .insert(poolVersions)
      .values({
        packTierId: tierRow.id,
        versionLabel: "2026-08-02.3", // bumped: expanded fixture ladder (180 real Pokemon cards) + hard price-cap fix
        isPromotional: false,
        poolHash,
        oddsHash,
        supplierSnapshotHash: sha256Hex(`snapshot:${tierDef.key}`),
        totalWeight,
        cardCountTotal: entriesSpec.length,
      })
      .onConflictDoNothing({ target: [poolVersions.packTierId, poolVersions.versionLabel] })
      .returning();

    if (!pool) continue; // already seeded

    for (const spec of entriesSpec) {
      await db.insert(poolEntries).values({
        poolVersionId: pool.id,
        cardGame: spec.fixture.cardGame,
        cardName: spec.fixture.cardName,
        setName: spec.fixture.setName,
        cardNumber: spec.fixture.cardNumber,
        finish: spec.fixture.finish,
        minCondition: spec.fixture.condition,
        weight: spec.weight,
        probabilityBandLabel: spec.probabilityBandLabel,
        referenceValueUsdcBaseUnits: spec.fixture.priceUsdcBaseUnits,
        referenceValueAsOf: new Date(),
        supplierListingId: listingIds[spec.fixture.externalListingId],
      });
    }
    console.log(`  ${tierDef.key}: ${entriesSpec.length} pool entries`);
  }

  console.log("Seed complete.");
}

main()
  .then(async () => {
    await closeScriptDb();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("Seed failed:", err);
    await closeScriptDb();
    process.exit(1);
  });
