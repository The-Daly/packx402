import { scriptDb as db, closeScriptDb } from "./script-client";
import { packTiers, poolVersions, poolEntries, suppliers, supplierListings } from "./schema";
import { PACK_TIERS } from "@/server/config/pack-tiers";
import { sha256Hex } from "@/server/fairness/engine";
import { MOCK_CARDTRADER_INVENTORY } from "@/server/suppliers/cardtrader/fixtures";
import { eq } from "drizzle-orm";

/**
 * Seeds the fixed pack tier catalog, one CardTrader mock-mode supplier, its fixture
 * listings, and a published pool version + entries for the Spark and Gold tiers so the
 * marketplace and opening flow are demoable end to end in mock/testnet mode.
 *
 * Run with: npm run db:seed (requires `docker compose up -d && npm run db:migrate` first).
 */
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

  console.log("Publishing pool versions for Spark and Gold...");
  for (const tierKey of ["spark", "gold"] as const) {
    const [tierRow] = await db.select().from(packTiers).where(eq(packTiers.key, tierKey)).limit(1);
    if (!tierRow) continue;

    const entriesSpec =
      tierKey === "spark"
        ? [
            { fixtureId: "mock-listing-001", weight: 800, probabilityBandLabel: "~80%" },
            { fixtureId: "mock-listing-002", weight: 200, probabilityBandLabel: "~20%" },
          ]
        : [
            { fixtureId: "mock-listing-002", weight: 600, probabilityBandLabel: "~60%" },
            { fixtureId: "mock-listing-004", weight: 350, probabilityBandLabel: "~35%" },
            { fixtureId: "mock-listing-003", weight: 50, probabilityBandLabel: "~5% (chase)" },
          ];

    const poolHash = sha256Hex(`${tierKey}:${entriesSpec.map((e) => e.fixtureId).join(",")}`);
    const oddsHash = sha256Hex(`${tierKey}:odds:${entriesSpec.map((e) => e.weight).join(",")}`);
    const totalWeight = entriesSpec.reduce((acc, e) => acc + e.weight, 0);

    const [pool] = await db
      .insert(poolVersions)
      .values({
        packTierId: tierRow.id,
        versionLabel: "2026-08-01.1",
        isPromotional: false,
        poolHash,
        oddsHash,
        supplierSnapshotHash: sha256Hex(`snapshot:${tierKey}`),
        totalWeight,
        cardCountTotal: entriesSpec.length,
      })
      .onConflictDoNothing({ target: [poolVersions.packTierId, poolVersions.versionLabel] })
      .returning();

    if (!pool) continue; // already seeded

    for (const spec of entriesSpec) {
      const fixture = MOCK_CARDTRADER_INVENTORY.find(
        (f) => f.externalListingId === spec.fixtureId,
      )!;
      await db.insert(poolEntries).values({
        poolVersionId: pool.id,
        cardGame: fixture.cardGame,
        cardName: fixture.cardName,
        setName: fixture.setName,
        cardNumber: fixture.cardNumber,
        finish: fixture.finish,
        minCondition: fixture.condition,
        weight: spec.weight,
        probabilityBandLabel: spec.probabilityBandLabel,
        referenceValueUsdcBaseUnits: fixture.priceUsdcBaseUnits,
        referenceValueAsOf: new Date(),
        supplierListingId: listingIds[spec.fixtureId],
      });
    }
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
