import { supabase } from '../lib/supabase';

const MS_IN_DAY = 1000 * 60 * 60 * 24;
const MIN_CYCLE_LENGTH = 21;
const MAX_CYCLE_LENGTH = 45;
const DEFAULT_CYCLE_LENGTH = 28;
const DEFAULT_PERIOD_LENGTH = 5;
const PREDICTION_VERSION = 1;
const MAX_ANCHOR_SHIFT = 10;
const DEBUG_ENABLED = typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_CYCLE_DEBUG === '1';

const debugLog = (...args) => {
  if (DEBUG_ENABLED) {
    // eslint-disable-next-line no-console
    console.log('[cycle-prediction]', ...args);
  }
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const normalizeDateArray = (value) =>
  (Array.isArray(value) ? value : [])
    .filter((item) => typeof item === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item));

const parseYMD = (value) => {
  if (!value || typeof value !== 'string') return null;
  const [year, month, day] = value.split('-').map((v) => Number.parseInt(v, 10));
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
};

const toYMD = (value) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const addDaysYmd = (ymd, days) => {
  const parsed = parseYMD(ymd);
  if (!parsed) return null;
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return toYMD(parsed);
};

const daysBetween = (laterYmd, earlierYmd) => {
  const later = parseYMD(laterYmd);
  const earlier = parseYMD(earlierYmd);
  if (!later || !earlier) return null;
  return Math.floor((later.getTime() - earlier.getTime()) / MS_IN_DAY);
};

const median = (values) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
};

const getPredictionMethod = (lengthsCount) => {
  if (lengthsCount <= 0) return 'fallback_default';
  if (lengthsCount === 1) return 'single_cycle';
  if (lengthsCount === 2) return 'median_two_cycles';
  return 'robust_median';
};

const dedupePeriodsByStart = (rows, preferredUserId) => {
  const byStart = new Map();
  rows.forEach((row) => {
    if (!row?.start_date) return;
    const existing = byStart.get(row.start_date);
    if (!existing) {
      byStart.set(row.start_date, row);
      return;
    }
    if (row.user_id === preferredUserId && existing.user_id !== preferredUserId) {
      byStart.set(row.start_date, row);
      return;
    }
    if ((row.created_at || '') > (existing.created_at || '')) {
      byStart.set(row.start_date, row);
    }
  });

  return Array.from(byStart.values()).sort((a, b) => b.start_date.localeCompare(a.start_date));
};

const buildDayRange = (startYmd, length) => {
  const safeLen = Math.max(1, Math.floor(length));
  return Array.from({ length: safeLen }, (_, index) => addDaysYmd(startYmd, index)).filter(Boolean);
};

const listDaysBetween = (startYmd, endYmd) => {
  const distance = daysBetween(endYmd, startYmd);
  if (distance == null || distance < 0) return [];
  return Array.from({ length: distance + 1 }, (_, index) => addDaysYmd(startYmd, index)).filter(Boolean);
};

const buildPredictionPayload = (prediction, { legacy = false } = {}) => {
  if (legacy) {
    return {
      predicted_period_date: prediction.predicted_period_date,
      predicted_ovulation_date: prediction.predicted_ovulation_date,
      predicted_cycle_length: prediction.predicted_cycle_length,
      confidence_score: prediction.confidence_score,
      prediction_method: prediction.prediction_method,
      is_active: true,
    };
  }

  const anchor = prediction.cycle_anchor_date || prediction.predicted_period_date || null;
  const periodDays =
    normalizeDateArray(prediction.predicted_period_days).length > 0
      ? normalizeDateArray(prediction.predicted_period_days)
      : anchor
        ? buildDayRange(anchor, DEFAULT_PERIOD_LENGTH)
        : [];

  return {
    cycle_anchor_date: anchor,
    predicted_period_date: prediction.predicted_period_date || anchor,
    predicted_ovulation_date: prediction.predicted_ovulation_date,
    predicted_cycle_length: prediction.predicted_cycle_length,
    predicted_period_days: periodDays,
    predicted_fertile_days: normalizeDateArray(prediction.predicted_fertile_days),
    predicted_pms_days: normalizeDateArray(prediction.predicted_pms_days),
    confidence_score: prediction.confidence_score,
    prediction_method: prediction.prediction_method,
    prediction_version: prediction.prediction_version || PREDICTION_VERSION,
    status: prediction.status || 'predicted',
    is_active: true,
    source: prediction.source || 'auto',
  };
};

