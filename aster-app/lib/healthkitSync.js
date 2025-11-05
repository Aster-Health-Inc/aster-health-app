import { addDays, formatISO9075 } from 'date-fns';

import {
  readActivitySeries,
  readTodaySummary,
} from './healthkit';
import { supabase } from './supabase';
import { warn, info } from '../utils/CrashLogger';

const DEFAULT_TODAY_SUMMARY = { steps: 0, activeEnergy: 0 };
const DEFAULT_SERIES = { values: [], bucketMeta: [] };

const formatError = (err) => {
  if (!err) return 'Unknown error';
  if (typeof err === 'string' || typeof err === 'number') return String(err);
  if (err.message) return err.message;
  if (err.reason) return err.reason;
  const parts = [];
  if (err.details) parts.push(err.details);
  if (err.hint) parts.push(err.hint);
  if (err.code) parts.push(`code ${err.code}`);
  if (err.status) parts.push(`status ${err.status}`);
  if (parts.length) return parts.join(' | ');
  try {
    const serialized = JSON.stringify(err);
    return serialized && serialized !== '{}' ? serialized : 'Unknown error';
  } catch (_) {
    return 'Unknown error';
  }
};

const safeCall = async (stage, fn, fallback) => {
  try {
    return await fn();
  } catch (err) {
    warn(`HealthKit ${stage} fetch failed`, formatError(err));
    return fallback;
  }
};

/**
 * Helper to format a JS Date into YYYY-MM-DD for Supabase DATE columns.
 */
const toISODate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }
  return formatISO9075(date, { representation: 'date' });
};

/**
 * Build an array of ISO dates from bucket metadata returned by readActivitySeries.
 * Falls back to today - index days if metadata is unavailable.
 */
const buildDatesFromBuckets = (bucketMeta = []) => {
  if (!Array.isArray(bucketMeta) || bucketMeta.length === 0) {
    const today = new Date();
    return Array.from({ length: 7 }, (_, idx) =>
      toISODate(addDays(today, -(6 - idx))),
    );
  }

  return bucketMeta.map((bucket) => {
    if (bucket?.start) {
      return toISODate(new Date(bucket.start));
    }
    if (bucket?.end) {
      return toISODate(new Date(bucket.end));
    }
    return null;
  });
};

/**
 * Sync the latest Apple Health metrics (steps, calories, heart rate) into Supabase.
 * - Writes one row per day for the last 7 days (including today).
 * - Requires a Supabase table `health_metrics` with UNIQUE (user_id, metric_date).
 */
export async function syncHealthMetricsToSupabase(userId) {
  if (!userId) throw new Error('Missing user id for health sync');

  const [todaySummary, weeklySteps, weeklyCalories, weeklyHeartRate] =
    await Promise.all([
      safeCall('todaySummary', () => readTodaySummary(), DEFAULT_TODAY_SUMMARY),
      safeCall('weeklySteps', () => readActivitySeries({ metric: 'steps', range: 'W' }), DEFAULT_SERIES),
      safeCall('weeklyCalories', () => readActivitySeries({ metric: 'calories', range: 'W' }), DEFAULT_SERIES),
      safeCall('weeklyHeartRate', () => readActivitySeries({ metric: 'heartRate', range: 'W' }), DEFAULT_SERIES),
    ]);

  const dates = buildDatesFromBuckets(weeklySteps.bucketMeta);
  const payload = dates.map((isoDate, index) => ({
    user_id: userId,
    metric_date: isoDate,
    steps: weeklySteps.values?.[index] ?? 0,
    active_calories: weeklyCalories.values?.[index] ?? 0,
    avg_heart_rate: weeklyHeartRate.values?.[index] ?? 0,
    source: 'apple_health',
  }));

  // Ensure today's aggregate reflects the latest summary values (if available).
  const todayIso = toISODate(new Date());
  const todayRow = payload.find((row) => row.metric_date === todayIso);
  if (todayRow) {
    if (Number.isFinite(todaySummary?.steps)) {
      todayRow.steps = Math.round(todaySummary.steps);
    }
    if (Number.isFinite(todaySummary?.activeEnergy)) {
      todayRow.active_calories = Math.round(todaySummary.activeEnergy);
    }
  }

  const sanitizedPayload = payload.filter(
    (row) => row.user_id && row.metric_date,
  );

  if (!sanitizedPayload.length) {
    return [];
  }

  const { error } = await supabase
    .from('health_metrics')
    .upsert(sanitizedPayload, { onConflict: 'user_id,metric_date' });

  if (error) {
    const context = {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      rows: sanitizedPayload.length,
    };
    const gracefulCodes = new Set(['42P01', '42501', 'PGRST003', 'PGRST116', 'PGRST301']);
    if (error?.code && gracefulCodes.has(error.code)) {
      const reasonMap = {
        '42P01': 'table_missing',
        'PGRST003': 'table_missing',
        'PGRST116': 'table_missing',
        '42501': 'insufficient_privilege',
        'PGRST301': 'rls_blocked',
      };
      info('Health metrics upsert skipped', {
        reason: reasonMap[error.code] || 'insufficient_privilege',
        ...context,
      });
      return [];
    }
    warn('Health metrics upsert failed', context);
    const upsertError = new Error(formatError(error));
    upsertError.code = error.code;
    upsertError.details = error.details;
    upsertError.hint = error.hint;
    throw upsertError;
  }

  return sanitizedPayload;
}

export default {
  syncHealthMetricsToSupabase,
};
