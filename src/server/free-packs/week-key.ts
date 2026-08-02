/**
 * ISO-8601 week key ("YYYY-Www") used to anchor the "one free-pack grant per user per
 * weekly period" rule (spec section 20). Weeks run Monday-Sunday per ISO 8601.
 */
export function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7; // Sunday(0) -> 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // move to the Thursday of this ISO week
  const isoYearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((d.getTime() - isoYearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

export function isoWeekBounds(date: Date): { start: Date; end: Date } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - dayNum + 1);
  monday.setUTCHours(0, 0, 0, 0);
  const nextMonday = new Date(monday);
  nextMonday.setUTCDate(monday.getUTCDate() + 7);
  return { start: monday, end: nextMonday };
}
