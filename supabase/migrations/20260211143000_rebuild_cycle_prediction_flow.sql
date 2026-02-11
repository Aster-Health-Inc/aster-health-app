-- Remodel cycle prediction data model for confirmation-driven predictions.
-- Source of truth stays in public.periods (confirmed/user-entered logs).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Harden period logs: dedupe by start date + prevent accidental overlaps.
ALTER TABLE public.periods
  ADD COLUMN IF NOT EXISTS is_validated_separate_cycle boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source text;

UPDATE public.periods
SET source = COALESCE(source, 'user_manual')
WHERE source IS NULL;

-- Normalize legacy rows with inverted ranges (end before start) to prevent range errors.
UPDATE public.periods
SET end_date = start_date
WHERE end_date IS NOT NULL
  AND end_date < start_date;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'periods_user_start_date_key'
  ) THEN
    ALTER TABLE public.periods
      ADD CONSTRAINT periods_user_start_date_key UNIQUE (user_id, start_date);
  END IF;
END $$;

WITH ranked_periods AS (
  SELECT
    ctid,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, start_date
      ORDER BY created_at DESC NULLS LAST, ctid DESC
    ) AS rn
  FROM public.periods
)
DELETE FROM public.periods p
USING ranked_periods rp
WHERE p.ctid = rp.ctid
  AND rp.rn > 1;

WITH overlapping_periods AS (
  SELECT older.ctid AS delete_ctid
  FROM public.periods older
  JOIN public.periods newer
   ON older.user_id = newer.user_id
   AND older.ctid <> newer.ctid
   AND COALESCE(older.is_validated_separate_cycle, false) = false
   AND COALESCE(newer.is_validated_separate_cycle, false) = false
   AND daterange(older.start_date, GREATEST(COALESCE(older.end_date, older.start_date), older.start_date), '[]')
       && daterange(newer.start_date, GREATEST(COALESCE(newer.end_date, newer.start_date), newer.start_date), '[]')
   AND (
     COALESCE(older.created_at, 'epoch'::timestamptz), older.ctid
   ) < (
     COALESCE(newer.created_at, 'epoch'::timestamptz), newer.ctid
   )
)
DELETE FROM public.periods p
USING overlapping_periods o
WHERE p.ctid = o.delete_ctid;

CREATE OR REPLACE FUNCTION public.prevent_overlapping_period_logs()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(NEW.is_validated_separate_cycle, false) THEN
    RETURN NEW;
  END IF;

  IF NEW.end_date IS NULL THEN
    NEW.end_date := NEW.start_date;
  ELSIF NEW.end_date < NEW.start_date THEN
    NEW.end_date := NEW.start_date;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.periods p
    WHERE p.user_id = NEW.user_id
      AND (NEW.id IS NULL OR p.id <> NEW.id)
      AND COALESCE(p.is_validated_separate_cycle, false) = false
      AND daterange(p.start_date, GREATEST(COALESCE(p.end_date, p.start_date), p.start_date), '[]')
          && daterange(NEW.start_date, GREATEST(COALESCE(NEW.end_date, NEW.start_date), NEW.start_date), '[]')
  ) THEN
    RAISE EXCEPTION 'Overlapping period range for user %', NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_periods_prevent_overlap ON public.periods;
CREATE TRIGGER trg_periods_prevent_overlap
BEFORE INSERT OR UPDATE ON public.periods
FOR EACH ROW
EXECUTE FUNCTION public.prevent_overlapping_period_logs();

-- 2) Extend cycle_predictions for anchor-based prediction lifecycle.
ALTER TABLE public.cycle_predictions
  ADD COLUMN IF NOT EXISTS cycle_anchor_date date,
  ADD COLUMN IF NOT EXISTS prediction_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'predicted',
  ADD COLUMN IF NOT EXISTS predicted_period_days date[] NOT NULL DEFAULT '{}'::date[],
  ADD COLUMN IF NOT EXISTS predicted_fertile_days date[] NOT NULL DEFAULT '{}'::date[],
  ADD COLUMN IF NOT EXISTS predicted_pms_days date[] NOT NULL DEFAULT '{}'::date[],
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz;

UPDATE public.cycle_predictions
SET cycle_anchor_date = COALESCE(cycle_anchor_date, predicted_period_date)
WHERE cycle_anchor_date IS NULL;

UPDATE public.cycle_predictions
SET status = CASE
  WHEN status IS NULL THEN 'predicted'
  ELSE status
END,
prediction_version = COALESCE(prediction_version, 1);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cycle_predictions_status_check'
  ) THEN
    ALTER TABLE public.cycle_predictions
      ADD CONSTRAINT cycle_predictions_status_check
      CHECK (status IN ('predicted', 'confirmed', 'rejected', 'superseded'));
  END IF;
END $$;

WITH ranked_predictions AS (
  SELECT
    ctid,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, COALESCE(cycle_anchor_date, predicted_period_date), COALESCE(prediction_version, 1)
      ORDER BY created_at DESC NULLS LAST, ctid DESC
    ) AS rn
  FROM public.cycle_predictions
)
DELETE FROM public.cycle_predictions cp
USING ranked_predictions rp
WHERE cp.ctid = rp.ctid
  AND rp.rn > 1;

WITH active_ranked AS (
  SELECT
    ctid,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY created_at DESC NULLS LAST, ctid DESC
    ) AS rn
  FROM public.cycle_predictions
  WHERE is_active = true
    AND status = 'predicted'
)
UPDATE public.cycle_predictions cp
SET is_active = false,
    status = 'superseded',
    superseded_at = NOW()
FROM active_ranked ar
WHERE cp.ctid = ar.ctid
  AND ar.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS cycle_predictions_anchor_version_uidx
  ON public.cycle_predictions (user_id, cycle_anchor_date, prediction_version);

CREATE UNIQUE INDEX IF NOT EXISTS cycle_predictions_single_active_predicted_uidx
  ON public.cycle_predictions (user_id)
  WHERE is_active = true AND status = 'predicted';

CREATE INDEX IF NOT EXISTS cycle_predictions_user_anchor_idx
  ON public.cycle_predictions (user_id, cycle_anchor_date DESC, status);

-- 3) Store explicit user feedback on predicted starts.
CREATE TABLE IF NOT EXISTS public.prediction_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  prediction_id uuid NULL REFERENCES public.cycle_predictions(id) ON DELETE SET NULL,
  predicted_start_date date NOT NULL,
  feedback_type text NOT NULL CHECK (feedback_type IN ('confirmed', 'rejected', 'corrected')),
  corrected_start_date date NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prediction_feedback_user_created_idx
  ON public.prediction_feedback (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS prediction_feedback_user_start_idx
  ON public.prediction_feedback (user_id, predicted_start_date DESC);

ALTER TABLE public.prediction_feedback ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'prediction_feedback'
      AND policyname = 'prediction_feedback_select_own'
  ) THEN
    CREATE POLICY prediction_feedback_select_own
      ON public.prediction_feedback
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'prediction_feedback'
      AND policyname = 'prediction_feedback_insert_own'
  ) THEN
    CREATE POLICY prediction_feedback_insert_own
      ON public.prediction_feedback
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

GRANT SELECT, INSERT ON public.prediction_feedback TO authenticated;
