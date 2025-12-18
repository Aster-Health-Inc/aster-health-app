import React from 'react';
import { waitFor } from '@testing-library/react-native';
import SymptomLogScreen from '../SymptomLogScreen';
import { renderWithProviders, createSupabaseMock } from '../testUtils';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    }),
  };
});

jest.mock('../../lib/supabase', () => {
  const { createSupabaseMock } = require('../testUtils');
  return { supabase: createSupabaseMock() };
});

describe('SymptomLogScreen (integration)', () => {
  it('renders symptom and mood sections with default mock data', async () => {
    const { getByText } = renderWithProviders(<SymptomLogScreen />);

    await waitFor(() => {
      expect(getByText('Symptoms')).toBeTruthy();
      expect(getByText('Moods')).toBeTruthy();
    });
  });
});
