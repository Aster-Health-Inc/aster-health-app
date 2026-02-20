-- =====================================================
-- Account deletion RPC
-- Generated: 2026-02-20
-- Purpose: Allow an authenticated user to securely delete their account
-- =====================================================

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_table RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete rows from every public base table that is keyed by user_id.
  FOR v_table IN
    SELECT c.table_schema, c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'user_id'
      AND t.table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('DELETE FROM %I.%I WHERE user_id = $1', v_table.table_schema, v_table.table_name)
    USING v_user_id;
  END LOOP;

  -- Delete user profile records when keyed by id.
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'users'
  ) THEN
    EXECUTE 'DELETE FROM public.users WHERE id = $1' USING v_user_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'public_users'
  ) THEN
    EXECUTE 'DELETE FROM public.public_users WHERE id = $1' USING v_user_id;
  END IF;

  -- Delete the auth identity last so the JWT remains valid during cleanup.
  DELETE FROM auth.users WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Authenticated user not found in auth.users';
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

COMMENT ON FUNCTION public.delete_my_account()
IS 'Deletes all user-owned rows and the authenticated auth.users record for account closure.';
