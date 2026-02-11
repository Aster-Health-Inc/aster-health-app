import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { render, waitFor } from '@testing-library/react-native';
import CycleHomeScreen from '../CycleHomeScreen';

// Freeze time so cycle math is deterministic
const FIXED_NOW = new Date('2025-12-16T12:00:00Z');

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(FIXED_NOW);
});

afterAll(() => {
  jest.useRealTimers();
});

// Mock navigation hooks
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

// Mock canonical user resolver
jest.mock('../../utils/authUser', () => ({
  getCanonicalUserId: jest.fn().mockResolvedValue('user-1'),
  getVerifiedUser: jest.fn().mockResolvedValue({ id: 'user-1' }),
}));

// Mock prediction updater to avoid network
jest.mock('../../utils/cyclePredictions', () => ({
  updatePredictionsForUser: jest.fn().mockResolvedValue(null),
  updatePredictionStatus: jest.fn().mockResolvedValue(null),
  submitPredictionFeedback: jest.fn().mockResolvedValue(true),
}));

const makeSupabase = () => {
  const usersBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest
      .fn()
      .mockResolvedValue({ data: { average_cycle_length: 28, average_period_length: 5 }, error: null }),
  };

  const periodsBuilder = {
    select: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({
      data: [
        { id: 'period-1', user_id: 'user-1', start_date: '2025-12-14', end_date: '2025-12-18' }, // Day 3 on Dec 16
      ],
      error: null,
    }),
    upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
  };

  const dailyLogsBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({
      data: { id: 'log-1', energy_level: 50 },
      error: null,
    }),
  };

  const symptomsBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ data: [], error: null }),
  };

  const moodsBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ data: [], error: null }),
  };

  const cyclePredictionsBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    update: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
  };

  const predictionFeedbackBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    insert: jest.fn().mockResolvedValue({ data: null, error: null }),
  };

  const from = jest.fn((table) => {
    if (table === 'users') return usersBuilder;
    if (table === 'periods') return periodsBuilder;
    if (table === 'daily_logs') return dailyLogsBuilder;
    if (table === 'user_symptoms') return symptomsBuilder;
    if (table === 'user_moods') return moodsBuilder;
    if (table === 'cycle_predictions') return cyclePredictionsBuilder;
    if (table === 'prediction_feedback') return predictionFeedbackBuilder;
    return usersBuilder;
  });

  return {
    from,
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
  };
};

// Provide screen with mocked supabase client
jest.mock('../../lib/supabase', () => ({
  supabase: makeSupabase(),
}));

describe('CycleHomeScreen (integration)', () => {
  it('shows current cycle info based on latest period data', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <CycleHomeScreen />
      </NavigationContainer>,
    );

    await waitFor(() => {
      expect(getByText('Monthly Cycle')).toBeTruthy();
    });

    expect(getByText('Menstrual Phase')).toBeTruthy();
    expect(getByText('Day 3')).toBeTruthy();
    expect(getByText("Today's symptoms")).toBeTruthy();
  });
});
