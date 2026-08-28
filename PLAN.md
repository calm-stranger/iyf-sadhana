# Sadhana Card — PWA

A Progressive Web App for **ISKCON Youth Forum · Guwahati** to digitise the weekly
Sadhana Card, let students submit daily, and let servant leaders + the counsellor
track consistency.

Stack: **Next.js (App Router) + Supabase (Postgres, Auth, Storage, Edge Functions) + Tailwind**.
Offline-first via a service worker + IndexedDB. Installable PWA.

---

## 1. Roles & hierarchy

| Role | Who | Sees |
|------|-----|------|
| `super_admin` | The counsellor + the developer | Everyone — all students, all servant leaders, all cards, all analysis |
| `servant_leader` | A student chosen by the counsellor to mentor others | Only the students assigned to them. Submits their **own** sadhana card to the counsellor. Cannot see other servant leaders' students or cards. |
| `student` | A regular sadhaka | Only their own submissions and their own analysis |

Rules:
- A student is assigned to exactly **one** servant leader (`servant_leader_id`).
- Servant leader **A** cannot see servant leader **B**'s students.
- A student cannot see another student's submissions — not even a peer under the same leader.
- Only `super_admin` can see a servant leader's own sadhana card.
- The counsellor promotes/demotes servant leaders and can reassign students.

All of this is enforced in the database with **Row Level Security** (see §4), not just in the UI.

---

## 2. Auth — 4-digit PIN

Supabase Auth is used underneath, but the user only ever sees **WhatsApp number + 4-digit PIN**.

- **Identifier:** WhatsApp phone number (E.164, e.g. `+919876543210`).
- Internally we create a Supabase user with a synthetic email `‹digits›@sadhana.iyf`
  and password = `derivePassword(pin)` (PIN + a server-side pepper so it clears
  Supabase's 6-char minimum; the real entropy is still only the 4 digits — acceptable
  for a small closed community, mitigated by rate-limiting login attempts).
- **Register:** a server action (service-role) creates the auth user + `profiles` row
  with `status = 'pending'`. Until the counsellor/servant leader approves, the student
  can log in but only sees a "waiting for approval" screen.
- **Login:** client `signInWithPassword({ email: synthetic, password: derived })`.
- **Change PIN:** server action verifies the current PIN, then
  `auth.admin.updateUserById` with the new derived password. Available any time from Settings.
- **Forgot PIN:** servant leader or super admin resets it to a temporary PIN from their portal
  (no email infra needed).

## 3. Registration form (all fields mandatory)

- Full name
- Date of birth
- WhatsApp phone number (validated, E.164)
- Address
- Year joined IYF (dropdown, 2005 … current year)
- Rounds chanting daily (number, 1–64)
- Servant leader (dropdown, populated from active servant leaders)
- Photo — **upload OR take a selfie** (`<input type="file" accept="image/*" capture="user">`),
  compressed client-side, stored in Supabase Storage bucket `avatars/`
- 4-digit PIN + confirm PIN

---

## 4. Data model

### `profiles`
| column | type | notes |
|--------|------|-------|
| id | uuid PK | = `auth.users.id` |
| role | text | `student` \| `servant_leader` \| `super_admin` |
| status | text | `pending` \| `active` \| `disabled` |
| full_name | text | |
| dob | date | |
| whatsapp | text | E.164, unique |
| address | text | |
| year_joined | int | |
| rounds | int | |
| servant_leader_id | uuid FK → profiles.id | null for super_admin; set for students & (optionally) for a servant leader's own counsellor link |
| photo_url | text | |
| created_at / updated_at | timestamptz | |

### `sadhana_entries` — one row per user per calendar day
| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK → profiles.id | |
| entry_date | date | the day being reported |
| submitted_at | timestamptz | **server-set on every write** — reveals "filled Monday's sheet on Saturday" |
| woke_up_at | time null | scored |
| chanting_completed_at | time null | "16 rounds finished / chanting before 12pm" — scored |
| slept_at | time null | scored |
| mangal_arati | bool | all-or-nothing |
| nrsimha_arati | bool | |
| siksastakam | bool | |
| book_reading | bool | Srila Prabhupada's books, 20 min |
| lecture_hearing | bool | 30 min |
| seva | bool | 30 min |
| study_or_household | bool | academic study / household activities |
| book_reading_detail / lecture_hearing_detail / seva_detail / study_or_household_detail | text null | optional "what did you read / hear / do / how many hours", shown only when the row is ticked (never scored) — migration `0002` |
| note | text null | optional day note |
| day_score | int | computed & stored on write (also recomputable client-side) |
| unique (user_id, entry_date) | | upsert target |

