import { supabase } from '../lib/supabase';

export const calculateCyclePredictions = async (userId, extraUserIds = []) => {
  try {
    const candidateIds = [userId, ...(extraUserIds || [])].filter(Boolean);
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

    if (cycleLengths.length === 0) {
      return null;
    }

    // Calculate average cycle length
    const avgCycleLength = Math.round(
      cycleLengths.reduce((sum, length) => sum + length, 0) / cycleLengths.length
    );

    // Calculate confidence based on consistency
    const variance = cycleLengths.reduce((sum, length) => 
      sum + Math.pow(length - avgCycleLength, 2), 0
    ) / cycleLengths.length;
    
    const standardDeviation = Math.sqrt(variance);
    const confidence = Math.max(0.1, Math.min(1.0, 1 - (standardDeviation / avgCycleLength)));

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
      prediction_method: cycleLengths.length >= 3 ? 'trend' : 'average'
    };
  } catch (error) {
    console.error('Error calculating predictions:', error);
    return null;
  }
};

export const saveCyclePrediction = async (userId, prediction) => {
  try {
    // Mark previous predictions as inactive
    await supabase
      .from('cycle_predictions')
      .update({ is_active: false })
      .eq('user_id', userId);

    // Insert new prediction
    const { data, error } = await supabase
      .from('cycle_predictions')
      .insert([{
        user_id: userId,
        ...prediction,
        is_active: true
      }])
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
