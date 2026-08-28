// Daily reminder push. Deploy: supabase functions deploy send-reminders
// Schedule (SQL editor):
//   select cron.schedule('sadhana-reminder', '30 14 * * *',  -- 20:00 IST
//     $$ select net.http_post(
//          url := 'https://<project>.functions.supabase.co/send-reminders',
//          headers := jsonb_build_object('Authorization', 'Bearer <anon>')) $$);

import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT")!,
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

Deno.serve(async () => {
  const today = new Date().toISOString().slice(0, 10);

  const { data: submittedRows } = await supabase
    .from("sadhana_entries")
    .select("user_id")
    .eq("entry_date", today);
  const submitted = new Set((submittedRows ?? []).map((r) => r.user_id));

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth");

  const payload = JSON.stringify({
    title: "Sadhana",
    body: "Fill today's sadhana card 🙏",
    url: "/",
  });

  let sent = 0;
  for (const s of subs ?? []) {
    if (submitted.has(s.user_id)) continue;
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      );
      sent++;
    } catch (err) {
      // 404/410 → stale subscription, clean it up
      // @ts-expect-error err shape
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
    }
  }

  return new Response(JSON.stringify({ sent }), {
    headers: { "content-type": "application/json" },
  });
});
