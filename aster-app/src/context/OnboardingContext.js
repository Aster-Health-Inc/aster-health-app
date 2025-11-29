import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const OnboardingContext = createContext(null);

const initialState = {
  profile: {
    name: '',
    birthdate: null,
    weight: '',
    heightFeet: null,
    heightInches: null,
    unitSystem: 'imperial',
  },
  cycle: {
    lastPeriodDate: null,
    averageCycleLength: 28,
    averagePeriodLength: 5,
  },
  flowIntensity: Array(6).fill(null),
  periodHistory: [], // [{ start: Date|null, end: Date|null }]
  additionalInfo: {
    unusualBleeding: null,
    fertileWindowIntercourse: null,
    conditionsChoice: null,
    conditionsText: '',
  },
  reminder: {
    time: null,
    days: [0, 1, 2, 3, 4, 5, 6],
    checkinEnabled: true,
  },
};

export function OnboardingProvider({ children }) {
  const [state, setState] = useState(initialState);

  const updateProfile = useCallback((patch) => {
    setState((prev) => ({ ...prev, profile: { ...prev.profile, ...patch } }));
  }, []);

  const updateCycle = useCallback((patch) => {
    setState((prev) => ({ ...prev, cycle: { ...prev.cycle, ...patch } }));
  }, []);

  const setFlowIntensity = useCallback((ratings) => {
    setState((prev) => ({ ...prev, flowIntensity: ratings }));
  }, []);

  const setPeriodHistory = useCallback((periods) => {
    setState((prev) => ({ ...prev, periodHistory: periods }));
  }, []);

  const updateAdditionalInfo = useCallback((patch) => {
    setState((prev) => ({
      ...prev,
      additionalInfo: { ...prev.additionalInfo, ...patch },
    }));
  }, []);

  const updateReminder = useCallback((patch) => {
    setState((prev) => ({ ...prev, reminder: { ...prev.reminder, ...patch } }));
  }, []);

  const resetOnboarding = useCallback(() => setState(initialState), []);

  const value = useMemo(
    () => ({
      state,
      updateProfile,
      updateCycle,
      setFlowIntensity,
      setPeriodHistory,
      updateAdditionalInfo,
      updateReminder,
      resetOnboarding,
    }),
    [state, updateProfile, updateCycle, setFlowIntensity, setPeriodHistory, updateAdditionalInfo, updateReminder, resetOnboarding],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return ctx;
}
