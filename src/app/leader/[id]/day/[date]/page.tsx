import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireProfile, getEntry } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { todayKey } from "@/lib/dates";
import { DayCardView } from "@/components/DayCardView";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { BottomNav } from "@/components/BottomNav";
import type { Profile } from "@/types/database";

export default async function LeaderDayPage({ params }: PageProps<"/leader/[id]/day/[date]">) {
  const me = await requireProfile();
  if (me.role !== "servant_leader" && me.role !== "super_admin") notFound();

  const { id, date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > todayKey()) notFound();

  const supabase = await createClient();
  const { data: student } = await supabase.from("profiles").select("*").eq("id", id).single();
  if (!student) notFound(); // RLS blocks students not under this leader
  const s = student as Profile;

  const entry = await getEntry(s.id, date);

  return (
    <>
      <main className="page page-md animate-page flex-1 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/leader/${id}`}
            className="tap -ml-1 inline-flex items-center text-sm font-medium text-primary"
          >
            <ChevronLeft size={16} />
            {s.full_name}
          </Link>
          <WhatsAppButton phone={s.whatsapp} message={`Hare Krishna ${s.full_name} 🙏`} />
        </div>

        <DayCardView date={date} entry={entry} />
      </main>
      <BottomNav portal={me.role === "super_admin" ? "admin" : "leader"} />
    </>
  );
}
