import { describe, expect, it } from "vitest";
import { evaluatePurchaseAgainstLimits, scheduleLimitChange } from "./limits";

const baseLimits = {
  dailyLimitUsdcBaseUnits: 50_000_000, // $50
  weeklyLimitUsdcBaseUnits: 200_000_000, // $200
  monthlyLimitUsdcBaseUnits: 500_000_000, // $500
  coolOffUntil: null,
  pausedUntil: null,
};

const noExclusion = { isActive: false, endsAt: null };
const noSpend = {
  spentTodayUsdcBaseUnits: 0,
  spentThisWeekUsdcBaseUnits: 0,
  spentThisMonthUsdcBaseUnits: 0,
};

describe("evaluatePurchaseAgainstLimits", () => {
  const now = new Date("2026-08-01T12:00:00Z");

  it("allows a purchase within all limits", () => {
    const decision = evaluatePurchaseAgainstLimits({
      now,
      priceUsdcBaseUnits: 10_000_000,
      limits: baseLimits,
      selfExclusion: noExclusion,
      rollingSpend: noSpend,
    });
    expect(decision.allowed).toBe(true);
  });

  it("denies when self-exclusion is active indefinitely", () => {
    const decision = evaluatePurchaseAgainstLimits({
      now,
      priceUsdcBaseUnits: 1,
      limits: baseLimits,
      selfExclusion: { isActive: true, endsAt: null },
      rollingSpend: noSpend,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("self_excluded");
  });

  it("allows once a time-boxed self-exclusion has expired", () => {
    const decision = evaluatePurchaseAgainstLimits({
      now,
      priceUsdcBaseUnits: 1,
      limits: baseLimits,
      selfExclusion: { isActive: true, endsAt: new Date("2026-01-01T00:00:00Z") },
      rollingSpend: noSpend,
    });
    expect(decision.allowed).toBe(true);
  });

  it("denies during an active cool-off period", () => {
    const decision = evaluatePurchaseAgainstLimits({
      now,
      priceUsdcBaseUnits: 1,
      limits: { ...baseLimits, coolOffUntil: new Date("2026-08-02T00:00:00Z") },
      selfExclusion: noExclusion,
      rollingSpend: noSpend,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("cool_off_active");
  });

  it("denies when a paused account attempts to purchase", () => {
    const decision = evaluatePurchaseAgainstLimits({
      now,
      priceUsdcBaseUnits: 1,
      limits: { ...baseLimits, pausedUntil: new Date("2026-08-02T00:00:00Z") },
      selfExclusion: noExclusion,
      rollingSpend: noSpend,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("account_paused");
  });

  it("denies when the purchase would exceed the daily limit", () => {
    const decision = evaluatePurchaseAgainstLimits({
      now,
      priceUsdcBaseUnits: 45_000_000,
      limits: baseLimits,
      selfExclusion: noExclusion,
      rollingSpend: { ...noSpend, spentTodayUsdcBaseUnits: 10_000_000 },
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("daily_limit_exceeded");
  });

  it("denies when the purchase would exceed the weekly limit even if daily is fine", () => {
    const decision = evaluatePurchaseAgainstLimits({
      now,
      priceUsdcBaseUnits: 5_000_000,
      limits: baseLimits,
      selfExclusion: noExclusion,
      rollingSpend: { ...noSpend, spentThisWeekUsdcBaseUnits: 198_000_000 },
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("weekly_limit_exceeded");
  });

  it("denies when the purchase would exceed the monthly limit", () => {
    const decision = evaluatePurchaseAgainstLimits({
      now,
      priceUsdcBaseUnits: 5_000_000,
      limits: baseLimits,
      selfExclusion: noExclusion,
      rollingSpend: { ...noSpend, spentThisMonthUsdcBaseUnits: 498_000_000 },
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("monthly_limit_exceeded");
  });

  it("treats null limits as unbounded", () => {
    const decision = evaluatePurchaseAgainstLimits({
      now,
      priceUsdcBaseUnits: 1_000_000_000,
      limits: {
        dailyLimitUsdcBaseUnits: null,
        weeklyLimitUsdcBaseUnits: null,
        monthlyLimitUsdcBaseUnits: null,
        coolOffUntil: null,
        pausedUntil: null,
      },
      selfExclusion: noExclusion,
      rollingSpend: noSpend,
    });
    expect(decision.allowed).toBe(true);
  });
});

describe("scheduleLimitChange", () => {
  const now = new Date("2026-08-01T12:00:00Z");
  const cooling = 48 * 60 * 60 * 1000; // 48h

  it("applies a decrease immediately", () => {
    const result = scheduleLimitChange({
      now,
      current: { dailyLimitUsdcBaseUnits: 50_000_000 },
      requested: { dailyLimitUsdcBaseUnits: 20_000_000 },
      increaseCoolingPeriodMs: cooling,
    });
    expect(result.appliesImmediately).toBe(true);
    expect(result.effectiveAt).toEqual(now);
  });

  it("delays an increase until after the cooling period", () => {
    const result = scheduleLimitChange({
      now,
      current: { dailyLimitUsdcBaseUnits: 50_000_000 },
      requested: { dailyLimitUsdcBaseUnits: 100_000_000 },
      increaseCoolingPeriodMs: cooling,
    });
    expect(result.appliesImmediately).toBe(false);
    expect(result.effectiveAt.getTime()).toBe(now.getTime() + cooling);
  });

  it("treats removing the limit (null) as an increase", () => {
    const result = scheduleLimitChange({
      now,
      current: { dailyLimitUsdcBaseUnits: 50_000_000 },
      requested: { dailyLimitUsdcBaseUnits: null },
      increaseCoolingPeriodMs: cooling,
    });
    expect(result.appliesImmediately).toBe(false);
  });
});
