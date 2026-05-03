-- ============================================================
-- OPERATOR — Phase 1 schema
-- ============================================================
-- Personal performance command center. Single-user app today; the
-- schema is keyed to auth.users so multi-user is possible later.
--
-- Apply via:
--   supabase db push       -- if using the Supabase CLI
--   psql ... -f schema.sql -- if applying directly
-- ============================================================

-- Required extensions ---------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- =============================================================
-- profile  (one row per auth user, holds settings + targets)
-- =============================================================
create table if not exists public.profile (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text,
  timezone      text default 'America/Chicago',
  phase         text default 'foundation' check (phase in ('foundation','recomp','performance')),
  weight_goal_lb numeric(5,1),
  bf_goal_pct    numeric(4,1),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- =============================================================
-- activities  (workouts pulled from Strava / device sync)
-- =============================================================
create table if not exists public.activities (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  source        text not null check (source in ('strava','withings','manual','garmin','apple','whoop')),
  external_id   text,
  sport         text,
  date          date not null,
  started_at    timestamptz,
  duration_s    integer,
  distance_m    numeric(10,2),
  avg_hr        integer,
  max_hr        integer,
  calories      integer,
  notes         text,
  raw           jsonb,
  created_at    timestamptz not null default now(),
  unique (user_id, source, external_id)
);

create index if not exists activities_user_date_idx
  on public.activities (user_id, date desc);

-- =============================================================
-- body_metrics  (Withings + manual body composition entries)
-- =============================================================
create table if not exists public.body_metrics (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  date            date not null,
  weight_lb       numeric(5,1),
  bf_pct          numeric(4,1),
  muscle_mass_lb  numeric(5,1),
  water_pct       numeric(4,1),
  waist_inches    numeric(4,1),
  sleep_hours     numeric(4,2),
  notes           text,
  created_at      timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists body_metrics_user_date_idx
  on public.body_metrics (user_id, date desc);

-- =============================================================
-- workouts_completed  (programmed workout completion ledger)
-- =============================================================
create table if not exists public.workouts_completed (
  user_id           uuid not null references auth.users (id) on delete cascade,
  date              date not null,
  completed         boolean not null default false,
  manual_override   boolean not null default false,
  override_reason   text,
  notes             text,
  updated_at        timestamptz not null default now(),
  primary key (user_id, date)
);

-- =============================================================
-- diet_log  (meal-by-meal nutrition log)
-- =============================================================
create table if not exists public.diet_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  date        date not null,
  meal        text not null,
  calories    integer,
  protein_g   numeric(6,1),
  carbs_g     numeric(6,1),
  fat_g       numeric(6,1),
  source      text default 'manual' check (source in ('usda','estimate','manual')),
  fdc_id      text,
  meal_type   text check (meal_type in ('breakfast','lunch','dinner','snack')),
  eaten_at    timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists diet_log_user_date_idx
  on public.diet_log (user_id, date desc);

-- =============================================================
-- Row Level Security
-- Each user can only read/write rows they own.
-- =============================================================
alter table public.profile             enable row level security;
alter table public.activities          enable row level security;
alter table public.body_metrics        enable row level security;
alter table public.workouts_completed  enable row level security;
alter table public.diet_log            enable row level security;

-- profile: id == auth.uid()
drop policy if exists "profile_self_select" on public.profile;
drop policy if exists "profile_self_modify" on public.profile;
create policy "profile_self_select" on public.profile
  for select using (auth.uid() = id);
create policy "profile_self_modify" on public.profile
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- activities: user_id == auth.uid()
drop policy if exists "activities_self_select" on public.activities;
drop policy if exists "activities_self_modify" on public.activities;
create policy "activities_self_select" on public.activities
  for select using (auth.uid() = user_id);
create policy "activities_self_modify" on public.activities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- body_metrics
drop policy if exists "body_metrics_self_select" on public.body_metrics;
drop policy if exists "body_metrics_self_modify" on public.body_metrics;
create policy "body_metrics_self_select" on public.body_metrics
  for select using (auth.uid() = user_id);
create policy "body_metrics_self_modify" on public.body_metrics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- workouts_completed
drop policy if exists "workouts_completed_self_select" on public.workouts_completed;
drop policy if exists "workouts_completed_self_modify" on public.workouts_completed;
create policy "workouts_completed_self_select" on public.workouts_completed
  for select using (auth.uid() = user_id);
create policy "workouts_completed_self_modify" on public.workouts_completed
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- diet_log
drop policy if exists "diet_log_self_select" on public.diet_log;
drop policy if exists "diet_log_self_modify" on public.diet_log;
create policy "diet_log_self_select" on public.diet_log
  for select using (auth.uid() = user_id);
create policy "diet_log_self_modify" on public.diet_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================
-- updated_at trigger for profile
-- =============================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profile_touch_updated_at on public.profile;
create trigger profile_touch_updated_at
  before update on public.profile
  for each row execute function public.touch_updated_at();

drop trigger if exists workouts_touch_updated_at on public.workouts_completed;
create trigger workouts_touch_updated_at
  before update on public.workouts_completed
  for each row execute function public.touch_updated_at();

-- =============================================================
-- Auto-create a profile row when a new auth.users row appears
-- =============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profile (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
