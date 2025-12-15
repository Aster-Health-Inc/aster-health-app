import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Pressable, ActivityIndicator, Alert, Animated, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { supabase } from '../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

const THUMB_SIZE = 28;

const SYMPTOM_ORDER = [
  'Cramps',
  'Backache',
  'Headache',
  'Tender Breasts',
  'Abdominal pain',
  'Fatigue',
  'Cravings',
  'Nausea',
  'Bloating',
];

const MOOD_ORDER = [
  'Calm',
  'Happy',
  'Cool',
  'Energetic',
  'Excited',
  'Grateful',
  'Content',
  'Fluctuating',
  'Moody',
];

const ENERGY_STOPS = [
  { label: 'Low', value: 1 },
  { label: '', value: 2 },
  { label: 'Medium', value: 3 },
  { label: '', value: 4 },
  { label: 'High', value: 5 },
];

const BatteryIcon = ({ width = 28, height = 12 }) => (
  <Svg width={width} height={height} viewBox="0 0 35 16" fill="none">
    <Path
      d="M6.24609 15.8555C4.25391 15.8555 2.56641 15.668 1.37109 14.4727C0.175781 13.2773 0 11.6133 0 9.60938V6.21094C0 4.25391 0.175781 2.57812 1.37109 1.38281C2.56641 0.1875 4.25391 0 6.22266 0H24.668C26.6719 0 28.3594 0.1875 29.5547 1.38281C30.75 2.57812 30.9258 4.24219 30.9258 6.24609V9.60938C30.9258 11.6133 30.75 13.2773 29.5547 14.4727C28.3594 15.668 26.6719 15.8555 24.668 15.8555H6.24609ZM5.92969 13.9688H24.9961C26.2031 13.9688 27.4688 13.8047 28.1719 13.1016C28.8867 12.3867 29.0391 11.1328 29.0391 9.92578V5.91797C29.0391 4.71094 28.8867 3.46875 28.1719 2.75391C27.4688 2.05078 26.2031 1.88672 24.9961 1.88672H5.96484C4.73438 1.88672 3.45703 2.03906 2.74219 2.75391C2.03906 3.46875 1.88672 4.72266 1.88672 5.95312V9.92578C1.88672 11.1328 2.03906 12.3867 2.74219 13.1016C3.45703 13.8047 4.72266 13.9688 5.92969 13.9688ZM5.30859 12.6094C4.51172 12.6094 4.03125 12.4922 3.70312 12.1641C3.375 11.8359 3.25781 11.3672 3.25781 10.5586V5.32031C3.25781 4.5 3.375 4.01953 3.70312 3.69141C4.01953 3.36328 4.5 3.24609 5.34375 3.24609H13.4062C14.2031 3.24609 14.6836 3.36328 15.0117 3.69141C15.3398 4.01953 15.4688 4.48828 15.4688 5.29688V10.5586C15.4688 11.3672 15.3398 11.8359 15.0117 12.1641C14.6836 12.4922 14.2148 12.6094 13.4062 12.6094H5.30859ZM32.5195 10.957V4.89844C33.4453 4.95703 34.6875 6.14062 34.6875 7.92188C34.6875 9.71484 33.4453 10.8984 32.5195 10.957Z"
      fill="#E6B366"
    />
  </Svg>
);

