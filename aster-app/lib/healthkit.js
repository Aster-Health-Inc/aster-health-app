// lib/healthkit.ios.js
import AppleHealthKit from 'react-native-health';

// Safeguard if module is unavailable (e.g., Expo Go)
const hasHK = !!(AppleHealthKit && AppleHealthKit.initHealthKit);
const PERMS = (AppleHealthKit && AppleHealthKit.Constants && AppleHealthKit.Constants.Permissions) || {};

export const healthKitAvailable = hasHK;

const mapIdentifierToPerm = (id) => {
  switch (id) {
    case 'HKWorkoutTypeIdentifier':
      return PERMS.Workout || 'Workout';
    case 'HKQuantityTypeIdentifierActiveEnergyBurned':
      return PERMS.ActiveEnergyBurned || 'ActiveEnergyBurned';
    case 'HKQuantityTypeIdentifierDistanceWalkingRunning':
      return PERMS.DistanceWalkingRunning || 'DistanceWalkingRunning';
    case 'HKQuantityTypeIdentifierHeartRate':
      return PERMS.HeartRate || 'HeartRate';
    case 'HKQuantityTypeIdentifierStepCount':
      return PERMS.Steps || PERMS.StepCount || 'Steps';
    default:
      return id;
  }
};

// selectedItems: [{ identifier, read: bool, write: bool }]
export async function requestHealthPermissions(selectedItems) {
  if (!hasHK) return { ok: false, reason: 'HealthKit module unavailable' };

  const read = [];
  const write = [];
  for (const it of selectedItems) {
    if (it.read) read.push(mapIdentifierToPerm(it.identifier));
    if (it.write) write.push(mapIdentifierToPerm(it.identifier));
  }

  const perms = { permissions: { read, write } };

  return new Promise((resolve) => {
    try {
      AppleHealthKit.initHealthKit(perms, (err) => {
        if (err) {
          console.log('HealthKit init error:', err);
          resolve({ ok: false, reason: String(err?.message || err) });
        } else {
          resolve({ ok: true });
        }
      });
    } catch (e) {
      resolve({ ok: false, reason: String(e?.message || e) });
    }
  });
}

export async function readTodaySummary() {
  // Gracefully return zeros if HK is not available (e.g., Expo Go)
  if (!hasHK) return { steps: 0, activeEnergy: 0, distance: 0 };

  return new Promise((resolve) => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const options = { startDate: start.toISOString(), endDate: now.toISOString() };
    const out = { steps: 0, activeEnergy: 0, distance: 0 };

    const energyOpts = { unit: 'kCal', startDate: options.startDate, endDate: options.endDate };
    const finalize = () => resolve(out);

    const readDistance = () => {
      try {
        AppleHealthKit.getDistanceWalkingRunning(energyOpts, (e3, res3) => {
          if (!e3 && Array.isArray(res3)) {
            out.distance = res3.reduce((s, r) => s + (Number(r.value) || 0), 0);
          }
          finalize();
        });
      } catch (_) {
        finalize();
      }
    };

    const readEnergy = () => {
      try {
        AppleHealthKit.getActiveEnergyBurned(energyOpts, (e2, res2) => {
          if (!e2 && Array.isArray(res2)) {
            out.activeEnergy = res2.reduce((s, r) => s + (Number(r.value) || 0), 0);
          }
          readDistance();
        });
      } catch (_) {
        // Fallback to samples API if the shortcut isn't available
        try {
          AppleHealthKit.getSamples(
            { ...energyOpts, type: 'ActiveEnergyBurned' },
            (e, rs) => {
              if (!e && Array.isArray(rs)) {
                out.activeEnergy = rs.reduce((s, r) => s + (Number(r.value) || 0), 0);
              }
              readDistance();
            }
          );
        } catch (__) {
          readDistance();
        }
      }
    };

    const onSamples = (res) => {
      if (Array.isArray(res) && res.length) {
        const todaySample = res.find((s) => {
          const end = new Date(s.endDate || s.end || 0);
          return end.getDate() === now.getDate() &&
            end.getMonth() === now.getMonth() &&
            end.getFullYear() === now.getFullYear();
        }) || res[res.length - 1];
        out.steps = Number(todaySample?.value || 0);
      }
      readEnergy();
    };

    const fallbackStepCount = () => {
      try {
        AppleHealthKit.getStepCount(options, (err, res) => {
          if (!err && res) {
            out.steps = Number(res.value || 0);
          }
          readEnergy();
        });
      } catch (_) {
        readEnergy();
      }
    };

    try {
      // Steps (daily)
      AppleHealthKit.getDailyStepCountSamples(options, (err, res) => {
        if (!err && Array.isArray(res) && res.length) {
          onSamples(res);
        } else {
          fallbackStepCount();
        }
      });
    } catch (e) {
      fallbackStepCount();
    }
  });
}

