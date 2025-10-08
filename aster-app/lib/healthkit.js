// lib/healthkit.ios.js
import AppleHealthKit from 'react-native-health';

// Safeguard if module is unavailable (e.g., Expo Go)
const hasHK = !!(AppleHealthKit && AppleHealthKit.initHealthKit);
const PERMS = (AppleHealthKit && AppleHealthKit.Constants && AppleHealthKit.Constants.Permissions) || {};

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
