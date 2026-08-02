/**
 * Config-driven pack tier definitions (spec section 3). Prices are integer USDC base
 * units (6 decimals) — never floats, to avoid floating-point rounding in money math.
 *
 * `availableTestnet` / `availableAlgorandMainnet` / `availableSolana` / `availableEvm`
 * and `locked` / `requiresHighValueReleaseGate` are the SERVER-SIDE source of truth for
 * what can actually be purchased. They are seeded into the `pack_tiers` table and read
 * from there at request time — this file is the seed source, not a runtime bypass.
 * A frontend lock alone is never sufficient (spec section 3).
 */

export type PackTierKey =
  | "spark"
  | "starter"
  | "scout"
  | "bronze"
  | "silver"
  | "gold"
  | "prism"
  | "platinum"
  | "obsidian"
  | "mythic"
  | "crown"
  | "vault"
  | "grail"
  | "genesis";

export interface PackTierDefinition {
  key: PackTierKey;
  name: string;
  priceUsdcBaseUnits: number;
  sortOrder: number;
  shippingTreatment: "included" | "separately_charged" | "subsidized";
  estimatedShippingUsdcBaseUnits: number;
  cardGames: string[];
  minDisclosedCondition: string;
  /** Max reference value a single card in this tier's pool may have (see
   * MAX_OBTAINABLE_VALUE_MULTIPLIER below) — the ceiling on what's obtainable from the pack. */
  procurementPriceCapUsdcBaseUnits: number;
  availableTestnet: boolean;
  availableAlgorandMainnet: boolean;
  availableSolana: boolean;
  availableEvm: boolean;
  requiresHighValueReleaseGate: boolean;
  locked: boolean;
  weeklyFreePackEligible: boolean;
}

const USDC_BASE_UNITS_PER_DOLLAR = 1_000_000; // USDC has 6 decimals
const usd = (dollars: number) => Math.round(dollars * USDC_BASE_UNITS_PER_DOLLAR);

// Max-obtainable-value multiplier per tier: the ceiling on how expensive a single card in
// a tier's pool can be, expressed as a multiple of the pack's own price. Tapers down as
// price rises — a cheap pack can hit a big multiple of its price (Spark: $0.50 -> $25 max,
// 50x) without the platform's per-pull financial exposure scaling linearly with price at
// the top end (Genesis: $10,000 -> $20,000 max, only 2x). This is a deliberate,
// user-directed design choice, distinct from (and now replaces) the old flat 1.15x
// "barely above cost" cap — see PROJECT_STATUS.md and docs/LEGAL_REVIEW_REQUIRED.md for
// the responsible-purchasing/EV-disclosure implications of this schedule.
const MAX_OBTAINABLE_VALUE_MULTIPLIER: Record<PackTierKey, number> = {
  spark: 50,
  starter: 40,
  scout: 30,
  bronze: 25,
  silver: 20,
  gold: 15,
  prism: 12,
  platinum: 10,
  obsidian: 8,
  mythic: 6,
  crown: 5,
  vault: 4,
  grail: 3,
  genesis: 2,
};

// Beta default availability:
// - TestNet / Solana / EVM: Spark through Mythic ($250) — everything the current
//   supplier-purchase bankroll can actually fund.
// - Algorand MainNet: Spark through Bronze (unrelated, more conservative real-money limit).
// - Packs above $250 (Crown+): visible but locked — the beta bankroll does not yet cover
//   funding supplier purchases above this price point. Unlock once that changes.
// - The same $250 threshold also gates `requiresHighValueReleaseGate`, since a legal/
//   financial/security review is required before either lock lifts.
const TESTNET_CEILING: PackTierKey[] = [
  "spark",
  "starter",
  "scout",
  "bronze",
  "silver",
  "gold",
  "prism",
  "platinum",
  "obsidian",
  "mythic",
];
const MAINNET_CEILING: PackTierKey[] = ["spark", "starter", "scout", "bronze"];
const LOCKED_ABOVE: PackTierKey[] = ["crown", "vault", "grail", "genesis"];
const HIGH_VALUE_GATE_ABOVE: PackTierKey[] = ["crown", "vault", "grail", "genesis"];

