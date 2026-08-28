"use client";

import { useActionState } from "react";
import { answerReview } from "@/lib/admin-actions";

export function AnswerForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(answerReview, {} as { error?: string });

  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="id" value={id} />
      <textarea
        name="counsellor_feedback"
        rows={2}
        required
        placeholder="Add feedback for the servant leader / student…"
        className="w-full rounded-xl border border-border bg-background p-2 text-sm"
      />
      {state?.error ? <p className="text-sm text-warn">{state.error}</p> : null}
      <button
        disabled={pending}
        className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg disabled:opacity-60"
      >
        {pending ? "Saving…" : "Send feedback"}
      </button>
    </form>
  );
}
