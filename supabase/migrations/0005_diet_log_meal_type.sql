-- ============================================================
-- OPERATOR — Phase 3 : meal_type + eaten_at on diet_log
-- ============================================================
-- Lets each diet_log row be slotted into a meal-of-day bucket and
-- carry an explicit timestamp. The dashboard groups today's list by
-- type (BREAKFAST · LUNCH · DINNER · SNACK) and the analysis card
-- uses time-of-day context.
--
-- Existing rows keep null meal_type / eaten_at; the UI falls back to
-- the row's date + a neutral label for those.
--
-- Apply manually in the Supabase SQL Editor on top of 0004:
--   psql ... -f supabase/migrations/0005_diet_log_meal_type.sql
-- ============================================================

alter table public.diet_log
  add column if not exists meal_type text
    check (meal_type in ('breakfast','lunch','dinner','snack')),
  add column if not exists eaten_at timestamptz;
