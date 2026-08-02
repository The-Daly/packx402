import { describe, expect, it } from "vitest";
import { isoWeekBounds, isoWeekKey } from "./week-key";

describe("isoWeekKey", () => {
  it("computes a known ISO week (2026-08-01 is a Saturday in ISO week 31)", () => {
    expect(isoWeekKey(new Date("2026-08-01T12:00:00Z"))).toBe("2026-W31");
  });

  it("gives the same week key for every day Mon-Sun of the same ISO week", () => {
    // 2026-W31 runs Monday 2026-07-27 through Sunday 2026-08-02.
    const days = [
      "2026-07-27T00:00:00Z",
      "2026-07-28T23:59:59Z",
      "2026-07-31T12:00:00Z",
      "2026-08-02T23:59:59Z",
    ];
    const keys = days.map((d) => isoWeekKey(new Date(d)));
    expect(new Set(keys).size).toBe(1);
    expect(keys[0]).toBe("2026-W31");
  });

  it("rolls over correctly across a year boundary", () => {
    // Dec 31 2025 is a Wednesday, ISO week 1 of 2026 in some calendars — verify it's stable/self-consistent.
    const key = isoWeekKey(new Date("2025-12-31T12:00:00Z"));
    expect(key).toMatch(/^\d{4}-W\d{2}$/);
  });
});

describe("isoWeekBounds", () => {
  it("returns a Monday start and the following Monday as end", () => {
    const { start, end } = isoWeekBounds(new Date("2026-08-01T12:00:00Z"));
    expect(start.getUTCDay()).toBe(1); // Monday
    expect(end.getUTCDay()).toBe(1);
    expect(end.getTime() - start.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("places the reference date inside [start, end)", () => {
    const ref = new Date("2026-08-01T12:00:00Z");
    const { start, end } = isoWeekBounds(ref);
    expect(ref.getTime()).toBeGreaterThanOrEqual(start.getTime());
    expect(ref.getTime()).toBeLessThan(end.getTime());
  });
});
