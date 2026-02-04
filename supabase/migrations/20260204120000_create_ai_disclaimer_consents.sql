-- Migration: Create ai_disclaimer_consents table
-- Purpose: Track mandatory AI disclaimer acknowledgments
-- Date: 2026-02-04

CREATE TABLE IF NOT EXISTS public.ai_disclaimer_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_version TEXT NOT NULL,
  consent_text TEXT NOT NULL,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_disclaimer_consents_user_version_idx
  ON public.ai_disclaimer_consents(user_id, consent_version);

CREATE INDEX IF NOT EXISTS ai_disclaimer_consents_user_time_idx
  ON public.ai_disclaimer_consents(user_id, consented_at DESC);

ALTER TABLE public.ai_disclaimer_consents ENABLE ROW LEVEL SECURITY;

-- Users can read their own consents
CREATE POLICY "Users can view own ai disclaimer consents"
ON public.ai_disclaimer_consents
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own consent records
CREATE POLICY "Users can insert own ai disclaimer consents"
ON public.ai_disclaimer_consents
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Optional: allow users to update their own row (if you later add fields)
CREATE POLICY "Users can update own ai disclaimer consents"
ON public.ai_disclaimer_consents
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.ai_disclaimer_consents IS 'User acknowledgments for AI wellness disclaimer';
