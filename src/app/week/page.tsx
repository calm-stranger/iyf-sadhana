import Link from "next/link";
import { requireSadhakaProfile, getEntries } from "@/lib/data";
import { todayKey, weekStart, weekDays, addDays, DOW } from "@/lib/dates";
import { CARD_ROWS } from "@/lib/sadhana-schema";
import { scoreDay, dayTotal, summarizePeriod } from "@/lib/scoring";
import { BottomNav } from "@/components/BottomNav";

export default async function WeekPage({ searchParams }: PageProps<"/week">) {
  const profile = await requireSadhakaProfile();
  const sp = await searchParams;
  const anchor = typeof sp.w === "string" ? sp.w : todayKey();
  const monday = weekStart(anchor);
  const days = weekDays(monday);

  const entries = await getEntries(profile.id, days[0], days[6]);
  const byDate = new Map(entries.map((e) => [e.entry_date, e]));
  const summary = summarizePeriod(
    entries.map((e) => ({ ...e })),
    7,
  );

  return (
    <>
      <main className="page page-md animate-page flex-1">
        <div className="flex items-center justify-between">
          <Link href={`/week?w=${addDays(monday, -7)}`} className="tap rounded-lg px-2 py-1 text-sm font-medium text-primary">‹ Prev</Link>
          <h1 className="text-sm font-semibold">Week of {monday}</h1>
          <Link href={`/week?w=${addDays(monday, 7)}`} className="tap rounded-lg px-2 py-1 text-sm font-medium text-primary">Next ›</Link>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="p-2 text-left font-medium">Practice</th>
                {DOW.map((d, i) => (
                  <th key={d} className="p-2 text-center font-medium">
                    <Link href={`/day/${days[i]}`}>{d}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CARD_ROWS.map((row) => (
                <tr key={row.key} className="border-t border-border">
                  <td className="p-2">{row.label}</td>
                  {days.map((d) => {
                    const e = byDate.get(d);
                    const v = e?.[row.key as keyof typeof e];
                    const pts = e ? scoreDay(e).byRow[row.key] : 0;
                    return (
                      <td key={d} className="p-2 text-center">
                        {row.type === "time"
                          ? (v as string) ?? "·"
                          : v
                            ? "✓"
                            : "·"}
                        {e ? <div className="text-[10px] text-muted">{pts}</div> : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-t-2 border-border font-semibold">
                <td className="p-2">Today&apos;s total</td>
                {days.map((d) => (
                  <td key={d} className="p-2 text-center">
                    {byDate.has(d) ? dayTotal(byDate.get(d)!) : "·"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
          <Stat label="Week total" value={`${summary.total} / 1400`} />
          <Stat label="Best day" value={summary.bestDay ? `${summary.bestDay.score}` : "—"} />
          <Stat label="Mangal aratis" value={`${summary.mangalAratis} / 7`} />
        </dl>
      </main>
      <BottomNav />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="text-base font-semibold">{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}
