import { notFound } from "next/navigation";
import Link from "next/link";
import { requireProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { PersonControls } from "./PersonControls";
import { AddServantLeader } from "./AddServantLeader";
import { BottomNav } from "@/components/BottomNav";
import type { Profile } from "@/types/database";

export default async function AdminPage() {
  const me = await requireProfile();
  if (me.role !== "super_admin") notFound();

  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").order("full_name");
  const people = (data as Profile[]) ?? [];
  const leaders = people.filter((p) => p.role === "servant_leader");
  const nameOf = new Map(people.map((p) => [p.id, p.full_name]));

  const pending = people.filter((p) => p.status === "pending");
  const students = people.filter((p) => p.role === "student" && p.status !== "pending");

  const { count: openReviews } = await supabase
    .from("card_reviews")
    .select("*", { count: "exact", head: true })
    .eq("status", "open");

  return (
    <>
      <main className="page page-md animate-page flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Counsellor portal</h1>
          <Link href="/admin/reviews" className="rounded-lg border border-border px-3 py-1.5 text-sm">
            Reviews {openReviews ? `(${openReviews})` : ""}
          </Link>
        </div>

        {pending.length > 0 && (
          <Section title={`Pending approvals (${pending.length})`}>
            {pending.map((p) => (
              <Row key={p.id} p={p}>
                <PersonControls person={p} leaders={leaders} />
              </Row>
            ))}
          </Section>
        )}

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Servant leaders ({leaders.length})</h2>
          </div>
          <div className="mb-3">
            <AddServantLeader />
          </div>
          <ul className="space-y-2">
            {leaders.map((p) => (
              <Row key={p.id} p={p}>
                <PersonControls person={p} leaders={leaders} />
              </Row>
            ))}
          </ul>
        </section>

        <Section title={`Students (${students.length})`}>
          {students.map((p) => (
            <Row key={p.id} p={p} sub={`under ${nameOf.get(p.servant_leader_id ?? "") ?? "—"}`}>
              <PersonControls person={p} leaders={leaders} />
            </Row>
          ))}
        </Section>
      </main>
      <BottomNav portal="admin" />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <ul className="space-y-2">{children}</ul>
    </section>
  );
}

function Row({ p, sub, children }: { p: Profile; sub?: string; children: React.ReactNode }) {
  return (
    <li className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center justify-between">
        <Link href={`/leader/${p.id}`} className="font-medium">{p.full_name}</Link>
        <WhatsAppButton phone={p.whatsapp} />
      </div>
      <div className="text-xs text-muted">
        {p.whatsapp} · {p.status}
        {sub ? ` · ${sub}` : ""}
      </div>
      <div className="mt-2">{children}</div>
    </li>
  );
}
