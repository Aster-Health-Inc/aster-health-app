import { supabase } from '../lib/supabase';

export const calculateCyclePredictions = async (userId, extraUserIds = []) => {
  try {
    const candidateIds = Array.from(
      new Set([userId, ...(extraUserIds || [])].filter(Boolean)),
    );
    if (!candidateIds.length) return null;

    // Get user's period history
    const { data: periods, error } = await supabase
      .from('periods')
      .select('user_id, start_date, end_date')
      .in('user_id', candidateIds)
      .order('start_date', { ascending: false })
      .limit(12); // grab a bit more since we may be mixing legacy ids

    if (error || !periods || periods.length === 0) {
      return null;
    }

    // Calculate cycle lengths
    const cycleLengths = [];
    for (let i = 0; i < periods.length - 1; i++) {
      const currentStart = new Date(periods[i].start_date);
      const nextStart = new Date(periods[i + 1].start_date);
      const cycleLength = Math.floor((currentStart - nextStart) / (1000 * 60 * 60 * 24));
      if (cycleLength > 0 && cycleLength <= 45) { // Valid cycle length
        cycleLengths.push(cycleLength);
      }
    }

    let avgCycleLength = null;
    let fallbackUsed = false;
    let predictionMethod = 'average';

    if (cycleLengths.length === 0) {
      // Fallback: single period entry. Use stored average_cycle_length or default 28.
      const { data: userRow } = await supabase
        .from('users')
        .select('average_cycle_length')
        .eq('id', userId)
        .maybeSingle();

      avgCycleLength = Number(userRow?.average_cycle_length) || 28;
      fallbackUsed = true;
      predictionMethod = 'fallback_single_period';
    } else if (cycleLengths.length === 1) {
      // Single cycle: use it directly
      avgCycleLength = cycleLengths[0];
      predictionMethod = 'single_cycle';
    } else {
      // Multiple cycles: use recency-weighted average (recent cycles weighted more)
      // Weight formula: weight = index + 1 (most recent gets highest weight)
      let weightedSum = 0;
      let totalWeight = 0;
      
      cycleLengths.forEach((length, index) => {
        const weight = cycleLengths.length - index; // Most recent gets highest weight
        weightedSum += length * weight;
        totalWeight += weight;
      });
      
      avgCycleLength = Math.round(weightedSum / totalWeight);
      predictionMethod = cycleLengths.length >= 3 
        ? 'weighted_average' 
        : 'average';
    }

    if (!avgCycleLength || Number.isNaN(avgCycleLength)) {
      return null;
    }

    // Calculate confidence based on consistency (or conservative if fallback)
    let confidence = 0.5;
    if (!fallbackUsed && cycleLengths.length) {
      const variance = cycleLengths.reduce((sum, length) =>
        sum + Math.pow(length - avgCycleLength, 2), 0
      ) / cycleLengths.length;

      const standardDeviation = Math.sqrt(variance);
      confidence = Math.max(0.1, Math.min(1.0, 1 - (standardDeviation / avgCycleLength)));
    }

    // Predict next period
    const lastPeriodStart = new Date(periods[0].start_date);
    const nextPeriodDate = new Date(lastPeriodStart);
    nextPeriodDate.setDate(lastPeriodStart.getDate() + avgCycleLength);

    // Predict ovulation (typically 14 days before next period)
    const ovulationDate = new Date(nextPeriodDate);
    ovulationDate.setDate(nextPeriodDate.getDate() - 14);

    return {
      predicted_period_date: nextPeriodDate.toISOString().split('T')[0],
      predicted_ovulation_date: ovulationDate.toISOString().split('T')[0],
      predicted_cycle_length: avgCycleLength,
      confidence_score: Math.round(confidence * 100) / 100,
      prediction_method: predictionMethod
    };
  } catch (error) {
    console.error('Error calculating predictions:', error);
    return null;
  }
};

export const saveCyclePrediction = async (userId, prediction) => {
  try {
    // Ensure user row exists before saving prediction
    await supabase
      .from('users')
      .upsert([{ id: userId }], { onConflict: 'id' });

    // Upsert the active prediction for this user
    const { data, error } = await supabase
      .from('cycle_predictions')
      .upsert(
        [
          {
            user_id: userId,
            ...prediction,
            is_active: true,
          },
        ],
        { onConflict: 'user_id' },
      )
      .select();

    if (error) {
      console.error('Error saving prediction:', error);
      return null;
    }

    return data[0];
  } catch (error) {
    console.error('Error saving prediction:', error);
    return null;
  }
};

export const getActivePrediction = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('cycle_predictions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching prediction:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('Error fetching prediction:', error);
    return null;
  }
};

export const updatePredictionsForUser = async (userId, options = {}) => {
  try {
    const prediction = await calculateCyclePredictions(userId, options.includeUserIds);
    if (prediction) {
      return await saveCyclePrediction(userId, prediction);
    }
    return null;
  } catch (error) {
    console.error('Error updating predictions:', error);
    return null;
  }
};
