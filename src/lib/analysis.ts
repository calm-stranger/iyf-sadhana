import { getEntries } from "@/lib/data";
import { todayKey, weekStart, weekDays, monthRange, addDays, DOW } from "@/lib/dates";
import { currentStreak, dayTotal, summarizePeriod, type WeekSummary } from "@/lib/scoring";
import type { SadhanaEntry } from "@/types/database";

export type AnalysisRange = "week" | "month" | "year";

export function parseRange(v: unknown): AnalysisRange {
  return v === "month" || v === "year" ? v : "week";
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface AnalysisData {
  range: AnalysisRange;
  chart: ChartPoint[];
  chartMax: number;
  chartCaption: string;
  summary: WeekSummary;
  streak: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Everything the analysis view needs for one user + one range. */
export async function getAnalysis(userId: string, range: AnalysisRange): Promise<AnalysisData> {
  const today = todayKey();
  const year = today.slice(0, 4);

  let start: string;
  let end = today;
  let expectedDays: number;

  if (range === "week") {
    start = weekStart(today);
    expectedDays = 7;
  } else if (range === "month") {
    const m = monthRange(today);
    start = m.start;
    expectedDays = m.days;
  } else {
    start = `${year}-01-01`;
    end = `${year}-12-31`;
    expectedDays = 365;
  }

  const rows = (await getEntries(userId, start, end)) as SadhanaEntry[];
  const byDate = new Map(rows.map((r) => [r.entry_date, r]));

  // summary is computed only over days that actually have data
  const summary = summarizePeriod(
    rows.map((e) => ({ ...e })),
    expectedDays,
  );

  let chart: ChartPoint[];
  let chartCaption: string;

  if (range === "week") {
    const days = weekDays(weekStart(today));
    chart = days.map((d, i) => ({
      label: DOW[i],
      value: byDate.has(d) ? dayTotal(byDate.get(d)!) : 0,
    }));
    chartCaption = "Score each day this week";
  } else if (range === "month") {
    const m = monthRange(today);
    chart = Array.from({ length: m.days }, (_, i) => {
      const d = addDays(m.start, i);
      return { label: String(i + 1), value: byDate.has(d) ? dayTotal(byDate.get(d)!) : 0 };
    });
    chartCaption = "Score each day this month";
  } else {
    // 12 months → average score per filled day that month
    const totals = Array.from({ length: 12 }, () => ({ sum: 0, days: 0 }));
    for (const r of rows) {
      const mi = Number(r.entry_date.slice(5, 7)) - 1;
      totals[mi].sum += dayTotal(r);
      totals[mi].days += 1;
    }
    chart = totals.map((t, i) => ({
      label: MONTHS[i],
      value: t.days ? Math.round(t.sum / t.days) : 0,
    }));
    chartCaption = "Average daily score each month";
  }

  const streakRows =
    range === "week" || range === "month"
      ? ((await getEntries(userId, addDays(today, -400), today)) as SadhanaEntry[])
      : rows;
  const streak = currentStreak(
    streakRows.map((e) => e.entry_date),
    today,
  );

  return { range, chart, chartMax: 200, chartCaption, summary, streak };
}
