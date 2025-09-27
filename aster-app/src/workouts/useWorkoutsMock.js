import { useEffect, useState, useCallback } from 'react';
import { mockActivitySummary, mockWeeklyMove, mockWorkouts } from './mockData';

export function useWorkoutsMock() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [weeklyMove, setWeeklyMove] = useState([]);
  const [workouts, setWorkouts] = useState([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 250)); // pretend network delay
    setSummary(mockActivitySummary);
    setWeeklyMove(mockWeeklyMove);
    setWorkouts(mockWorkouts);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { loading, summary, weeklyMove, workouts, refresh };
}
