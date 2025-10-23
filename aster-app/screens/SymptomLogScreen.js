import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  Animated,
  PanResponder,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { supabase } from '../lib/supabase';

const SYMPTOM_ORDER = [
  'Cramps',
  'Backache',
  'Headache',
  'Tender Breasts',
  'Abdominal pain',
  'Fatigue',
  'Cravings',
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
];

const ENERGY_STOPS = [
  { label: 'Low', value: 1 },
  { label: 'Medium', value: 3 },
  { label: 'High', value: 5 },
];

const PERIOD_FLOW_OPTIONS = [
  { key: 'none', label: 'None', icon: 'water-off-outline', tint: '#F9D7E4', value: 0 },
  { key: 'light', label: 'Light', icon: 'water-outline', tint: '#F9A1BE', value: 1 },
  { key: 'medium', label: 'Medium', icon: 'water-outline', tint: '#F16E9A', value: 2 },
  { key: 'heavy', label: 'Heavy', icon: 'water', tint: '#D13F6C', value: 3 },
];

const FLOW_VALUE_TO_KEY = {
  0: 'none',
  1: 'light',
  2: 'medium',
  3: 'heavy',
};

const COLLAPSED_VISIBLE_HEIGHT = 132;
const THUMB_SIZE = 28;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const SymptomLogScreen = () => {
  const navigation = useNavigation();
  const [searchValue, setSearchValue] = useState('');
  const [symptomOptions, setSymptomOptions] = useState([]);
  const [moodOptions, setMoodOptions] = useState([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState('none');
  const [selectedEnergyIndex, setSelectedEnergyIndex] = useState(1);
  const [notes, setNotes] = useState('');
  const [trackWidth, setTrackWidth] = useState(0);
  const [initializing, setInitializing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false);

  const userIdRef = useRef(null);
  const dailyLogIdRef = useRef(null);
  const sheetTranslateY = useRef(new Animated.Value(0)).current;
  const sheetHeightRef = useRef(0);
  const collapsedOffsetRef = useRef(0);
  const sheetOffsetRef = useRef(0);
  const panStartOffsetRef = useRef(0);

  const todayLabel = useMemo(() => {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const filteredSymptoms = useMemo(() => {
    if (!searchValue.trim()) return symptomOptions;
    const query = searchValue.trim().toLowerCase();
    return symptomOptions.filter((option) => option.name.toLowerCase().includes(query));
  }, [symptomOptions, searchValue]);

  const thumbCenter = trackWidth
    ? (selectedEnergyIndex / (ENERGY_STOPS.length - 1 || 1)) * trackWidth
    : 0;

  const animateSheetTo = useCallback(
    (toValue) => {
      sheetOffsetRef.current = toValue;
      Animated.spring(sheetTranslateY, {
        toValue,
        useNativeDriver: true,
        damping: 18,
        stiffness: 180,
      }).start();
    },
    [sheetTranslateY],
  );

  const toggleSheet = useCallback(
    (forceCollapsed) => {
      const collapsedOffset = collapsedOffsetRef.current;
      if (collapsedOffset <= 0) return;
      const shouldCollapse =
        typeof forceCollapsed === 'boolean' ? forceCollapsed : !isSheetCollapsed;
      const target = shouldCollapse ? collapsedOffset : 0;
      setIsSheetCollapsed(shouldCollapse);
      animateSheetTo(target);
    },
    [animateSheetTo, isSheetCollapsed],
  );

  const handleSheetLayout = useCallback(
    (event) => {
      const height = event.nativeEvent.layout.height;
      sheetHeightRef.current = height;
      const collapsedOffset = Math.max(0, height - COLLAPSED_VISIBLE_HEIGHT);
      collapsedOffsetRef.current = collapsedOffset;
      const target = isSheetCollapsed ? collapsedOffset : 0;
      sheetOffsetRef.current = target;
      sheetTranslateY.setValue(target);
    },
    [isSheetCollapsed, sheetTranslateY],
  );

  const sheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dy) > Math.abs(gesture.dx) && Math.abs(gesture.dy) > 4,
        onPanResponderGrant: () => {
          panStartOffsetRef.current = sheetOffsetRef.current;
        },
        onPanResponderMove: (_, gesture) => {
          const collapsedOffset = collapsedOffsetRef.current;
          if (collapsedOffset <= 0) return;
          const next = clamp(panStartOffsetRef.current + gesture.dy, 0, collapsedOffset);
          sheetTranslateY.setValue(next);
          sheetOffsetRef.current = next;
        },
        onPanResponderRelease: (_, gesture) => {
          const collapsedOffset = collapsedOffsetRef.current;
          if (collapsedOffset <= 0) return;

          const rawValue = panStartOffsetRef.current + gesture.dy;
          const clamped = clamp(rawValue, 0, collapsedOffset);
          const isTap = Math.abs(gesture.dy) < 5 && Math.abs(gesture.vy) < 0.2;

          let target = clamped;
          if (isTap) {
            target = isSheetCollapsed ? 0 : collapsedOffset;
          } else if (gesture.dy > 0) {
            target = clamped > collapsedOffset / 2 || gesture.vy > 0.3 ? collapsedOffset : 0;
          } else {
            target = clamped < collapsedOffset / 2 || gesture.vy < -0.3 ? 0 : collapsedOffset;
          }

          setIsSheetCollapsed(target === collapsedOffset);
          animateSheetTo(target);
        },
      }),
    [animateSheetTo, isSheetCollapsed, sheetTranslateY],
  );

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
          .select('id, name, emoji')
          .in('name', MOOD_ORDER)
          .eq('is_active', true),
        supabase
          .from('daily_logs')
          .select('id, notes, energy_level, flow_level')
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

      setSymptomOptions(orderedSymptoms);
      setMoodOptions(orderedMoods);
      setSelectedSymptoms([]);
      setSelectedMoods([]);
      setSelectedFlow('none');
      setSelectedEnergyIndex(1);
      setNotes('');

      const existingLog = logRes.data ?? null;
      dailyLogIdRef.current = existingLog?.id ?? null;

      if (existingLog) {
        setNotes(existingLog.notes ?? '');
        if (typeof existingLog.flow_level === 'number') {
          const flowKey = FLOW_VALUE_TO_KEY[existingLog.flow_level];
          if (flowKey) setSelectedFlow(flowKey);
        }
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

  const toggleSymptom = useCallback((option) => {
    setSelectedSymptoms((prev) => {
      const exists = prev.some((item) => item.id === option.id);
      if (exists) {
        return prev.filter((item) => item.id !== option.id);
      }
      return [...prev, option];
    });
  }, []);

  const toggleMood = useCallback((option) => {
    setSelectedMoods((prev) => {
      const exists = prev.some((item) => item.id === option.id);
      if (exists) {
        return prev.filter((item) => item.id !== option.id);
      }
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
      const flowValue =
        PERIOD_FLOW_OPTIONS.find((option) => option.key === selectedFlow)?.value ?? null;
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
            flow_level: flowValue,
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
  }, [navigation, notes, selectedEnergyIndex, selectedFlow, selectedMoods, selectedSymptoms, saving]);

  const handleClose = () => {
    navigation.goBack();
  };

  if (initializing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5C1FA0" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.circleButton} onPress={handleClose}>
            <Ionicons name="close" size={20} color="#5C4A86" />
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
          <Ionicons name="search" size={18} color="#ADA7C1" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="#ADA7C1"
            value={searchValue}
            onChangeText={setSearchValue}
          />
          <Ionicons name="mic-outline" size={18} color="#ADA7C1" />
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
                  key={stop.label}
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
              <View style={styles.energyTrack} />
              <View style={[styles.energyProgress, { width: thumbCenter }]} />
              {ENERGY_STOPS.map((stop, index) => {
                const isActive = index <= selectedEnergyIndex;
                const position = trackWidth
                  ? (index / (ENERGY_STOPS.length - 1 || 1)) * trackWidth
                  : 0;
                return (
                  <View
                    key={stop.label}
                    style={[
                      styles.energyTick,
                      { left: Math.max(0, position - 6) },
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
              />
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Notes"
              placeholderTextColor="#C3BCD6"
              multiline
              value={notes}
              onChangeText={setNotes}
            />
          </View>
        </ScrollView>

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}
          onLayout={handleSheetLayout}
        >
          <View style={styles.sheetHandleArea} {...sheetPanResponder.panHandlers}>
            <Pressable onPress={() => toggleSheet()} hitSlop={8}>
              <View style={styles.sheetHandle} />
            </Pressable>
          </View>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Period Flow</Text>
          </View>
          <View style={styles.flowRow}>
            {PERIOD_FLOW_OPTIONS.map((option) => {
              const isActive = option.key === selectedFlow;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.flowCard, isActive && styles.flowCardActive]}
                  onPress={() => setSelectedFlow(option.key)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.flowIconWrapper, { backgroundColor: option.tint }]}>
                    <MaterialCommunityIcons
                      name={option.icon}
                      size={24}
                      color={isActive ? '#FFFFFF' : '#D87A96'}
                    />
                  </View>
                  <Text style={[styles.flowLabel, isActive && styles.flowLabelActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F1FF',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3A1F78',
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4C3A7A',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  primaryButton: {
    backgroundColor: '#5C1FA0',
    shadowColor: '#5C1FA0',
    shadowOpacity: 0.25,
  },
  circleButtonDisabled: {
    opacity: 0.6,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F0ECFF',
    height: 42,
    gap: 12,
    marginBottom: 18,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#3A1F78',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 260,
    gap: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#7E6B9B',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3A1F78',
    marginBottom: 16,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FDE7EF',
    borderWidth: 1,
    borderColor: '#F7C7DA',
    gap: 10,
  },
  chipSelected: {
    backgroundColor: '#E35D93',
    borderColor: '#E35D93',
  },
  chipDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FAC8DA',
  },
  chipDotSelected: {
    backgroundColor: '#FFFFFF',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C34B78',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  moodChip: {
    backgroundColor: '#EEF5FF',
    borderColor: '#D5E6FF',
  },
  moodDot: {
    backgroundColor: '#C7DEFF',
  },
  moodText: {
    color: '#3A63A6',
  },
  emptyStateText: {
    fontSize: 13,
    color: '#A094BB',
  },
  energyLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  energyLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9B92B8',
  },
  energyLabelActive: {
    color: '#3A1F78',
  },
  energyTrackWrapper: {
    height: 40,
    justifyContent: 'center',
  },
  energyTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5DEFF',
  },
  energyProgress: {
    position: 'absolute',
    left: 0,
    top: 16,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F3C37A',
  },
  energyTick: {
    position: 'absolute',
    top: 12,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EDE7FF',
  },
  energyTickActive: {
    backgroundColor: '#F3C37A',
  },
  energyThumb: {
    position: 'absolute',
    top: 9,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#FFEBB7',
    borderWidth: 3,
    borderColor: '#F39C3D',
    shadowColor: '#F39C3D',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#E3DCF7',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    minHeight: 90,
    fontSize: 14,
    color: '#3A1F78',
    backgroundColor: '#F8F5FF',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 30,
    paddingTop: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -6 },
    elevation: 10,
  },
  sheetHandleArea: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E0D8F5',
  },
  sheetHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3A1F78',
  },
  flowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  flowCard: {
    flex: 1,
    borderRadius: 22,
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: '#FBE9F1',
    gap: 12,
  },
  flowCardActive: {
    backgroundColor: '#AF2870',
    shadowColor: '#AF2870',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  flowIconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9D7E4',
  },
  flowLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B66D8B',
  },
  flowLabelActive: {
    color: '#FFFFFF',
  },
});

export default SymptomLogScreen;
