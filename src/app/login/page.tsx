"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type ActionState } from "@/lib/auth-actions";

const initial: ActionState = {};

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, initial);

  return (
    <main className="page page-sm animate-page flex min-h-full flex-col justify-center">
      <div className="mb-8">
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-2xl">
          🪷
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Sadhana Card</h1>
        <p className="mt-1 text-muted">ISKCON Youth Forum · Guwahati</p>
      </div>

      <form action={action} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-muted">WhatsApp number</span>
          <input
            name="whatsapp"
            type="tel"
            inputMode="tel"
            autoComplete="username"
            placeholder="+91 98765 43210"
            required
            className="mt-1.5 w-full p-3.5"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-muted">4-digit PIN</span>
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            autoComplete="current-password"
            required
            className="mt-1.5 w-full p-3.5 text-lg tracking-[0.6em]"
          />
        </label>

        {state.error ? (
          <p className="rounded-lg bg-warn/10 px-3 py-2 text-sm text-warn">{state.error}</p>
        ) : null}

        <button
          disabled={pending}
          className="w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-fg shadow-sm hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-8 text-sm text-muted">
        New here?{" "}
        <Link href="/register" className="font-medium text-primary">
          Register
        </Link>
      </p>
    </main>
  );
}