const groupedSymptoms = [
  {
    title: 'Period',
    items: ['Cramps', 'Backache', 'Abdominal pain', 'Tender Breasts', 'Fatigue', 'Cravings', 'Headache', 'Bloating'],
  },
  {
    title: 'Sexual Health',
    items: ['Unprotected Sex', 'Masturbation', 'Protected Sex', 'High Sex Drive', 'Neutral Sex Drive', 'Low Sex Drive'],
  },
  {
    title: 'Hormonal Fluctuations',
    items: ['Mood Swings', 'Acne', 'Vaginal Dryness', 'Dizziness', 'Breast Swelling', 'Cravings', 'Nausea', 'Bloating'],
  },
  {
    title: 'Sleep-related',
    items: ['Insomnia', 'Day Sleeping', 'Restless sleep', 'Vivid Dreams'],
  },
  {
    title: 'Digestive Symptoms',
    items: ['Constipation', 'Diarrhea', 'Nausea', 'Gassy', 'Increased appetite', 'Heartburn'],
  },
  {
    title: 'Respiratory',
    items: ['Cough', 'Cold', 'Sinus pressure', 'Breathing issues'],
  },
  {
    title: 'Cognitive',
    items: ['Brain fog', 'Trouble focusing', 'Forgetfulness'],
  },
  {
    title: 'Other',
    items: ['Travel fog', 'Heavy Exercize', 'Alcohol', 'Smoke', 'Injury', 'Disease', 'Medicine'],
  },
];

const groupedMoods = [
  {
    title: 'Positive/Neutral Moods',
    items: [
      'Calm',
      'Happy',
      'Fluctuating',
      'Energetic',
      'Excited',
      'Grateful',
      'Confident',
      'Focused',
      'Neutral',
      'Content',
      'Cool',
      'Optimistic',
    ],
  },
  {
    title: 'Negative Moods',
    items: [
      'Mood swings',
      'Overwhelmed',
      'Sensitive',
      'Apathetic',
      'Restless',
      'Confused',
      'Irritated',
      'Anxious',
      'Stressed',
      'Sad',
      'Depressed',
      'Self-critical',
      'Hopeless',
      'Insecure',
      'Jealous',
      'Angry',
      'Lonely',
      'Obsessive thoughts',
    ],
  },
];

