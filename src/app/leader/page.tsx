import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile, getEntries } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { todayKey, weekStart, weekDays } from "@/lib/dates";
import { summarizePeriod } from "@/lib/scoring";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { BottomNav } from "@/components/BottomNav";
import type { Profile } from "@/types/database";

export default async function LeaderPage() {
  const me = await requireProfile();
  if (me.role !== "servant_leader" && me.role !== "super_admin") notFound();

  const supabase = await createClient();
  const { data: students } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "student")
    .eq(me.role === "servant_leader" ? "servant_leader_id" : "role", me.role === "servant_leader" ? me.id : "student")
    .order("full_name");

  const today = todayKey();
  const monday = weekStart(today);
  const days = weekDays(monday);

  const rows = await Promise.all(
    ((students as Profile[]) ?? []).map(async (s) => {
      const entries = await getEntries(s.id, days[0], days[6]);
      const summary = summarizePeriod(entries.map((e) => ({ ...e })), 7);
      const submittedToday = entries.some((e) => e.entry_date === today);
      return { s, summary, submittedToday, pending: s.status === "pending" };
    }),
  );

  const pending = rows.filter((r) => r.pending);
  const active = rows.filter((r) => !r.pending);

  return (
    <>
      <main className="page page-md animate-page flex-1">
        <h1 className="text-[1.35rem] font-semibold tracking-tight">My students</h1>
        <p className="mt-1 text-sm text-muted">Week of {monday}</p>

        {pending.length > 0 && (
          <section className="mt-4">
            <h2 className="text-sm font-semibold text-warn">Awaiting your approval</h2>
            <ul className="mt-2 space-y-2">
              {pending.map(({ s }) => (
                <li key={s.id} className="flex items-center justify-between rounded-xl border border-warn/40 bg-warn/5 p-3">
                  <span>{s.full_name}</span>
                  <ApproveButton id={s.id} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <ul className="mt-4 space-y-2.5">
          {active.map(({ s, summary, submittedToday }) => (
            <li
              key={s.id}
              className="card relative p-4 transition-colors hover:bg-surface-2"
            >
              {/* whole card opens the student — WhatsApp button sits above it */}
              <Link
                href={`/leader/${s.id}`}
                className="absolute inset-0 rounded-2xl"
                aria-label={`Open ${s.full_name}`}
              />
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{s.full_name}</span>
                <span className={submittedToday ? "text-xs text-good" : "text-xs text-warn"}>
                  {submittedToday ? "submitted today" : "not yet today"}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-sm text-muted">
                <span>
                  Week {summary.total}/1400 · {summary.daysFilled}/7 days · MA{" "}
                  {summary.mangalAratis}/7
                </span>
                <span className="relative z-10 shrink-0">
                  <WhatsAppButton
                    phone={s.whatsapp}
                    message={`Hare Krishna ${s.full_name} 🙏 Checking in on your sadhana this week.`}
                  />
                </span>
              </div>
            </li>
          ))}
          {active.length === 0 && <p className="text-sm text-muted">No students yet.</p>}
        </ul>
      </main>
      <BottomNav portal="leader" />
    </>
  );
}

function ApproveButton({ id }: { id: string }) {
  return (
    <form
      action={async () => {
        "use server";
        const { setUserStatus } = await import("@/lib/admin-actions");
        await setUserStatus(id, "active");
      }}
    >
      <button className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-fg">
        Approve
      </button>
    </form>
  );
}
