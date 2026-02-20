import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import AccountDetailsScreen from '../AccountDetailsScreen';

const mockGoBack = jest.fn();
const mockReset = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    reset: mockReset,
  }),
}));

jest.mock('posthog-react-native', () => ({
  usePostHog: () => ({
    capture: jest.fn(),
  }),
}));

describe('AccountDetailsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens account deletion confirmation when Delete My Account is pressed', () => {
    const { getByTestId, getByText, queryByText } = render(<AccountDetailsScreen />);

    expect(queryByText('Delete account')).toBeNull();

    fireEvent.press(getByTestId('delete-account-button'));

    expect(getByText('Delete account')).toBeTruthy();
    expect(getByText('This permanently deletes your account and data. This cannot be undone.')).toBeTruthy();
    expect(getByText('Cancel')).toBeTruthy();
    expect(getByText('Delete')).toBeTruthy();
  });
});