const HOUR_MS = 1000 * 60 * 60;
const DAY_MS = HOUR_MS * 24;

const formatters = {
  time: new Intl.DateTimeFormat('en-US', { hour: 'numeric' }),
  day: new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }),
  dayShort: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }),
  weekdayShort: new Intl.DateTimeFormat('en-US', { weekday: 'short' }),
  monthShort: new Intl.DateTimeFormat('en-US', { month: 'short' }),
  monthLong: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }),
};

const rangeConfigs = {
  D: { type: 'hour', segments: 8, segmentHours: 3 },
  W: { type: 'day', segments: 7, segmentDays: 1 },
  M: { type: 'day', segments: 6, segmentDays: 5 },
  '6M': { type: 'month', segments: 6 },
  Y: { type: 'month', segments: 12 },
};

const addDays = (date, amount) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const addMonths = (date, amount) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
};

const formatHourLabel = (date) => {
  const raw = formatters.time.format(date);
  return raw.replace(/\s+/g, '');
};

function buildBuckets(range, reference = new Date()) {
  const config = rangeConfigs[range] || rangeConfigs.Y;
  const now = new Date(reference);
  const buckets = [];

  if (config.type === 'hour') {
    const start = startOfDay(now);
    const totalSegments = config.segments;
    const spanHours = config.segmentHours || 1;

    for (let i = 0; i < totalSegments; i += 1) {
      const bucketStart = new Date(start.getTime() + i * spanHours * HOUR_MS);
      const bucketEnd = new Date(bucketStart.getTime() + spanHours * HOUR_MS);
      buckets.push({
        start: bucketStart,
        end: bucketEnd,
        label: formatHourLabel(bucketStart),
        highlightLabel: `${formatters.day.format(bucketStart)} ${formatters.time.format(bucketStart)}`,
      });
    }

    return {
      type: 'hour',
      start: buckets[0].start,
      end: buckets[buckets.length - 1].end,
      bucketMs: spanHours * HOUR_MS,
      buckets,
    };
  }

  if (config.type === 'day') {
    const spanDays = config.segmentDays || 1;
    const totalSegments = config.segments;
    const end = addDays(startOfDay(now), 1);
    let bucketEnd = new Date(end);

    for (let i = 0; i < totalSegments; i += 1) {
      const bucketStart = addDays(bucketEnd, -spanDays);
      buckets.unshift({
        start: startOfDay(bucketStart),
        end: bucketEnd,
        label:
          spanDays > 1
            ? formatters.dayShort.format(startOfDay(bucketStart))
            : formatters.weekdayShort.format(startOfDay(bucketStart)).charAt(0),
        highlightLabel: formatters.day.format(startOfDay(bucketStart)),
      });
      bucketEnd = startOfDay(bucketStart);
    }

    return {
      type: 'day',
      start: buckets[0].start,
      end: addDays(startOfDay(now), 1),
      bucketMs: spanDays * DAY_MS,
      buckets,
    };
  }

  // month-based ranges
  const totalSegments = config.segments;
  const endMonth = addMonths(startOfMonth(now), 1);
  const startMonthRange = addMonths(endMonth, -totalSegments);

  for (let i = 0; i < totalSegments; i += 1) {
    const bucketStart = addMonths(startMonthRange, i);
    const bucketEnd = addMonths(bucketStart, 1);
    buckets.push({
      start: bucketStart,
      end: bucketEnd,
      label: formatters.monthShort.format(bucketStart),
      highlightLabel: formatters.monthLong.format(bucketStart),
    });
  }

  return {
    type: 'month',
    start: buckets[0].start,
    end: buckets[buckets.length - 1].end,
    buckets,
  };
}

