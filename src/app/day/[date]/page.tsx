import { notFound } from "next/navigation";
import { getEntry, requireSadhakaProfile } from "@/lib/data";
import { todayKey } from "@/lib/dates";
import { DayEntryForm } from "@/components/DayEntryForm";
import { BottomNav } from "@/components/BottomNav";

export default async function DayPage({ params }: PageProps<"/day/[date]">) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  if (date > todayKey()) notFound();

  const profile = await requireSadhakaProfile();
  if (profile.status !== "active") notFound();

  const entry = await getEntry(profile.id, date);

  return (
    <>
      <main className="flex-1">
        <DayEntryForm date={date} initial={entry} serverSubmittedAt={entry?.submitted_at ?? null} />
      </main>
      <BottomNav />
    </>
  );
}
