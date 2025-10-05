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

export const fetchUserDailyLogs = async (user_id, date) => {
  console.log('🔍 fetchUserDailyLogs called with:', { user_id, date });
  
  // Try using RPC function first to bypass RLS
  const { data: rpcData, error: rpcError } = await supabase
    .rpc('get_user_daily_logs', {
      p_user_id: user_id,
      p_log_date: date
    });
  
  console.log('🔍 RPC get_user_daily_logs result:', { rpcData, rpcError });
  
  if (!rpcError && rpcData) {
    // Water is already in oz from the database
    const result = {
      meals: rpcData.meals || [],
      mealItems: rpcData.mealItems || [],
      water: rpcData.water || 0,
      dailyTotals: rpcData.dailyTotals || {},
    };

    console.log('🔍 fetchUserDailyLogs returning RPC result:', result);
    return result;
  }
  
  console.log('🔍 RPC failed, falling back to direct queries...');
  
  // Fallback to direct queries if RPC fails
  // First, let's check if there are ANY meal_logs for this user
  const { data: allUserLogs, error: allLogsErr } = await supabase
    .from('meal_logs')
    .select('*')
    .eq('user_id', user_id);
  
  console.log('🔍 ALL meal_logs for user:', { allUserLogs, allLogsErr });
  
  // Get the meal_logs row for the day
  const { data: mealLog, error: mealLogErr } = await supabase
    .from('meal_logs')
    .select('id, total_calories, total_protein, total_carbs, total_fat, log_date')
    .eq('user_id', user_id)
    .eq('log_date', date)
    .maybeSingle();

  console.log('🔍 meal_logs query result:', { mealLog, mealLogErr });

  let meals = [];
  if (mealLog?.id) {
    console.log('🔍 Fetching meals for log_id:', mealLog.id);
    const { data: mealRows, error: mealsErr } = await supabase
      .from('meals')
      .select('*')
      .eq('log_id', mealLog.id);
    console.log('🔍 meals query result:', { mealRows, mealsErr });
    meals = mealRows || [];
  } else {
    console.log('🔍 No meal_log found, skipping meals query');
  }

  // Get water intake (oz)
  const { data: waterRow } = await supabase
    .from('water_logs')
    .select('amount_oz')
    .eq('user_id', user_id)
    .eq('log_date', date)
    .maybeSingle();

  const result = {
    meals, // array of meal rows for the day
    water: waterRow?.amount_oz || 0, // already in oz
    dailyTotals: mealLog || {},
  };

  console.log('🔍 fetchUserDailyLogs returning fallback result:', result);
  return result;
};
