import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

const BACKGROUND = '#EEE7FF';
const SURFACE = '#FFFFFF';

const DEFAULT_PREFS = [
  { key: 'reminders', label: 'Reminders', enabled: true },
  { key: 'cycle', label: 'Cycle Updates', enabled: false },
  { key: 'insights', label: 'Health Insights', enabled: false },
  { key: 'streaks', label: 'Streaks and Goals', enabled: false },
  { key: 'suggestions', label: 'Suggestions', enabled: false },
  { key: 'checkins', label: 'Check Ins', enabled: false },
];

const NotificationsScreen = () => {
  const navigation = useNavigation();
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);

  const togglePref = (key) => {
    setPrefs((current) =>
      current.map((item) => (item.key === key ? { ...item, enabled: !item.enabled } : item)),
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.closeButton}
              activeOpacity={0.85}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="close" size={22} color="#3F2560" />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Notifications</Text>

          <View style={styles.list}>
            {prefs.map((pref) => (
              <TouchableOpacity
                key={pref.key}
                style={styles.item}
                activeOpacity={0.9}
                onPress={() => togglePref(pref.key)}
              >
                <Text style={styles.itemLabel}>{pref.label}</Text>
                <View style={[styles.switchTrack, pref.enabled && styles.switchTrackOn]}>
                  <View style={[styles.switchThumb, pref.enabled && styles.switchThumbOn]} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default NotificationsScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 40,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B8A6E8',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F1635',
    marginTop: 4,
  },
  list: {
    gap: 12,
    marginTop: 4,
  },
  item: {
    backgroundColor: SURFACE,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#B8A6E8',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E2148',
  },
  switchTrack: {
    width: 56,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#DFD9EB',
    padding: 3,
    justifyContent: 'center',
  },
  switchTrackOn: {
    backgroundColor: '#4B117B',
    alignItems: 'flex-end',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#B8A6E8',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  switchThumbOn: {
    backgroundColor: '#FFFFFF',
  },
});
