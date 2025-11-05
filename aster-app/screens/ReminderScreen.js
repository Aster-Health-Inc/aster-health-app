import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { supabase } from '../lib/supabase';
import { useOnboardingGuard } from '../utils/useOnboardingGuard';

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

export default function ReminderScreen() {
  const navigation = useNavigation();
  useOnboardingGuard(navigation);

  const [selectedTime, setSelectedTime] = useState(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    return now;
  });
  const [saving, setSaving] = useState(false);

  const formattedTime = useMemo(
    () => formatTimeDisplay(selectedTime),
    [selectedTime],
  );

  const handleTimeChange = useCallback(
    (_, date) => {
      if (!date) return;
      const next = new Date(date);
      next.setSeconds(0, 0);
      setSelectedTime(next);
    },
    [],
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

      const reminderTime = to24HourString(selectedTime);
      const { error: upsertError } = await supabase
        .from('reminder_settings')
        .upsert(
          [
            {
              user_id: user.id,
              reminder_time: reminderTime,
              reminder_days: DAILY_DAYS,
              checkin_enabled: true,
            },
          ],
          { onConflict: 'user_id' },
        );

      if (upsertError) {
        throw upsertError;
      }

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ onboarding_completed: true })
        .eq('user_id', user.id);

      if (updateError) {
        throw updateError;
      }

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
                textColor={COLORS.textPrimary}
                style={styles.picker}
              />
            ) : (
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display="default"
                onChange={handleTimeChange}
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
