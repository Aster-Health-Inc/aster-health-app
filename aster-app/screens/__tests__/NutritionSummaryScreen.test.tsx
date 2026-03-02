import React from 'react';
import { Linking } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

import NutritionSummaryScreen from '../NutritionSummaryScreen';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: () => ({
    params: {
      photoUri: 'file:///mock-photo.jpg',
      analysisData: {
        name: 'Test Meal',
        description: 'Balanced plate summary.',
        calories: '420',
        macros: {
          protein: '30g',
          carbs: '45g',
          fats: '12g',
        },
        ingredients: [
          { name: 'Salmon', quantity: '150g' },
        ],
        micronutrients: [
          { name: 'Vitamin D', value: '3mcg' },
        ],
        servingSize: '1',
        mealType: 'Dinner',
        weight: '350',
      },
      geminiData: {
        protein: '30g',
        carbohydrates: '45g',
        fat: '12g',
      },
    },
  }),
}));

jest.mock('posthog-react-native', () => ({
  usePostHog: () => ({
    capture: jest.fn(),
  }),
}));

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-1', email: 'user@example.com' } },
      }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null }),
      upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

describe('NutritionSummaryScreen compliance wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows info icons, opens sources modal on press, and keeps disclaimer visible', () => {
    const { getAllByLabelText, getByText } = render(<NutritionSummaryScreen />);

    const infoIcons = getAllByLabelText(/sources and methodology/i);
    expect(infoIcons.length).toBeGreaterThan(0);

    fireEvent.press(infoIcons[0]);

    expect(getByText('Sources and Methodology')).toBeTruthy();
    expect(getByText(/not a medical device/i)).toBeTruthy();
  });
});
