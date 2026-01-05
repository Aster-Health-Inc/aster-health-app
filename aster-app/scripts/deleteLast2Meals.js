import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY'
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function deleteLast2Meals() {
  try {
    // First check meal_items table
    console.log('Checking meal_items table...');
    const { data: mealItems, error: itemsError } = await supabase
      .from('meal_items')
      .select('id, name, calories, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!itemsError && mealItems) {
      console.log('Found meal_items:');
      mealItems.forEach((item, i) => {
        console.log(`${i + 1}. ${item.name} - ${item.calories} cal (${item.created_at})`);
      });
    }

    // Get the last 2 meals ordered by created_at
    console.log('\nChecking meals table...');
    const { data: meals, error: fetchError } = await supabase
      .from('meals')
      .select('id, meal_type, calories, created_at, log_id')
      .order('created_at', { ascending: false })
      .limit(2);

    if (fetchError) {
      console.error('Error fetching meals:', fetchError);
      return;
    }

    if (!meals || meals.length === 0) {
      console.log('No meals found in meals table');

      // Try to delete from meal_items instead
      if (mealItems && mealItems.length >= 2) {
        console.log('\nDeleting last 2 entries from meal_items...');
        const itemIds = mealItems.slice(0, 2).map(m => m.id);
        const { error: deleteError } = await supabase
          .from('meal_items')
          .delete()
          .in('id', itemIds);

        if (deleteError) {
          console.error('Error deleting meal_items:', deleteError);
        } else {
          console.log('✅ Successfully deleted 2 meal_items!');
        }
      }
      return;
    }

    console.log('Found meals to delete:');
    meals.forEach((meal, index) => {
      console.log(`${index + 1}. ${meal.meal_type} - ${meal.calories} cal (ID: ${meal.id})`);
    });

    // Delete the meals
    const mealIds = meals.map(m => m.id);
    const { error: deleteError } = await supabase
      .from('meals')
      .delete()
      .in('id', mealIds);

    if (deleteError) {
      console.error('Error deleting meals:', deleteError);
      return;
    }

    console.log('\n✅ Successfully deleted the last 2 meals!');

    // Also need to update meal_logs to recalculate totals
    console.log('\nRecalculating meal_logs totals...');

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Get the log_id from deleted meals to find the meal_log
    const deletedLogIds = [...new Set(meals.map(m => m.log_id))];

    for (const logId of deletedLogIds) {
      // Get the meal_log entry
      const { data: mealLog, error: logError } = await supabase
        .from('meal_logs')
        .select('user_id, log_date')
        .eq('id', logId)
        .single();

      if (logError || !mealLog) {
        console.error('Error fetching meal_log:', logError);
        continue;
      }

      // Get all remaining meals for this log
      const { data: remainingMeals, error: remainingError } = await supabase
        .from('meals')
        .select('calories, protein, carbs, fat')
        .eq('log_id', logId);

      if (remainingError) {
        console.error('Error fetching remaining meals:', remainingError);
        continue;
      }

      // Calculate new totals
      const totals = (remainingMeals || []).reduce((acc, meal) => ({
        calories: acc.calories + (meal.calories || 0),
        protein: acc.protein + (parseFloat(meal.protein) || 0),
        carbs: acc.carbs + (parseFloat(meal.carbs) || 0),
        fat: acc.fat + (parseFloat(meal.fat) || 0),
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

      // Update meal_logs
      const { error: updateError } = await supabase
        .from('meal_logs')
        .update({
          total_calories: totals.calories,
          total_protein: totals.protein,
          total_carbs: totals.carbs,
          total_fat: totals.fat,
        })
        .eq('id', logId);

      if (updateError) {
        console.error('Error updating meal_logs:', updateError);
      } else {
        console.log(`✅ Updated meal_logs for ${mealLog.log_date}: ${totals.calories} cal, ${totals.protein}g protein, ${totals.carbs}g carbs, ${totals.fat}g fat`);
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

deleteLast2Meals();