export const calculateCyclePredictions = async (userId, extraUserIds = []) => {
  try {
    const candidateIds = Array.from(new Set([userId, ...(extraUserIds || [])].filter(Boolean)));
    if (!candidateIds.length) return null;

    const [{ data: userRow }, { data: periodRows, error: periodsError }, feedbackResult] = await Promise.all([
      supabase
        .from('users')
        .select('average_cycle_length, average_period_length')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('periods')
        .select('user_id, start_date, end_date, created_at')
        .in('user_id', candidateIds)
        .order('start_date', { ascending: false })
        .limit(30),
      supabase
        .from('prediction_feedback')
        .select('predicted_start_date, feedback_type')
        .eq('user_id', userId)
        .eq('feedback_type', 'rejected')
        .order('created_at', { ascending: false })
        .limit(30),
    ]);

    if (periodsError) {
      debugLog('Failed to read periods', periodsError.message);
      return null;
    }

    const dedupedPeriods = dedupePeriodsByStart(periodRows || [], userId);
    if (!dedupedPeriods.length) return null;

    const cycleDiffs = [];
    for (let i = 0; i < dedupedPeriods.length - 1; i += 1) {
      const diff = daysBetween(dedupedPeriods[i].start_date, dedupedPeriods[i + 1].start_date);
      if (diff != null && diff >= MIN_CYCLE_LENGTH && diff <= MAX_CYCLE_LENGTH) {
        cycleDiffs.push(diff);
      }
    }

    const medianLength = median(cycleDiffs);
    const cycleLength = clamp(
      Math.round(medianLength ?? Number(userRow?.average_cycle_length) ?? DEFAULT_CYCLE_LENGTH),
      MIN_CYCLE_LENGTH,
      MAX_CYCLE_LENGTH,
    );

    const periodDurations = dedupedPeriods
      .map((row) => {
        if (!row?.start_date || !row?.end_date) return null;
        const diff = daysBetween(row.end_date, row.start_date);
        if (diff == null) return null;
        return clamp(diff + 1, 2, 10);
      })
      .filter((value) => Number.isInteger(value));

    const periodLength = clamp(
      Math.round(median(periodDurations) ?? Number(userRow?.average_period_length) ?? DEFAULT_PERIOD_LENGTH),
      2,
      10,
    );

    const lastStart = dedupedPeriods[0].start_date;
    let cycleAnchorDate = addDaysYmd(lastStart, cycleLength);
    if (!cycleAnchorDate) return null;

    const rejectedSet = new Set((feedbackResult.data || []).map((row) => row.predicted_start_date));
    for (let shift = 0; shift < MAX_ANCHOR_SHIFT && rejectedSet.has(cycleAnchorDate); shift += 1) {
      cycleAnchorDate = addDaysYmd(cycleAnchorDate, 1);
    }

    const ovulationOffset = cycleLength - 14;
    const ovulationDate = addDaysYmd(cycleAnchorDate, ovulationOffset);
    const fertileStart = addDaysYmd(cycleAnchorDate, ovulationOffset - 5);
    const fertileEnd = addDaysYmd(cycleAnchorDate, ovulationOffset + 1);
    const pmsStart = addDaysYmd(cycleAnchorDate, cycleLength - 5);
    const pmsEnd = addDaysYmd(cycleAnchorDate, cycleLength - 1);

    const variabilityBase = medianLength == null ? 0 : Math.abs(cycleLength - medianLength);
    const confidence = clamp(Number((1 - variabilityBase / cycleLength).toFixed(2)), 0.2, 0.95);

    const prediction = {
      cycle_anchor_date: cycleAnchorDate,
      predicted_period_date: cycleAnchorDate,
      predicted_ovulation_date: ovulationDate,
      predicted_cycle_length: cycleLength,
      predicted_period_days: buildDayRange(cycleAnchorDate, periodLength),
      predicted_fertile_days: listDaysBetween(fertileStart, fertileEnd),
      predicted_pms_days: listDaysBetween(pmsStart, pmsEnd),
      confidence_score: confidence,
      prediction_method: getPredictionMethod(cycleDiffs.length),
      prediction_version: PREDICTION_VERSION,
      status: 'predicted',
      source: 'model_v2',
    };

    debugLog('Generated prediction', {
      anchor: prediction.cycle_anchor_date,
      cycleLength,
      periodLength,
      method: prediction.prediction_method,
      rejectedShift: rejectedSet.has(addDaysYmd(lastStart, cycleLength)),
    });

    return prediction;
  } catch (error) {
    console.error('Error calculating predictions:', error);
    return null;
  }
};

