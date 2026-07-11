-- ============================================================================
-- RLS LOCKDOWN for all user-data tables
-- ----------------------------------------------------------------------------
-- WHY: No tracked migration enables RLS / owner policies for the core health
-- tables (users, periods, daily_logs, meal_logs, water_logs, cycle_predictions,
-- user_profiles, ...). A prior migration grants the PUBLIC `anon` role access to
-- public.users. If RLS is off, anyone with the shipped anon key can read/modify
-- every user's health data. This migration enforces owner-scoped access.
--
-- BEFORE APPLYING (do not skip):
--   1. Run docs/SECURITY_VERIFICATION.sql to confirm each table exists and its
--      owner column (this migration assumes `user_id`, and `id` for `users`).
--   2. Apply to a Supabase BRANCH / staging first and smoke-test the app
--      (login, log a period/meal/water, open history) before production.
--   3. Review existing policies for over-permissive rules (e.g. USING (true));
--      this migration ADDS an owner policy but does not remove looser ones.
--
-- SAFE TO RE-RUN: skips any table/column that doesn't exist; the owner policy is
-- dropped and recreated. RLS is only enabled when the owner column is present
-- (so a table is never left "RLS on / no policy" = deny-all).
-- ============================================================================

do $$
declare
  r record;
begin
  for r in
    select tbl, col from (values
      ('users',                'id'),
      ('user_profiles',        'user_id'),
      ('periods',              'user_id'),
      ('cycle_predictions',    'user_id'),
      ('prediction_feedback',  'user_id'),
      ('flow_intensity_logs',  'user_id'),
      ('daily_logs',           'user_id'),
      ('daily_water',          'user_id'),
      ('water_logs',           'user_id'),
      ('water_goals',          'user_id'),
      ('meal_logs',            'user_id'),
      ('meals',                'user_id'),
      ('nutrition_goals',      'user_id'),
      ('user_symptoms',        'user_id'),
      ('user_moods',           'user_id'),
      ('reminder_settings',    'user_id'),
      ('onboarding_answers',   'user_id'),
      ('guardrail_events',     'user_id'),
      ('ai_disclaimer_consents','user_id'),
      ('app_ratings',          'user_id')
    ) as x(tbl, col)
  loop
    if to_regclass('public.' || r.tbl) is not null
       and exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = r.tbl and column_name = r.col
       )
    then
      execute format('alter table public.%I enable row level security', r.tbl);
      execute format('drop policy if exists %I on public.%I', 'owner_all_' || r.tbl, r.tbl);
      execute format(
        'create policy %I on public.%I for all to authenticated using (%I = auth.uid()) with check (%I = auth.uid())',
        'owner_all_' || r.tbl, r.tbl, r.col, r.col
      );
      raise notice 'RLS locked: public.% (owner = %)', r.tbl, r.col;
    else
      raise notice 'SKIPPED (missing table or column): public.%.%', r.tbl, r.col;
    end if;
  end loop;
end $$;

-- The app authenticates (incl. anonymous sign-in => a real JWT) before touching
-- public.users, so the anon role never needs direct table access. Revoke it.
revoke all on public.users from anon;
