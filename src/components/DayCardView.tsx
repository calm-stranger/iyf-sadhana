import { CARD_ROWS, DAY_MAX } from "@/lib/sadhana-schema";
import { scoreDay, dayTotal } from "@/lib/scoring";
import { prettyDate } from "@/lib/dates";
import { ScoreRing } from "@/components/ScoreRing";
import type { SadhanaEntry } from "@/types/database";

/** Read-only rendering of one day's card — used by servant leaders / counsellor. */
export function DayCardView({ date, entry }: { date: string; entry: SadhanaEntry | null }) {
  const byRow = entry ? scoreDay(entry).byRow : null;

  const details: string[] = entry
    ? [
        entry.book_reading_detail && `Reading — ${entry.book_reading_detail}`,
        entry.lecture_hearing_detail && `Lecture — ${entry.lecture_hearing_detail}`,
        entry.seva_detail && `Seva — ${entry.seva_detail}`,
        entry.study_or_household_detail && `Study / work — ${entry.study_or_household_detail}`,
      ].filter((x): x is string => Boolean(x))
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[1.1rem] font-semibold tracking-tight">{prettyDate(date)}</h2>
          {entry ? (
            <p className="mt-0.5 text-xs text-muted">
              Submitted {new Date(entry.submitted_at).toLocaleString(undefined, {
                day: "numeric",
                month: "short",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-warn">Not submitted</p>
          )}
        </div>
        <ScoreRing value={entry ? dayTotal(entry) : 0} max={DAY_MAX} />
      </div>

      {entry ? (
        <>
          <ul className="card divide-y divide-border p-0">
            {CARD_ROWS.map((row) => {
              const raw = entry[row.key as keyof SadhanaEntry];
              const display =
                row.type === "time"
                  ? raw
                    ? String(raw).slice(0, 5)
                    : "—"
                  : raw
                    ? "Yes"
                    : "—";
              const pts = byRow ? byRow[row.key] : 0;
              return (
                <li key={row.key} className="flex items-center justify-between gap-3 p-3.5 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{row.label}</span>
                    {row.hint ? <span className="ml-1 text-xs text-muted">· {row.hint}</span> : null}
                  </span>
                  <span className={raw ? "" : "text-muted"}>{display}</span>
                  <span className="w-12 shrink-0 text-right text-[13px] tabular-nums text-muted">
                    {pts}
                    <span className="opacity-50">/{row.max}</span>
                  </span>
                </li>
              );
            })}
          </ul>

          {details.length > 0 && (
            <div className="card space-y-1 p-4 text-sm">
              {details.map((d, i) => (
                <p key={i} className="text-muted">
                  {d}
                </p>
              ))}
            </div>
          )}

          {entry.note && (
            <div className="card p-4 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">Note</div>
              <p className="mt-1">{entry.note}</p>
            </div>
          )}
        </>
      ) : (
        <div className="card p-8 text-center text-sm text-muted">
          This day hasn&apos;t been filled in.
        </div>
      )}
    </div>
  );
}
