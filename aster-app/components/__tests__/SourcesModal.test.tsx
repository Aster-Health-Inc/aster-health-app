import React from 'react';
import { Linking } from 'react-native';
import { render } from '@testing-library/react-native';

import SourcesModal from '../SourcesModal';

describe('SourcesModal', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders title, context, and provided sources when visible', () => {
    const mockSources = [
      {
        title: 'WHO: Healthy Diet Fact Sheet',
        url: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet',
      },
    ];

    const { getByText } = render(
      <SourcesModal
        visible
        onClose={jest.fn()}
        title="Sources and Methodology"
        contextText="This nutrition summary reflects your logged food data and general public health guidance."
        sources={mockSources}
      />,
    );

    expect(getByText('Sources and Methodology')).toBeTruthy();
    expect(
      getByText('This nutrition summary reflects your logged food data and general public health guidance.'),
    ).toBeTruthy();
    expect(getByText('WHO: Healthy Diet Fact Sheet')).toBeTruthy();
  });
});
