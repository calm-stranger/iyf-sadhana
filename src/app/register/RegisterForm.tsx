"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerStudent, type ActionState } from "@/lib/auth-actions";
import { PhotoCapture } from "@/components/PhotoCapture";

const initial: ActionState = {};
const YEARS = Array.from({ length: new Date().getFullYear() - 2004 }, (_, i) => 2005 + i).reverse();

export function RegisterForm({ leaders }: { leaders: { id: string; full_name: string }[] }) {
  const [state, action, pending] = useActionState(registerStudent, initial);

  return (
    <main className="page page-sm animate-page">
      <h1 className="text-2xl font-semibold tracking-tight">Register</h1>
      <p className="mt-1 text-sm text-muted">Every field is needed. It takes a minute.</p>

      <form action={action} className="mt-6 space-y-4">
        <Field label="Full name" name="full_name" required />
        <Field label="Date of birth" name="dob" type="date" required />
        <Field label="WhatsApp number" name="whatsapp" type="tel" placeholder="+91…" required />
        <Field label="Address" name="address" required />

        <label className="block">
          <span className="text-sm text-muted">Year you joined IYF</span>
          <select name="year_joined" required className="mt-1 w-full rounded-xl border border-border bg-surface p-3">
            <option value="">Select</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>

        <Field label="Rounds you chant daily" name="rounds" type="number" min={1} max={64} defaultValue={16} required />

        <label className="block">
          <span className="text-sm text-muted">Your servant leader</span>
          <select name="servant_leader_id" required className="mt-1 w-full rounded-xl border border-border bg-surface p-3">
            <option value="">Select</option>
            {leaders.map((l) => (
              <option key={l.id} value={l.id}>{l.full_name}</option>
            ))}
          </select>
          {leaders.length === 0 ? (
            <span className="text-xs text-warn">No servant leaders yet — ask the counsellor to add one.</span>
          ) : null}
        </label>

        <PhotoCapture />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Choose a 4-digit PIN" name="pin" type="password" inputMode="numeric" pattern="\d{4}" maxLength={4} required />
          <Field label="Confirm PIN" name="confirm_pin" type="password" inputMode="numeric" pattern="\d{4}" maxLength={4} required />
        </div>

        {state.error ? (
          <p className="rounded-lg bg-warn/10 px-3 py-2 text-sm text-warn">{state.error}</p>
        ) : null}

        <button
          disabled={pending}
          className="w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-fg shadow-sm hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 pb-4 text-sm text-muted">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-primary">Sign in</Link>
      </p>
    </main>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-muted">{label}</span>
      <input {...props} className="mt-1.5 w-full p-3.5" />
    </label>
  );
}
