/**
 * Calculate personalized nutrition goals based on user profile
 * Uses Harris-Benedict Equation for BMR and activity multipliers for TDEE
 */

/**
 * Calculate Basal Metabolic Rate (BMR) using Harris-Benedict Equation
 * @param {number} weight - in kg
 * @param {number} height - in cm
 * @param {number} age - in years
 * @param {string} gender - 'male' or 'female'
 * @returns {number} BMR in calories
 */
function calculateBMR(weight, height, age, gender = 'female') {
  if (gender === 'male') {
    return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
  } else {
    return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
  }
}

/**
 * Calculate Total Daily Energy Expenditure (TDEE)
 * @param {number} bmr - Basal Metabolic Rate
 * @param {string} activityLevel - 'sedentary', 'light', 'moderate', 'active', 'very_active'
 * @returns {number} TDEE in calories
 */
function calculateTDEE(bmr, activityLevel = 'moderate') {
  const activityMultipliers = {
    sedentary: 1.2,      // Little or no exercise
    light: 1.375,        // Light exercise 1-3 days/week
    moderate: 1.55,      // Moderate exercise 3-5 days/week
    active: 1.725,       // Hard exercise 6-7 days/week
    very_active: 1.9     // Very hard exercise & physical job
  };

  return bmr * (activityMultipliers[activityLevel] || activityMultipliers.moderate);
}

/**
 * Calculate macronutrient goals
 * @param {number} calories - Total daily calories
 * @param {string} goal - 'maintain', 'lose', 'gain'
 * @returns {object} Macro goals in grams {protein, carbs, fat}
 */
function calculateMacros(calories, goal = 'maintain') {
  // Adjust calories based on goal
  let targetCalories = calories;
  if (goal === 'lose') {
    targetCalories = calories * 0.85; // 15% deficit
  } else if (goal === 'gain') {
    targetCalories = calories * 1.10; // 10% surplus
  }

  // Standard macro split (40% carbs, 30% protein, 30% fat)
  const proteinCalories = targetCalories * 0.30;
  const carbsCalories = targetCalories * 0.40;
  const fatCalories = targetCalories * 0.30;

  return {
    calories: Math.round(targetCalories),
    protein: Math.round(proteinCalories / 4), // 4 cal/gram
    carbs: Math.round(carbsCalories / 4),     // 4 cal/gram
    fat: Math.round(fatCalories / 9),         // 9 cal/gram
  };
}

/**
 * Main function to calculate nutrition goals from user profile
 * @param {object} userProfile - User profile object
 * @returns {object} Nutrition goals
 */
export function calculateNutritionGoals(userProfile) {
  if (!userProfile) {
    // Return default values if no profile
    return {
      calories: 2000,
      protein: 150,
      carbs: 200,
      fat: 67,
      water: 64 // oz
    };
  }

  const {
    birthdate,
    height,
    weight,
    unit_system,
    gender = 'female',        // Default to female if not specified
    activity_level = 'moderate', // Default to moderate activity
    goal = 'maintain'         // Default to maintain weight
  } = userProfile;

  // Calculate age from birthdate
  let age = 25; // default
  if (birthdate) {
    const today = new Date();
    const birth = new Date(birthdate);
    age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
  }

  // Convert to metric if needed
  let weightKg = weight || 70; // Default 70kg if not provided
  let heightCm = height || 168; // Default 168cm if not provided

  if (unit_system === 'imperial') {
    weightKg = (weight || 154) * 0.453592; // lbs to kg (default 154 lbs)
    heightCm = (height || 66) * 2.54;      // inches to cm (default 5'6")
  }

  // Calculate BMR
  const bmr = calculateBMR(weightKg, heightCm, age, gender || 'female');

  // Calculate TDEE
  const tdee = calculateTDEE(bmr, activity_level || 'moderate');

  // Calculate macros
  const macros = calculateMacros(tdee, goal || 'maintain');

  // Calculate water goal (simplified: half body weight in oz for imperial, or 30-35ml per kg)
  let waterOz;
  if (unit_system === 'imperial') {
    waterOz = Math.round(weight / 2); // half body weight in lbs = oz of water
  } else {
    waterOz = Math.round((weightKg * 33) / 29.5735); // 33ml per kg, converted to oz
  }

  return {
    calories: macros.calories,
    protein: macros.protein,
    carbs: macros.carbs,
    fat: macros.fat,
    water: waterOz
  };
}

/**
 * Get user profile and calculate nutrition goals
 * @param {object} supabase - Supabase client
 * @param {string} userId - User ID
 * @returns {Promise<object>} Nutrition goals
 */
export async function getUserNutritionGoals(supabase, userId) {
  try {
    // 1) If user has explicit goals saved, use them
    const { data: savedGoals, error: goalsError } = await supabase
      .from('nutrition_goals')
      .select('calories, protein, carbs, fat, water')
      .eq('user_id', userId)
      .maybeSingle();

    if (savedGoals && !goalsError) {
      return {
        calories: Number(savedGoals.calories) || 0,
        protein: Number(savedGoals.protein) || 0,
        carbs: Number(savedGoals.carbs) || 0,
        fat: Number(savedGoals.fat) || 0,
        water: Number(savedGoals.water) || 0,
      };
    }

    // 2) Otherwise derive from profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return calculateNutritionGoals(null); // Return defaults
    }

    console.log('User profile data:', profile);
    const goals = calculateNutritionGoals(profile);
    console.log('Calculated goals from profile:', goals);
    return goals;
  } catch (err) {
    console.error('Error in getUserNutritionGoals:', err);
    return calculateNutritionGoals(null); // Return defaults
  }
}
