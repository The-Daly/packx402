/**
 * Pure loyalty-level calculation (spec section 21). Operates on a rolling 30-day
 * eligible-fulfilled-spend total; DB access (aggregating fulfilled orders, excluding
 * refunds/affiliate/self-referral) happens in the caller, which then calls this function
 * to determine the resulting level and persist an audit row.
 */

export type LoyaltyLevelKey = "member" | "copper" | "silver" | "gold" | "obsidian";

export interface LoyaltyLevelDefinition {
  key: LoyaltyLevelKey;
  minSpendUsdcBaseUnits: number;
  maxSpendUsdcBaseUnits: number | null;
  weeklyRewardPackTierKey: string | null;
}

// Beta ceiling is Silver — Gold/Obsidian tiers are defined for completeness but their
// reward level is capped at Silver's reward during beta (see MAX_BETA_REWARD_LEVEL).
export const LOYALTY_LEVELS: LoyaltyLevelDefinition[] = [
  {
    key: "member",
    minSpendUsdcBaseUnits: 0,
    maxSpendUsdcBaseUnits: 24_990_000,
    weeklyRewardPackTierKey: "spark",
  },
  {
    key: "copper",
    minSpendUsdcBaseUnits: 25_000_000,
    maxSpendUsdcBaseUnits: 99_990_000,
    weeklyRewardPackTierKey: "starter",
  },
  {
    key: "silver",
    minSpendUsdcBaseUnits: 100_000_000,
    maxSpendUsdcBaseUnits: 249_990_000,
    weeklyRewardPackTierKey: "scout",
  },
  {
    key: "gold",
    minSpendUsdcBaseUnits: 250_000_000,
    maxSpendUsdcBaseUnits: 499_990_000,
    weeklyRewardPackTierKey: "bronze",
  },
  {
    key: "obsidian",
    minSpendUsdcBaseUnits: 500_000_000,
    maxSpendUsdcBaseUnits: null,
    weeklyRewardPackTierKey: "silver",
  },
];

export const MAX_BETA_REWARD_LEVEL: LoyaltyLevelKey = "silver";

export function determineLoyaltyLevel(eligibleSpendUsdcBaseUnits: number): LoyaltyLevelDefinition {
  if (eligibleSpendUsdcBaseUnits < 0) {
    throw new Error("eligibleSpendUsdcBaseUnits must be non-negative");
  }
  // Iterate from highest to lowest so an exact boundary value resolves to the higher tier.
  for (let i = LOYALTY_LEVELS.length - 1; i >= 0; i--) {
    const level = LOYALTY_LEVELS[i];
    if (eligibleSpendUsdcBaseUnits >= level.minSpendUsdcBaseUnits) {
      return level;
    }
  }
  return LOYALTY_LEVELS[0];
}

/**
 * The reward level actually granted is capped at MAX_BETA_REWARD_LEVEL regardless of the
 * computed spend tier (spec section 21: "Maximum reward level during beta is Silver").
 */
export function determineCappedRewardLevel(
  eligibleSpendUsdcBaseUnits: number,
): LoyaltyLevelDefinition {
  const computed = determineLoyaltyLevel(eligibleSpendUsdcBaseUnits);
  const capIndex = LOYALTY_LEVELS.findIndex((l) => l.key === MAX_BETA_REWARD_LEVEL);
  const computedIndex = LOYALTY_LEVELS.findIndex((l) => l.key === computed.key);
  return computedIndex > capIndex ? LOYALTY_LEVELS[capIndex] : computed;
}

/**
 * Computes eligible spend for the rolling window: fulfilled order totals minus refunds,
 * minus affiliate-attributed and self-referral spend (spec section 21). Pure arithmetic —
 * the caller is responsible for correctly sourcing each input from fulfilled orders only.
 */
export function computeEligibleSpend(params: {
  fulfilledOrderTotalsUsdcBaseUnits: number;
  refundedUsdcBaseUnits: number;
  affiliateAttributedUsdcBaseUnits: number;
  selfReferralUsdcBaseUnits: number;
}): number {
  const eligible =
    params.fulfilledOrderTotalsUsdcBaseUnits -
    params.refundedUsdcBaseUnits -
    params.affiliateAttributedUsdcBaseUnits -
    params.selfReferralUsdcBaseUnits;
  return Math.max(0, eligible);
}
