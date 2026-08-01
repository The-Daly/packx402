import { describe, expect, it } from "vitest";
import { evaluateListingEligibility, type ListingEligibilityInput } from "./eligibility";

const now = new Date("2026-08-01T12:00:00Z");

function baseInput(overrides: Partial<ListingEligibilityInput> = {}): ListingEligibilityInput {
  return {
    quantityAvailable: 3,
    sellerOnVacation: false,
    shipsToCustomerCountry: true,
    cardIdentityKnown: true,
    setAndNumberKnown: true,
    conditionKnown: true,
    languageKnown: true,
    finishKnown: true,
    gradeKnownIfGraded: true,
    priceUsdcBaseUnits: 4_000_000,
    tierProcurementCapUsdcBaseUnits: 5_000_000,
    sellerReliabilityScore: 95,
    minimumSellerReliabilityScore: 80,
    lastRefreshedAt: new Date("2026-08-01T11:00:00Z"),
    maxInventoryAgeMs: 6 * 60 * 60 * 1000,
    shippingEstimable: true,
    imageUsePermitted: true,
    now,
    ...overrides,
  };
}

describe("evaluateListingEligibility", () => {
  it("accepts a listing that satisfies every rule", () => {
    const result = evaluateListingEligibility(baseInput());
    expect(result.eligible).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it("rejects zero-quantity listings", () => {
    const result = evaluateListingEligibility(baseInput({ quantityAvailable: 0 }));
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("no_quantity_available");
  });

  it("rejects sellers on vacation", () => {
    const result = evaluateListingEligibility(baseInput({ sellerOnVacation: true }));
    expect(result.reasons).toContain("seller_on_vacation");
  });

  it("rejects listings priced above the tier's procurement cap", () => {
    const result = evaluateListingEligibility(
      baseInput({ priceUsdcBaseUnits: 6_000_000, tierProcurementCapUsdcBaseUnits: 5_000_000 }),
    );
    expect(result.reasons).toContain("exceeds_tier_procurement_limit");
  });

  it("rejects sellers below the reliability threshold", () => {
    const result = evaluateListingEligibility(baseInput({ sellerReliabilityScore: 50 }));
    expect(result.reasons).toContain("seller_reliability_below_threshold");
  });

  it("rejects a null reliability score", () => {
    const result = evaluateListingEligibility(baseInput({ sellerReliabilityScore: null }));
    expect(result.reasons).toContain("seller_reliability_below_threshold");
  });

  it("rejects stale inventory snapshots", () => {
    const result = evaluateListingEligibility(
      baseInput({ lastRefreshedAt: new Date("2026-08-01T00:00:00Z") }),
    );
    expect(result.reasons).toContain("inventory_snapshot_stale");
  });

  it("accumulates multiple simultaneous failures", () => {
    const result = evaluateListingEligibility(
      baseInput({ quantityAvailable: 0, sellerOnVacation: true, imageUsePermitted: false }),
    );
    expect(result.eligible).toBe(false);
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        "no_quantity_available",
        "seller_on_vacation",
        "image_use_not_permitted",
      ]),
    );
    expect(result.reasons.length).toBe(3);
  });
});
