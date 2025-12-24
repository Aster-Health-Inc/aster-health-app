import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render } from '@testing-library/react-native';

export const renderWithProviders = (ui) =>
  render(
    <NavigationContainer>
      <SafeAreaProvider>{ui}</SafeAreaProvider>
    </NavigationContainer>,
  );

export const createSupabaseMock = (overrides = {}) => {
  const dataByTable = {
    symptom_categories:
      overrides.symptomCategories ??
      [
        { id: 'sym-1', name: 'Cramps', is_active: true },
        { id: 'sym-2', name: 'Backache', is_active: true },
      ],
    mood_categories:
      overrides.moodCategories ??
      [
        { id: 'mood-1', name: 'Calm', is_active: true },
        { id: 'mood-2', name: 'Happy', is_active: true },
      ],
    daily_logs: overrides.dailyLog ?? { id: 'log-1', notes: '', energy_level: 50 },
    users: overrides.userRow ?? null,
    ...overrides.dataByTable,
  };

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: overrides.user ?? { id: 'user-1' } },
        error: null,
      }),
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    from: jest.fn((table) => {
      const builder = {
        _table: table,
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: dataByTable[table] ?? null, error: null }),
        maybeSingle: jest.fn().mockResolvedValue({ data: dataByTable[table] ?? null, error: null }),
        upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        update: jest.fn().mockResolvedValue({ data: null, error: null }),
        delete: jest.fn().mockReturnThis(),
      };
      return builder;
    }),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  };
};
