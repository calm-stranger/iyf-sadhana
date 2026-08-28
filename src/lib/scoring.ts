import {
  CARD_ROWS,
  DAY_MAX,
  TICK_ROWS,
  TIME_ROWS,
  type RowKey,
  type TickRowKey,
  type TimeRow,
} from "./sadhana-schema";

/** Shape of a day's raw values (nullable while a draft is in progress). */
export interface DayValues {
  woke_up_at?: string | null; // "HH:MM" (24h)
  chanting_completed_at?: string | null;
  slept_at?: string | null;
  mangal_arati?: boolean | null;
  nrsimha_arati?: boolean | null;
  siksastakam?: boolean | null;
  book_reading?: boolean | null;
  lecture_hearing?: boolean | null;
  seva?: boolean | null;
  study_or_household?: boolean | null;
}

/** "HH:MM" -> minutes since midnight, or null. Accepts "H:MM" and "HH:MM:SS"
 *  (Postgres `time` columns come back as "HH:MM:SS"). */
export function parseTimeToMinutes(t?: string | null): number | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(t.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

export function scoreTimeRow(row: TimeRow, value?: string | null): number {
  let mins = parseTimeToMinutes(value);
  if (mins === null) return 0;
  // a bedtime like 01:30 belongs to the next day — push it past the cutoffs
  if (row.wrapsBeforeMinutes !== undefined && mins < row.wrapsBeforeMinutes) {
    mins += 24 * 60;
  }
  for (const band of row.bands) {
    if (mins < band.beforeMinutes) return band.score;
  }
  return row.elseScore;
}

export function scoreTickRow(key: TickRowKey, value: boolean | null | undefined, max: number): number {
  return value ? max : 0;
}

export interface DayScore {
  total: number;
  max: number;
  byRow: Record<RowKey, number>;
}

export function scoreDay(values: DayValues): DayScore {
  const byRow = {} as Record<RowKey, number>;

  for (const row of TIME_ROWS) {
    byRow[row.key] = scoreTimeRow(row, values[row.key]);
  }
  for (const row of TICK_ROWS) {
    byRow[row.key] = scoreTickRow(row.key, values[row.key], row.max);
  }

  const total = CARD_ROWS.reduce((s, r) => s + (byRow[r.key] ?? 0), 0);
  return { total, max: DAY_MAX, byRow };
}

// ---- week / month / year aggregation ----

export interface DayRecord extends DayValues {
  entry_date: string; // "YYYY-MM-DD"
  day_score?: number | null;
}

export function dayTotal(d: DayRecord): number {
  return typeof d.day_score === "number" ? d.day_score : scoreDay(d).total;
}

export interface WeekSummary {
  total: number;
  max: number;
  daysFilled: number;
  bestDay: { date: string; score: number } | null;
  mangalAratis: number;
  average: number;
}

export function summarizePeriod(days: DayRecord[], expectedDays: number): WeekSummary {
  let total = 0;
  let mangalAratis = 0;
  let best: { date: string; score: number } | null = null;

  for (const d of days) {
    const t = dayTotal(d);
    total += t;
    if (d.mangal_arati) mangalAratis += 1;
    if (!best || t > best.score) best = { date: d.entry_date, score: t };
  }

  return {
    total,
    max: DAY_MAX * expectedDays,
    daysFilled: days.length,
    bestDay: best,
    mangalAratis,
    average: days.length ? Math.round(total / days.length) : 0,
  };
}

/** Consecutive-day submission streak ending at `today` (YYYY-MM-DD). */
export function currentStreak(entryDates: string[], today: string): number {
  const set = new Set(entryDates);
  let streak = 0;
  const cursor = new Date(today + "T00:00:00Z");
  // allow the streak to "hold" if today isn't filled yet but yesterday is
  if (!set.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (set.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
