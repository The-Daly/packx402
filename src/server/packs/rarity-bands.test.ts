import { describe, expect, it } from "vitest";
import {
  RARITY_BANDS,
  maxObtainableValueMultiplier,
  pickFixtureForBand,
  rarityBandsForTierPrice,
} from "./rarity-bands";

describe("RARITY_BANDS", () => {
  it("odds sum to exactly 10000 (100.00%)", () => {
    const total = RARITY_BANDS.reduce((sum, b) => sum + b.oddsPer10000, 0);
    expect(total).toBe(10_000);
  });

  it("bands are contiguous and ascending, common through grail", () => {
    const keys = RARITY_BANDS.map((b) => b.key);
    expect(keys).toEqual(["common", "uncommon", "rare", "epic", "legendary", "grail"]);
    for (let i = 1; i < RARITY_BANDS.length; i++) {
      expect(RARITY_BANDS[i].minPriceMultiplier).toBeGreaterThanOrEqual(
        RARITY_BANDS[i - 1].minPriceMultiplier,
      );
    }
  });

  it("maxObtainableValueMultiplier matches the Grail band's upper bound", () => {
    expect(maxObtainableValueMultiplier()).toBe(20);
  });
});

describe("rarityBandsForTierPrice", () => {
  it("reproduces the $5 tier's example price bands exactly", () => {
    const bands = rarityBandsForTierPrice(5_000_000); // $5 in USDC base units
    const byKey = Object.fromEntries(bands.map((b) => [b.key, b]));

    expect(byKey.uncommon.minPriceUsdcBaseUnits).toBe(2_000_000); // $2
    expect(byKey.uncommon.maxPriceUsdcBaseUnits).toBe(5_000_000); // $5
    expect(byKey.rare.minPriceUsdcBaseUnits).toBe(5_000_000); // $5
    expect(byKey.rare.maxPriceUsdcBaseUnits).toBe(6_000_000); // $6
    expect(byKey.epic.minPriceUsdcBaseUnits).toBe(6_000_000); // $6
    expect(byKey.epic.maxPriceUsdcBaseUnits).toBe(7_000_000); // $7
    expect(byKey.legendary.minPriceUsdcBaseUnits).toBe(7_000_000); // $7
    expect(byKey.legendary.maxPriceUsdcBaseUnits).toBe(9_000_000); // $9
    expect(byKey.grail.minPriceUsdcBaseUnits).toBe(9_000_000); // $9
    expect(byKey.grail.maxPriceUsdcBaseUnits).toBe(100_000_000); // $100
  });

  it("scales proportionally for a different tier price", () => {
    const bands = rarityBandsForTierPrice(10_000_000); // $10
    const grail = bands.find((b) => b.key === "grail")!;
    expect(grail.minPriceUsdcBaseUnits).toBe(18_000_000); // $18
    expect(grail.maxPriceUsdcBaseUnits).toBe(200_000_000); // $200
  });
});

describe("pickFixtureForBand", () => {
  const band = {
    key: "rare" as const,
    label: "Rare",
    oddsPer10000: 1610,
    minPriceUsdcBaseUnits: 5_000_000,
    maxPriceUsdcBaseUnits: 6_000_000,
  };

  it("picks a fixture whose price falls inside the band", () => {
    const candidates = [
      { id: "a", priceUsdcBaseUnits: 1_000_000 },
      { id: "b", priceUsdcBaseUnits: 5_500_000 },
      { id: "c", priceUsdcBaseUnits: 20_000_000 },
    ];
    expect(pickFixtureForBand(candidates, band)?.id).toBe("b");
  });

  it("falls back to the closest fixture when none fall inside the band", () => {
    const candidates = [
      { id: "a", priceUsdcBaseUnits: 1_000_000 },
      { id: "b", priceUsdcBaseUnits: 8_000_000 },
    ];
    // Band midpoint is 5.5M; 8M (2.5M away) is closer than 1M (4.5M away).
    expect(pickFixtureForBand(candidates, band)?.id).toBe("b");
  });

  it("returns null for an empty candidate list", () => {
    expect(pickFixtureForBand([], band)).toBeNull();
  });
});