const SymptomLogScreen = () => {
  const navigation = useNavigation();
  const slideAnim = useRef(new Animated.Value(120)).current;
  const [searchValue, setSearchValue] = useState('');
  const [symptomOptions, setSymptomOptions] = useState([]);
  const [moodOptions, setMoodOptions] = useState([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [selectedEnergyIndex, setSelectedEnergyIndex] = useState(2);
  const [notes, setNotes] = useState('');
  const [trackWidth, setTrackWidth] = useState(0);
  const [initializing, setInitializing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [moreVisible, setMoreVisible] = useState(false);
  const [moreMoodsVisible, setMoreMoodsVisible] = useState(false);

  const userIdRef = useRef(null);
  const dailyLogIdRef = useRef(null);

  const todayLabel = useMemo(() => {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const filteredSymptoms = useMemo(() => {
    const base =
      symptomOptions && symptomOptions.length
        ? symptomOptions
        : SYMPTOM_ORDER.map((name, idx) => ({ id: `sym-${idx}`, name }));
    if (!searchValue.trim()) return base;
    const query = searchValue.trim().toLowerCase();
    return base.filter((option) => option.name.toLowerCase().includes(query));
  }, [symptomOptions, searchValue]);

  const thumbCenter = trackWidth
    ? (selectedEnergyIndex / (ENERGY_STOPS.length - 1 || 1)) * trackWidth
    : 0;

  const loadInitialData = useCallback(async () => {
    try {
      setInitializing(true);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) {
        setInitializing(false);
        Alert.alert('Sign-in required', 'Please sign in to log your symptoms.');
        navigation.goBack();
        return;
      }

      userIdRef.current = user.id;
      const todayISO = new Date().toISOString().split('T')[0];

      const [symptomRes, moodRes, logRes] = await Promise.all([
        supabase
          .from('symptom_categories')
          .select('id, name')
          .in('name', SYMPTOM_ORDER)
          .eq('is_active', true),
        supabase
          .from('mood_categories')
          .select('id, name')
          .in('name', MOOD_ORDER)
          .eq('is_active', true),
        supabase
          .from('daily_logs')
          .select('id, notes, energy_level')
          .eq('user_id', user.id)
          .eq('date', todayISO)
          .maybeSingle(),
      ]);

      if (symptomRes.error) throw symptomRes.error;
      if (moodRes.error) throw moodRes.error;
      if (logRes.error) throw logRes.error;

      const symptomData = symptomRes.data ?? [];
      const moodData = moodRes.data ?? [];

      const orderedSymptoms = SYMPTOM_ORDER.map((name) =>
        symptomData.find((entry) => entry.name === name),
      ).filter(Boolean);
      const orderedMoods = MOOD_ORDER.map((name) =>
        moodData.find((entry) => entry.name === name),
      ).filter(Boolean);

      setSymptomOptions(orderedSymptoms.length ? orderedSymptoms : symptomData);
      setMoodOptions(orderedMoods.length ? orderedMoods : moodData);
      setSelectedSymptoms([]);
      setSelectedMoods([]);
      setSelectedEnergyIndex(1);
      setNotes('');

      const existingLog = logRes.data ?? null;
      dailyLogIdRef.current = existingLog?.id ?? null;

      if (existingLog) {
        setNotes(existingLog.notes ?? '');
        if (typeof existingLog.energy_level === 'number') {
          const energyIndex = ENERGY_STOPS.findIndex(
            (stop) => stop.value === existingLog.energy_level,
          );
          if (energyIndex >= 0) {
            setSelectedEnergyIndex(energyIndex);
          } else if (existingLog.energy_level <= 2) {
            setSelectedEnergyIndex(0);
          } else if (existingLog.energy_level >= 4) {
            setSelectedEnergyIndex(2);
          }
        }

        if (existingLog.id) {
          const [symptomSelRes, moodSelRes] = await Promise.all([
            supabase
              .from('user_symptoms')
              .select('symptom_id')
              .eq('daily_log_id', existingLog.id),
            supabase
              .from('user_moods')
              .select('mood_id')
              .eq('daily_log_id', existingLog.id),
          ]);

          if (symptomSelRes.error) throw symptomSelRes.error;
          if (moodSelRes.error) throw moodSelRes.error;

          const symptomIds = symptomSelRes.data?.map((row) => row.symptom_id) ?? [];
          const moodIds = moodSelRes.data?.map((row) => row.mood_id) ?? [];

          setSelectedSymptoms(
            orderedSymptoms.filter((option) => symptomIds.includes(option.id)),
          );
          setSelectedMoods(orderedMoods.filter((option) => moodIds.includes(option.id)));
        }
      }
    } catch (error) {
      console.error('SymptomLogScreen loadInitialData error', error);
      Alert.alert('Unable to load data', 'Please try again shortly.');
    } finally {
      setInitializing(false);
    }
  }, [navigation]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
    }).start();
  }, [slideAnim]);

  const toggleSymptom = useCallback((option) => {
    setSelectedSymptoms((prev) => {
      const exists = prev.some((item) => item.id === option.id);
      if (exists) return prev.filter((item) => item.id !== option.id);
      return [...prev, option];
    });
  }, []);

  const toggleMood = useCallback((option) => {
    setSelectedMoods((prev) => {
      const exists = prev.some((item) => item.id === option.id);
      if (exists) return prev.filter((item) => item.id !== option.id);
      return [...prev, option];
    });
  }, []);

  const handleTrackPress = (event) => {
    if (!trackWidth) return;
    const clickX = event.nativeEvent.locationX;
    const ratio = clickX / trackWidth;
    const index = Math.round(ratio * (ENERGY_STOPS.length - 1));
    setSelectedEnergyIndex(Math.max(0, Math.min(ENERGY_STOPS.length - 1, index)));
  };

  const handleSave = useCallback(async () => {
    if (!userIdRef.current || saving) return;
    try {
      setSaving(true);
      const userId = userIdRef.current;
      const todayISO = new Date().toISOString().split('T')[0];
      const energyValue = ENERGY_STOPS[selectedEnergyIndex]?.value ?? null;
      const sanitizedNotes = notes.trim().length ? notes.trim() : null;

      const { data: upsertedLog, error: upsertError } = await supabase
        .from('daily_logs')
        .upsert(
          {
            id: dailyLogIdRef.current ?? undefined,
            user_id: userId,
            date: todayISO,
            notes: sanitizedNotes,
            energy_level: energyValue,
          },
          { onConflict: 'user_id,date' },
        )
        .select()
        .single();

      if (upsertError) throw upsertError;

      const dailyLogId = upsertedLog.id;
      dailyLogIdRef.current = dailyLogId;

      const { error: deleteSymptomsError } = await supabase
        .from('user_symptoms')
        .delete()
        .eq('daily_log_id', dailyLogId);
      if (deleteSymptomsError) throw deleteSymptomsError;

      if (selectedSymptoms.length) {
        const symptomPayload = selectedSymptoms.map((option) => ({
          user_id: userId,
          daily_log_id: dailyLogId,
          symptom_id: option.id,
        }));
        const { error: insertSymptomsError } = await supabase
          .from('user_symptoms')
          .insert(symptomPayload);
        if (insertSymptomsError) throw insertSymptomsError;
      }

      const { error: deleteMoodsError } = await supabase
        .from('user_moods')
        .delete()
        .eq('daily_log_id', dailyLogId);
      if (deleteMoodsError) throw deleteMoodsError;

      if (selectedMoods.length) {
        const moodPayload = selectedMoods.map((option) => ({
          user_id: userId,
          daily_log_id: dailyLogId,
          mood_id: option.id,
          intensity: 3,
        }));
        const { error: insertMoodsError } = await supabase
          .from('user_moods')
          .insert(moodPayload);
        if (insertMoodsError) throw insertMoodsError;
      }

      navigation.goBack();
    } catch (error) {
      console.error('SymptomLogScreen handleSave error', error);
      Alert.alert('Unable to save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  }, [navigation, notes, selectedEnergyIndex, selectedMoods, selectedSymptoms, saving]);

  const handleClose = () => navigation.goBack();
  const handleMoreClose = () => setMoreVisible(false);
  const handleMoodMoreClose = () => setMoreMoodsVisible(false);

  if (initializing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4B117B" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <Animated.View style={[styles.overlay, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.handle} />
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.circleButton} onPress={handleClose}>
              <Ionicons name="close" size={22} color="#8A8A91" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{todayLabel}</Text>
            <TouchableOpacity
              style={[styles.circleButton, styles.primaryButton, saving && styles.circleButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrapper}>
            <Ionicons name="search" size={18} color="#B0AAB8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              placeholderTextColor="#B0AAB8"
              value={searchValue}
              onChangeText={setSearchValue}
            />
            <Ionicons name="mic-outline" size={18} color="#B0AAB8" />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Symptoms</Text>
              {filteredSymptoms.length ? (
                <View style={styles.chipGrid}>
                  {filteredSymptoms.map((option) => {
                    const isSelected = selectedSymptoms.some((item) => item.id === option.id);
                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={[styles.chip, isSelected && styles.chipSelected]}
                        onPress={() => toggleSymptom(option)}
                      >
                        <View style={[styles.chipDot, isSelected && styles.chipDotSelected]} />
                        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                          {option.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity style={styles.chip} onPress={() => setMoreVisible(true)}>
                    <Ionicons name="add" size={16} color="#444" />
                    <Text style={styles.chipText}>More</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.emptyStateText}>No symptoms match your search.</Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Moods</Text>
              {moodOptions.length ? (
                <View style={styles.chipGrid}>
                  {moodOptions.map((option) => {
                    const isSelected = selectedMoods.some((item) => item.id === option.id);
                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={[styles.chip, styles.moodChip, isSelected && styles.chipSelected]}
                        onPress={() => toggleMood(option)}
                      >
                        <View style={[styles.chipDot, styles.moodDot, isSelected && styles.chipDotSelected]} />
                        <Text
                          style={[
                            styles.chipText,
                            styles.moodText,
                            isSelected && styles.chipTextSelected,
                          ]}
                        >
                          {option.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity style={[styles.chip, styles.moodChip]} onPress={() => setMoreMoodsVisible(true)}>
                    <Ionicons name="add" size={16} color="#444" />
                    <Text style={[styles.chipText, styles.moodText]}>More</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.emptyStateText}>No moods available.</Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Energy Level</Text>
              <View style={styles.energyLabels}>
                {ENERGY_STOPS.map((stop, index) => (
                  <Text
                    key={`label-${index}`}
                    style={[
                      styles.energyLabel,
                      index === selectedEnergyIndex && styles.energyLabelActive,
                    ]}
                  >
                    {stop.label}
                  </Text>
                ))}
              </View>
              <Pressable
                style={styles.energyTrackWrapper}
                onPress={handleTrackPress}
                onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
              >
                <View style={styles.energyTrackBackground} />
                <View style={[styles.energyFill, { width: thumbCenter }]} />
                {ENERGY_STOPS.map((stop, index) => {
                  const isActive = index <= selectedEnergyIndex;
                  const position = trackWidth
                    ? (index / (ENERGY_STOPS.length - 1 || 1)) * trackWidth
                    : 0;
                  return (
                    <View
                      key={`tick-${index}`}
                      style={[
                        styles.energyTick,
                        { left: Math.max(0, position - 2) },
                        isActive && styles.energyTickActive,
                      ]}
                    />
                  );
                })}
                <View
                  style={[
                    styles.energyThumb,
                    { left: Math.max(0, thumbCenter - THUMB_SIZE / 2) },
                  ]}
                >
                  <BatteryIcon />
                </View>
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Notes</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Notes"
                placeholderTextColor="#B0AAB8"
                multiline
                value={notes}
                onChangeText={setNotes}
              />
            </View>
          </ScrollView>
        </View>
      </Animated.View>

      <Modal
        visible={moreVisible}
        transparent
        animationType="fade"
        onRequestClose={handleMoreClose}
      >
        <Pressable style={styles.modalBackdrop} onPress={handleMoreClose}>
          <View style={styles.moreSheet}>
            <View style={styles.moreHeader}>
              <Text style={styles.moreTitle}>More Symptoms</Text>
              <TouchableOpacity onPress={handleMoreClose}>
                <Ionicons name="close" size={20} color="#4B4B4B" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.moreContent} showsVerticalScrollIndicator={false}>
              {groupedSymptoms.map((group) => (
                <View key={group.title} style={styles.moreSection}>
                  <Text style={styles.moreSectionTitle}>{group.title}</Text>
                  <View style={styles.chipGrid}>
                    {group.items.map((name) => {
                      const option =
                        symptomOptions.find((o) => o.name === name) ||
                        { id: `local-${name}`, name };
                      const isSelected = selectedSymptoms.some((item) => item.id === option.id);
                      return (
                        <TouchableOpacity
                          key={option.id}
                          style={[styles.chip, isSelected && styles.chipSelected]}
                          onPress={() => toggleSymptom(option)}
                        >
                          <View style={[styles.chipDot, isSelected && styles.chipDotSelected]} />
                          <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                            {option.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={moreMoodsVisible}
        transparent
        animationType="fade"
        onRequestClose={handleMoodMoreClose}
      >
        <Pressable style={styles.modalBackdrop} onPress={handleMoodMoreClose}>
          <View style={styles.moreSheet}>
            <View style={styles.moreHeader}>
              <Text style={styles.moreTitle}>More Moods</Text>
              <TouchableOpacity onPress={handleMoodMoreClose}>
                <Ionicons name="close" size={20} color="#4B4B4B" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.moreContent} showsVerticalScrollIndicator={false}>
              {groupedMoods.map((group) => (
                <View key={group.title} style={styles.moreSection}>
                  <Text style={styles.moreSectionTitle}>{group.title}</Text>
                  <View style={styles.chipGrid}>
                    {group.items.map((name) => {
                      const option = moodOptions.find((o) => o.name === name) || { id: `local-${name}`, name };
                      const isSelected = selectedMoods.some((item) => item.id === option.id);
                      return (
                        <TouchableOpacity
                          key={option.id}
                          style={[styles.chip, styles.moodChip, isSelected && styles.chipSelected]}
                          onPress={() => toggleMood(option)}
                        >
                          <View style={[styles.chipDot, styles.moodDot, isSelected && styles.chipDotSelected]} />
                          <Text
                            style={[
                              styles.chipText,
                              styles.moodText,
                              isSelected && styles.chipTextSelected,
                            ]}
                          >
                            {option.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

export default SymptomLogScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)' },
  overlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 60,
    bottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 52,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C9C6D3',
    marginBottom: 10,
  },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1F1F1F' },
  circleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#B9AFD6',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  primaryButton: { backgroundColor: '#4B117B', shadowColor: '#4B117B', shadowOpacity: 0.25 },
  circleButtonDisabled: { opacity: 0.6 },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    height: 44,
    gap: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2DEEC',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1F1F1F' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 60, gap: 14 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    shadowColor: '#C4B9DF',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  sectionLabel: { fontSize: 16, fontWeight: '700', color: '#1F1F1F', marginBottom: 14 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, rowGap: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#F9F7FB',
    borderWidth: 1,
    borderColor: '#EBE6F2',
    gap: 8,
    minHeight: 38,
  },
  chipSelected: { backgroundColor: '#EDE3FF', borderColor: '#CBB6F6' },
  chipDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#F1D9E4' },
  chipDotSelected: { backgroundColor: '#CBB6F6' },
  chipText: { fontSize: 13, fontWeight: '700', color: '#4B4B4B' },
  chipTextSelected: { color: '#2D1B4E' },
  moodChip: { backgroundColor: '#F6F4FB', borderColor: '#EBE6F2' },
  moodDot: { backgroundColor: '#D9D1F0' },
  moodText: { color: '#3A3A3A' },
  emptyStateText: { fontSize: 13, color: '#A094BB' },
  energyLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 6 },
  energyLabel: { fontSize: 13, color: '#A59BC1' },
  energyLabelActive: { color: '#4B117B' },
  energyTrackWrapper: { marginTop: 8, height: 36, justifyContent: 'center' },
  energyTrackBackground: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 999 },
  energyFill: { position: 'absolute', left: 0, height: 6, backgroundColor: '#E6B366', borderRadius: 999 },
  energyTick: { position: 'absolute', bottom: -2, width: 4, height: 4, borderRadius: 2, backgroundColor: '#CFCFD3', opacity: 0.9 },
  energyTickActive: { backgroundColor: '#E6B366', opacity: 1 },
  energyThumb: {
    position: 'absolute',
    width: THUMB_SIZE + 6,
    height: THUMB_SIZE + 6,
    borderRadius: (THUMB_SIZE + 6) / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E6B366',
    shadowColor: '#E6B366',
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesInput: {
    marginTop: 8,
    minHeight: 80,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    fontSize: 14,
    color: '#3A1F78',
    borderWidth: 1,
    borderColor: '#E2DEEC',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
  },
  moreSheet: {
    maxHeight: '75%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  moreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  moreTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F1F1F',
  },
  moreContent: {
    paddingBottom: 12,
    gap: 14,
  },
  moreSection: {
    backgroundColor: '#F9F7FB',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EAE6F1',
  },
  moreSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D2D2D',
    marginBottom: 10,
  },
});
