import Image from "next/image";
import { requireProfile } from "@/lib/data";
import { logout } from "@/lib/auth-actions";
import { ChangePinForm } from "./ChangePinForm";
import { NotificationToggle } from "./NotificationToggle";
import { BottomNav } from "@/components/BottomNav";

export default async function SettingsPage() {
  const profile = await requireProfile();

  return (
    <>
      <main className="page page-sm animate-page flex-1 space-y-6">
        <div className="flex items-center gap-4">
          {profile.photo_url ? (
            <Image
              src={profile.photo_url}
              alt=""
              width={64}
              height={64}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : null}
          <div>
            <div className="font-semibold">{profile.full_name}</div>
            <div className="text-sm text-muted">{profile.whatsapp}</div>
            <div className="text-xs text-muted capitalize">{profile.role.replace("_", " ")}</div>
          </div>
        </div>

        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Change PIN</h2>
          <ChangePinForm />
        </section>

        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Daily reminder</h2>
          <NotificationToggle />
        </section>

        <form action={logout}>
          <button className="w-full rounded-xl border border-border py-3 text-sm">Sign out</button>
        </form>
      </main>
      <BottomNav
        portal={
          profile.role === "super_admin" ? "admin" : profile.role === "servant_leader" ? "leader" : undefined
        }
      />
    </>
  );
}
