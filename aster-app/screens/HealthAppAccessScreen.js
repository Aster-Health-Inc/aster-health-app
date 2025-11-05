import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { requestHealthPermissions } from '../lib/healthkit';
import { syncHealthMetricsToSupabase } from '../lib/healthkitSync';
import { log, warn, error } from '../utils/CrashLogger';
import { ensureUserRecord } from '../utils/authUser';
import { supabase } from '../lib/supabase';
import { useOnboardingGuard } from '../utils/useOnboardingGuard';

const COLORS = {
  lavender: '#EDE5F7',
  card: '#FFFFFF',
  textPrimary: '#1F103B',
  textSecondary: '#6C5A8A',
  accent: '#4B117B',
  pill: '#EFE7FB',
  switchTrack: '#D6C6F0',
  switchThumb: '#FFFFFF',
  toggleIconBg: '#E8DFFF',
  toggleIconBorder: '#D6C6F0',
  divider: '#EFE7FB',
  skipBorder: '#E0D5F4',
  banner: '#8B2F1F',
};

const HEALTH_ITEMS = [
  {
    key: 'steps',
    label: 'Steps',
    identifier: 'HKQuantityTypeIdentifierStepCount',
    read: true,
    write: false,
  },
  {
    key: 'calories',
    label: 'Active Calories',
    identifier: 'HKQuantityTypeIdentifierActiveEnergyBurned',
    read: true,
    write: false,
  },
  {
    key: 'heartRate',
    label: 'Heart Rate',
    identifier: 'HKQuantityTypeIdentifierHeartRate',
    read: true,
    write: false,
  },
];

const SAFE_APPLE_HEALTH_ERROR =
  'We could not connect to Apple Health right now. You can enable this later from Settings.';

