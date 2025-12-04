-- Migration: Fix get_user_daily_logs with correct column names
-- Purpose: Use the actual column names from meal_logs and water_logs
-- Date: 2024-12-04

-- Drop and recreate the function with correct column names
DROP FUNCTION IF EXISTS public.get_user_daily_logs(UUID, DATE);

CREATE OR REPLACE FUNCTION public.get_user_daily_logs(
    p_user_id UUID,
    p_log_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSON;
    v_total_calories NUMERIC := 0;
    v_total_protein NUMERIC := 0;
    v_total_carbs NUMERIC := 0;
    v_total_fat NUMERIC := 0;
    v_total_water NUMERIC := 0;
BEGIN
    -- Get nutrition totals from meal_logs (using correct column names)
    SELECT
        COALESCE(total_calories, 0),
        COALESCE(total_protein, 0),
        COALESCE(total_carbs, 0),
        COALESCE(total_fat, 0)
    INTO
        v_total_calories,
        v_total_protein,
        v_total_carbs,
        v_total_fat
    FROM public.meal_logs
    WHERE user_id = p_user_id
    AND log_date = p_log_date
    LIMIT 1;

    -- Get water intake from water_logs (using correct column name)
    SELECT COALESCE(water_intake_ml, 0)
    INTO v_total_water
    FROM public.water_logs
    WHERE user_id = p_user_id
    AND log_date = p_log_date
    LIMIT 1;

    -- Build the result JSON in the format expected by the app
    v_result := json_build_object(
        'dailyTotals', json_build_object(
            'total_calories', v_total_calories,
            'total_protein', v_total_protein,
            'total_carbs', v_total_carbs,
            'total_fat', v_total_fat
        ),
        'water', v_total_water,
        'date', p_log_date
    );

    RETURN v_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_daily_logs(UUID, DATE) TO authenticated, anon;

-- Add comment
COMMENT ON FUNCTION public.get_user_daily_logs IS 'Returns daily nutrition totals for a user on a specific date - uses actual column names';
