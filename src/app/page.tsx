import Link from "next/link";
import { requireSadhakaProfile, getEntry } from "@/lib/data";
import { todayKey } from "@/lib/dates";
import { DayEntryForm } from "@/components/DayEntryForm";
import { BottomNav } from "@/components/BottomNav";
import { Page } from "@/components/ui";

export default async function TodayPage() {
  const profile = await requireSadhakaProfile();

  if (profile.status === "pending") {
    return (
      <Page size="sm" className="grid place-items-center text-center">
        <div>
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-2xl">
            🙏
          </div>
          <h1 className="text-xl font-semibold">Almost there</h1>
          <p className="mt-2 text-muted">
            Your servant leader will approve your account shortly. Check back soon.
          </p>
        </div>
      </Page>
    );
  }

  const date = todayKey();
  const entry = await getEntry(profile.id, date);

  return (
    <>
      <div className="flex-1">
        <DayEntryForm date={date} initial={entry} serverSubmittedAt={entry?.submitted_at ?? null} />
        <div className="mx-auto max-w-md border-t border-border px-5 py-5">
          <Link href="/day" className="tap text-sm font-medium text-primary">
            Fill a past day →
          </Link>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            Missed a day? Your submission time is always recorded, so past entries stay honest.
          </p>
        </div>
      </div>
      <BottomNav portal={profile.role === "servant_leader" ? "leader" : undefined} />
    </>
  );
}
