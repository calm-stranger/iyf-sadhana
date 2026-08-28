import { describe, expect, it } from "vitest";
import {
  currentStreak,
  parseTimeToMinutes,
  scoreDay,
  summarizePeriod,
} from "./scoring";
import { DAY_MAX } from "./sadhana-schema";

describe("parseTimeToMinutes", () => {
  it("parses valid times", () => {
    expect(parseTimeToMinutes("05:00")).toBe(300);
    expect(parseTimeToMinutes("5:00")).toBe(300);
    expect(parseTimeToMinutes("23:59")).toBe(1439);
  });
  it("accepts postgres HH:MM:SS", () => {
    expect(parseTimeToMinutes("05:30:00")).toBe(330);
    expect(parseTimeToMinutes("21:45:00")).toBe(1305);
  });
  it("rejects junk", () => {
    expect(parseTimeToMinutes("")).toBeNull();
    expect(parseTimeToMinutes(null)).toBeNull();
    expect(parseTimeToMinutes("25:00")).toBeNull();
    expect(parseTimeToMinutes("abc")).toBeNull();
  });
});

describe("scoreDay — woke up bands", () => {
  const woke = (t: string) => scoreDay({ woke_up_at: t }).byRow.woke_up_at;
  it("before 5:00 → 25", () => expect(woke("04:59")).toBe(25));
  it("5:00–5:29 → 20", () => {
    expect(woke("05:00")).toBe(20);
    expect(woke("05:29")).toBe(20);
  });
  it("5:30–5:59 → 15", () => expect(woke("05:45")).toBe(15));
  it("6:00–6:29 → 10", () => expect(woke("06:15")).toBe(10));
  it("6:30–6:59 → 5", () => expect(woke("06:59")).toBe(5));
  it("7:00+ → 0", () => expect(woke("07:00")).toBe(0));
  it("blank → 0", () => expect(woke("")).toBe(0));
});

describe("scoreDay — 16 rounds bands", () => {
  const c = (t: string) => scoreDay({ chanting_completed_at: t }).byRow.chanting_completed_at;
  it("before noon → 25", () => expect(c("11:59")).toBe(25));
  it("12:00–12:29 → 20", () => expect(c("12:00")).toBe(20));
  it("12:30–12:59 → 15", () => expect(c("12:45")).toBe(15));
  it("13:00–13:29 → 10", () => expect(c("13:00")).toBe(10));
  it("13:30–13:59 → 5", () => expect(c("13:59")).toBe(5));
  it("14:00+ → 0", () => expect(c("14:00")).toBe(0));
});

describe("scoreDay — sleep", () => {
  const s = (t: string) => scoreDay({ slept_at: t }).byRow.slept_at;
  it("by 10:00 PM → 25", () => {
    expect(s("22:00")).toBe(25);
    expect(s("21:30")).toBe(25);
    expect(s("12:00")).toBe(25);
  });
  it("after 10:00 PM same night → 0", () => {
    expect(s("22:01")).toBe(0);
    expect(s("23:30")).toBe(0);
  });
  it("past midnight counts as the next day → 0", () => {
    expect(s("00:00")).toBe(0);
    expect(s("01:30")).toBe(0);
    expect(s("05:00")).toBe(0);
    expect(s("11:59")).toBe(0);
  });
});

describe("scoreDay — ticks and total", () => {
  it("empty day = 0", () => expect(scoreDay({}).total).toBe(0));
  it("perfect day = 200", () => {
    const perfect = scoreDay({
      woke_up_at: "04:30",
      chanting_completed_at: "10:00",
      slept_at: "21:45",
      mangal_arati: true,
      nrsimha_arati: true,
      siksastakam: true,
      book_reading: true,
      lecture_hearing: true,
      seva: true,
      study_or_household: true,
    });
    expect(perfect.total).toBe(DAY_MAX);
    expect(perfect.total).toBe(200);
  });
  it("ticks are all-or-nothing", () => {
    expect(scoreDay({ mangal_arati: true }).byRow.mangal_arati).toBe(25);
    expect(scoreDay({ mangal_arati: false }).byRow.mangal_arati).toBe(0);
  });
});

describe("summarizePeriod", () => {
  it("totals, best day and mangal aratis", () => {
    const s = summarizePeriod(
      [
        { entry_date: "2026-08-24", day_score: 120, mangal_arati: true },
        { entry_date: "2026-08-25", day_score: 200, mangal_arati: true },
        { entry_date: "2026-08-26", day_score: 90, mangal_arati: false },
      ],
      7,
    );
    expect(s.total).toBe(410);
    expect(s.max).toBe(1400);
    expect(s.daysFilled).toBe(3);
    expect(s.bestDay).toEqual({ date: "2026-08-25", score: 200 });
    expect(s.mangalAratis).toBe(2);
  });
});

describe("currentStreak", () => {
  it("counts back from today", () => {
    expect(currentStreak(["2026-08-26", "2026-08-27", "2026-08-28"], "2026-08-28")).toBe(3);
  });
  it("holds if today not yet filled but yesterday is", () => {
    expect(currentStreak(["2026-08-26", "2026-08-27"], "2026-08-28")).toBe(2);
  });
  it("breaks on a gap", () => {
    expect(currentStreak(["2026-08-24", "2026-08-27", "2026-08-28"], "2026-08-28")).toBe(2);
  });
  it("zero when nothing recent", () => {
    expect(currentStreak(["2026-01-01"], "2026-08-28")).toBe(0);
  });
});
