/**
 * Pure responsible-purchasing limit evaluation (spec section 33). Kept dependency-free
 * from the DB so the decision logic is directly unit-testable; callers fetch the current
 * limits row + rolling spend totals and pass them in here.
 */

export interface PurchaseLimitsSnapshot {
  dailyLimitUsdcBaseUnits: number | null;
  weeklyLimitUsdcBaseUnits: number | null;
  monthlyLimitUsdcBaseUnits: number | null;
  coolOffUntil: Date | null;
  pausedUntil: Date | null;
}

export interface SelfExclusionSnapshot {
  isActive: boolean;
  endsAt: Date | null; // null = indefinite
}

export interface RollingSpendSnapshot {
  spentTodayUsdcBaseUnits: number;
  spentThisWeekUsdcBaseUnits: number;
  spentThisMonthUsdcBaseUnits: number;
}

export type PurchaseDenialReason =
  | "self_excluded"
  | "account_paused"
  | "cool_off_active"
  | "daily_limit_exceeded"
  | "weekly_limit_exceeded"
  | "monthly_limit_exceeded";

export interface PurchaseLimitDecision {
  allowed: boolean;
  reason?: PurchaseDenialReason;
  remaining?: {
    dailyUsdcBaseUnits: number | null;
    weeklyUsdcBaseUnits: number | null;
    monthlyUsdcBaseUnits: number | null;
  };
}

export function evaluatePurchaseAgainstLimits(params: {
  now: Date;
  priceUsdcBaseUnits: number;
  limits: PurchaseLimitsSnapshot;
  selfExclusion: SelfExclusionSnapshot;
  rollingSpend: RollingSpendSnapshot;
}): PurchaseLimitDecision {
  const { now, priceUsdcBaseUnits, limits, selfExclusion, rollingSpend } = params;

  if (selfExclusion.isActive && (selfExclusion.endsAt === null || selfExclusion.endsAt > now)) {
    return { allowed: false, reason: "self_excluded" };
  }
  if (limits.pausedUntil && limits.pausedUntil > now) {
    return { allowed: false, reason: "account_paused" };
  }
  if (limits.coolOffUntil && limits.coolOffUntil > now) {
    return { allowed: false, reason: "cool_off_active" };
  }

  const remaining = {
    dailyUsdcBaseUnits:
      limits.dailyLimitUsdcBaseUnits === null
        ? null
        : limits.dailyLimitUsdcBaseUnits - rollingSpend.spentTodayUsdcBaseUnits,
    weeklyUsdcBaseUnits:
      limits.weeklyLimitUsdcBaseUnits === null
        ? null
        : limits.weeklyLimitUsdcBaseUnits - rollingSpend.spentThisWeekUsdcBaseUnits,
    monthlyUsdcBaseUnits:
      limits.monthlyLimitUsdcBaseUnits === null
        ? null
        : limits.monthlyLimitUsdcBaseUnits - rollingSpend.spentThisMonthUsdcBaseUnits,
  };

  if (remaining.dailyUsdcBaseUnits !== null && priceUsdcBaseUnits > remaining.dailyUsdcBaseUnits) {
    return { allowed: false, reason: "daily_limit_exceeded", remaining };
  }
  if (
    remaining.weeklyUsdcBaseUnits !== null &&
    priceUsdcBaseUnits > remaining.weeklyUsdcBaseUnits
  ) {
    return { allowed: false, reason: "weekly_limit_exceeded", remaining };
  }
  if (
    remaining.monthlyUsdcBaseUnits !== null &&
    priceUsdcBaseUnits > remaining.monthlyUsdcBaseUnits
  ) {
    return { allowed: false, reason: "monthly_limit_exceeded", remaining };
  }

  return { allowed: true, remaining };
}

/**
 * Limit-increase requests take effect only after a cooling period; decreases take effect
 * immediately (spec section 33). Returns the effective new limit values and, for
 * increases, the timestamp at which they become active.
 */
export function scheduleLimitChange(params: {
  now: Date;
  current: { dailyLimitUsdcBaseUnits: number | null };
  requested: { dailyLimitUsdcBaseUnits: number | null };
  increaseCoolingPeriodMs: number;
}): { appliesImmediately: boolean; effectiveAt: Date } {
  const { now, current, requested, increaseCoolingPeriodMs } = params;
  const isIncrease =
    requested.dailyLimitUsdcBaseUnits === null ||
    (current.dailyLimitUsdcBaseUnits !== null &&
      requested.dailyLimitUsdcBaseUnits > current.dailyLimitUsdcBaseUnits);

  if (!isIncrease) {
    return { appliesImmediately: true, effectiveAt: now };
  }
  return {
    appliesImmediately: false,
    effectiveAt: new Date(now.getTime() + increaseCoolingPeriodMs),
  };
}
