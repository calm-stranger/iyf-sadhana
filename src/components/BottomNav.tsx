"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, Home, Inbox, Settings, Users } from "lucide-react";
import { cn } from "@/lib/cn";

type Item = { href: string; label: string; icon: typeof Home };

const personal: Item[] = [
  { href: "/", label: "Today", icon: Home },
  { href: "/week", label: "Week", icon: CalendarDays },
  { href: "/analysis", label: "Analysis", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

// The counsellor does not submit a sadhana card — only students and servant
// leaders do. So the admin nav has no personal Today / Week / Analysis.
const adminItems: Item[] = [
  { href: "/admin", label: "People", icon: Users },
  { href: "/admin/reviews", label: "Reviews", icon: Inbox },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav({ portal }: { portal?: "leader" | "admin" }) {
  const pathname = usePathname();
  const items =
    portal === "admin"
      ? adminItems
      : portal === "leader"
        ? [{ href: "/leader", label: "Students", icon: Users }, ...personal]
        : personal;

  return (
    <nav className="sticky bottom-0 z-20 border-t border-border bg-surface/80 backdrop-blur-lg">
      <ul className="safe-b mx-auto flex max-w-md px-2 py-1.5">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "tap relative flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                    active && "bg-primary-soft",
                  )}
                >
                  <Icon size={19} strokeWidth={active ? 2.4 : 2} />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
