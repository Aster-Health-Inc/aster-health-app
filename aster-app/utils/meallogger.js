// utils/meallogger.js
import { supabase } from '../lib/supabase'; // Adjust path if needed

const OZ_TO_ML = 29.5735;

export const upsertMealLog = async ({
  user_id,
  date,         // string YYYY-MM-DD
  meal_type,    // 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'
  calories,
  carbs,
  protein,
  fat
}) => {
  // Step 1: Upsert meal_logs for that day/user
  const { data: mealLogArr, error: mealLogError } = await supabase
    .from('meal_logs')
    .upsert([
      { user_id, log_date: date }
    ], { onConflict: ['user_id', 'log_date'], returning: 'representation' })
    .select();

  if (mealLogError || !mealLogArr?.[0]?.id) {
    console.error('Error upserting meal_log:', mealLogError);
    throw mealLogError || new Error('No meal_log found');
  }

  const log_id = mealLogArr[0].id;

  // DEBUG: Log what we are saving!
  console.log('Meal upsert:', {
    log_id,
    meal_type,
    calories,
    protein,
    carbs,
    fat,
  });

  // Step 2: Upsert into meals (unique on log_id + meal_type)
  const { error: mealsError, data } = await supabase
    .from('meals')
    .upsert([
      {
        log_id,
        meal_type,
        calories,
        protein,
        carbs,
        fat,
      }
    ], { onConflict: ['log_id', 'meal_type'] });

  // DEBUG: Log the result/error
  console.log('Upsert response:', { data, mealsError });

  if (mealsError) {
    console.error('Error upserting meal:', mealsError);
    throw mealsError;
  }
};

export const upsertDailyCalorie = async ({ user_id, date, total_calories, total_protein = 0, total_carbs = 0, total_fat = 0 }) => {
  // Update meal_logs table (your "daily" table)
  const { error } = await supabase
    .from('meal_logs')
    .upsert([
      {
        user_id,
        log_date: date,
        total_calories,
        total_protein,
        total_carbs,
        total_fat,
      }
    ], { onConflict: ['user_id', 'log_date'] });

  if (error) {
    console.error('Error upserting daily calories:', error);
    throw error;
  }
};

export const upsertWaterLog = async ({ user_id, date, water_intake, mode = 'add' }) => {
  let totalML;

  if (mode === 'edit') {
    // Edit mode: set the total to the specified amount
    totalML = Math.round(water_intake * OZ_TO_ML);
    console.log('Water edit mode - setting total:', {
      new_total_oz: water_intake,
      new_total_ml: totalML
    });
  } else {
    // Add mode: add to existing amount
    const { data: existingWater, error: fetchError } = await supabase
      .from('water_logs')
      .select('water_intake_ml')
      .eq('user_id', user_id)
      .eq('log_date', date)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching existing water log:', fetchError);
      throw fetchError;
    }

    // Calculate new total: existing + new intake
    const newIntakeML = Math.round(water_intake * OZ_TO_ML);
    const existingML = existingWater?.water_intake_ml || 0;
    totalML = existingML + newIntakeML;

    console.log('Water add mode calculation:', {
      existing_ml: existingML,
      new_intake_ml: newIntakeML,
      total_ml: totalML,
      new_intake_oz: water_intake
    });
  }

  // Upsert with the new total
  const { error } = await supabase
    .from('water_logs')
    .upsert([
      {
        user_id,
        log_date: date,
        water_intake_ml: totalML,
      }
    ], { onConflict: ['user_id', 'log_date'] });

  if (error) {
    console.error('Error upserting water log:', error);
    throw error;
  }
};

const fetchWaterOzForDate = async (user_id, date) => {
  const { data: waterRow } = await supabase
    .from('water_logs')
    .select('water_intake_ml')
    .eq('user_id', user_id)
    .eq('log_date', date)
    .maybeSingle();

  const ml = waterRow?.water_intake_ml || 0;
  return ml / OZ_TO_ML;
};

export const fetchUserDailyLogs = async (user_id, date) => {
  console.log('🔍 fetchUserDailyLogs called with:', { user_id, date });

  // Try RPC first to leverage backend logic, but we'll still override water and fall back for meals if needed
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_daily_logs', {
    p_user_id: user_id,
    p_log_date: date,
  });
  console.log('🔍 RPC get_user_daily_logs result:', { rpcData, rpcError });

  let resultMeals = rpcData?.meals || [];
  let resultMealItems = rpcData?.mealItems || [];
  let resultDailyTotals = rpcData?.dailyTotals || {};

  const hasRpcMeals =
    (resultMeals && resultMeals.length > 0) ||
    (resultDailyTotals && Object.keys(resultDailyTotals || {}).length > 0);

  if (!hasRpcMeals || rpcError) {
    console.log('🔍 RPC missing/empty, falling back to direct queries...');

    const { data: mealLog, error: mealLogErr } = await supabase
      .from('meal_logs')
      .select('id, total_calories, total_protein, total_carbs, total_fat, log_date')
      .eq('user_id', user_id)
      .eq('log_date', date)
      .maybeSingle();

    console.log('🔍 meal_logs query result:', { mealLog, mealLogErr });

    if (mealLog?.id) {
      console.log('🔍 Fetching meals for log_id:', mealLog.id);
      const { data: mealRows, error: mealsErr } = await supabase
        .from('meals')
        .select('*')
        .eq('log_id', mealLog.id);
      console.log('🔍 meals query result:', { mealRows, mealsErr });
      resultMeals = mealRows || [];
      resultDailyTotals = mealLog || {};
    } else {
      console.log('🔍 No meal_log found, skipping meals query');
      resultMeals = [];
      resultDailyTotals = mealLog || {};
    }
  }

  // Always fetch water directly and override
  const { data: waterRow, error: waterErr } = await supabase
    .from('water_logs')
    .select('water_intake_ml')
    .eq('user_id', user_id)
    .eq('log_date', date)
    .maybeSingle();

  if (waterErr) {
    console.error('🔍 water_logs query error:', waterErr);
  }

  const waterOz = waterRow?.water_intake_ml ? waterRow.water_intake_ml / OZ_TO_ML : 0;

  const result = {
    meals: resultMeals,
    mealItems: resultMealItems,
    water: waterOz,
    dailyTotals: resultDailyTotals,
  };

  console.log('🔍 fetchUserDailyLogs returning combined result:', result);
  return result;
};
