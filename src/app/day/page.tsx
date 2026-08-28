import { requireSadhakaProfile, getEntries } from "@/lib/data";
import { todayKey, weekStart, addDays, prettyDate } from "@/lib/dates";
import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";

export default async function DayIndexPage() {
  const profile = await requireSadhakaProfile();
  const today = todayKey();
  const start = addDays(weekStart(today), -7); // last 14 days
  const entries = await getEntries(profile.id, start, today);
  const filled = new Map(entries.map((e) => [e.entry_date, e.day_score]));

  const days: string[] = [];
  for (let i = 0; i < 14; i++) days.push(addDays(today, -i));

  return (
    <>
      <main className="page page-sm animate-page flex-1">
        <h1 className="text-lg font-semibold">Pick a day</h1>
        <p className="text-sm text-muted">Fill or fix any day up to today.</p>
        <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-surface">
          {days.map((d) => (
            <li key={d}>
              <Link href={`/day/${d}`} className="flex items-center justify-between p-3">
                <span>{prettyDate(d)}</span>
                <span className="text-sm text-muted">
                  {filled.has(d) ? `${filled.get(d)}/200` : "not filled"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <BottomNav />
    </>
  );
}
