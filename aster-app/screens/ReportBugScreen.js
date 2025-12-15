import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKGROUND = '#EEE7FF';
const SURFACE = '#FFFFFF';

const AREAS = [
  'Home',
  'Cycle',
  'Food',
  'Workout',
  'Chatbot',
  'Settings',
  'Other',
];

const ReportBugScreen = () => {
  const navigation = useNavigation();
  const [description, setDescription] = useState('');
  const [area, setArea] = useState(null);
  const [otherText, setOtherText] = useState('');
  const [screenshotNote, setScreenshotNote] = useState('');

  const renderAreaPill = (label) => {
    const selected = area === label;
    return (
      <TouchableOpacity
        key={label}
        style={[styles.areaPill, selected && styles.areaPillSelected]}
        activeOpacity={0.9}
        onPress={() => setArea(label)}
      >
        <Text style={[styles.areaPillText, selected && styles.areaPillTextSelected]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.closeButton} activeOpacity={0.85} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={22} color="#3F2560" />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Report Bug</Text>
          <Text style={styles.subtitle}>
            Oops! Something&apos;s acting up? Help us improve the app by reporting it! 🚨
          </Text>

          <View style={styles.inputCard}>
            <Text style={styles.label}>What happened?</Text>
            <TextInput
              style={styles.textArea}
              multiline
              placeholder="Tell us what happened..."
              placeholderTextColor="#9C92B2"
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Where did it happen?</Text>
            <View style={styles.areaGrid}>
              {AREAS.map((label) => renderAreaPill(label))}
            </View>
            {area === 'Other' && (
              <TextInput
                style={styles.otherInput}
                placeholder="Type here..."
                placeholderTextColor="#9C92B2"
                value={otherText}
                onChangeText={setOtherText}
              />
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Have a screenshot? (Optional)</Text>
            <View style={styles.uploadRow}>
              <TextInput
                style={styles.uploadInput}
                placeholder="Upload here"
                placeholderTextColor="#9C92B2"
                value={screenshotNote}
                onChangeText={setScreenshotNote}
              />
              <Ionicons name="camera-outline" size={22} color="#5B4A7A" />
            </View>
          </View>

          <TouchableOpacity style={styles.primaryButton} activeOpacity={0.9}>
            <Text style={styles.primaryButtonText}>Send it over!</Text>
          </TouchableOpacity>

          <View style={styles.supportBlock}>
            <Text style={styles.supportText}>Have questions?</Text>
            <Text style={styles.supportText}>Need help?</Text>
            <Text style={styles.supportText}>Contact us.</Text>
          </View>

          <TouchableOpacity style={styles.supportButton} activeOpacity={0.9}>
            <Ionicons name="mail-outline" size={20} color="#4B117B" />
            <Text style={styles.supportButtonText}>Support</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default ReportBugScreen;

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
    color: '#2E2148',
  },
  subtitle: {
    fontSize: 13,
    color: '#4F4267',
    lineHeight: 18,
  },
  inputCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 12,
    shadowColor: '#B8A6E8',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3A2C55',
    marginBottom: 6,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#2E2148',
  },
  section: {
    gap: 8,
  },
  areaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  areaPill: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#E5DCF8',
  },
  areaPillSelected: {
    backgroundColor: '#D0C1FF',
  },
  areaPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B3A6C',
  },
  areaPillTextSelected: {
    color: '#2E2148',
  },
  otherInput: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#2E2148',
    shadowColor: '#B8A6E8',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: SURFACE,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#B8A6E8',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  uploadInput: {
    flex: 1,
    fontSize: 13,
    color: '#2E2148',
  },
  primaryButton: {
    backgroundColor: '#D3C3FF',
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E2148',
  },
  supportBlock: {
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  supportText: {
    fontSize: 12,
    color: '#433760',
  },
  supportButton: {
    marginTop: 12,
    backgroundColor: '#D8C9FF',
    borderRadius: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  supportButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E2148',
  },
});
