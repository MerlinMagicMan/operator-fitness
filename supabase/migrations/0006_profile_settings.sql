-- ============================================================
-- OPERATOR — Phase 4 : extend profile for editable settings
-- ============================================================
-- The dashboard previously read body composition + diet inputs from
-- hardcoded USER_DEFAULTS constants (age 38, height 73", standard
-- macro split). This migration adds editable columns so the user (and
-- the coach via tool-use) can override them — most importantly, swap
-- the macro math from a generic deficit to keto / low-carb / custom.
--
-- All new columns are nullable: when null, the app falls back to
-- USER_DEFAULTS so existing rows keep working unchanged.
--
-- Apply manually in the Supabase SQL Editor on top of 0005:
--   psql ... -f supabase/migrations/0006_profile_settings.sql
-- ============================================================

alter table public.profile
  add column if not exists age_years integer
    check (age_years is null or (age_years between 12 and 110)),
  add column if not exists height_inches numeric(5,2)
    check (height_inches is null or (height_inches between 36 and 96)),
  add column if not exists start_weight_lb numeric(5,1)
    check (start_weight_lb is null or (start_weight_lb between 60 and 700)),
  add column if not exists activity_multiplier numeric(3,2)
    check (activity_multiplier is null
           or (activity_multiplier between 1.0 and 2.5)),
  add column if not exists cut_deficit_kcal integer
    check (cut_deficit_kcal is null
           or (cut_deficit_kcal between -1500 and 1500)),
  add column if not exists diet_style text,
  add column if not exists protein_g_per_lb numeric(3,2)
    check (protein_g_per_lb is null
           or (protein_g_per_lb between 0.2 and 2.0)),
  add column if not exists fat_pct_of_calories numeric(4,3)
    check (fat_pct_of_calories is null
           or (fat_pct_of_calories between 0.05 and 0.95)),
  add column if not exists net_carbs_max_g integer
    check (net_carbs_max_g is null
           or (net_carbs_max_g between 0 and 800)),
  add column if not exists diet_notes text,
  add column if not exists goals_notes text;
