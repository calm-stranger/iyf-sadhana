import { notFound } from "next/navigation";
import Link from "next/link";
import { requireProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { AnswerForm } from "./AnswerForm";
import { BottomNav } from "@/components/BottomNav";
import type { CardReview, Profile } from "@/types/database";

export default async function ReviewsPage() {
  const me = await requireProfile();
  if (me.role !== "super_admin") notFound();

  const supabase = await createClient();
  const { data: reviews } = await supabase
    .from("card_reviews")
    .select("*")
    .order("created_at", { ascending: false });
  const { data: people } = await supabase.from("profiles").select("id, full_name, whatsapp");
  const person = new Map(((people as Profile[]) ?? []).map((p) => [p.id, p]));

  return (
    <>
      <main className="page page-md animate-page flex-1 space-y-3">
        <h1 className="text-lg font-semibold">Forwarded cards</h1>
        {((reviews as CardReview[]) ?? []).map((r) => (
          <article key={r.id} className="rounded-xl border border-border bg-surface p-3">
            <div className="flex items-center justify-between">
              <Link href={`/leader/${r.subject_user_id}`} className="font-medium">
                {person.get(r.subject_user_id)?.full_name ?? "Student"}
              </Link>
              <span className="text-xs text-muted">
                {r.period_type} of {r.period_start} · {r.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">
              From {person.get(r.raised_by)?.full_name ?? "leader"}: “{r.leader_message}”
            </p>
            {r.counsellor_feedback ? (
              <p className="mt-2 rounded-lg bg-primary/5 p-2 text-sm">
                <b>Your feedback:</b> {r.counsellor_feedback}
              </p>
            ) : (
              <AnswerForm id={r.id} />
            )}
          </article>
        ))}
        {(!reviews || reviews.length === 0) && <p className="text-sm text-muted">Nothing forwarded yet.</p>}
      </main>
      <BottomNav portal="admin" />
    </>
  );
}
