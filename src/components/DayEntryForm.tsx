"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CARD_ROWS, type CardRow, type DetailKey } from "@/lib/sadhana-schema";
import { scoreDay, type DayValues } from "@/lib/scoring";
import { submitEntry, type EntryInput } from "@/lib/entry-actions";
import {
  clearDraft,
  enqueueSubmission,
  loadDraft,
  saveDraft,
  type DayDraft,
} from "@/lib/offline/draft";
import Link from "next/link";
import { prettyDate, todayKey } from "@/lib/dates";
import { ScoreRing } from "@/components/ScoreRing";
import { Spinner } from "@/components/ui";
import { cn } from "@/lib/cn";

function submittedLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) +
    " at " +
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

type Details = Partial<Record<DetailKey, string | null>>;
type FormValues = DayValues & Details & { note?: string | null };

const EMPTY: FormValues = {
  woke_up_at: null,
  chanting_completed_at: null,
  slept_at: null,
  mangal_arati: false,
  nrsimha_arati: false,
  siksastakam: false,
  book_reading: false,
  lecture_hearing: false,
  seva: false,
  study_or_household: false,
  book_reading_detail: "",
  lecture_hearing_detail: "",
  seva_detail: "",
  study_or_household_detail: "",
  note: "",
};

export function DayEntryForm({
  date,
  initial,
  serverSubmittedAt,
}: {
  date: string;
  initial: Partial<FormValues> | null;
  serverSubmittedAt: string | null;
}) {
  const [values, setValues] = useState<FormValues>({ ...EMPTY, ...initial });
  const [status, setStatus] = useState<"idle" | "saved" | "queued" | "error">("idle");
  // once submitted the form is read-only until the student taps "Edit"
  const [locked, setLocked] = useState<boolean>(!!serverSubmittedAt);
  const [submittedAt, setSubmittedAt] = useState<string | null>(serverSubmittedAt);
  const [pending, startTransition] = useTransition();
  const hydrated = useRef(false);
  // the last saved state — what "Cancel" restores and what "dirty" compares against
  const [baseline, setBaseline] = useState<FormValues>({ ...EMPTY, ...initial });

  // hydrate from the offline draft (unsaved edits win over the server copy)
  useEffect(() => {
    (async () => {
      const draft = await loadDraft(date);
      if (draft) {
        const serverTime = serverSubmittedAt ? Date.parse(serverSubmittedAt) : 0;
        if (draft.updatedAt >= serverTime) {
          const rest = { ...draft } as Partial<DayDraft>;
          delete rest.updatedAt;
          setValues((v) => ({ ...v, ...rest }));
          setLocked(false); // there are unsaved changes — let them keep editing
        }
      }
      hydrated.current = true;
    })();
  }, [date, serverSubmittedAt]);

  // persist every change (not while locked — nothing is changing then)
  useEffect(() => {
    if (!hydrated.current || locked) return;
    void saveDraft(date, values);
    setStatus("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, values]);

  const score = useMemo(() => scoreDay(values), [values]);

  const dirty = useMemo(
    () =>
      (Object.keys(EMPTY) as (keyof FormValues)[]).some(
        (k) => (values[k] ?? "") !== (baseline[k] ?? ""),
      ),
    [values, baseline],
  );

  // "Edit" mode = an already-submitted day reopened for changes
  const editingSubmitted = !locked && !!submittedAt;
  const onToday = date === todayKey();

  function set<K extends keyof FormValues>(key: K, val: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  function onCancelEdit() {
    setValues({ ...baseline });
    void clearDraft(date);
    setStatus("idle");
    setLocked(true);
  }

  function onSubmit() {
    const payload: EntryInput = {
      entry_date: date,
      woke_up_at: values.woke_up_at || null,
      chanting_completed_at: values.chanting_completed_at || null,
      slept_at: values.slept_at || null,
      mangal_arati: !!values.mangal_arati,
      nrsimha_arati: !!values.nrsimha_arati,
      siksastakam: !!values.siksastakam,
      book_reading: !!values.book_reading,
      lecture_hearing: !!values.lecture_hearing,
      seva: !!values.seva,
      study_or_household: !!values.study_or_household,
      // keep a detail only if its practice is ticked
      book_reading_detail: values.book_reading ? values.book_reading_detail || null : null,
      lecture_hearing_detail: values.lecture_hearing ? values.lecture_hearing_detail || null : null,
      seva_detail: values.seva ? values.seva_detail || null : null,
      study_or_household_detail: values.study_or_household
        ? values.study_or_household_detail || null
        : null,
      note: values.note || null,
    };

    startTransition(async () => {
      try {
        const res = await submitEntry(payload);
        if (res.ok) {
          await clearDraft(date);
          setBaseline({ ...values });
          setStatus("saved");
          setSubmittedAt(new Date().toISOString());
          setLocked(true);
        } else {
          setStatus("error");
        }
      } catch {
        // offline — queue it, service worker / reconnect will flush
        const draft: DayDraft = { ...values, updatedAt: Date.now() };
        await enqueueSubmission(date, draft);
        setBaseline({ ...values });
        setStatus("queued");
        setSubmittedAt(new Date().toISOString());
        setLocked(true);
      }
    });
  }

  const statusText =
    status === "saved"
      ? "Submitted ✓"
      : status === "queued"
        ? "Saved offline — will sync"
        : status === "error"
          ? "Couldn't submit — try again"
          : "Draft saved on this device";

  return (
    <div className="page page-sm animate-page pb-10">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[1.35rem] font-semibold tracking-tight">{prettyDate(date)}</h1>
          <p className="mt-1 text-sm text-muted">
            {locked ? "Submitted — tap Edit to change anything." : "Fill it in tonight, not at week's end."}
          </p>
        </div>
        <ScoreRing value={score.total} max={score.max} />
      </header>

      <fieldset disabled={locked} className="contents">
        <div className={cn("stagger space-y-2.5", locked && "opacity-70")}>
          {CARD_ROWS.map((row) => (
            <Row
              key={row.key}
              row={row}
              locked={locked}
              value={values[row.key as keyof FormValues]}
              points={score.byRow[row.key]}
              detailValue={
                row.type === "tick" && row.detail
                  ? (values[row.detail.key] as string | null) ?? ""
                  : ""
              }
              onTime={(t) => set(row.key as keyof FormValues, (t || null) as never)}
              onTick={(b) => set(row.key as keyof FormValues, b as never)}
              onDetail={(t) =>
                row.type === "tick" && row.detail
                  ? set(row.detail.key, t as never)
                  : undefined
              }
            />
          ))}
        </div>

        <label className={cn("mt-5 block", locked && "opacity-70")}>
          <span className="text-sm font-medium text-muted">One line about today (optional)</span>
          <textarea
            className="mt-1.5 w-full rounded-xl p-3 text-sm"
            rows={2}
            placeholder="What helped, or what got in the way…"
            value={values.note ?? ""}
            onChange={(e) => set("note", e.target.value)}
          />
        </label>
      </fieldset>

      {locked ? (
        <div className="mt-8 rounded-xl border border-good/30 bg-good/5 p-4 text-center">
          <p className="text-sm font-semibold text-good">
            {status === "queued" ? "Saved offline — will sync" : "Submitted ✓"}
          </p>
          {submittedAt ? (
            <p className="mt-0.5 text-xs text-muted">Recorded {submittedLabel(submittedAt)}</p>
          ) : null}
          <button
            onClick={() => {
              setLocked(false);
              setStatus("idle");
            }}
            className="mt-3 rounded-xl border border-border bg-surface px-6 py-2.5 text-sm font-semibold hover:bg-surface-2"
          >
            Edit
          </button>

          <div className="mt-4 flex items-center justify-center gap-5 border-t border-good/20 pt-3 text-sm font-medium text-primary">
            {!onToday ? (
              <Link href="/" className="tap">
                Back to today
              </Link>
            ) : null}
            <Link href="/day" className="tap">
              Fill another day
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <div className={cn("flex gap-3", !editingSubmitted && "flex-col")}>
            {editingSubmitted ? (
              <button
                onClick={onCancelEdit}
                disabled={pending}
                className="rounded-xl border border-border bg-surface px-6 py-3.5 text-sm font-semibold hover:bg-surface-2 disabled:opacity-60"
              >
                Cancel
              </button>
            ) : null}
            <button
              onClick={onSubmit}
              disabled={pending || (editingSubmitted && !dirty)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-fg shadow-sm hover:brightness-110 disabled:opacity-60"
            >
              {pending ? <Spinner className="text-primary-fg" /> : null}
              {pending ? "Saving…" : editingSubmitted ? "Update" : "Submit"}
            </button>
          </div>
          <p
            className={cn(
              "mt-2 text-center text-xs font-medium",
              status === "error" ? "text-warn" : "text-muted",
            )}
          >
            {status === "error"
              ? "Couldn't submit — try again"
              : editingSubmitted && !dirty
                ? "Nothing changed yet"
                : statusText}
          </p>
        </div>
      )}
    </div>
  );
}

function Row({
  row,
  value,
  points,
  detailValue,
  locked,
  onTime,
  onTick,
  onDetail,
}: {
  row: CardRow;
  value: unknown;
  points: number;
  detailValue: string;
  locked: boolean;
  onTime: (t: string) => void;
  onTick: (b: boolean) => void;
  onDetail: (t: string) => void;
}) {
  const active = !!value;
  const showDetail = row.type === "tick" && !!row.detail && active;

  return (
    <div
      className={cn(
        "rounded-xl border p-3.5 transition-colors",
        active ? "border-primary/30 bg-primary-soft" : "border-border bg-surface",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{row.label}</div>
          {row.hint ? <div className="mt-0.5 text-xs text-muted">{row.hint}</div> : null}
        </div>

        {row.type === "time" ? (
          <input
            type="time"
            value={(value as string) ?? ""}
            onChange={(e) => onTime(e.target.value)}
            className="bg-background px-2.5 text-sm"
          />
        ) : (
          <button
            type="button"
            onClick={() => onTick(!value)}
            aria-pressed={active}
            aria-label={row.label}
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-xl border text-lg disabled:opacity-100",
              locked && "cursor-default",
              active
                ? "border-primary bg-primary text-primary-fg shadow-sm"
                : "border-border bg-surface text-transparent",
            )}
          >
            ✓
          </button>
        )}

        <span className="w-11 shrink-0 text-right text-[13px] tabular-nums text-muted">
          {points}
          <span className="opacity-50">/{row.max}</span>
        </span>
      </div>

      {showDetail ? (
        <input
          type="text"
          value={detailValue}
          maxLength={200}
          onChange={(e) => onDetail(e.target.value)}
          placeholder={row.type === "tick" ? row.detail!.placeholder : ""}
          className="animate-in mt-2.5 w-full bg-surface px-3 py-2 text-sm"
        />
      ) : null}
    </div>
  );
}
