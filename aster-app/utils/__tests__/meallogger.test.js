jest.mock('../../lib/supabase', () => {
  const rpc = jest.fn();

  const waterBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: { water_intake_ml: 591.47 }, error: null }), // ~20 oz
  };

  const defaultBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    upsert: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  };

  const from = jest.fn((table) => {
    if (table === 'water_logs') return waterBuilder;
    return defaultBuilder;
  });

  rpc.mockResolvedValue({
    data: {
      meals: [{ meal_type: 'Breakfast', calories: 300 }],
      mealItems: [],
      dailyTotals: { total_calories: 300 },
      water: null,
    },
    error: null,
  });

  return {
    supabase: {
      rpc,
      from,
    },
  };
});

import { fetchUserDailyLogs } from '../meallogger';
import { supabase } from '../../lib/supabase';

describe('fetchUserDailyLogs', () => {
  it('returns rpc meals and overrides water with oz conversion', async () => {
    const result = await fetchUserDailyLogs('user-1', '2025-01-01');
    expect(supabase.rpc).toHaveBeenCalledWith('get_user_daily_logs', {
      p_user_id: 'user-1',
      p_log_date: '2025-01-01',
    });
    expect(result.meals).toHaveLength(1);
    expect(result.water).toBeCloseTo(20, 0);
  });
});

