"use client";

import { useActionState } from "react";
import { changePin, type ActionState } from "@/lib/auth-actions";

const initial: ActionState = {};

export function ChangePinForm() {
  const [state, action, pending] = useActionState(changePin, initial);

  return (
    <form action={action} className="mt-3 space-y-3">
      <input
        name="current"
        type="password"
        inputMode="numeric"
        pattern="\d{4}"
        maxLength={4}
        placeholder="Current PIN"
        required
        className="w-full rounded-xl border border-border bg-background p-3 tracking-[0.4em]"
      />
      <input
        name="next"
        type="password"
        inputMode="numeric"
        pattern="\d{4}"
        maxLength={4}
        placeholder="New PIN"
        required
        className="w-full rounded-xl border border-border bg-background p-3 tracking-[0.4em]"
      />
      {state.error ? <p className="text-sm text-warn">{state.error}</p> : null}
      {!state.error && state !== initial && !pending ? (
        <p className="text-sm text-good">PIN updated ✓</p>
      ) : null}
      <button
        disabled={pending}
        className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg disabled:opacity-60"
      >
        {pending ? "Updating…" : "Update PIN"}
      </button>
    </form>
  );
}
