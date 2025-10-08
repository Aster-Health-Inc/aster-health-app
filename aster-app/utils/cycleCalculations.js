export const calculateCyclePhase = (lastPeriodDate, cycleLength = 28) => {
  if (!lastPeriodDate) return null;

  const today = new Date();
  const lastPeriod = new Date(lastPeriodDate);
  const daysSinceLastPeriod = Math.floor((today - lastPeriod) / (1000 * 60 * 60 * 24));
  const currentCycleDay = (daysSinceLastPeriod % cycleLength) + 1;

  let phase;
  let phaseDay;
  let nextPhase;
  let daysUntilNext;

  if (currentCycleDay <= 5) {
    phase = 'menstrual';
    phaseDay = currentCycleDay;
    nextPhase = 'follicular';
    daysUntilNext = 6 - currentCycleDay;
  } else if (currentCycleDay <= 13) {
    phase = 'follicular';
    phaseDay = currentCycleDay - 5;
    nextPhase = 'ovulation';
    daysUntilNext = 14 - currentCycleDay;
  } else if (currentCycleDay <= 16) {
    phase = 'ovulation';
    phaseDay = currentCycleDay - 13;
    nextPhase = 'luteal';
    daysUntilNext = 17 - currentCycleDay;
  } else {
    phase = 'luteal';
    phaseDay = currentCycleDay - 16;
    nextPhase = 'menstrual';
    daysUntilNext = (cycleLength + 1) - currentCycleDay;
  }

  return {
    phase,
    phaseDay,
    currentCycleDay,
    nextPhase,
    daysUntilNext,
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

  const lastPeriod = new Date(lastPeriodDate);
  const nextPeriod = new Date(lastPeriod);
  nextPeriod.setDate(lastPeriod.getDate() + cycleLength);

  const today = new Date();
  const daysUntilPeriod = Math.ceil((nextPeriod - today) / (1000 * 60 * 60 * 24));

  return {
    date: nextPeriod,
    daysUntil: daysUntilPeriod,
  };
};

export const getFertilityWindow = (lastPeriodDate, cycleLength = 28) => {
  if (!lastPeriodDate) return null;

  const lastPeriod = new Date(lastPeriodDate);
  const ovulationDay = cycleLength - 14;
  const fertileStart = new Date(lastPeriod);
  fertileStart.setDate(lastPeriod.getDate() + ovulationDay - 5);

  const fertileEnd = new Date(lastPeriod);
  fertileEnd.setDate(lastPeriod.getDate() + ovulationDay + 1);

  return {
    start: fertileStart,
    end: fertileEnd,
    ovulationDay: ovulationDay,
  };
};
