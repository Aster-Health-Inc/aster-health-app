import { calculateNutritionGoals, getUserNutritionGoals } from '../nutritionCalculator';

describe('calculateNutritionGoals', () => {
  it('returns defaults when profile is missing', () => {
    const goals = calculateNutritionGoals(null);
    expect(goals).toEqual(
      expect.objectContaining({
        calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 67,
        water: 64,
      }),
    );
  });

  it('converts imperial values and adjusts goal for weight loss', () => {
    const goals = calculateNutritionGoals({
      birthdate: '1990-01-01',
      height: 66, // inches
      weight: 180, // lbs
      unit_system: 'imperial',
      gender: 'male',
      activity_level: 'light',
      goal: 'lose',
    });

    expect(goals.calories).toBeGreaterThan(0);
    expect(goals.protein).toBeGreaterThan(0);
    expect(goals.water).toBeCloseTo(90, -1); // ~ half body weight in oz
  });
});

describe('getUserNutritionGoals', () => {
  const makeSupabase = (overrides = {}) => {
    const defaultGoals = { calories: 1800, protein: 120, carbs: 200, fat: 60, water: 80 };
    const savedGoalsData =
      Object.prototype.hasOwnProperty.call(overrides, 'savedGoals')
        ? overrides.savedGoals
        : defaultGoals;

    const goalsBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: savedGoalsData, error: null }),
    };

    const profileBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: overrides.profile ?? {
          birthdate: '1990-01-01',
          height: 170,
          weight: 70,
          unit_system: 'metric',
          gender: 'female',
          activity_level: 'moderate',
          goal: 'maintain',
        },
        error: null,
      }),
      maybeSingle: jest.fn(),
    };

    const from = jest.fn((table) => {
      if (table === 'nutrition_goals') return goalsBuilder;
      if (table === 'user_profiles') return profileBuilder;
      return profileBuilder;
    });

    return {
      from,
      auth: { getSession: jest.fn(), onAuthStateChange: jest.fn() },
    };
  };

  it('returns saved goals when present', async () => {
    const supabase = makeSupabase();
    const goals = await getUserNutritionGoals(supabase, 'user-1');
    expect(goals).toEqual(expect.objectContaining({ calories: 1800, protein: 120 }));
    expect(supabase.from).toHaveBeenCalledWith('nutrition_goals');
  });

  it('derives goals from profile when no saved goals', async () => {
    const supabase = makeSupabase({ savedGoals: null });
    const goals = await getUserNutritionGoals(supabase, 'user-2');
    expect(goals.calories).toBeGreaterThan(0);
    expect(supabase.from).toHaveBeenCalledWith('user_profiles');
  });
});
