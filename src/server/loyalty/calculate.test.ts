import { describe, expect, it } from "vitest";
import {
  computeEligibleSpend,
  determineCappedRewardLevel,
  determineLoyaltyLevel,
} from "./calculate";

describe("determineLoyaltyLevel", () => {
  it("returns member for zero spend", () => {
    expect(determineLoyaltyLevel(0).key).toBe("member");
  });

  it("returns copper at the $25 boundary", () => {
    expect(determineLoyaltyLevel(25_000_000).key).toBe("copper");
    expect(determineLoyaltyLevel(24_990_000).key).toBe("member");
  });

  it("returns obsidian for very high spend with no upper bound", () => {
    expect(determineLoyaltyLevel(10_000_000_000).key).toBe("obsidian");
  });

  it("rejects negative spend", () => {
    expect(() => determineLoyaltyLevel(-1)).toThrow();
  });
});

describe("determineCappedRewardLevel", () => {
  it("caps gold-tier spend at the silver reward during beta", () => {
    const result = determineCappedRewardLevel(300_000_000); // gold-tier spend
    expect(result.key).toBe("silver");
  });

  it("caps obsidian-tier spend at the silver reward during beta", () => {
    const result = determineCappedRewardLevel(1_000_000_000);
    expect(result.key).toBe("silver");
  });

  it("does not upgrade a level below the cap", () => {
    const result = determineCappedRewardLevel(50_000_000); // copper-tier spend
    expect(result.key).toBe("copper");
  });
});

describe("computeEligibleSpend", () => {
  it("subtracts refunds, affiliate, and self-referral spend", () => {
    const eligible = computeEligibleSpend({
      fulfilledOrderTotalsUsdcBaseUnits: 100_000_000,
      refundedUsdcBaseUnits: 10_000_000,
      affiliateAttributedUsdcBaseUnits: 5_000_000,
      selfReferralUsdcBaseUnits: 5_000_000,
    });
    expect(eligible).toBe(80_000_000);
  });

  it("never returns a negative value", () => {
    const eligible = computeEligibleSpend({
      fulfilledOrderTotalsUsdcBaseUnits: 10_000_000,
      refundedUsdcBaseUnits: 50_000_000,
      affiliateAttributedUsdcBaseUnits: 0,
      selfReferralUsdcBaseUnits: 0,
    });
    expect(eligible).toBe(0);
  });
});
