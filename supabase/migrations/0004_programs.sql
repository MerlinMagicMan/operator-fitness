-- ============================================================
-- OPERATOR — Phase 3: programs library + enrollments
-- ============================================================
-- Lets the user load training programs (mobility, strength, S&C)
-- into OPERATOR and run them as overlays on top of the 44-week
-- build. Programs come from two sources:
--
--   1. Manual transcriptions of programs the user has purchased
--      and is entitled to use personally.
--   2. AI-generated programs produced by the Coach panel from a
--      brief + an archetype profile.
--
-- Both land in the same shape so the UI doesn't care where a
-- program came from. Sessions are stored fully denormalized into
-- a (program_id, week, day_of_week) grid so we can deliver "this
-- week / today" without recomputing structure on every render.
--
-- Apply manually in Supabase SQL Editor on top of 0003:
--   psql ... -f supabase/migrations/0004_programs.sql
-- ============================================================

-- =============================================================
-- programs  (library of program templates)
-- =============================================================
create table if not exists public.programs (
  id              uuid primary key default gen_random_uuid(),
  owner_user_id   uuid references auth.users(id) on delete cascade,
  name            text not null,
  slug            text,
  description     text,
  archetype       text not null check (archetype in (
    'bodyweight_mobility',
    'banded_mobility',
    'loaded_mobility',
    'advanced_loaded_mobility',
    'bodyweight_conditioning',
    'dynamic_strength',
    'functional_sc',
    'custom'
  )),
  focus_areas     text[] not null default '{}',
  equipment       text[] not null default '{}',
  weeks           integer not null check (weeks > 0 and weeks <= 52),
  days_per_week   integer not null check (days_per_week between 1 and 7),
  session_minutes_avg integer,
  source          text not null check (source in ('manual','transcribed','ai_generated')),
  ai_brief        jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (owner_user_id, slug)
);

create index if not exists programs_owner_idx
  on public.programs (owner_user_id);

-- =============================================================
-- program_sessions  (week x day grid; blocks live in jsonb)
-- =============================================================
-- blocks jsonb shape (see lib/programs/types.ts):
--   [
--     {
--       "label": "A",
--       "type": "warmup" | "mobility" | "strength" | "capacity" | "cooldown",
--       "name": "Warm-up flow",
--       "items": [
--         {
--           "name": "90/90 hip switch",
--           "sets": 2,
--           "reps": 8,
--           "duration_s": null,
--           "tempo": "3-1-3",
--           "rpe": null,
--           "load": null,
--           "notes": "controlled, breathe through the switch"
--         }
--       ]
--     }
--   ]
-- =============================================================
create table if not exists public.program_sessions (
  id              uuid primary key default gen_random_uuid(),
  program_id      uuid not null references public.programs(id) on delete cascade,
  week            integer not null check (week >= 1),
  day_of_week     integer not null check (day_of_week between 1 and 7),
  title           text,
  est_minutes     integer,
  blocks          jsonb not null default '[]'::jsonb,
  notes           text,
  created_at      timestamptz not null default now(),
  unique (program_id, week, day_of_week)
);

create index if not exists program_sessions_program_idx
  on public.program_sessions (program_id, week, day_of_week);

-- =============================================================
-- program_enrollments  (user runs a program; can run multiple as overlays)
-- =============================================================
create table if not exists public.program_enrollments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  program_id      uuid not null references public.programs(id) on delete cascade,
  started_on      date not null default current_date,
  current_week    integer not null default 1 check (current_week >= 1),
  status          text not null default 'active'
    check (status in ('active','paused','completed','abandoned')),
  is_overlay      boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists program_enrollments_user_status_idx
  on public.program_enrollments (user_id, status);

-- Only one active enrollment per (user, program) at a time.
create unique index if not exists program_enrollments_user_program_active_uniq
  on public.program_enrollments (user_id, program_id)
  where status = 'active';

-- =============================================================
-- session_completions  (ledger of completed sessions per enrollment)
-- =============================================================
-- block_state jsonb tracks which items the user checked off so a
-- session can be partially completed and resumed:
--   { "A": { "0": true, "1": true }, "B": { "0": false } }
-- =============================================================
create table if not exists public.session_completions (
  id              uuid primary key default gen_random_uuid(),
  enrollment_id   uuid not null references public.program_enrollments(id) on delete cascade,
  week            integer not null check (week >= 1),
  day_of_week     integer not null check (day_of_week between 1 and 7),
  completed_at    timestamptz not null default now(),
  rpe             numeric(3,1) check (rpe between 0 and 10),
  notes           text,
  block_state     jsonb not null default '{}'::jsonb,
  unique (enrollment_id, week, day_of_week)
);

create index if not exists session_completions_enrollment_idx
  on public.session_completions (enrollment_id, completed_at desc);

-- =============================================================
-- Row Level Security
-- =============================================================
alter table public.programs              enable row level security;
alter table public.program_sessions      enable row level security;
alter table public.program_enrollments   enable row level security;
alter table public.session_completions   enable row level security;

-- programs: owner_user_id == auth.uid()
drop policy if exists "programs_self_select" on public.programs;
drop policy if exists "programs_self_modify" on public.programs;
create policy "programs_self_select" on public.programs
  for select using (auth.uid() = owner_user_id);
create policy "programs_self_modify" on public.programs
  for all using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

-- program_sessions: visible/writable iff the parent program is owned
drop policy if exists "program_sessions_via_program_select" on public.program_sessions;
drop policy if exists "program_sessions_via_program_modify" on public.program_sessions;
create policy "program_sessions_via_program_select" on public.program_sessions
  for select using (
    exists (
      select 1 from public.programs p
      where p.id = program_sessions.program_id
        and p.owner_user_id = auth.uid()
    )
  );
create policy "program_sessions_via_program_modify" on public.program_sessions
  for all using (
    exists (
      select 1 from public.programs p
      where p.id = program_sessions.program_id
        and p.owner_user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.programs p
      where p.id = program_sessions.program_id
        and p.owner_user_id = auth.uid()
    )
  );

-- program_enrollments: user_id == auth.uid()
drop policy if exists "program_enrollments_self_select" on public.program_enrollments;
drop policy if exists "program_enrollments_self_modify" on public.program_enrollments;
create policy "program_enrollments_self_select" on public.program_enrollments
  for select using (auth.uid() = user_id);
create policy "program_enrollments_self_modify" on public.program_enrollments
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- session_completions: visible/writable iff the parent enrollment is owned
drop policy if exists "session_completions_via_enrollment_select" on public.session_completions;
drop policy if exists "session_completions_via_enrollment_modify" on public.session_completions;
create policy "session_completions_via_enrollment_select" on public.session_completions
  for select using (
    exists (
      select 1 from public.program_enrollments e
      where e.id = session_completions.enrollment_id
        and e.user_id = auth.uid()
    )
  );
create policy "session_completions_via_enrollment_modify" on public.session_completions
  for all using (
    exists (
      select 1 from public.program_enrollments e
      where e.id = session_completions.enrollment_id
        and e.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.program_enrollments e
      where e.id = session_completions.enrollment_id
        and e.user_id = auth.uid()
    )
  );

-- =============================================================
-- updated_at triggers reuse the touch_updated_at helper from schema.sql
-- =============================================================
drop trigger if exists programs_touch_updated_at on public.programs;
create trigger programs_touch_updated_at
  before update on public.programs
  for each row execute function public.touch_updated_at();

drop trigger if exists program_enrollments_touch_updated_at on public.program_enrollments;
create trigger program_enrollments_touch_updated_at
  before update on public.program_enrollments
  for each row execute function public.touch_updated_at();