### `week_notes` — the "one line about this week"
| week_start (Mon) date, user_id uuid, text, best_day, week_total, mangal_aratis | | |

### `card_reviews` — servant leader → counsellor escalation + feedback
| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| subject_user_id | uuid | whose card |
| period_type | text | `week` \| `month` |
| period_start | date | |
| raised_by | uuid | servant leader (or super_admin) |
| status | text | `open` \| `answered` \| `closed` |
| leader_message | text | why it's being forwarded |
| counsellor_feedback | text null | |
| created_at / answered_at | timestamptz | |

### `push_subscriptions`
`user_id uuid, endpoint text, p256dh text, auth text, created_at` — for Web Push reminders.

### Storage
- Bucket `avatars` (public read of a signed/transformed URL, write restricted to the owner or admin).

### RLS sketch
Helper SQL functions (security definer):
- `current_role()` → role of `auth.uid()`
- `is_super_admin()`
- `leads(target uuid)` → true if `auth.uid()` is the `servant_leader_id` of `target`

Policies:
- `profiles` SELECT: `id = auth.uid()` OR `is_super_admin()` OR `leads(id)`
- `profiles` UPDATE: self (whitelisted columns) OR `is_super_admin()` OR `leads(id)` for status only
- `sadhana_entries` SELECT/ALL: `user_id = auth.uid()` OR `is_super_admin()` OR `leads(user_id)`
  - write: only `user_id = auth.uid()` (admins read-only on others; they don't fake entries)
- `card_reviews` SELECT: `subject is me` OR `raised_by = auth.uid()` OR `is_super_admin()` OR `leads(subject_user_id)`
  - INSERT: `leads(subject_user_id)` OR `is_super_admin()`
  - UPDATE (counsellor_feedback/status): `is_super_admin()`
- `push_subscriptions`: owner only.

Servant-leader-sees-own-card-only-to-counsellor is automatic: a servant leader is *nobody's*
subject except the super admin's, because no one `leads()` a servant leader.

---

## 5. Scoring (from the PDF)

Daily total **/200**:

| Row | Max | Type |
|-----|-----|------|
| Woke up | 25 | time |
| Mangal arati | 25 | tick |
| Nrsimha arati | 20 | tick |
| Siksastakam | 10 | tick |
| Chanting before 12pm (16 rounds) | 25 | time |
| Srila Prabhupada's books reading (20 min) | 20 | tick |
| Lecture hearing (30 min) | 20 | tick |
| Seva (30 min) | 10 | tick |
| Academic study / household activities | 20 | tick |
| Sleep time & sadhana entry | 25 | time |

**Woke up:** `<5:00 → 25`, `5:00–5:29 → 20`, `5:30–5:59 → 15`, `6:00–6:29 → 10`, `6:30–6:59 → 5`, `≥7:00 → 0`
**16 rounds finished:** `<12:00 → 25`, `12:00–12:29 → 20`, `12:30–12:59 → 15`, `13:00–13:29 → 10`, `13:30–13:59 → 5`, `≥14:00 → 0`
**Went to sleep:** `12:00–22:00 → 25`, else `0`. A time from `00:00`–`11:59` is read as *the next morning* (slept past midnight) and scores `0` — so `01:30` = 0, not 25.

Every tick row is all-or-nothing.

Week total **/1400**, best day, mangal aratis **/7**. Month = sum of days. Year = sum of months.

Single source of truth: [`src/lib/scoring.ts`](src/lib/scoring.ts) with unit tests. The DB stores
`day_score` for fast aggregation, computed from the same rules via a Postgres function so the
two never drift.

---

## 6. Offline-first

- Serwist service worker: precache the app shell, runtime-cache GET API/data, offline fallback page.
- **Draft persistence:** every keystroke on the daily-entry form writes to IndexedDB
  (`idb-keyval`, key `draft:‹date›`). Drafts survive reload, app close, and days passing.
  A draft is only cleared once the server confirms the submission.
- **Submit queue:** if offline at submit time, the entry is queued
  (`queue:‹date›`) and a Background Sync / on-reconnect flush pushes it to Supabase.
  `submitted_at` is set by the server at flush time (documented behaviour: the recorded
  time is when it reached the server, not when it was typed).
- Conflict rule: server row wins only if its `submitted_at` is newer than the local queue
  timestamp; otherwise the queued version upserts.

---

## 7. Notifications

- Web Push (VAPID). On first login we ask for permission and store the `PushSubscription`.
- A Supabase Edge Function `send-reminders` runs daily (pg_cron / scheduled function) at a
  configurable local hour, pushing "Fill today's sadhana 🙏" to anyone who hasn't submitted
  today's entry.
- Servant leaders get an optional weekly digest push.
- iOS caveat: Web Push only works for an installed PWA on iOS 16.4+ — the install prompt is
  surfaced prominently.

---

## 8. Screens

### Student
- `/login`, `/register`, `/pending` (awaiting approval)
- `/` — **Today**: big card for today, tap-to-tick rows, time pickers, live score ring, Save
- `/day/[date]` — fill/adjust any past day (date picker; future dates blocked)
- `/week` — the 7-column grid like the paper card, week total, best day, week note
- `/analysis` — weekly / monthly / yearly tabs: score trend line, per-practice consistency
  bars, streak counter, mangal-arati %, best/worst day
- `/settings` — change PIN, update photo, notification toggle, install PWA

### Servant leader portal `/leader`
- Roster of assigned students with today/this-week status (submitted? score? streak?)
- Per-student drill-down: their week grid + analysis (read-only)
- **WhatsApp button** on each student row / week / month → `https://wa.me/‹number›?text=‹prefilled›`
- "Forward to counsellor" on a student's week/month → creates a `card_reviews` row + message
- Their **own** Today / Week / Analysis (same as a student) — submitted to the counsellor
- Leader-level analysis: group averages, consistency leaderboard, who's slipping

### Super admin portal `/admin`
- All servant leaders + all students, searchable, filter by leader
- Approve/reject pending registrations; assign/reassign servant leader; promote to servant leader
- Any user's card + analysis
- `card_reviews` inbox: read leader's message, add `counsellor_feedback`, close
- Org-wide analysis: totals, trends, per-leader comparison, engagement %
- WhatsApp button everywhere a person is shown

---

## 9. Milestones

- [x] **M0** Scaffold: Next.js + Tailwind + deps, this plan
- [x] **M1** `0001_init.sql` (schema + RLS + scoring fn + storage). *Still to do: create the actual Supabase project + `supabase gen types`.*
- [x] **M2** Auth: PIN login, registration form + photo upload, `/pending`, proxy (middleware) guard
- [x] **M3** Scoring lib + tests (25 passing); Today screen; Day screen + picker; draft persistence (IndexedDB)
- [x] **M4** Week grid; PWA manifest + Serwist SW. *Partial: week note UI, offline submit-queue reconnect flush not wired.*
- [x] **M5** Student analysis (weekly/monthly/yearly) — score trend, stats, streak
- [x] **M6** Servant leader portal (roster, student drill-down, WhatsApp, forward-to-counsellor)
- [x] **M7** Super admin portal (approvals, role/leader assignment, **add servant leader directly**, reviews inbox + feedback). *Org analysis dashboards pending.*
- [x] **M8** Web Push subscribe UI + `send-reminders` edge function + cron snippet. *Needs VAPID keys + deploy.*
- [ ] **M9** Polish: rasterised icons, image compression, reconnect flush, login rate-limit, leader/org analytics, deploy (Vercel)

---

## 10. Repo layout

```
src/
  app/
    (auth)/login, register, pending
    (student)/ (today), day/[date], week, analysis, settings
    leader/ ...
    admin/ ...
    api/ ...            # server actions mostly; api routes for push
  components/           # ui primitives + card rows + charts
  lib/
    scoring.ts (+ .test.ts)
    sadhana-schema.ts   # the 10 rows, labels, types, maxes — single definition
    supabase/{client,server,middleware}.ts
    offline/{draft,queue}.ts
    whatsapp.ts
  types/database.ts     # generated
supabase/
  migrations/0001_init.sql
  functions/send-reminders/
```

## 11. Env

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PIN_PEPPER=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:counsellor@example.com
```
