import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKGROUND = '#EEE7FF';
const SURFACE = '#FFFFFF';
const ACCENT = '#4B117B';
const MUTED = '#6C5A8A';

const HealthDataUsageScreen = () => {
  const navigation = useNavigation();

  const openSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (err) {
      console.log('Open settings failed', err);
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
            <TouchableOpacity style={styles.primaryButton} activeOpacity={0.9} onPress={openSettings}>
              <Ionicons name="settings-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Open Settings</Text>
            </TouchableOpacity>
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
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
