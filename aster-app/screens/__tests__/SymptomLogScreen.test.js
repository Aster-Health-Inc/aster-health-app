import React from 'react';
import { waitFor } from '@testing-library/react-native';
import SymptomLogScreen from '../SymptomLogScreen';
import { renderWithProviders } from '../testUtils';

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => mockNavigation,
  };
});

jest.mock('../../lib/supabase', () => {
  const { createSupabaseMock } = require('../testUtils');
  return { supabase: createSupabaseMock() };
});

describe('SymptomLogScreen (integration)', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('renders symptom and mood sections with default mock data', async () => {
    const { findByPlaceholderText, getByText } = renderWithProviders(<SymptomLogScreen />);

    expect(await findByPlaceholderText('Search')).toBeTruthy();
    await waitFor(() => expect(getByText('Symptoms')).toBeTruthy());
    expect(getByText('Moods')).toBeTruthy();
  });
});
