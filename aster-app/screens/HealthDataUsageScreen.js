import React, { useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { healthKitAvailable, requestHealthPermissions } from '../lib/healthkit';

const BACKGROUND = '#EEE7FF';
const SURFACE = '#FFFFFF';
const ACCENT = '#4B117B';
const MUTED = '#6C5A8A';

const HEALTH_PERMISSION_ITEMS = [
  {
    key: 'steps',
    identifier: 'HKQuantityTypeIdentifierStepCount',
    read: true,
    write: false,
  },
  {
    key: 'calories',
    identifier: 'HKQuantityTypeIdentifierActiveEnergyBurned',
    read: true,
    write: false,
  },
  {
    key: 'heartRate',
    identifier: 'HKQuantityTypeIdentifierHeartRate',
    read: true,
    write: false,
  },
];

const HealthDataUsageScreen = () => {
  const navigation = useNavigation();
  const [requesting, setRequesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [showSettingsLink, setShowSettingsLink] = useState(false);

  const openSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (err) {
      console.log('Open settings failed', err);
    }
  };

  const requestAccess = async () => {
    if (Platform.OS !== 'ios') {
      setStatusMessage('Apple Health is only available on iOS devices.');
      return;
    }

    if (!healthKitAvailable) {
      setStatusMessage('Apple Health is not available in this build.');
      return;
    }

    setRequesting(true);
    try {
      const response = await requestHealthPermissions(HEALTH_PERMISSION_ITEMS);
      if (response?.ok) {
        setStatusMessage('Apple Health access granted. You can adjust access in Settings anytime.');
        setShowSettingsLink(true);
      } else {
        const reason = response?.reason || 'Apple Health access was not granted.';
        setStatusMessage(reason);
        setShowSettingsLink(true);
      }
    } catch (err) {
      setStatusMessage('Unable to request Apple Health access right now.');
      setShowSettingsLink(true);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={22} color={ACCENT} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Health Data Usage</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.title}>Health Data Usage</Text>
            <Text style={styles.body}>
              Aster Health uses Apple Health to read activity, cycle, and wellness data to provide
              personalized insights and predictions. Your data is stored securely and never shared
              without your consent.
            </Text>
            <Text style={styles.body}>
              You can manage Apple Health permissions at any time in iOS Settings.
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, requesting && styles.primaryButtonDisabled]}
              activeOpacity={0.9}
              onPress={requestAccess}
              disabled={requesting}
            >
              <Ionicons name="shield-checkmark-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>
                {requesting ? 'Requesting...' : 'Request Apple Health Access'}
              </Text>
            </TouchableOpacity>
            {showSettingsLink ? (
              <TouchableOpacity
                style={styles.secondaryButton}
                activeOpacity={0.9}
                onPress={openSettings}
              >
                <Ionicons name="settings-outline" size={18} color={ACCENT} />
                <Text style={styles.secondaryButtonText}>Open Settings</Text>
              </TouchableOpacity>
            ) : null}
            {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default HealthDataUsageScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2DAF1',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3A1F78',
  },
  headerSpacer: {
    width: 34,
  },
  scrollContent: {
    paddingTop: 18,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#C4B9DF',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D1B57',
    marginBottom: 10,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
    marginBottom: 12,
  },
  primaryButton: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    paddingVertical: 12,
    borderRadius: 14,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F1ECFF',
    paddingVertical: 10,
    borderRadius: 14,
  },
  secondaryButtonText: {
    color: ACCENT,
    fontWeight: '700',
  },
  statusText: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    color: MUTED,
    textAlign: 'center',
  },
});
