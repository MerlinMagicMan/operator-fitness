-- ============================================================
-- OPERATOR — Phase 3 : diet_log source + fdc_id
-- ============================================================
-- Adds provenance to diet_log so the UI can show whether each meal
-- row was verified against USDA FoodData Central, estimated by AI, or
-- entered manually. Existing rows backfill to 'manual' since they
-- predate the parse pipeline.
--
-- Apply manually in the Supabase SQL Editor on top of 0003:
--   psql ... -f supabase/migrations/0004_diet_log_source.sql
-- ============================================================

alter table public.diet_log
  add column if not exists source text default 'manual'
    check (source in ('usda','estimate','manual')),
  add column if not exists fdc_id text;

update public.diet_log
   set source = 'manual'
 where source is null;
