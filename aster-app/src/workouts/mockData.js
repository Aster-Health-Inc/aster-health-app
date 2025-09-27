const now = new Date();
function d(daysAgo, h, m) {
  const x = new Date();
  x.setDate(now.getDate() - daysAgo);
  x.setHours(h, m, 0, 0);
  return x;
}

export const mockActivitySummary = {
  moveKcal: 520,
  exerciseMin: 41,
  standHrs: 12,
  moveGoal: 650,
  exerciseGoal: 45,
  standGoal: 12,
};

export const mockWeeklyMove = [
  { label: 'S', value: 380 },
  { label: 'M', value: 610 },
  { label: 'T', value: 540 },
  { label: 'W', value: 720 },
  { label: 'T', value: 460 },
  { label: 'F', value: 680 },
  { label: 'S', value: 510 },
];

export const mockWorkouts = [
  { id: 'w1', type: 'Running',  start: d(0, 7, 10), end: d(0, 7, 45), calories: 330, distanceKm: 5.2, heartAvg: 148 },
  { id: 'w2', type: 'Strength', start: d(1, 18, 20), end: d(1, 19, 5), calories: 240, heartAvg: 118, notes: 'Upper body' },
  { id: 'w3', type: 'Walking',  start: d(2, 12, 10), end: d(2, 12, 45), calories: 160, distanceKm: 2.4, heartAvg: 102 },
  { id: 'w4', type: 'Yoga',     start: d(3, 6, 45),  end: d(3, 7, 30), calories: 120, heartAvg: 92 },
  { id: 'w5', type: 'Cycling',  start: d(5, 17, 0),  end: d(5, 18, 5), calories: 420, distanceKm: 15.6, heartAvg: 132 },
];
