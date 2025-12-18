// Extend matchers
import '@testing-library/jest-native/extend-expect';

// Safe area + gesture-handler mocks for RN tests
jest.mock('react-native-safe-area-context', () => {
  const safeArea = require('react-native-safe-area-context/jest/mock');
  return safeArea.default || safeArea; // Support CJS/ESM shapes so named exports resolve
});

jest.mock('react-native-gesture-handler', () => {
  const mock = require('react-native-gesture-handler/jestSetup');
  return mock;
});

// AsyncStorage mock for React Native
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Global supabase mock to prevent network calls in unit tests
jest.mock('./lib/supabase', () => {
  const noop = jest.fn();
  const queryBuilder = () => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
  });

  return {
    supabase: {
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
        onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      },
      from: jest.fn(() => queryBuilder()),
      rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
    },
  };
});

// Silence noisy console warnings in test output
const originalWarn = console.warn;
console.warn = (...args) => {
  const msg = args?.[0] || '';
  if (typeof msg === 'string' && msg.includes('Animated: `useNativeDriver`')) return;
  originalWarn(...args);
};
