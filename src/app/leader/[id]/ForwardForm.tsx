"use client";

import { useActionState, useState } from "react";
import { forwardToCounsellor } from "@/lib/admin-actions";

export function ForwardForm({
  subjectUserId,
  weekStart,
  monthStart,
}: {
  subjectUserId: string;
  weekStart: string;
  monthStart: string;
}) {
  const [state, action, pending] = useActionState(forwardToCounsellor, {} as { error?: string });
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [done, setDone] = useState(false);

  return (
    <form
      action={async (fd) => {
        await action(fd);
        setDone(true);
      }}
      className="mt-3 space-y-3"
    >
      <input type="hidden" name="subject_user_id" value={subjectUserId} />
      <input type="hidden" name="period_type" value={period} />
      <input type="hidden" name="period_start" value={period === "week" ? weekStart : monthStart} />

      <div className="flex gap-2">
        {(["week", "month"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`rounded-full px-3 py-1 text-sm ${period === p ? "bg-primary text-primary-fg" : "border border-border"}`}
          >
            This {p}
          </button>
        ))}
      </div>

      <textarea
        name="leader_message"
        rows={3}
        required
        placeholder="What would you like the counsellor to look at?"
        className="w-full rounded-xl border border-border bg-background p-3 text-sm"
      />

      {state?.error ? <p className="text-sm text-warn">{state.error}</p> : null}
      {done && !state?.error ? <p className="text-sm text-good">Forwarded to the counsellor ✓</p> : null}

      <button
        disabled={pending}
        className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg disabled:opacity-60"
      >
        {pending ? "Sending…" : "Forward"}
      </button>
    </form>
  );
}
