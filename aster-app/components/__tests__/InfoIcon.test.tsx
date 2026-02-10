import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import InfoIcon from '../InfoIcon';

describe('InfoIcon', () => {
  it('renders with accessibility label and is tappable', () => {
    const onPress = jest.fn();

    const { getByLabelText } = render(
      <InfoIcon onPress={onPress} accessibilityLabel="Sources and methodology" />,
    );

    const iconButton = getByLabelText('Sources and methodology');
    expect(iconButton).toBeTruthy();

    fireEvent.press(iconButton);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
