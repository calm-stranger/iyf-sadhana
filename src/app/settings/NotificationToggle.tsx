"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function NotificationToggle() {
  const [state, setState] = useState<"unknown" | "on" | "off" | "unsupported">(() =>
    pushSupported() ? "unknown" : "unsupported",
  );

  useEffect(() => {
    if (!pushSupported()) return;
    let cancelled = false;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!cancelled) setState(sub ? "on" : "off");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    });
    const json = sub.toJSON();
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("push_subscriptions").upsert({
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: json.keys!.p256dh,
        auth: json.keys!.auth,
      });
    }
    setState("on");
  }

  if (state === "unsupported")
    return (
      <p className="mt-2 text-sm text-muted">
        Install the app to your home screen to get reminders.
      </p>
    );

  return (
    <div className="mt-2 flex items-center justify-between">
      <span className="text-sm text-muted">Remind me every evening to submit</span>
      <button
        onClick={enable}
        disabled={state === "on"}
        className="rounded-xl border border-border px-4 py-2 text-sm disabled:opacity-60"
      >
        {state === "on" ? "On ✓" : "Turn on"}
      </button>
    </div>
  );
}
