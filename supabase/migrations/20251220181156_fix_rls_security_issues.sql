-- =====================================================
-- Supabase Security Fixes
-- Generated: 2025-12-20
-- Purpose: Fix RLS (Row Level Security) errors from Security Advisor
-- =====================================================

-- =====================================================
-- PART 1: Enable RLS on all affected tables
-- =====================================================

-- Enable RLS on nutrition_goals
ALTER TABLE public.nutrition_goals ENABLE ROW LEVEL SECURITY;

-- Enable RLS on public_users
ALTER TABLE public.public_users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on app_ratings
ALTER TABLE public.app_ratings ENABLE ROW LEVEL SECURITY;

-- Enable RLS on mood_categories
ALTER TABLE public.mood_categories ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 2: Create RLS Policies
-- =====================================================

-- -------------------------------------------------
-- Policies for nutrition_goals
-- -------------------------------------------------

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own nutrition goals" ON public.nutrition_goals;
DROP POLICY IF EXISTS "Users can insert their own nutrition goals" ON public.nutrition_goals;
DROP POLICY IF EXISTS "Users can update their own nutrition goals" ON public.nutrition_goals;
DROP POLICY IF EXISTS "Users can delete their own nutrition goals" ON public.nutrition_goals;

-- Allow users to view their own nutrition goals
CREATE POLICY "Users can view their own nutrition goals"
ON public.nutrition_goals
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own nutrition goals
CREATE POLICY "Users can insert their own nutrition goals"
ON public.nutrition_goals
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own nutrition goals
CREATE POLICY "Users can update their own nutrition goals"
ON public.nutrition_goals
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own nutrition goals
CREATE POLICY "Users can delete their own nutrition goals"
ON public.nutrition_goals
FOR DELETE
USING (auth.uid() = user_id);

-- -------------------------------------------------
-- Policies for public_users
-- -------------------------------------------------

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.public_users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.public_users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.public_users;

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile"
ON public.public_users
FOR SELECT
USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile"
ON public.public_users
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
ON public.public_users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- -------------------------------------------------
-- Policies for app_ratings
-- -------------------------------------------------

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own ratings" ON public.app_ratings;
DROP POLICY IF EXISTS "Users can insert their own ratings" ON public.app_ratings;
DROP POLICY IF EXISTS "Users can update their own ratings" ON public.app_ratings;
DROP POLICY IF EXISTS "Users can delete their own ratings" ON public.app_ratings;

-- Allow users to view their own ratings
CREATE POLICY "Users can view their own ratings"
ON public.app_ratings
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own ratings
CREATE POLICY "Users can insert their own ratings"
ON public.app_ratings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own ratings
CREATE POLICY "Users can update their own ratings"
ON public.app_ratings
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own ratings
CREATE POLICY "Users can delete their own ratings"
ON public.app_ratings
FOR DELETE
USING (auth.uid() = user_id);

-- -------------------------------------------------
-- Policies for mood_categories
-- -------------------------------------------------

-- mood_categories is a reference/lookup table that all users should read
DROP POLICY IF EXISTS "Anyone can view mood categories" ON public.mood_categories;

-- Allow all authenticated users to view mood categories
CREATE POLICY "Anyone can view mood categories"
ON public.mood_categories
FOR SELECT
USING (true);  -- All authenticated users can read