export const supersedeActivePredictions = async (userId) => {
  try {
    const { error } = await supabase
      .from('cycle_predictions')
      .update({
        is_active: false,
        status: 'superseded',
        superseded_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('is_active', true)
      .in('status', ['predicted', 'rejected']);

    if (error) {
      debugLog('supersedeActivePredictions fallback/noop', error.message);
    }
  } catch (error) {
    debugLog('supersedeActivePredictions failed', error?.message);
  }
};

export const saveCyclePrediction = async (userId, prediction) => {
  try {
    await supabase.from('users').upsert([{ id: userId }], { onConflict: 'id' });

    await supersedeActivePredictions(userId);

    const nextPayload = {
      user_id: userId,
      ...buildPredictionPayload(prediction),
    };

    const newStyleResult = await supabase
      .from('cycle_predictions')
      .upsert([nextPayload], { onConflict: 'user_id,cycle_anchor_date,prediction_version' })
      .select()
      .maybeSingle();

    if (!newStyleResult.error) {
      return newStyleResult.data;
    }

    debugLog('saveCyclePrediction using legacy fallback', newStyleResult.error.message);

    const legacyPayload = {
      user_id: userId,
      ...buildPredictionPayload(prediction, { legacy: true }),
    };

    const legacyResult = await supabase
      .from('cycle_predictions')
      .upsert([legacyPayload], { onConflict: 'user_id' })
      .select()
      .maybeSingle();

    if (legacyResult.error) {
      console.error('Error saving prediction:', legacyResult.error);
      return null;
    }

    return legacyResult.data;
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

export const submitPredictionFeedback = async ({
  userId,
  predictionId = null,
  predictedStartDate,
  feedbackType,
  correctedStartDate = null,
}) => {
  try {
    const payload = {
      user_id: userId,
      prediction_id: predictionId,
      predicted_start_date: predictedStartDate,
      feedback_type: feedbackType,
      corrected_start_date: correctedStartDate,
    };

    const { error } = await supabase.from('prediction_feedback').insert(payload);
    if (error) {
      debugLog('submitPredictionFeedback skipped', error.message);
      return false;
    }

    return true;
  } catch (error) {
    debugLog('submitPredictionFeedback failed', error?.message);
    return false;
  }
};

export const updatePredictionStatus = async ({ predictionId, userId, status, isActive = false }) => {
  if (!predictionId) return;
  try {
    const { error } = await supabase
      .from('cycle_predictions')
      .update({
        status,
        is_active: isActive,
        superseded_at: status === 'superseded' ? new Date().toISOString() : null,
      })
      .eq('id', predictionId)
      .eq('user_id', userId);

    if (error) {
      debugLog('updatePredictionStatus skipped', error.message);
    }
  } catch (error) {
    debugLog('updatePredictionStatus failed', error?.message);
  }
};

export const updatePredictionsForUser = async (userId, options = {}) => {
  try {
    const prediction = await calculateCyclePredictions(userId, options.includeUserIds);
    if (!prediction) {
      return null;
    }

    return await saveCyclePrediction(userId, prediction);
  } catch (error) {
    console.error('Error updating predictions:', error);
    return null;
  }
};
