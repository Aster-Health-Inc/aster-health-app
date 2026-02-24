import { healthInsightSources } from '../healthInsightSources';

describe('healthInsightSources', () => {
  it('includes manual_nutrition_logs with required context and Kaggle source', () => {
    const entry = healthInsightSources.manual_nutrition_logs;

    expect(entry).toBeTruthy();
    expect(entry.contextText).toContain('Nutrition insights summarize your self-reported food logs');
    expect(Array.isArray(entry.sources)).toBe(true);
    expect(entry.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Public Nutrition Dataset (Kaggle)',
          url: 'https://www.kaggle.com/datasets/trolukovich/nutritional-values-for-common-foods-and-products',
        }),
      ]),
    );
  });
});
