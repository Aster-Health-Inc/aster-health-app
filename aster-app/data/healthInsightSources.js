export const HEALTH_INSIGHT_SOURCES = {
  general_wellness: {
    context:
      'This feature shares general wellness information to help you understand patterns in your logged data.',
    methodology:
      'Aster combines your logged entries with public health guidance from major organizations to generate educational wellness summaries.',
    wellnessReminder:
      'This content is educational only and is not medical advice.',
    sources: [
      {
        title: 'WHO: Menstrual Health',
        url: 'https://www.who.int/health-topics/menstrual-health',
        note: 'Overview of menstrual health and related wellbeing factors.',
      },
      {
        title: 'NIH MedlinePlus: Menstruation',
        url: 'https://medlineplus.gov/menstruation.html',
        note: 'General education on periods and cycle changes.',
      },
      {
        title: 'ACOG: Your Menstrual Cycle',
        url: 'https://www.acog.org/womens-health/faqs/your-menstrual-cycle',
        note: 'Reference ranges and cycle basics used for context.',
      },
      {
        title: 'CDC: Women\'s Health',
        url: 'https://www.cdc.gov/womenshealth/',
        note: 'Public health references for women\'s wellness topics.',
      },
    ],
  },
  cycle_estimates: {
    context:
      'Cycle dates and phase timing are estimates derived from your logged period history and common cycle timing patterns.',
    methodology:
      'Aster estimates upcoming dates by using your recent cycle lengths and a simple timing model. Estimates can change as more data is logged.',
    wellnessReminder:
      'Cycle estimates are for wellness tracking and are not diagnostic.',
    sources: [
      {
        title: 'ACOG: Your Menstrual Cycle',
        url: 'https://www.acog.org/womens-health/faqs/your-menstrual-cycle',
        note: 'Defines typical cycle length ranges and variability.',
      },
      {
        title: 'NIH MedlinePlus: Menstruation',
        url: 'https://medlineplus.gov/menstruation.html',
        note: 'Describes normal cycle timing and factors that can affect it.',
      },
      {
        title: 'WHO: Menstrual Health',
        url: 'https://www.who.int/health-topics/menstrual-health',
        note: 'Global standards for menstrual health literacy.',
      },
      {
        title: 'CDC: Menstrual Hygiene',
        url: 'https://www.cdc.gov/hygiene/about/menstrual-hygiene.html',
        note: 'General menstrual care and education guidance.',
      },
    ],
  },
  cycle_phase_patterns: {
    context:
      'Phase-based cards describe broad wellness patterns that many people may notice across cycle phases.',
    methodology:
      'Aster maps your current cycle day to a phase estimate and shows educational tips aligned with commonly reported patterns.',
    wellnessReminder:
      'Individual experiences vary. Use these as general wellness pointers, not medical conclusions.',
    sources: [
      {
        title: 'ACOG: Premenstrual Syndrome (PMS)',
        url: 'https://www.acog.org/womens-health/faqs/premenstrual-syndrome-pms',
        note: 'Background on common luteal-phase symptoms and self-care options.',
      },
      {
        title: 'NIH ODS: Magnesium Fact Sheet',
        url: 'https://ods.od.nih.gov/factsheets/Magnesium-Consumer/',
        note: 'Nutrient reference used in food-related wellness suggestions.',
      },
      {
        title: 'NIH MedlinePlus: Menstruation',
        url: 'https://medlineplus.gov/menstruation.html',
        note: 'General cycle education supporting phase explanations.',
      },
      {
        title: 'WHO: Menstrual Health',
        url: 'https://www.who.int/health-topics/menstrual-health',
        note: 'Public health framing for menstrual wellbeing support.',
      },
    ],
  },
  energy_patterns: {
    context:
      'Energy insights summarize your recent self-reported logs and show trends over time.',
    methodology:
      'Aster calculates rolling averages and simple comparisons from your entries; it does not diagnose causes of fatigue or symptoms.',
    wellnessReminder:
      'Energy trends are educational signals only and should not be used as medical advice.',
    sources: [
      {
        title: 'CDC: Sleep and Sleep Disorders',
        url: 'https://www.cdc.gov/sleep/about/index.html',
        note: 'Sleep guidance relevant to daily energy and recovery.',
      },
      {
        title: 'WHO: Physical Activity Fact Sheet',
        url: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity',
        note: 'Evidence-based activity guidance linked to wellbeing and energy.',
      },
      {
        title: 'NIH MedlinePlus: Fatigue',
        url: 'https://medlineplus.gov/fatigue.html',
        note: 'General education on fatigue and possible contributing factors.',
      },
      {
        title: 'CDC: Women\'s Health',
        url: 'https://www.cdc.gov/womenshealth/',
        note: 'General preventive wellness context.',
      },
    ],
  },
  monthly_reports: {
    context:
      'Monthly recap cards summarize logged trends so you can reflect on wellness habits over time.',
    methodology:
      'Report values are derived from tracked entries and trend math. They are not medical measurements or clinical assessments.',
    wellnessReminder:
      'Use monthly recaps for education and planning, not medical decision-making.',
    sources: [
      {
        title: 'WHO: Menstrual Health',
        url: 'https://www.who.int/health-topics/menstrual-health',
        note: 'Broad menstrual health context for trend interpretation.',
      },
      {
        title: 'CDC: Sleep and Sleep Disorders',
        url: 'https://www.cdc.gov/sleep/about/index.html',
        note: 'Sleep context often related to energy trend analysis.',
      },
      {
        title: 'NIH MedlinePlus: Menstruation',
        url: 'https://medlineplus.gov/menstruation.html',
        note: 'Cycle education reference for monthly summaries.',
      },
      {
        title: 'ACOG: Your Menstrual Cycle',
        url: 'https://www.acog.org/womens-health/faqs/your-menstrual-cycle',
        note: 'Cycle variability reference used in trend framing.',
      },
    ],
  },
  nutrition_reports: {
    context:
      'Nutrition cards summarize your logged food entries and analysis output to support general wellness tracking.',
    methodology:
      'Aster displays nutrition estimates from logged meal data and compares them to broad public-health nutrition references.',
    wellnessReminder:
      'Nutrition summaries are educational only and do not provide diagnosis, treatment, or medical advice.',
    sources: [
      {
        title: 'NIH Office of Dietary Supplements: Consumer Fact Sheets',
        url: 'https://ods.od.nih.gov/factsheets/list-all/',
        note: 'General nutrient education for consumers.',
      },
      {
        title: 'USDA Dietary Guidelines for Americans',
        url: 'https://www.dietaryguidelines.gov/',
        note: 'National guidance for healthy dietary patterns.',
      },
      {
        title: 'USDA MyPlate',
        url: 'https://www.myplate.gov/',
        note: 'Practical food-group guidance and balanced meal planning.',
      },
      {
        title: 'CDC: Nutrition, Physical Activity, and Obesity',
        url: 'https://www.cdc.gov/nutrition/index.html',
        note: 'Public health nutrition resources and prevention-focused guidance.',
      },
      {
        title: 'WHO: Healthy Diet Fact Sheet',
        url: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet',
        note: 'Global healthy eating recommendations.',
      },
    ],
  },
  manual_nutrition_logs: {
    contextText:
      'Nutrition insights summarize your self-reported food logs and show trends over time.\n\nAster calculates daily totals and rolling averages from your entries. Nutrient values are based on a publicly available nutrition dataset and may vary by brand, recipe, and preparation method.\n\nNutrition trends are educational signals only and should not be used as medical advice.',
    sources: [
      {
        title: 'Public Nutrition Dataset (Kaggle)',
        url: 'https://www.kaggle.com/datasets/trolukovich/nutritional-values-for-common-foods-and-products',
      },
    ],
  },
};

export const healthInsightSources = HEALTH_INSIGHT_SOURCES;

export const getHealthInsightSourceConfig = (categoryKey) =>
  HEALTH_INSIGHT_SOURCES[categoryKey] || HEALTH_INSIGHT_SOURCES.general_wellness;
