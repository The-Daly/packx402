import { describe, expect, it } from "vitest";
import { calculateAge, evaluateEligibility } from "./policy";

describe("calculateAge", () => {
  it("computes exact age on a birthday", () => {
    expect(calculateAge("2008-08-01", new Date("2026-08-01T12:00:00Z"))).toBe(18);
  });

  it("computes age as one less the day before a birthday", () => {
    expect(calculateAge("2008-08-01", new Date("2026-07-31T12:00:00Z"))).toBe(17);
  });

  it("computes age as one more the day after a birthday", () => {
    expect(calculateAge("2008-08-01", new Date("2026-08-02T12:00:00Z"))).toBe(18);
  });
});

describe("evaluateEligibility", () => {
  const now = new Date("2026-08-01T12:00:00Z");

  it("allows an 18-year-old in an unblocked country who acknowledged", () => {
    const decision = evaluateEligibility({
      dateOfBirth: "2008-08-01",
      ageAcknowledged18Plus: true,
      country: "US",
      now,
    });
    expect(decision.eligible).toBe(true);
    expect(decision.reasons).toEqual([]);
  });

  it("denies a 17-year-old", () => {
    const decision = evaluateEligibility({
      dateOfBirth: "2009-01-01",
      ageAcknowledged18Plus: true,
      country: "US",
      now,
    });
    expect(decision.eligible).toBe(false);
    expect(decision.reasons).toContain("under_18_by_dob");
  });

  it("denies when the 18+ acknowledgment checkbox was not checked, even if actually 18+", () => {
    const decision = evaluateEligibility({
      dateOfBirth: "1990-01-01",
      ageAcknowledged18Plus: false,
      country: "US",
      now,
    });
    expect(decision.eligible).toBe(false);
    expect(decision.reasons).toContain("age_not_acknowledged");
  });

  it("denies a blocked country regardless of age", () => {
    const decision = evaluateEligibility({
      dateOfBirth: "1990-01-01",
      ageAcknowledged18Plus: true,
      country: "KP",
      now,
    });
    expect(decision.eligible).toBe(false);
    expect(decision.reasons).toContain("location_blocked_country");
  });

  it("is case-insensitive on country codes", () => {
    const decision = evaluateEligibility({
      dateOfBirth: "1990-01-01",
      ageAcknowledged18Plus: true,
      country: "kp",
      now,
    });
    expect(decision.reasons).toContain("location_blocked_country");
  });

  it("accumulates multiple denial reasons at once", () => {
    const decision = evaluateEligibility({
      dateOfBirth: "2015-01-01",
      ageAcknowledged18Plus: false,
      country: "IR",
      now,
    });
    expect(decision.reasons).toEqual(
      expect.arrayContaining([
        "under_18_by_dob",
        "age_not_acknowledged",
        "location_blocked_country",
      ]),
    );
    expect(decision.reasons.length).toBe(3);
  });
});