const METRIC_TYPES = {
  steps: {
    type: 'StepCount',
    aggregator: 'sum',
  },
  calories: {
    type: 'ActiveEnergyBurned',
    unit: 'kCal',
    aggregator: 'sum',
  },
  heartRate: {
    type: 'HeartRate',
    unit: 'count/min',
    aggregator: 'average',
  },
};

const normalizeValue = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

export async function readActivitySeries({ metric = 'steps', range = '6M' } = {}) {
  if (!hasHK) {
    return {
      available: false,
      labels: [],
      values: [],
      highlight: null,
      highlightIndex: -1,
      total: 0,
    };
  }

  const metricConfig = METRIC_TYPES[metric] || METRIC_TYPES.steps;
  const bucketConfig = buildBuckets(range);
  const totals = bucketConfig.buckets.map(() =>
    metricConfig.aggregator === 'average'
      ? { sum: 0, count: 0 }
      : 0,
  );

  const options = {
    type: metricConfig.type,
    startDate: bucketConfig.start.toISOString(),
    endDate: bucketConfig.end.toISOString(),
    ascending: true,
    limit: 2000,
  };

  if (metricConfig.unit) {
    options.unit = metricConfig.unit;
  }

  return new Promise((resolve, reject) => {
    try {
      AppleHealthKit.getSamples(options, (err, samples) => {
        if (err) {
          reject(new Error(String(err?.message || err)));
          return;
        }
        const data = Array.isArray(samples) ? samples : [];
        data.forEach((sample) => {
          const sampleEnd = new Date(sample.endDate || sample.end || sample.endTimestamp || sample.startDate || sample.start);
          if (!Number.isFinite(sampleEnd.getTime())) return;
          if (sampleEnd < bucketConfig.start || sampleEnd > bucketConfig.end) return;
          const value = normalizeValue(sample.value);
          if (value <= 0) return;

          let index = -1;

          if (bucketConfig.type === 'month') {
            index = bucketConfig.buckets.findIndex(
              (bucket) => sampleEnd >= bucket.start && sampleEnd < bucket.end,
            );
          } else {
            const elapsed = sampleEnd.getTime() - bucketConfig.start.getTime();
            index = Math.floor(elapsed / bucketConfig.bucketMs);
            if (index < 0) index = 0;
            if (index >= totals.length) index = totals.length - 1;
          }

          if (index >= 0) {
            if (metricConfig.aggregator === 'average') {
              totals[index].sum += value;
              totals[index].count += 1;
            } else {
              totals[index] += value;
            }
          }
        });

        const values = totals.map((record) => {
          if (metricConfig.aggregator === 'average') {
            const { sum, count } = record;
            return Math.round(count > 0 ? sum / count : 0);
          }
          return Math.round(record);
        });

        const highlightIndex = values.reduce(
          (acc, val, idx) => (val > values[acc] ? idx : acc),
          0,
        );
        const highlightBucket = bucketConfig.buckets[highlightIndex];

        resolve({
          available: true,
          labels: bucketConfig.buckets.map((bucket) => bucket.label),
          values,
          highlight: highlightBucket
            ? {
                label: highlightBucket.highlightLabel,
                value: values[highlightIndex] ?? 0,
              }
            : null,
          highlightIndex,
          total:
            metricConfig.aggregator === 'average'
              ? Math.round(
                  values.length
                    ? values.reduce((sum, val) => sum + val, 0) / values.length
                    : 0,
                )
              : values.reduce((sum, val) => sum + val, 0),
          bucketMeta: bucketConfig.buckets.map((bucket) => ({
            start: bucket.start.toISOString(),
            end: bucket.end.toISOString(),
          })),
        });
      });
    } catch (e) {
      reject(e);
    }
  });
}
