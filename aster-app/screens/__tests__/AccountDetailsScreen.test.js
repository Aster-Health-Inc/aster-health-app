import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import AccountDetailsScreen from '../AccountDetailsScreen';

const mockGoBack = jest.fn();
const mockReset = jest.fn();
const mockCapture = jest.fn();
const mockGetUser = jest.fn();
const mockSignOut = jest.fn();
const mockRpc = jest.fn();
const authUserResponse = {
  data: {
    user: {
      id: 'user-1',
      email: 'user@example.com',
      user_metadata: {},
    },
  },
  error: null,
};

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    reset: mockReset,
  }),
}));

jest.mock('posthog-react-native', () => ({
  usePostHog: () => ({
    capture: mockCapture,
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getAllKeys: jest.fn().mockResolvedValue([]),
  multiRemove: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: (...args) => mockGetUser(...args),
      signOut: (...args) => mockSignOut(...args),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: (...args) => mockRpc(...args),
  },
}));

describe('AccountDetailsScreen', () => {
  let alertSpy;
  let logSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockRpc.mockResolvedValue({ error: null });
    mockSignOut.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    alertSpy.mockRestore();
    logSpy.mockRestore();
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

  it('shows loading state while account deletion is in progress', async () => {
    mockGetUser
      .mockResolvedValueOnce({ data: { user: null }, error: null })
      .mockResolvedValueOnce(authUserResponse);
    mockRpc.mockImplementationOnce(() => new Promise(() => {}));

    const { getByTestId, getAllByText } = render(<AccountDetailsScreen />);

    fireEvent.press(getByTestId('delete-account-button'));
    fireEvent.press(getByTestId('confirm-delete-account-button'));

    expect(getAllByText('Deleting...').length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('delete_my_account');
    });
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('resets navigation to auth UI after successful deletion', async () => {
    mockGetUser
      .mockResolvedValueOnce({ data: { user: null }, error: null })
      .mockResolvedValueOnce(authUserResponse);

    const { getByTestId } = render(<AccountDetailsScreen />);

    fireEvent.press(getByTestId('delete-account-button'));
    fireEvent.press(getByTestId('confirm-delete-account-button'));

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Welcome' }] });
    });
    expect(mockCapture).toHaveBeenCalledWith('account_deleted');
  });

  it('shows error and re-enables delete flow when deletion fails', async () => {
    mockGetUser
      .mockResolvedValueOnce({ data: { user: null }, error: null })
      .mockResolvedValueOnce(authUserResponse);
    mockRpc.mockRejectedValueOnce(new Error('Delete failed'));

    const { getByTestId, getByText, queryByText } = render(<AccountDetailsScreen />);

    fireEvent.press(getByTestId('delete-account-button'));
    fireEvent.press(getByTestId('confirm-delete-account-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Delete account failed', 'Delete failed');
    });

    expect(getByText('Delete')).toBeTruthy();
    expect(queryByText('Deleting...')).toBeNull();
    expect(mockReset).not.toHaveBeenCalled();
  });
});
