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

export const upsertWaterLog = async ({ user_id, date, water_intake }) => {
  // Supabase wants log_date, and ml (not oz)
  const { error } = await supabase
    .from('water_logs')
    .upsert([
      {
        user_id,
        log_date: date,
        water_intake_ml: Math.round(water_intake * OZ_TO_ML), // stores in ml
      }
    ], { onConflict: ['user_id', 'log_date'] });

  if (error) {
    console.error('Error upserting water log:', error);
    throw error;
  }
};

export const fetchUserDailyLogs = async (user_id, date) => {
  // Get the meal_logs row for the day
  const { data: mealLog, error: mealLogErr } = await supabase
    .from('meal_logs')
    .select('id, total_calories, total_protein, total_carbs, total_fat')
    .eq('user_id', user_id)
    .eq('log_date', date)
    .maybeSingle();

  let meals = [];
  if (mealLog?.id) {
    const { data: mealRows } = await supabase
      .from('meals')
      .select('*')
      .eq('log_id', mealLog.id);
    meals = mealRows || [];
  }

  // Get water intake (ml)
  const { data: waterRow } = await supabase
    .from('water_logs')
    .select('water_intake_ml')
    .eq('user_id', user_id)
    .eq('log_date', date)
    .maybeSingle();

  return {
    meals, // array of meal rows for the day
    water: waterRow?.water_intake_ml ? Math.round(waterRow.water_intake_ml / OZ_TO_ML) : 0, // return oz for UI
    dailyTotals: mealLog || {},
  };
};
