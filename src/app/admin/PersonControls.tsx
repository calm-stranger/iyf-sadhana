"use client";

import { useTransition } from "react";
import { assignUser, setUserStatus } from "@/lib/admin-actions";
import type { Profile } from "@/types/database";

export function PersonControls({
  person,
  leaders,
}: {
  person: Profile;
  leaders: { id: string; full_name: string }[];
}) {
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {person.status === "pending" && (
        <button
          disabled={pending}
          onClick={() => start(() => void setUserStatus(person.id, "active"))}
          className="rounded-lg bg-primary px-3 py-1.5 font-semibold text-primary-fg"
        >
          Approve
        </button>
      )}
      {person.status === "active" && (
        <button
          disabled={pending}
          onClick={() => start(() => void setUserStatus(person.id, "disabled"))}
          className="rounded-lg border border-border px-3 py-1.5"
        >
          Disable
        </button>
      )}
      {person.status === "disabled" && (
        <button
          disabled={pending}
          onClick={() => start(() => void setUserStatus(person.id, "active"))}
          className="rounded-lg border border-border px-3 py-1.5"
        >
          Re-enable
        </button>
      )}

      <select
        defaultValue={person.role}
        disabled={pending}
        onChange={(e) =>
          start(() => void assignUser({ userId: person.id, role: e.target.value as Profile["role"] }))
        }
        className="rounded-lg border border-border bg-background px-2 py-1"
      >
        <option value="student">student</option>
        <option value="servant_leader">servant leader</option>
        <option value="super_admin">super admin</option>
      </select>

      {person.role === "student" && (
        <select
          defaultValue={person.servant_leader_id ?? ""}
          disabled={pending}
          onChange={(e) =>
            start(() =>
              void assignUser({ userId: person.id, servant_leader_id: e.target.value || null }),
            )
          }
          className="rounded-lg border border-border bg-background px-2 py-1"
        >
          <option value="">no leader</option>
          {leaders.map((l) => (
            <option key={l.id} value={l.id}>
              {l.full_name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
