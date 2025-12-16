import React from 'react';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import WelcomeScreen from '../WelcomeScreen';

jest.mock('react-native-svg', () => ({
  SvgXml: () => null,
}));

describe('WelcomeScreen', () => {
  it('renders title and button', () => {
    const navigate = jest.fn();
    const { getByText } = render(
      <SafeAreaProvider>
        <WelcomeScreen navigation={{ navigate }} />
      </SafeAreaProvider>
    );

    expect(getByText(/get started/i)).toBeTruthy();
  });
});

