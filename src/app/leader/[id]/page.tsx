import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { requireProfile, getEntries } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { getAnalysis, parseRange } from "@/lib/analysis";
import { todayKey, weekStart, weekDays, monthRange, prettyDate } from "@/lib/dates";
import { dayTotal } from "@/lib/scoring";
import { AnalysisView } from "@/components/AnalysisView";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { ForwardForm } from "./ForwardForm";
import { BottomNav } from "@/components/BottomNav";
import type { Profile } from "@/types/database";

export default async function StudentDetailPage({ params, searchParams }: PageProps<"/leader/[id]">) {
  const me = await requireProfile();
  if (me.role !== "servant_leader" && me.role !== "super_admin") notFound();

  const { id } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: student } = await supabase.from("profiles").select("*").eq("id", id).single();
  if (!student) notFound(); // RLS blocks students not under this leader
  const s = student as Profile;

  const today = todayKey();
  const monday = weekStart(today);
  const days = weekDays(monday);
  const month = monthRange(today);

  const [analysis, weekEntries] = await Promise.all([
    getAnalysis(s.id, parseRange(sp.r)),
    getEntries(s.id, days[0], days[6]),
  ]);

  return (
    <>
      <main className="page page-md animate-page flex-1 space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[1.35rem] font-semibold tracking-tight">{s.full_name}</h1>
            <p className="mt-1 text-sm text-muted">
              {s.rounds} rounds · joined {s.year_joined} · {s.whatsapp}
            </p>
          </div>
          <WhatsAppButton phone={s.whatsapp} message={`Hare Krishna ${s.full_name} 🙏`} />
        </header>

        <AnalysisView data={analysis} basePath={`/leader/${id}`} />

        <section className="card overflow-hidden p-0">
          <h2 className="border-b border-border p-4 text-xs font-semibold uppercase tracking-wide text-muted">
            This week, day by day
          </h2>
          <ul className="divide-y divide-border">
            {days.map((d) => {
              const e = weekEntries.find((x) => x.entry_date === d);
              const future = d > today;
              const details = e
                ? [
                    e.book_reading_detail && `Reading: ${e.book_reading_detail}`,
                    e.lecture_hearing_detail && `Lecture: ${e.lecture_hearing_detail}`,
                    e.seva_detail && `Seva: ${e.seva_detail}`,
                    e.study_or_household_detail && `Study/work: ${e.study_or_household_detail}`,
                    e.note && `Note: ${e.note}`,
                  ].filter(Boolean)
                : [];

              const body = (
                <>
                  <div className="flex items-center justify-between">
                    <span className={future ? "text-muted" : "font-medium"}>{prettyDate(d)}</span>
                    <span className="flex items-center gap-1 text-muted">
                      {e
                        ? `${dayTotal(e)}/200 · sent ${new Date(e.submitted_at).toLocaleDateString()}`
                        : future
                          ? "—"
                          : "not submitted"}
                      {e ? <ChevronRight size={15} className="text-primary" /> : null}
                    </span>
                  </div>
                  {details.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5 text-xs text-muted">
                      {details.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  )}
                </>
              );

              return (
                <li key={d} className="text-sm">
                  {e ? (
                    <Link href={`/leader/${id}/day/${d}`} className="tap block p-4 hover:bg-surface-2">
                      {body}
                    </Link>
                  ) : (
                    <div className="p-4">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Forward to counsellor
          </h2>
          <ForwardForm subjectUserId={s.id} weekStart={monday} monthStart={month.start} />
        </section>
      </main>
      <BottomNav portal={me.role === "super_admin" ? "admin" : "leader"} />
    </>
  );
}
