/**
 * Integer money helpers. All monetary values in PackX402 are integer USDC base units
 * (6 decimals). Never use floating-point arithmetic for money — see spec section 3.
 */

export const USDC_BASE_UNITS_PER_DOLLAR = 1_000_000;

export function usdcBaseUnitsToDisplayString(baseUnits: number): string {
  if (!Number.isInteger(baseUnits)) {
    throw new Error(`usdcBaseUnitsToDisplayString requires an integer, got ${baseUnits}`);
  }
  const negative = baseUnits < 0;
  const abs = Math.abs(baseUnits);
  const whole = Math.floor(abs / USDC_BASE_UNITS_PER_DOLLAR);
  const fraction = abs % USDC_BASE_UNITS_PER_DOLLAR;
  const fractionStr = String(fraction).padStart(6, "0").slice(0, 2);
  return `${negative ? "-" : ""}${whole.toLocaleString("en-US")}.${fractionStr}`;
}

export function sumUsdcBaseUnits(...values: number[]): number {
  for (const v of values) {
    if (!Number.isInteger(v)) {
      throw new Error(`sumUsdcBaseUnits requires integers, got ${v}`);
    }
  }
  return values.reduce((acc, v) => acc + v, 0);
}

export function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer, got ${value}`);
  }
}