const HealthAppAccessScreen = () => {
  const navigation = useNavigation();
  const items = useMemo(() => HEALTH_ITEMS, []);
  const isMountedRef = useRef(true);

  const [enabled, setEnabled] = useState(() =>
    items.reduce((acc, cur) => ({ ...acc, [cur.key]: true }), {}),
  );
  const [banner, setBanner] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [authUser, setAuthUser] = useState(null);

  useOnboardingGuard(navigation);

  const allOn = useMemo(() => Object.values(enabled).every(Boolean), [enabled]);

  const updateAll = (value) => {
    setEnabled(() => items.reduce((acc, item) => ({ ...acc, [item.key]: value }), {}));
  };

  const toggleItem = (key, explicitValue) => {
    setEnabled((prev) => ({
      ...prev,
      [key]: explicitValue ?? !prev[key],
    }));
  };

  const requestPermissionsFor = async (selectedItems) => {
    if (Platform.OS !== 'ios') {
      if (isMountedRef.current) {
        setBanner('Apple Health is only available on iOS. We will skip this step on your device.');
      }
      return { ok: false };
    }

    if (!selectedItems.length) {
      if (isMountedRef.current) {
        setBanner('Choose at least one data type to continue.');
      }
      return { ok: false };
    }

    if (isMountedRef.current) {
      setRequesting(true);
    }

    try {
      const response = await requestHealthPermissions(selectedItems);
      if (!response?.ok) {
        const reason =
          response?.reason ||
          'Health permissions not granted. You can enable them later in Settings.';
        if (isMountedRef.current) {
          setBanner(reason);
        }
        warn('Health permissions not granted', { reason });
      } else if (isMountedRef.current) {
        setBanner(null);
      }
      return response;
    } catch (err) {
      const message = SAFE_APPLE_HEALTH_ERROR;
      error('Health permission request failed', { error: String(err) });
      if (isMountedRef.current) {
        setBanner(message);
      }
      return { ok: false, reason: message };
    } finally {
      if (isMountedRef.current) {
        setRequesting(false);
      }
    }
  };

  const syncMetrics = async (userId) => {
    if (!userId) return;

    try {
      if (isMountedRef.current) {
        setSyncing(true);
      }
      await syncHealthMetricsToSupabase(userId);
      if (isMountedRef.current) {
        setBanner(null);
      }
    } catch (err) {
      const message =
        (err && typeof err === 'object' && (err.message || err.reason)) ||
        (typeof err === 'string' ? err : 'Unknown error');
      error('Health metrics sync failed', {
        message,
        code: err && typeof err === 'object' ? err.code : undefined,
        details: err && typeof err === 'object' ? err.details : undefined,
      });
      if (isMountedRef.current) {
        setBanner('We could not sync your latest health data. You can retry from Settings.');
      }
    } finally {
      if (isMountedRef.current) {
        setSyncing(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    const bootstrap = async () => {
      let resolvedUser = null;

      try {
        const {
          data: { user: fetchedUser },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !fetchedUser?.id) {
          warn('Health access screen missing user', { userError });
          return;
        }

        await ensureUserRecord(fetchedUser);
        resolvedUser = fetchedUser;
        if (isMountedRef.current) {
          setAuthUser(fetchedUser);
        }
      } catch (err) {
        warn('ensureUserRecord from health access failed', { err: String(err) });
      }

      if (!resolvedUser?.id) return;

      const response = await requestPermissionsFor(items);
      if (response?.ok) {
        await syncMetrics(resolvedUser.id);
      }
    };

    bootstrap();
    return () => {
      isMountedRef.current = false;
    };
  }, [items]);

  const handleContinue = async () => {
    const selectedItems = items.filter((item) => enabled[item.key]);
    const response = await requestPermissionsFor(selectedItems);
    log('Health access continue pressed', {
      selected: selectedItems.map((item) => item.identifier),
      ok: response?.ok,
    });

    if (response?.ok) {
      await syncMetrics(authUser?.id);
    }

    navigation.navigate('ReminderSetup');
  };

  const handleSkip = () => {
    navigation.navigate('ReminderSetup');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Health Access</Text>
            <View style={styles.heartWrapper}>
              <View style={styles.heartBadge}>
                <Image
                  source={require('../assets/apple-health.png')}
                  style={styles.heartIcon}
                  resizeMode="contain"
                />
              </View>
            </View>
            <Text style={styles.cardSubtitle}>
              "Aster" would like to access and update your health data.
            </Text>

            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={styles.toggleRowLeft}
                activeOpacity={0.85}
                onPress={() => updateAll(!allOn)}
              >
                <Ionicons name="flash-outline" size={18} color={COLORS.accent} />
                <Text style={styles.toggleRowText}>Turn on All</Text>
              </TouchableOpacity>
              <View style={styles.switchWrapper}>
                <Switch
                  value={allOn}
                  onValueChange={updateAll}
                  thumbColor={COLORS.switchThumb}
                  trackColor={{ true: COLORS.accent, false: COLORS.switchTrack }}
                  ios_backgroundColor={COLORS.switchTrack}
                  style={styles.switch}
                />
              </View>
            </View>

            <View style={styles.divider} />

            {items.map((item) => {
              const value = enabled[item.key];
              return (
                <TouchableOpacity
                  key={item.key}
                  style={styles.listRow}
                  activeOpacity={0.85}
                  onPress={() => toggleItem(item.key)}
                >
                  <View style={styles.listRowLeft}>
                    <View style={styles.listIcon}>
                      <Ionicons name="document-text-outline" size={16} color={COLORS.accent} />
                    </View>
                    <Text style={styles.listLabel}>{item.label}</Text>
                  </View>
                  <View style={styles.switchWrapper}>
                    <Switch
                      value={value}
                      onValueChange={(next) => toggleItem(item.key, next)}
                      thumbColor={COLORS.switchThumb}
                      trackColor={{ true: COLORS.accent, false: COLORS.switchTrack }}
                      ios_backgroundColor={COLORS.switchTrack}
                      style={styles.switch}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                (requesting || syncing) && styles.primaryButtonDisabled,
              ]}
              activeOpacity={0.9}
              onPress={handleContinue}
              disabled={requesting || syncing}
            >
              <Text style={styles.primaryButtonText}>
                {requesting ? 'Requesting�' : syncing ? 'Syncing�' : 'Continue'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkip} activeOpacity={0.85}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>

          {banner ? <Text style={styles.banner}>{banner}</Text> : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.lavender,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 32,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 18 },
    shadowRadius: 32,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  heartWrapper: {
    alignItems: 'center',
    marginTop: 18,
  },
  heartBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartIcon: {
    width: 36,
    height: 36,
  },
  cardSubtitle: {
    marginTop: 18,
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  toggleRow: {
    marginTop: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  toggleRowText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accent,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 22,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  listRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  listIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: COLORS.toggleIconBg,
    borderWidth: 1,
    borderColor: COLORS.toggleIconBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listLabel: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  switchWrapper: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switch: {
    transform: [{ scaleX: 0.84 }, { scaleY: 0.84 }],
  },
  primaryButton: {
    marginTop: 28,
    backgroundColor: COLORS.accent,
    borderRadius: 26,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  skipButton: {
    marginTop: 16,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: COLORS.skipBorder,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.accent,
  },
  banner: {
    marginTop: 16,
    textAlign: 'center',
    color: COLORS.banner,
    fontSize: 12,
    lineHeight: 16,
  },
});

export default HealthAppAccessScreen;
