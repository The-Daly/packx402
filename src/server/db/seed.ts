import { scriptDb as db, closeScriptDb } from "./script-client";
import { packTiers, poolVersions, poolEntries, suppliers, supplierListings } from "./schema";
import { PACK_TIERS } from "@/server/config/pack-tiers";
import { sha256Hex } from "@/server/fairness/engine";
import { MOCK_CARDTRADER_INVENTORY } from "@/server/suppliers/cardtrader/fixtures";
import { eq } from "drizzle-orm";

/**
 * Seeds the fixed pack tier catalog, one CardTrader mock-mode supplier, its fixture
 * listings, and a published pool version + entries for every one of the 14 pack tiers
 * (commons + a chase card drawn from the fixture ladder, scaled to each tier's
 * procurement cap) so the marketplace, pack-detail odds table, and opening flow are
 * demoable end to end in mock/testnet mode for every tier, not just a couple.
 *
 * Run with: npm run db:seed (requires `docker compose up -d && npm run db:migrate` first).
 */

// Commons carry the bulk of the weight; the single most expensive eligible fixture
// becomes the tier's "chase" card at a small weight — a simple, transparent stand-in for
// real supplier-driven odds curation, not a claim about real-world pull rates.
const COMMON_WEIGHTS = [550, 300, 100]; // sums to 950 when 3 commons are available
const CHASE_WEIGHT = 50;

function buildPoolEntriesForTier(procurementCapUsdcBaseUnits: number) {
  const eligible = MOCK_CARDTRADER_INVENTORY.filter(
    (f) => f.priceUsdcBaseUnits <= procurementCapUsdcBaseUnits,
  ).sort((a, b) => a.priceUsdcBaseUnits - b.priceUsdcBaseUnits);

  if (eligible.length === 0) return [];

  const chase = eligible[eligible.length - 1];
  const commonsPool = eligible.slice(0, -1);
  const commons = commonsPool.slice(0, Math.min(3, commonsPool.length));

  const totalCommonWeight = COMMON_WEIGHTS.slice(0, commons.length).reduce((a, b) => a + b, 0);
  const entries = commons.map((fixture, i) => ({
    fixture,
    weight: COMMON_WEIGHTS[i],
    probabilityBandLabel: `~${Math.round((COMMON_WEIGHTS[i] / (totalCommonWeight + (commons.length > 0 ? CHASE_WEIGHT : 0))) * 100)}%`,
  }));

  if (chase && chase.externalListingId !== commons[commons.length - 1]?.externalListingId) {
    const denom = totalCommonWeight + CHASE_WEIGHT;
    entries.push({
      fixture: chase,
      weight: CHASE_WEIGHT,
      probabilityBandLabel: `~${Math.round((CHASE_WEIGHT / denom) * 100)}% (chase)`,
    });
  }

  return entries;
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

    const entriesSpec = buildPoolEntriesForTier(tierRow.procurementPriceCapUsdcBaseUnits);
    if (entriesSpec.length === 0) {
      console.log(`  ${tierDef.key}: no eligible fixtures under its procurement cap, skipping`);
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
        versionLabel: "2026-08-01.1",
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
