/**
 * Server-side eligibility policy (spec section 6). This is the authoritative gate — never
 * trust a client-side "I am 18+" checkbox alone. Every acknowledgment is persisted with
 * its policy version and timestamp (eligibility_records table) so it can be audited later.
 */

export const CURRENT_ELIGIBILITY_POLICY_VERSION = "2026-08-01.1";

// Configurable without a code deploy in principle; hardcoded here for beta with a clear
// extension point — swap for a DB-backed admin-editable list before wide launch.
export const BLOCKED_COUNTRIES: ReadonlySet<string> = new Set([
  "KP", // North Korea
  "IR", // Iran
  "SY", // Syria
  "CU", // Cuba
]);

// US states with additional randomized-purchase/loot-box restrictions to review before
// allowing (placeholder list — requires legal review per LEGAL_REVIEW_REQUIRED.md).
export const BLOCKED_US_STATES: ReadonlySet<string> = new Set([]);

export interface EligibilityCheckInput {
  dateOfBirth: string; // ISO date "YYYY-MM-DD"
  ageAcknowledged18Plus: boolean;
  country: string; // ISO 3166-1 alpha-2
  stateOrProvince?: string;
  now: Date;
}

export type EligibilityDenialReason =
  | "under_18_by_dob"
  | "age_not_acknowledged"
  | "location_blocked_country"
  | "location_blocked_state";

export interface EligibilityDecision {
  eligible: boolean;
  reasons: EligibilityDenialReason[];
  policyVersion: string;
}

export function calculateAge(dateOfBirth: string, now: Date): number {
  const dob = new Date(dateOfBirth + "T00:00:00Z");
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }
  return age;
}

export function evaluateEligibility(input: EligibilityCheckInput): EligibilityDecision {
  const reasons: EligibilityDenialReason[] = [];

  if (calculateAge(input.dateOfBirth, input.now) < 18) {
    reasons.push("under_18_by_dob");
  }
  if (!input.ageAcknowledged18Plus) {
    reasons.push("age_not_acknowledged");
  }
  if (BLOCKED_COUNTRIES.has(input.country.toUpperCase())) {
    reasons.push("location_blocked_country");
  }
  if (
    input.country.toUpperCase() === "US" &&
    input.stateOrProvince &&
    BLOCKED_US_STATES.has(input.stateOrProvince.toUpperCase())
  ) {
    reasons.push("location_blocked_state");
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    policyVersion: CURRENT_ELIGIBILITY_POLICY_VERSION,
  };
}
