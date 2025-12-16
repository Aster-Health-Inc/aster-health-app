const MS_IN_DAY = 1000 * 60 * 60 * 24;

// Normalize a date (Date or string) to UTC midnight so math is consistent across timezones
export const toUtcMidnight = (value) => {
  if (!value) return null;
  const d = typeof value === 'string' ? new Date(value) : new Date(value);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};

export const parseYMD = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map((v) => Number.parseInt(v, 10));
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
};

const addDaysUtc = (date, days) => {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
};

const diffDaysUtc = (a, b) => Math.floor((a.getTime() - b.getTime()) / MS_IN_DAY);

export const calculateCyclePhase = (lastPeriodDate, cycleLength = 28) => {
  if (!lastPeriodDate) return null;

  const today = toUtcMidnight(new Date());
  const lastPeriod = parseYMD(lastPeriodDate) || toUtcMidnight(lastPeriodDate);
  if (!lastPeriod) return null;

  const daysSinceLastPeriod = diffDaysUtc(today, lastPeriod);
  if (daysSinceLastPeriod < 0) return null;
  const currentCycleDay = (daysSinceLastPeriod % cycleLength) + 1;

  let phase;
  let phaseDay;
  let nextPhase;
  let daysUntilNextPhase;

  if (currentCycleDay <= 5) {
    phase = 'menstrual';
    phaseDay = currentCycleDay;
    nextPhase = 'follicular';
    daysUntilNextPhase = 6 - currentCycleDay;
  } else if (currentCycleDay <= 13) {
    phase = 'follicular';
    phaseDay = currentCycleDay - 5;
    nextPhase = 'ovulation';
    daysUntilNextPhase = 14 - currentCycleDay;
  } else if (currentCycleDay <= 16) {
    phase = 'ovulation';
    phaseDay = currentCycleDay - 13;
    nextPhase = 'luteal';
    daysUntilNextPhase = 17 - currentCycleDay;
  } else {
    phase = 'luteal';
    phaseDay = currentCycleDay - 16;
    nextPhase = 'menstrual';
    daysUntilNextPhase = (cycleLength + 1) - currentCycleDay;
  }

  const daysUntilNextPeriod = Math.max(0, cycleLength - currentCycleDay);
  const nextPeriodDate = addDaysUtc(today, daysUntilNextPeriod);

  return {
    phase,
    phaseDay,
    currentCycleDay,
    nextPhase,
    daysUntilNext: daysUntilNextPhase, // kept for existing components
    daysUntilNextPhase,
    daysUntilNextPeriod,
    nextPeriodDate: nextPeriodDate.toISOString().split('T')[0],
    cycleLength,
    progress: (currentCycleDay / cycleLength) * 100,
  };
};

export const getPhaseInfo = (phase) => {
  const phaseData = {
    menstrual: {
      name: 'Menstrual',
      emoji: '🩸',
      color: '#e91e63',
      gradientColors: ['#e91e63', '#ad1457'],
      description: 'Your period is here. Time to rest and reset.',
      tips: [
        'Rest and take it easy',
        'Stay hydrated and eat iron-rich foods',
        'Practice gentle movement like yoga',
        "Listen to your body's needs",
      ],
      hormones: {
        estrogen: 'Low and rising',
        progesterone: 'Low',
        mood: 'Introspective and calm',
      },
    },
    follicular: {
      name: 'Follicular',
      emoji: '🌱',
      color: '#4caf50',
      gradientColors: ['#4caf50', '#2e7d32'],
      description: 'Energy is building. Perfect time for new beginnings.',
      tips: [
        'Start new projects and make plans',
        'Increase exercise intensity',
        'Try new things and be social',
        'Focus on goal-setting',
      ],
      hormones: {
        estrogen: 'Rising',
        progesterone: 'Low',
        mood: 'Optimistic and energetic',
      },
    },
    ovulation: {
      name: 'Ovulation',
      emoji: '✨',
      color: '#ff9800',
      gradientColors: ['#ff9800', '#f57400'],
      description: "You're glowing! Peak energy and fertility.",
      tips: [
        'Embrace social activities',
        'Tackle challenging workouts',
        'Communicate important matters',
        'Make big decisions',
      ],
      hormones: {
        estrogen: 'Peak',
        progesterone: 'Starting to rise',
        mood: 'Confident and charismatic',
      },
    },
    luteal: {
      name: 'Luteal',
      emoji: '🌙',
      color: '#9c27b0',
      gradientColors: ['#9c27b0', '#6a1b9a'],
      description: 'Winding down. Time for reflection and self-care.',
      tips: [
        'Focus on completing projects',
        'Practice self-care and relaxation',
        'Prepare for your next cycle',
        'Listen to your intuition',
      ],
      hormones: {
        estrogen: 'Declining',
        progesterone: 'High then dropping',
        mood: 'Reflective and sensitive',
      },
    },
  };

  return phaseData[phase] || null;
};

export const calculateNextPeriod = (lastPeriodDate, cycleLength = 28) => {
  if (!lastPeriodDate) return null;

  const today = toUtcMidnight(new Date());
  const lastPeriod = parseYMD(lastPeriodDate) || toUtcMidnight(lastPeriodDate);
  if (!lastPeriod) return null;

  const cyclesElapsed = Math.max(0, Math.floor(diffDaysUtc(today, lastPeriod) / cycleLength));
  const nextPeriod = addDaysUtc(lastPeriod, (cyclesElapsed + 1) * cycleLength);
  const daysUntilPeriod = Math.max(0, diffDaysUtc(nextPeriod, today));

  return {
    date: nextPeriod,
    daysUntil: daysUntilPeriod,
  };
};

export const getFertilityWindow = (lastPeriodDate, cycleLength = 28) => {
  if (!lastPeriodDate) return null;

  const lastPeriod = parseYMD(lastPeriodDate) || toUtcMidnight(lastPeriodDate);
  if (!lastPeriod) return null;

  const ovulationDay = cycleLength - 14;
  const fertileStart = addDaysUtc(lastPeriod, ovulationDay - 5);

  const fertileEnd = addDaysUtc(lastPeriod, ovulationDay + 1);

  return {
    start: fertileStart,
    end: fertileEnd,
    ovulationDay: ovulationDay,
  };
};
