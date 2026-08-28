-- Sadhana Card — schema, scoring, row level security.
-- Run with: supabase db push   (or paste into the Supabase SQL editor)

-- ---------------------------------------------------------------------------
-- enums
-- ---------------------------------------------------------------------------
create type user_role   as enum ('student', 'servant_leader', 'super_admin');
create type user_status as enum ('pending', 'active', 'disabled');
create type review_status as enum ('open', 'answered', 'closed');

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  role              user_role   not null default 'student',
  status            user_status not null default 'pending',
  full_name         text        not null,
  dob               date        not null,
  whatsapp          text        not null unique,   -- E.164, e.g. +919876543210
  address           text        not null,
  year_joined       int         not null,
  rounds            int         not null default 16,
  servant_leader_id uuid        references profiles (id) on delete set null,
  photo_url         text        not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index profiles_servant_leader_id_idx on profiles (servant_leader_id);
create index profiles_role_idx on profiles (role);

-- ---------------------------------------------------------------------------
-- sadhana_entries — one row per user per day
-- ---------------------------------------------------------------------------
create table sadhana_entries (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references profiles (id) on delete cascade,
  entry_date            date not null,
  submitted_at          timestamptz not null default now(),  -- server clock, always
  woke_up_at            time,
  chanting_completed_at time,
  slept_at              time,
  mangal_arati          boolean not null default false,
  nrsimha_arati         boolean not null default false,
  siksastakam           boolean not null default false,
  book_reading          boolean not null default false,
  lecture_hearing       boolean not null default false,
  seva                  boolean not null default false,
  study_or_household    boolean not null default false,
  note                  text,
  day_score             int not null default 0,
  unique (user_id, entry_date)
);
create index sadhana_entries_user_date_idx on sadhana_entries (user_id, entry_date);

-- ---------------------------------------------------------------------------
-- week_notes — "one line about this week"
-- ---------------------------------------------------------------------------
create table week_notes (
  user_id     uuid not null references profiles (id) on delete cascade,
  week_start  date not null,                -- Monday
  text        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, week_start)
);

-- ---------------------------------------------------------------------------
-- card_reviews — servant leader escalates a card to the counsellor
-- ---------------------------------------------------------------------------
create table card_reviews (
  id                  uuid primary key default gen_random_uuid(),
  subject_user_id     uuid not null references profiles (id) on delete cascade,
  period_type         text not null check (period_type in ('week', 'month')),
  period_start        date not null,
  raised_by           uuid not null references profiles (id) on delete cascade,
  status              review_status not null default 'open',
  leader_message      text not null,
  counsellor_feedback text,
  created_at          timestamptz not null default now(),
  answered_at         timestamptz
);
create index card_reviews_subject_idx on card_reviews (subject_user_id);

-- ---------------------------------------------------------------------------
-- push_subscriptions
-- ---------------------------------------------------------------------------
create table push_subscriptions (
  user_id    uuid not null references profiles (id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, endpoint)
);

-- ===========================================================================
-- scoring — must match src/lib/scoring.ts
-- ===========================================================================
create or replace function score_time_band(
  v time, bands int[][], else_score int
) returns int language plpgsql immutable as $$
declare
  mins int;
  b int[];
begin
  if v is null then return 0; end if;
  mins := extract(hour from v) * 60 + extract(minute from v);
  foreach b slice 1 in array bands loop
    if mins < b[1] then return b[2]; end if;
  end loop;
  return else_score;
end;
$$;

create or replace function compute_day_score(e sadhana_entries) returns int
language sql immutable as $$
  select
      score_time_band(e.woke_up_at,
        array[array[300,25],array[330,20],array[360,15],array[390,10],array[420,5]], 0)
    + score_time_band(e.chanting_completed_at,
        array[array[720,25],array[750,20],array[780,15],array[810,10],array[840,5]], 0)
    + score_time_band(e.slept_at,
        array[array[1321,25]], 0)   -- <= 22:00
    + case when e.mangal_arati       then 25 else 0 end
    + case when e.nrsimha_arati      then 20 else 0 end
    + case when e.siksastakam        then 10 else 0 end
    + case when e.book_reading       then 20 else 0 end
    + case when e.lecture_hearing    then 20 else 0 end
    + case when e.seva               then 10 else 0 end
    + case when e.study_or_household then 20 else 0 end
