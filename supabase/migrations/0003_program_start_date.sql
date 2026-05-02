-- ============================================================
-- OPERATOR — Phase 2C+ : program_start_date on profile
-- ============================================================
-- The dashboard's phase / week / day counters derive from a "program
-- start" anchor date. Until now we used profile.created_at, which is
-- an audit timestamp set when the auth user signed up. That's wrong:
-- the program may start days or weeks after sign-up.
--
-- This migration adds an explicit program_start_date column so the
-- user can re-zero the program at any time without touching audit
-- timestamps. Existing rows backfill to the created_at date so the
-- dashboard keeps showing whatever week they were on.
--
-- Apply manually in the Supabase SQL Editor on top of 0002:
--   psql ... -f supabase/migrations/0003_program_start_date.sql
-- ============================================================

alter table public.profile
  add column if not exists program_start_date date;

update public.profile
   set program_start_date = created_at::date
 where program_start_date is null;
