/**
 * The Sadhana Card — single definition of the 10 daily rows.
 * Mirrors the ISKCON Youth Forum · Guwahati paper card. Keep this in sync with
 * the `day_score` Postgres function in supabase/migrations.
 */

export type TimeRowKey = "woke_up_at" | "chanting_completed_at" | "slept_at";
export type TickRowKey =
  | "mangal_arati"
  | "nrsimha_arati"
  | "siksastakam"
  | "book_reading"
  | "lecture_hearing"
  | "seva"
  | "study_or_household";

export type RowKey = TimeRowKey | TickRowKey;

/** Optional free-text the student may add about a practice (never scored). */
export type DetailKey =
  | "book_reading_detail"
  | "lecture_hearing_detail"
  | "seva_detail"
  | "study_or_household_detail";

export interface TimeRow {
  key: TimeRowKey;
  label: string;
  hint?: string;
  type: "time";
  max: number;
  /** ascending cutoffs: first matching `beforeMinutes` wins, else `elseScore` */
  bands: { beforeMinutes: number; score: number }[];
  elseScore: number;
  /**
   * If set, a time earlier than this is treated as belonging to the next day
   * (add 24h before scoring). Used for bedtime: 01:30 means 1:30 AM the next
   * morning, i.e. well after 10 PM, so it must score 0.
   */
  wrapsBeforeMinutes?: number;
}

export interface TickRow {
  key: TickRowKey;
  label: string;
  hint?: string;
  type: "tick";
  max: number;
  /** if set, show an optional text field once the row is ticked */
  detail?: { key: DetailKey; placeholder: string };
}

export const DETAIL_KEYS: DetailKey[] = [
  "book_reading_detail",
  "lecture_hearing_detail",
  "seva_detail",
  "study_or_household_detail",
];

export type CardRow = TimeRow | TickRow;

const hm = (h: number, m = 0) => h * 60 + m;

export const TIME_ROWS: TimeRow[] = [
  {
    key: "woke_up_at",
    label: "Woke up",
    hint: "write the time",
    type: "time",
    max: 25,
    bands: [
      { beforeMinutes: hm(5, 0), score: 25 },
      { beforeMinutes: hm(5, 30), score: 20 },
      { beforeMinutes: hm(6, 0), score: 15 },
      { beforeMinutes: hm(6, 30), score: 10 },
      { beforeMinutes: hm(7, 0), score: 5 },
    ],
    elseScore: 0,
  },
  {
    key: "chanting_completed_at",
    label: "16 rounds finished",
    hint: "chanting before 12 pm",
    type: "time",
    max: 25,
    bands: [
      { beforeMinutes: hm(12, 0), score: 25 },
      { beforeMinutes: hm(12, 30), score: 20 },
      { beforeMinutes: hm(13, 0), score: 15 },
      { beforeMinutes: hm(13, 30), score: 10 },
      { beforeMinutes: hm(14, 0), score: 5 },
    ],
    elseScore: 0,
  },
  {
    key: "slept_at",
    label: "Went to sleep",
    hint: "sleep time & sadhana entry",
    type: "time",
    max: 25,
    bands: [{ beforeMinutes: hm(22, 0) + 1, score: 25 }], // by 10:00 PM inclusive
    elseScore: 0,
    wrapsBeforeMinutes: hm(12, 0), // 00:00–11:59 = slept past midnight → next day
  },
];

export const TICK_ROWS: TickRow[] = [
  { key: "mangal_arati", label: "Mangal arati", type: "tick", max: 25 },
  { key: "nrsimha_arati", label: "Nrsimha arati", type: "tick", max: 20 },
  { key: "siksastakam", label: "Siksastakam", type: "tick", max: 10 },
  {
    key: "book_reading",
    label: "Srila Prabhupada's books reading",
    hint: "20 minutes",
    type: "tick",
    max: 20,
    detail: { key: "book_reading_detail", placeholder: "Which book / chapter? (optional)" },
  },
  {
    key: "lecture_hearing",
    label: "Lecture hearing",
    hint: "30 minutes",
    type: "tick",
    max: 20,
    detail: { key: "lecture_hearing_detail", placeholder: "Which lecture / speaker? (optional)" },
  },
  {
    key: "seva",
    label: "Seva",
    hint: "30 minutes",
    type: "tick",
    max: 10,
    detail: { key: "seva_detail", placeholder: "What seva did you do? (optional)" },
  },
  {
    key: "study_or_household",
    label: "Academic study / household activities",
    hint: "hours as a student or working student",
    type: "tick",
    max: 20,
    detail: { key: "study_or_household_detail", placeholder: "How many hours? (optional)" },
  },
];

/** Card row order as printed on the paper card. */
export const CARD_ROWS: CardRow[] = [
  TIME_ROWS[0],
  TICK_ROWS[0],
  TICK_ROWS[1],
  TICK_ROWS[2],
  TIME_ROWS[1],
  TICK_ROWS[3],
  TICK_ROWS[4],
  TICK_ROWS[5],
  TICK_ROWS[6],
  TIME_ROWS[2],
];

export const DAY_MAX = CARD_ROWS.reduce((s, r) => s + r.max, 0); // 200
export const WEEK_MAX = DAY_MAX * 7; // 1400
