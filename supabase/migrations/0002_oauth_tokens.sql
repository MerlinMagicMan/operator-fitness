-- ============================================================
-- OPERATOR — Phase 2C: oauth_tokens
-- ============================================================
-- One row per (user, provider) pair. Stores the access/refresh tokens
-- pulled from third-party OAuth flows (Strava first; Withings/Garmin/
-- Suunto follow). RLS scopes everything to the owning user.
--
-- Apply manually in Supabase SQL Editor on top of schema.sql:
--   psql ... -f supabase/migrations/0002_oauth_tokens.sql
-- ============================================================

create table if not exists public.oauth_tokens (
  user_id        uuid not null references auth.users(id) on delete cascade,
  provider       text not null check (provider in ('strava','withings','garmin','suunto')),
  access_token   text not null,
  refresh_token  text,
  expires_at     timestamptz,
  scope          text,
  athlete_id     text,
  raw            jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (user_id, provider)
);

-- =============================================================
-- Row Level Security
-- =============================================================
alter table public.oauth_tokens enable row level security;

drop policy if exists "oauth_tokens_self_select" on public.oauth_tokens;
drop policy if exists "oauth_tokens_self_modify" on public.oauth_tokens;

create policy "oauth_tokens_self_select" on public.oauth_tokens
  for select using (auth.uid() = user_id);

create policy "oauth_tokens_self_modify" on public.oauth_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================
-- updated_at trigger reuses the helper installed by schema.sql
-- =============================================================
drop trigger if exists oauth_tokens_touch_updated_at on public.oauth_tokens;
create trigger oauth_tokens_touch_updated_at
  before update on public.oauth_tokens
  for each row execute function public.touch_updated_at();
