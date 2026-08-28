# Sadhana Card PWA

Digital weekly Sadhana Card for **ISKCON Youth Forum · Guwahati**. See [PLAN.md](PLAN.md)
for the full design, data model, RLS rules and roadmap.

Next.js (App Router) · Supabase · Tailwind · Serwist (offline PWA).

## Setup

1. **Create a Supabase project** at supabase.com.
2. **Run the schema:** run every file in [`supabase/migrations/`](supabase/migrations/) in
   order (paste into the Supabase SQL editor, or `supabase db push` with the CLI linked).
   Re-run the latest one whenever you pull new migrations.
3. **Env:** copy `.env.example` → `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (from Supabase → Project Settings → API)
   - `PIN_PEPPER` — any long random string
   - VAPID keys — `npx web-push generate-vapid-keys`
4. **Regenerate DB types** (replaces the hand-written stub):
   ```
   npx supabase gen types typescript --project-id <id> > src/types/database.ts
   ```
5. `npm run dev` → http://localhost:3000

## First accounts

The migration seeds **no users** — `auth.users` and `profiles` start empty, so there is
no admin yet. And `/register` needs a servant leader to already exist, so bootstrap the
first account from the CLI:

```
npm run bootstrap-admin -- --name "Counsellor Name" --phone +919876543210 --pin 1234
```

(add `--role servant_leader` to create a servant leader instead). Then:

- Log in at `/login` with that WhatsApp number + PIN.
- The counsellor creates/promotes every other servant leader from `/admin`.
- Students self-register at `/register` once at least one servant leader exists, and
  the servant leader (or counsellor) approves them.

You can also do it by hand: Supabase dashboard → Authentication → Add user with email
`‹digits›@sadhana.iyf` and password `‹PIN_PEPPER›:‹pin›`, then insert a matching
`profiles` row with `role = 'super_admin'`, `status = 'active'`.

## Scripts

| command | what |
|---------|------|
| `npm run dev` | dev server (Serwist disabled in dev) |
| `npm run build` | production build (`--webpack`, required by Serwist) |
| `npm test` | scoring unit tests (Vitest) |
| `npm run lint` | eslint |

## Scoring

Single source of truth: [`src/lib/scoring.ts`](src/lib/scoring.ts) (JS, tested) and the
`compute_day_score` Postgres function (must stay in sync). Rules are in PLAN.md §5.

## Notifications

Deploy the reminder function and schedule it:
```
supabase functions deploy send-reminders
supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:...
```
Then add the `cron.schedule(...)` call from the header of
[`supabase/functions/send-reminders/index.ts`](supabase/functions/send-reminders/index.ts).

## TODO before launch

- Rasterised PWA icons (192/512, any + maskable) in `public/icons/`
- Client-side image compression on the register photo
- Offline submit-queue flush on reconnect (queue is written; wire a `online` listener / Background Sync)
- Rate-limit login attempts (4-digit PIN)
- Leader/org analysis dashboards (roster averages, leaderboards)