function buildTier(
  key: PackTierKey,
  name: string,
  priceDollars: number,
  sortOrder: number,
  overrides: Partial<PackTierDefinition> = {},
): PackTierDefinition {
  return {
    key,
    name,
    priceUsdcBaseUnits: usd(priceDollars),
    sortOrder,
    shippingTreatment: "separately_charged",
    estimatedShippingUsdcBaseUnits: usd(4.99),
    cardGames: ["pokemon", "yugioh"],
    minDisclosedCondition: "lightly_played",
    procurementPriceCapUsdcBaseUnits: usd(priceDollars * MAX_OBTAINABLE_VALUE_MULTIPLIER[key]),
    availableTestnet: TESTNET_CEILING.includes(key),
    availableAlgorandMainnet: MAINNET_CEILING.includes(key),
    availableSolana: TESTNET_CEILING.includes(key),
    availableEvm: TESTNET_CEILING.includes(key),
    requiresHighValueReleaseGate: HIGH_VALUE_GATE_ABOVE.includes(key),
    locked: LOCKED_ABOVE.includes(key),
    weeklyFreePackEligible: false,
    ...overrides,
  };
}

export const PACK_TIERS: PackTierDefinition[] = [
  buildTier("spark", "Spark", 0.5, 1, {
    shippingTreatment: "included",
    estimatedShippingUsdcBaseUnits: 0,
    weeklyFreePackEligible: true,
  }),
  buildTier("starter", "Starter", 1, 2, {
    shippingTreatment: "included",
    estimatedShippingUsdcBaseUnits: 0,
    weeklyFreePackEligible: true,
  }),
  buildTier("scout", "Scout", 2.5, 3, { weeklyFreePackEligible: true }),
  buildTier("bronze", "Bronze", 5, 4, { weeklyFreePackEligible: true }),
  buildTier("silver", "Silver", 10, 5, { weeklyFreePackEligible: true }),
  buildTier("gold", "Gold", 25, 6),
  buildTier("prism", "Prism", 35, 7),
  buildTier("platinum", "Platinum", 50, 8),
  buildTier("obsidian", "Obsidian", 100, 9),
  buildTier("mythic", "Mythic", 250, 10),
  buildTier("crown", "Crown", 500, 11),
  buildTier("vault", "Vault", 1_000, 12),
  buildTier("grail", "Grail", 2_000, 13),
  buildTier("genesis", "Genesis", 10_000, 14),
];

export function getPackTierDefinition(key: PackTierKey): PackTierDefinition {
  const tier = PACK_TIERS.find((t) => t.key === key);
  if (!tier) throw new Error(`Unknown pack tier key: ${key}`);
  return tier;
}

export type Chain = "algorand" | "solana" | "evm";
export type NetworkMode = "testnet" | "mainnet";

/**
 * Single source of truth for "can this tier be sold on this chain/network right now."
 * Called on every offer-creation request — never trust a client-supplied availability flag.
 * `highValueGateEnabled` comes from the FEATURE_HIGH_VALUE_PACKS_ENABLED server flag.
 */
export function isTierPurchasableOn(
  tier: PackTierDefinition,
  chain: Chain,
  network: NetworkMode,
  highValueGateEnabled: boolean,
): { allowed: boolean; reason?: string } {
  if (tier.requiresHighValueReleaseGate && !highValueGateEnabled) {
    return { allowed: false, reason: "requires_high_value_release_gate" };
  }
  if (tier.locked) {
    return { allowed: false, reason: "tier_locked" };
  }
  if (chain === "algorand" && network === "mainnet") {
    return tier.availableAlgorandMainnet
      ? { allowed: true }
      : { allowed: false, reason: "not_available_on_algorand_mainnet" };
  }
  if (network === "mainnet" && chain !== "algorand") {
    // Solana / EVM are TestNet-only during beta, full stop.
    return { allowed: false, reason: "solana_evm_mainnet_disabled_during_beta" };
  }
  if (!tier.availableTestnet && chain === "algorand") {
    return { allowed: false, reason: "not_available_on_testnet" };
  }
  if (chain === "solana" && !tier.availableSolana) {
    return { allowed: false, reason: "not_available_on_solana" };
  }
  if (chain === "evm" && !tier.availableEvm) {
    return { allowed: false, reason: "not_available_on_evm" };
  }
  return { allowed: true };
}
