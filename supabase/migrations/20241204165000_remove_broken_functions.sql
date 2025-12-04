-- Migration: Remove broken user functions that might be auth hooks
-- Purpose: Clean up functions that are causing auth failures
-- Date: 2024-12-04

-- Drop all user-related functions that might be configured as auth hooks
DROP FUNCTION IF EXISTS public.ensure_public_user() CASCADE;
DROP FUNCTION IF EXISTS public.get_or_create_public_user() CASCADE;
DROP FUNCTION IF EXISTS public.ensure_public_user(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_or_create_public_user(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.ensure_public_user(jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.get_or_create_public_user(jsonb) CASCADE;

-- Drop any variations with different parameters
DO $$
DECLARE
    func_rec RECORD;
BEGIN
    FOR func_rec IN
        SELECT n.nspname as schema_name, p.proname as function_name,
               pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND (p.proname LIKE '%ensure%user%' OR p.proname LIKE '%create%user%')
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
            func_rec.schema_name, func_rec.function_name, func_rec.args);
        RAISE NOTICE 'Dropped function: %.%(%)', func_rec.schema_name, func_rec.function_name, func_rec.args;
    END LOOP;
END $$;

-- Now create ONE clean function with proper error handling
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Simple insert with conflict handling
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email, updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail auth if profile creation fails
    RAISE WARNING 'Failed to create user profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Remove the old trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create new trigger with the new function
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
