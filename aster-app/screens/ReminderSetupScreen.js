import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';

import { useOnboardingGuard } from '../utils/useOnboardingGuard';

const COLORS = {
  background: '#EDE5F7',
  textPrimary: '#1F103B',
  textSecondary: '#5C4E7B',
  accent: '#4B117B',
  skip: '#1F103B',
  buttonText: '#FFFFFF',
};

const COPY = Object.freeze({
  heading: 'Tell me about your period!',
  title: 'Notifications',
  bodyLines: [
    'Want us to gently nudge you when it’s time to log how you feel, track symptoms or just vibe-check your hormones?',
    'It’s like having a supportive bestie who actually knows your body.',
  ],
});

export default function ReminderSetupScreen() {
  const navigation = useNavigation();
  const [requesting, setRequesting] = useState(false);

  useOnboardingGuard(navigation);

  const proceedToReminder = useCallback(() => {
    navigation.navigate('Reminder');
  }, [navigation]);

  const requestPermissions = useCallback(async () => {
    if (requesting) return;
    setRequesting(true);

    try {
      const existing = await Notifications.getPermissionsAsync();
      if (existing.status === 'granted') {
        proceedToReminder();
        return;
      }

      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Notifications not enabled',
          'You can turn them on later from Settings.',
        );
      }
      proceedToReminder();
    } catch (error) {
      console.log('Notification permission error:', error);
      Alert.alert('Error', 'We could not request notification permissions.');
      proceedToReminder();
    } finally {
      setRequesting(false);
    }
  }, [proceedToReminder, requesting]);

  const body = useMemo(
    () => COPY.bodyLines.join('\n\n'),
    [],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.heading}>{COPY.heading}</Text>
          <Text style={styles.title}>{COPY.title}</Text>
          <Text style={styles.body}>{body}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryButton, requesting && styles.primaryButtonDisabled]}
            activeOpacity={0.9}
            onPress={requestPermissions}
            disabled={requesting}
          >
            <Text style={styles.primaryButtonText}>
              {requesting ? 'Requesting…' : 'Allow Notifications'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.skipButton}
            activeOpacity={0.85}
            onPress={proceedToReminder}
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: 32,
    paddingTop: 64,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  content: {
    alignItems: 'center',
    gap: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  body: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    color: COLORS.textSecondary,
  },
  actions: {
    alignItems: 'center',
    gap: 18,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4B117B',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.75,
  },
  primaryButtonText: {
    color: COLORS.buttonText,
    fontSize: 16,
    fontWeight: '700',
  },
  skipButton: {
    paddingVertical: 6,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.skip,
  },
});
