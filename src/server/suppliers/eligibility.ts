/**
 * Supplier-listing eligibility rules (spec section 38). A listing is only included in a
 * pool if every rule passes. Pure function over a plain data shape so it's independently
 * testable and reusable by both the inventory-refresh job and admin tooling.
 */

export interface ListingEligibilityInput {
  quantityAvailable: number;
  sellerOnVacation: boolean;
  shipsToCustomerCountry: boolean;
  cardIdentityKnown: boolean;
  setAndNumberKnown: boolean;
  conditionKnown: boolean;
  languageKnown: boolean;
  finishKnown: boolean;
  gradeKnownIfGraded: boolean;
  priceUsdcBaseUnits: number;
  tierProcurementCapUsdcBaseUnits: number;
  sellerReliabilityScore: number | null;
  minimumSellerReliabilityScore: number;
  lastRefreshedAt: Date;
  maxInventoryAgeMs: number;
  shippingEstimable: boolean;
  imageUsePermitted: boolean;
  now: Date;
}

export function evaluateListingEligibility(input: ListingEligibilityInput): {
  eligible: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  if (input.quantityAvailable <= 0) reasons.push("no_quantity_available");
  if (input.sellerOnVacation) reasons.push("seller_on_vacation");
  if (!input.shipsToCustomerCountry) reasons.push("seller_does_not_ship_to_customer");
  if (!input.cardIdentityKnown) reasons.push("card_identity_unknown");
  if (!input.setAndNumberKnown) reasons.push("set_or_card_number_unknown");
  if (!input.conditionKnown) reasons.push("condition_unknown");
  if (!input.languageKnown) reasons.push("language_unknown");
  if (!input.finishKnown) reasons.push("finish_unknown");
  if (!input.gradeKnownIfGraded) reasons.push("grade_unknown");
  if (input.priceUsdcBaseUnits > input.tierProcurementCapUsdcBaseUnits) {
    reasons.push("exceeds_tier_procurement_limit");
  }
  if (
    input.sellerReliabilityScore === null ||
    input.sellerReliabilityScore < input.minimumSellerReliabilityScore
  ) {
    reasons.push("seller_reliability_below_threshold");
  }
  const ageMs = input.now.getTime() - input.lastRefreshedAt.getTime();
  if (ageMs > input.maxInventoryAgeMs) reasons.push("inventory_snapshot_stale");
  if (!input.shippingEstimable) reasons.push("shipping_not_estimable");
  if (!input.imageUsePermitted) reasons.push("image_use_not_permitted");

  return { eligible: reasons.length === 0, reasons };
}
