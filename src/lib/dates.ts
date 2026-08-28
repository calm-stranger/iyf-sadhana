/** All date keys in the app are "YYYY-MM-DD" in the org's local sense. */

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function addDays(key: string, n: number): string {
  const d = new Date(key + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing `key`. */
export function weekStart(key: string): string {
  const d = new Date(key + "T00:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7; // Mon = 0
  return addDays(key, -dow);
}

export function weekDays(mondayKey: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(mondayKey, i));
}

export function monthRange(key: string): { start: string; end: string; days: number } {
  const d = new Date(key + "T00:00:00Z");
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const mm = String(m + 1).padStart(2, "0");
  return { start: `${y}-${mm}-01`, end: `${y}-${mm}-${String(days).padStart(2, "0")}`, days };
}

export function prettyDate(key: string): string {
  return new Date(key + "T00:00:00Z").toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
