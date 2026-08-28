"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createServantLeader } from "@/lib/admin-actions";

const YEARS = Array.from({ length: new Date().getFullYear() - 2004 }, (_, i) => 2005 + i).reverse();

export function AddServantLeader() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createServantLeader, {} as { error?: string; ok?: boolean });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl border border-dashed border-primary/50 px-4 py-2 text-sm font-medium text-primary"
      >
        + Add servant leader
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-3 rounded-xl border border-border bg-surface p-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">New servant leader</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted">
          Close
        </button>
      </div>

      <input
        name="full_name"
        required
        placeholder="Full name"
        className="w-full rounded-xl border border-border bg-background p-3 text-sm"
      />
      <input
        name="whatsapp"
        type="tel"
        required
        placeholder="WhatsApp number (+91…)"
        className="w-full rounded-xl border border-border bg-background p-3 text-sm"
      />
      <div className="grid grid-cols-2 gap-3">
        <select name="year_joined" required defaultValue="" className="rounded-xl border border-border bg-background p-3 text-sm">
          <option value="" disabled>Year joined IYF</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <input
          name="rounds"
          type="number"
          min={1}
          max={64}
          defaultValue={16}
          required
          placeholder="Rounds"
          className="rounded-xl border border-border bg-background p-3 text-sm"
        />
      </div>
      <input
        name="pin"
        inputMode="numeric"
        pattern="\d{4}"
        maxLength={4}
        required
        placeholder="Temporary 4-digit PIN"
        className="w-full rounded-xl border border-border bg-background p-3 text-sm tracking-[0.4em]"
      />

      {state.error ? <p className="text-sm text-warn">{state.error}</p> : null}
      {state.ok ? <p className="text-sm text-good">Servant leader added ✓ Share the PIN with them.</p> : null}

      <p className="text-xs text-muted">
        They log in with this number + PIN, then set their own PIN, photo and details from Settings.
      </p>

      <button
        disabled={pending}
        className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add servant leader"}
      </button>
    </form>
  );
}
