import { logout } from "@/lib/auth-actions";

export default function PendingPage() {
  return (
    <main className="mx-auto grid min-h-full max-w-sm place-items-center p-6 text-center">
      <div>
        <h1 className="text-xl font-semibold">Waiting for approval 🙏</h1>
        <p className="mt-2 text-muted">
          Your servant leader needs to approve your account. You&apos;ll be able to submit your
          sadhana as soon as they do.
        </p>
        <form action={logout} className="mt-6">
          <button className="rounded-xl border border-border px-5 py-2 text-sm">Sign out</button>
        </form>
      </div>
    </main>
  );
}
