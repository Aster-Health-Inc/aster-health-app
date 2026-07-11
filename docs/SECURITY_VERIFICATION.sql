-- ============================================================================
-- SECURITY VERIFICATION (read-only) — run in the Supabase SQL editor
-- ----------------------------------------------------------------------------
-- Run this on the PRODUCTION project BEFORE applying the RLS lockdown migration,
-- so you know the real starting state and can confirm the migration's owner-column
-- assumptions. Nothing here writes data.
-- ============================================================================

-- 1) Which tables have RLS enabled?  Any user-data table with rls_enabled = false
--    is exposed to anyone holding the (public) anon key.
select n.nspname            as schema,
       c.relname            as table,
       c.relrowsecurity     as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relrowsecurity asc, c.relname;

-- 2) Existing policies (look for over-permissive USING/CHECK = true).
select schemaname, tablename, policyname, cmd, roles, qual as using_expr, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 3) Confirm the owner column for each user-data table (the lockdown migration
--    assumes `user_id`, and `id` for `users`). If any differs, edit the migration.
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and column_name in ('user_id', 'id')
  and table_name in (
    'users','user_profiles','periods','cycle_predictions','prediction_feedback',
    'flow_intensity_logs','daily_logs','daily_water','water_logs','water_goals',
    'meal_logs','meals','nutrition_goals','user_symptoms','user_moods',
    'reminder_settings','onboarding_answers','guardrail_events',
    'ai_disclaimer_consents','app_ratings'
  )
order by table_name, column_name;

-- 4) Direct table grants to the PUBLIC roles anon/authenticated (the lockdown
--    migration revokes anon on public.users; check nothing else over-grants anon).
select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as privs
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated')
group by table_name, grantee
order by table_name, grantee;

-- 5) HIGH-RISK: does an arbitrary-SQL RPC exist and who can execute it?
--    Expect ZERO rows. If `exec_sql` exists and is executable by anon/authenticated,
--    it is a full RLS-bypass primitive — drop it or revoke EXECUTE from public.
select p.proname as function,
       pg_get_function_identity_arguments(p.oid) as args,
       (select string_agg(distinct grantee, ', ')
          from information_schema.role_routine_grants g
         where g.routine_name = p.proname) as grantees
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('exec_sql', 'execute_sql', 'run_sql');
