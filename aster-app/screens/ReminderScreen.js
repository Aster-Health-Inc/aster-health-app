import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../lib/supabase';
import { useOnboardingGuard } from '../utils/useOnboardingGuard';
import { useOnboarding } from '../src/context/OnboardingContext';
import { getCanonicalUserId } from '../utils/authUser';
import { updatePredictionsForUser, saveCyclePrediction } from '../utils/cyclePredictions';
import { scheduleDailyCheckins } from '../utils/notifications';

const COLORS = {
  background: '#EDE5F7',
  card: '#FFFFFF',
  textPrimary: '#1F103B',
  textSecondary: '#5C4E7B',
  accent: '#4B117B',
  buttonDisabled: '#4B117B',
  buttonDisabledText: '#FFFFFF',
  timeBadge: '#F4F1FB',
  timeBadgeText: '#3A2C62',
};

const DAILY_DAYS = [0, 1, 2, 3, 4, 5, 6];

const formatTimeDisplay = (date) => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  } catch {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`;
  }
};

const to24HourString = (date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}:00`;
};

const PICKER_ANCHOR_DAY = new Date(2020, 6, 1, 12, 0, 0, 0); // Mid-summer to avoid DST edge

const readTimeParts = (raw) => {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return { hours: raw.getHours(), minutes: raw.getMinutes() };
  }

  if (typeof raw === 'string') {
    const match = raw.match(/^(\\d{1,2}):(\\d{2})/);
    if (match) {
      const hours = Math.min(23, Math.max(0, Number(match[1])));
      const minutes = Math.min(59, Math.max(0, Number(match[2])));
      return { hours, minutes };
    }
  }

  const now = new Date();
  return { hours: now.getHours(), minutes: now.getMinutes() };
};

const buildAnchoredTime = (value) => {
  const { hours, minutes } = readTimeParts(value);
  const anchor = new Date(PICKER_ANCHOR_DAY);
  anchor.setHours(hours, minutes, 0, 0);
  return anchor;
};

