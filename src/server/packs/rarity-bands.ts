/**
 * The six-rarity pool structure applied uniformly to every pack tier, price bands scaled
 * proportionally to that tier's own price (spec addendum, per user-specified odds/bands
 * for the $5 reference tier, generalized). Odds are fixed across all 14 tiers — what
 * changes per tier is only the price band each rarity maps to, not the percentages.
 *
 * Structurally inspired by a reference competitor app's "estimated odds & values"
 * breakdown, but not copied — see docs/DECISIONS.md. That reference app also has a
 * user-selectable "volatility level" (Normal/High/Max) that reshapes these odds; that
 * concept is not implemented here yet (see PROJECT_STATUS.md).
 */

export type RarityKey = "common" | "uncommon" | "rare" | "epic" | "legendary" | "grail";

export interface RarityBand {
  key: RarityKey;
  label: string;
  /** Odds out of 10,000 (i.e. hundredths of a percent) — integers only, avoids float
   * rounding in the odds hash / published probability. Sums to exactly 10,000. */
  oddsPer10000: number;
  /** Price band as a multiplier of the tier's own price, e.g. Rare on a $5 pack spans
   * 1.0x-1.2x = $5-$6. */
  minPriceMultiplier: number;
  maxPriceMultiplier: number;
}

export const RARITY_BANDS: RarityBand[] = [
  { key: "common", label: "Common", oddsPer10000: 2500, minPriceMultiplier: 0.05, maxPriceMultiplier: 0.4 },
  { key: "uncommon", label: "Uncommon", oddsPer10000: 2480, minPriceMultiplier: 0.4, maxPriceMultiplier: 1.0 },
  { key: "rare", label: "Rare", oddsPer10000: 1610, minPriceMultiplier: 1.0, maxPriceMultiplier: 1.2 },
  { key: "epic", label: "Epic", oddsPer10000: 1610, minPriceMultiplier: 1.2, maxPriceMultiplier: 1.4 },
  { key: "legendary", label: "Legendary", oddsPer10000: 1400, minPriceMultiplier: 1.4, maxPriceMultiplier: 1.8 },
  { key: "grail", label: "Grail", oddsPer10000: 400, minPriceMultiplier: 1.8, maxPriceMultiplier: 20 },
];

const TOTAL_ODDS = RARITY_BANDS.reduce((sum, b) => sum + b.oddsPer10000, 0);
if (TOTAL_ODDS !== 10_000) {
  throw new Error(`RARITY_BANDS odds must sum to 10000, got ${TOTAL_ODDS}`);
}

/** The Grail band's upper bound is the tier's max-obtainable-value cap (supersedes the
 * earlier flat/tapering-multiplier schedule — see PROJECT_STATUS.md). */
export function maxObtainableValueMultiplier(): number {
  return RARITY_BANDS[RARITY_BANDS.length - 1].maxPriceMultiplier;
}

export interface RarityPriceBand {
  key: RarityKey;
  label: string;
  oddsPer10000: number;
  minPriceUsdcBaseUnits: number;
  maxPriceUsdcBaseUnits: number;
}

/** Resolves each rarity's abstract multiplier band into concrete USDC-base-unit price
 * bounds for one specific tier's price. */
export function rarityBandsForTierPrice(tierPriceUsdcBaseUnits: number): RarityPriceBand[] {
  return RARITY_BANDS.map((band) => ({
    key: band.key,
    label: band.label,
    oddsPer10000: band.oddsPer10000,
    minPriceUsdcBaseUnits: Math.round(tierPriceUsdcBaseUnits * band.minPriceMultiplier),
    maxPriceUsdcBaseUnits: Math.round(tierPriceUsdcBaseUnits * band.maxPriceMultiplier),
  }));
}

export interface FixtureLike {
  priceUsdcBaseUnits: number;
}

/**
 * Picks the best-fitting fixture for a rarity price band from a candidate list: prefers
 * one whose price falls inside [min, max]; if none qualify, falls back to whichever
 * fixture's price is numerically closest to the band (mock-data approximation only — a
 * live supplier catalog would have real inventory in every band). Returns null if the
 * candidate list (after the absolute cap below) is empty.
 *
 * `absoluteMaxUsdcBaseUnits`, when given, is a HARD ceiling applied before either the
 * in-band search or the closest-match fallback — never optional, never bypassed. Without
 * it, the closest-match fallback alone could hand a cheap tier (e.g. Spark at $0.50) a
 * wildly expensive card (e.g. a $1,300 Lugia) if the fixture ladder happened to have a
 * gap right around that tier's band, since "closest to target" has no upper bound of its
 * own. Callers should always pass the tier's own procurement price cap
 * (`procurementPriceCapUsdcBaseUnits` in pack-tiers.ts, itself the same 20x-price ceiling
 * as the Grail band's own upper bound) — see seed.ts.
 */
export function pickFixtureForBand<T extends FixtureLike>(
  candidates: T[],
  band: RarityPriceBand,
  absoluteMaxUsdcBaseUnits?: number,
): T | null {
  const capped =
    absoluteMaxUsdcBaseUnits === undefined
      ? candidates
      : candidates.filter((c) => c.priceUsdcBaseUnits <= absoluteMaxUsdcBaseUnits);
  if (capped.length === 0) return null;

  const inBand = capped.filter(
    (c) => c.priceUsdcBaseUnits >= band.minPriceUsdcBaseUnits && c.priceUsdcBaseUnits <= band.maxPriceUsdcBaseUnits,
  );
  const pool = inBand.length > 0 ? inBand : capped;

  const target = (band.minPriceUsdcBaseUnits + band.maxPriceUsdcBaseUnits) / 2;
  return pool.reduce((closest, candidate) =>
    Math.abs(candidate.priceUsdcBaseUnits - target) < Math.abs(closest.priceUsdcBaseUnits - target)
      ? candidate
      : closest,
  );
}