$$;

create or replace function sadhana_entries_before_write() returns trigger
language plpgsql as $$
begin
  new.submitted_at := now();          -- server always stamps the real time
  new.day_score := compute_day_score(new);
  return new;
end;
$$;

create trigger sadhana_entries_stamp
  before insert or update on sadhana_entries
  for each row execute function sadhana_entries_before_write();

-- ===========================================================================
-- RLS
-- ===========================================================================
alter table profiles           enable row level security;
alter table sadhana_entries    enable row level security;
alter table week_notes         enable row level security;
alter table card_reviews       enable row level security;
alter table push_subscriptions enable row level security;

create or replace function is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'super_admin'
  );
$$;

-- true if the current user is the servant leader of `target`
create or replace function leads(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = target and servant_leader_id = auth.uid()
  );
$$;

-- ---- profiles ----
create policy profiles_select on profiles for select using (
  id = auth.uid() or is_super_admin() or leads(id)
);
-- students can see the roster of active servant leaders (for the register dropdown)
-- handled by a separate SECURITY DEFINER RPC `list_servant_leaders()` so we don't
-- widen this policy.

create policy profiles_update_self on profiles for update using (id = auth.uid())
  with check (id = auth.uid());
create policy profiles_update_admin on profiles for update using (is_super_admin())
  with check (is_super_admin());
create policy profiles_update_leader_status on profiles for update using (leads(id))
  with check (leads(id));
-- inserts happen via a service-role server action during registration only.
create policy profiles_admin_all on profiles for all using (is_super_admin())
  with check (is_super_admin());

-- ---- sadhana_entries ----
create policy entries_read on sadhana_entries for select using (
  user_id = auth.uid() or is_super_admin() or leads(user_id)
);
create policy entries_write_own on sadhana_entries for insert
  with check (user_id = auth.uid());
create policy entries_update_own on sadhana_entries for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy entries_delete_own on sadhana_entries for delete
  using (user_id = auth.uid());

-- ---- week_notes ----
create policy week_notes_read on week_notes for select using (
  user_id = auth.uid() or is_super_admin() or leads(user_id)
);
create policy week_notes_write_own on week_notes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- card_reviews ----
create policy reviews_read on card_reviews for select using (
  subject_user_id = auth.uid()
  or raised_by = auth.uid()
  or is_super_admin()
  or leads(subject_user_id)
);
create policy reviews_insert on card_reviews for insert with check (
  raised_by = auth.uid() and (leads(subject_user_id) or is_super_admin())
);
create policy reviews_update_admin on card_reviews for update
  using (is_super_admin()) with check (is_super_admin());

-- ---- push_subscriptions ----
create policy push_own on push_subscriptions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ===========================================================================
-- helper RPCs
-- ===========================================================================

-- register dropdown: only active servant leaders, minimal fields
create or replace function list_servant_leaders()
returns table (id uuid, full_name text)
language sql stable security definer set search_path = public as $$
  select id, full_name from profiles
  where role = 'servant_leader' and status = 'active'
  order by full_name;
$$;
grant execute on function list_servant_leaders() to anon, authenticated;

-- ===========================================================================
-- storage
-- ===========================================================================
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

create policy "avatars readable" on storage.objects for select
  using (bucket_id = 'avatars');
create policy "avatars writable by owner" on storage.objects for insert
  with check (bucket_id = 'avatars' and owner = auth.uid());
create policy "avatars updatable by owner" on storage.objects for update
  using (bucket_id = 'avatars' and owner = auth.uid());