export default function ReminderScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  useOnboardingGuard(navigation);
  const { state, updateReminder, resetOnboarding } = useOnboarding();
  const checkinEnabled = state.reminder.checkinEnabled !== false;
  const hasAutoSavedRef = useRef(false);

  const [selectedTime, setSelectedTime] = useState(() => {
    return buildAnchoredTime(state.reminder.time ? new Date(state.reminder.time) : new Date());
  });
  const pickerMinDate = useMemo(() => {
    const d = new Date(PICKER_ANCHOR_DAY);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const pickerMaxDate = useMemo(() => {
    const d = new Date(PICKER_ANCHOR_DAY);
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);
  const [saving, setSaving] = useState(false);

  const formattedTime = useMemo(
    () => formatTimeDisplay(selectedTime),
    [selectedTime],
  );

  const handleTimeChange = useCallback(
    (_, date) => {
      if (!date) return;
      const next = buildAnchoredTime(date);
      setSelectedTime(next);
      updateReminder({ time: next });
    },
    [updateReminder],
  );

  const persistReminder = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw userError || new Error('Not signed in');

      const canonicalUserId = await getCanonicalUserId(user);
      const { profile, cycle, flowIntensity, periodHistory, additionalInfo } = state;

      const { data: existingUserRow, error: existingUserError } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .maybeSingle();
      if (existingUserError) {
        console.log('Existing user fetch error (non-blocking):', existingUserError);
      }
      const resolvedEmail = user.email ?? existingUserRow?.email ?? null;

      // Validate required onboarding inputs
      if (
        !profile.name ||
        !profile.birthdate ||
        !profile.weight ||
        profile.heightFeet === null ||
        profile.heightInches === null ||
        !cycle.lastPeriodDate ||
        !cycle.averageCycleLength ||
        !cycle.averagePeriodLength
      ) {
        throw new Error('Missing required onboarding details. Please go back and complete all fields.');
      }

      const toYMD = (d) => {
        if (!d) return null;
        const dateObj = d instanceof Date ? d : new Date(d);
        return dateObj.toISOString().split('T')[0];
      };

      const heightTotalInches = Number(profile.heightFeet) * 12 + Number(profile.heightInches);
      const birthdateYmd = toYMD(profile.birthdate);
      const lastPeriodYmd = toYMD(cycle.lastPeriodDate);

      // Build period payload (current + history)
      const periodPayload = [];
      const periodKeys = new Set();
      const addPeriod = (entry) => {
        if (!entry.start_date) return;
        const key = `${entry.user_id}-${entry.start_date}`;
        if (periodKeys.has(key)) return;
        periodKeys.add(key);
        periodPayload.push(entry);
      };
      if (lastPeriodYmd) {
        addPeriod({ user_id: canonicalUserId, start_date: lastPeriodYmd });
      }
      if (periodHistory?.length) {
        periodHistory.forEach((p) => {
          const start = toYMD(p.start);
          addPeriod({
            user_id: canonicalUserId,
            start_date: start,
            end_date: toYMD(p.end),
          });
        });
      }

      // Flow intensity entries (keep associated to auth id for existing consumers)
      const flowEntries =
        flowIntensity?.map((intensity, index) => ({
          user_id: user.id,
          day_number: index + 1,
          intensity,
        }))?.filter((entry) => entry.intensity !== null) ?? [];

      // Persist in one go
      const reminderTime = checkinEnabled ? to24HourString(selectedTime) : null;
      const reminderDays = checkinEnabled
        ? (() => {
            const rawDays = Array.isArray(state.reminder.days) ? state.reminder.days : DAILY_DAYS;
            const uniqueDays = Array.from(
              new Set(
                rawDays.filter(
                  (d) => Number.isInteger(d) && d >= 0 && d <= 6,
                ),
              ),
            );
            return uniqueDays.length ? uniqueDays : DAILY_DAYS;
          })()
        : [];

      // Avoid email uniqueness explosions: if another user owns this email, skip setting it here
      let emailForUpsert = resolvedEmail ?? existingUserRow?.email ?? null;
      if (emailForUpsert) {
        const { data: emailOwner } = await supabase
          .from('users')
          .select('id')
          .eq('email', emailForUpsert)
          .maybeSingle();
        if (emailOwner?.id && emailOwner.id !== user.id) {
          console.log('Skipping email upsert: email already used by another user');
          emailForUpsert = existingUserRow?.email ?? null;
        }
      }

      const userRow = {
        id: canonicalUserId,
        average_cycle_length: cycle.averageCycleLength,
        average_period_length: cycle.averagePeriodLength,
      };
      if (emailForUpsert) {
        userRow.email = emailForUpsert;
      }

      const writes = [
        supabase
          .from('users')
          .upsert([userRow], { onConflict: 'id' }),
        supabase
          .from('user_profiles')
          .upsert(
            [
              {
                user_id: user.id,
                name: profile.name.trim(),
                birthdate: birthdateYmd,
                height: heightTotalInches,
                weight: parseFloat(profile.weight),
                unit_system: profile.unitSystem || 'imperial',
                onboarding_completed: true,
              },
            ],
            { onConflict: 'user_id' },
          ),
        periodPayload.length
          ? supabase.from('periods').upsert(periodPayload, { onConflict: 'user_id,start_date' })
          : Promise.resolve({ error: null }),
        flowEntries.length
          ? supabase.from('flow_intensity_logs').insert(flowEntries)
          : Promise.resolve({ error: null }),
        supabase
          .from('onboarding_answers')
          .upsert(
            {
              user_id: canonicalUserId,
              unusual_bleeding: additionalInfo.unusualBleeding,
              fertile_window_intercourse: additionalInfo.fertileWindowIntercourse,
              other_conditions:
                additionalInfo.conditionsChoice === 'No'
                  ? 'none'
                  : additionalInfo.conditionsChoice === 'Prefer not to say'
                    ? 'prefer_not_to_say'
                    : (additionalInfo.conditionsText || '').trim(),
            },
            { onConflict: 'user_id' },
          ),
        supabase
          .from('reminder_settings')
          .upsert(
            [
              {
                user_id: user.id,
                reminder_time: reminderTime,
                reminder_days: reminderDays,
                checkin_enabled: checkinEnabled,
              },
            ],
            { onConflict: 'user_id' },
          ),
      ];

      const results = await Promise.all(writes);
      const failed = results.find((r) => r?.error);
      if (failed?.error) throw failed.error;

      const predictionResult = await updatePredictionsForUser(canonicalUserId, {
        includeUserIds: [user.id],
      });

      if (!predictionResult && lastPeriodYmd) {
        const lpDate = new Date(lastPeriodYmd);
        const next = new Date(lpDate);
        next.setDate(lpDate.getDate() + cycle.averageCycleLength);
        const ovu = new Date(next);
        ovu.setDate(next.getDate() - 14);
        await saveCyclePrediction(canonicalUserId, {
          predicted_period_date: toYMD(next),
          predicted_ovulation_date: toYMD(ovu),
          predicted_cycle_length: cycle.averageCycleLength,
          confidence_score: 0.5,
          prediction_method: 'onboarding_fallback',
        });
      }

      await scheduleDailyCheckins({
        enabled: checkinEnabled,
        time: checkinEnabled ? selectedTime : null,
        days: reminderDays,
      });

      resetOnboarding();
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (error) {
      console.log('Reminder save error:', error);
      Alert.alert(
        'Could not save reminder',
        error?.message || 'Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }, [navigation, saving, selectedTime]);

  // If user opted out of notifications, skip the time selection UI and persist immediately
  useEffect(() => {
    if (
      route?.params?.skipReminder &&
      checkinEnabled === false &&
      !saving &&
      !hasAutoSavedRef.current
    ) {
      hasAutoSavedRef.current = true;
      persistReminder();
    }
  }, [checkinEnabled, persistReminder, route?.params?.skipReminder, saving]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.heading}>What time works best?</Text>
          <Text style={styles.title}>Reminders</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Daily Check-ins</Text>
            <View style={styles.timeBadge}>
              <Text style={styles.timeBadgeText}>{formattedTime}</Text>
            </View>
          </View>

          <View style={styles.pickerWrapper}>
            {Platform.OS === 'ios' ? (
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                minuteInterval={1}
                minimumDate={pickerMinDate}
                maximumDate={pickerMaxDate}
                textColor={COLORS.textPrimary}
                is24Hour={false}
                style={styles.picker}
              />
            ) : (
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display="default"
                onChange={handleTimeChange}
                is24Hour
                minimumDate={pickerMinDate}
                maximumDate={pickerMaxDate}
                minuteInterval={1}
              />
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
          activeOpacity={0.85}
          onPress={persistReminder}
          disabled={saving}
        >
          <Text style={styles.primaryButtonText}>
            {saving ? 'Saving...' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    marginTop: 16,
    alignItems: 'center',
    gap: 6,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  card: {
    marginTop: 32,
    backgroundColor: COLORS.card,
    borderRadius: 28,
    paddingVertical: 24,
    paddingHorizontal: 20,
    shadowColor: '#B8A6E8',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  timeBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.timeBadge,
  },
  timeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.timeBadgeText,
  },
  pickerWrapper: {
    marginTop: 8,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#F7F3FF',
  },
  picker: {
    width: '100%',
  },
  primaryButton: {
    marginTop: 'auto',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.buttonDisabledText,
  },
});
