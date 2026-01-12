import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Animated, PanResponder, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { usePostHog } from 'posthog-react-native';
import Svg, { Path } from 'react-native-svg';
import { supabase } from '../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

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

const ALL_SYMPTOM_NAMES = Array.from(
  new Set([
    ...SYMPTOM_ORDER,
    ...groupedSymptoms.flatMap((group) => group.items),
  ]),
);

const symptomCategoryByName = groupedSymptoms.reduce((acc, group) => {
  group.items.forEach((item) => {
    acc[item] = group.title;
  });
  return acc;
}, {});

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

const ALL_MOOD_NAMES = Array.from(
  new Set([
    ...MOOD_ORDER,
    ...groupedMoods.flatMap((group) => group.items),
  ]),
);

const isUuid = (value) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const THUMB_SIZE = 28;

const ENERGY_STOPS = [
  { label: 'Low', percent: 0 },
  { label: '', percent: 25 },
  { label: 'Medium', percent: 50 },
  { label: '', percent: 75 },
  { label: 'High', percent: 100 },
];

const BatteryIcon = ({ width = 28, height = 12 }) => (
  <Svg width={width} height={height} viewBox="0 0 35 16" fill="none">
    <Path
      d="M6.24609 15.8555C4.25391 15.8555 2.56641 15.668 1.37109 14.4727C0.175781 13.2773 0 11.6133 0 9.60938V6.21094C0 4.25391 0.175781 2.57812 1.37109 1.38281C2.56641 0.1875 4.25391 0 6.22266 0H24.668C26.6719 0 28.3594 0.1875 29.5547 1.38281C30.75 2.57812 30.9258 4.24219 30.9258 6.24609V9.60938C30.9258 11.6133 30.75 13.2773 29.5547 14.4727C28.3594 15.668 26.6719 15.8555 24.668 15.8555H6.24609ZM5.92969 13.9688H24.9961C26.2031 13.9688 27.4688 13.8047 28.1719 13.1016C28.8867 12.3867 29.0391 11.1328 29.0391 9.92578V5.91797C29.0391 4.71094 28.8867 3.46875 28.1719 2.75391C27.4688 2.05078 26.2031 1.88672 24.9961 1.88672H5.96484C4.73438 1.88672 3.45703 2.03906 2.74219 2.75391C2.03906 3.46875 1.88672 4.72266 1.88672 5.95312V9.92578C1.88672 11.1328 2.03906 12.3867 2.74219 13.1016C3.45703 13.8047 4.72266 13.9688 5.92969 13.9688ZM5.30859 12.6094C4.51172 12.6094 4.03125 12.4922 3.70312 12.1641C3.375 11.8359 3.25781 11.3672 3.25781 10.5586V5.32031C3.25781 4.5 3.375 4.01953 3.70312 3.69141C4.01953 3.36328 4.5 3.24609 5.34375 3.24609H13.4062C14.2031 3.24609 14.6836 3.36328 15.0117 3.69141C15.3398 4.01953 15.4688 4.48828 15.4688 5.29688V10.5586C15.4688 11.3672 15.3398 11.8359 15.0117 12.1641C14.6836 12.4922 14.2148 12.6094 13.4062 12.6094H5.30859ZM32.5195 10.957V4.89844C33.4453 4.95703 34.6875 6.14062 34.6875 7.92188C34.6875 9.71484 33.4453 10.8984 32.5195 10.957Z"
      fill="#E6B366"
    />
  </Svg>
);

const SymptomLogScreen = () => {
  const navigation = useNavigation();
  const posthog = usePostHog();
  const slideAnim = useRef(new Animated.Value(120)).current;
  const trackRef = useRef(null);
  const [searchValue, setSearchValue] = useState('');
  const [symptomOptions, setSymptomOptions] = useState([]);
  const [moodOptions, setMoodOptions] = useState([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [selectedEnergyPercent, setSelectedEnergyPercent] = useState(50);
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

  const searchQuery = searchValue.trim().toLowerCase();
  const normalizeName = useCallback((name) => (name || '').trim().toLowerCase(), []);
  const localIdFromName = useCallback((name) => `local-${normalizeName(name)}`, [normalizeName]);
  const createLocalOption = useCallback(
    (name) => ({ id: localIdFromName(name), name, isLocal: true }),
    [localIdFromName],
  );

  const symptomMap = useMemo(() => {
    const map = new Map();
    symptomOptions.forEach((opt) => {
      const key = normalizeName(opt.name);
      if (!map.has(key)) map.set(key, opt);
    });
    return map;
  }, [normalizeName, symptomOptions]);

  const moodMap = useMemo(() => {
    const map = new Map();
    moodOptions.forEach((opt) => {
      const key = normalizeName(opt.name);
      if (!map.has(key)) map.set(key, opt);
    });
    return map;
  }, [moodOptions, normalizeName]);

  const primarySymptoms = useMemo(
    () => symptomOptions.filter((option) => SYMPTOM_ORDER.includes(option.name)),
    [symptomOptions],
  );

  const primaryMoods = useMemo(
    () => moodOptions.filter((option) => MOOD_ORDER.includes(option.name)),
    [moodOptions],
  );

  const filterByQuery = useCallback(
    (items) => {
      if (!searchQuery) return items;
      return items.filter((option) => option.name.toLowerCase().includes(searchQuery));
    },
    [searchQuery],
  );

  const filteredSymptoms = useMemo(() => {
    const base = moreVisible || searchQuery ? symptomOptions : primarySymptoms;
    return filterByQuery(base);
  }, [filterByQuery, moreVisible, primarySymptoms, searchQuery, symptomOptions]);

  const filteredMoods = useMemo(() => {
    const base = moreMoodsVisible || searchQuery ? moodOptions : primaryMoods;
    return filterByQuery(base);
  }, [filterByQuery, moreMoodsVisible, moodOptions, primaryMoods, searchQuery]);

  const clampedEnergyPercent = Math.max(0, Math.min(100, selectedEnergyPercent));
  const thumbCenter = trackWidth ? (clampedEnergyPercent / 100) * trackWidth : 0;

  const nearestEnergyStopIndex = useMemo(() => {
    let closest = 0;
    let smallestDiff = Infinity;
    ENERGY_STOPS.forEach((stop, idx) => {
      const diff = Math.abs(stop.percent - clampedEnergyPercent);
      if (diff < smallestDiff) {
        smallestDiff = diff;
        closest = idx;
      }
    });
    return closest;
  }, [clampedEnergyPercent]);

  const updateEnergyFromGesture = useCallback(
    (rawX, { snap }) => {
      if (!trackWidth) return;
      const clampedX = Math.max(0, Math.min(trackWidth, rawX));
      const percent = (clampedX / trackWidth) * 100;
      const snappedPercent = snap ? Math.round(percent / 5) * 5 : percent;
      setSelectedEnergyPercent(snappedPercent);
    },
    [trackWidth],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Capture immediately so dragging the thumb or track updates energy without needing a tap
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: (evt) => updateEnergyFromGesture(evt.nativeEvent.locationX, { snap: false }),
        onPanResponderMove: (evt) => updateEnergyFromGesture(evt.nativeEvent.locationX, { snap: false }),
        onPanResponderRelease: (evt) => updateEnergyFromGesture(evt.nativeEvent.locationX, { snap: true }),
        onPanResponderTerminate: (evt) => updateEnergyFromGesture(evt.nativeEvent.locationX, { snap: true }),
      }),
    [updateEnergyFromGesture],
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
          .select('id, name'),
        supabase
          .from('mood_categories')
          .select('id, name'),
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

      const symptomMapByName = new Map(symptomData.map((entry) => [normalizeName(entry.name), entry]));
      const moodMapByName = new Map(moodData.map((entry) => [normalizeName(entry.name), entry]));

      const buildOrderedList = (orderNames, sourceMap, sourceData) => {
        const ordered = orderNames
          .map((name) => {
            const found = sourceMap.get(normalizeName(name));
            return found || createLocalOption(name);
          })
          .filter((item, idx, arr) => idx === arr.findIndex((n) => normalizeName(n.name) === normalizeName(item.name)));
        const extras = sourceData
          .filter((entry) => !orderNames.some((name) => normalizeName(name) === normalizeName(entry.name)))
          .map((entry) => ({
            id: entry.id ?? localIdFromName(entry.name),
            name: entry.name,
            isLocal: !entry.id,
          }));
        return [...ordered, ...extras];
      };

      const sortedSymptoms = buildOrderedList(ALL_SYMPTOM_NAMES, symptomMapByName, symptomData);
      const sortedMoods = buildOrderedList(ALL_MOOD_NAMES, moodMapByName, moodData);

      setSymptomOptions(sortedSymptoms);
      setMoodOptions(sortedMoods);
      setSelectedSymptoms([]);
      setSelectedMoods([]);
      setSelectedEnergyPercent(50);
      setNotes('');

      const existingLog = logRes.data ?? null;
      dailyLogIdRef.current = existingLog?.id ?? null;

      if (existingLog) {
        setNotes(existingLog.notes ?? '');
        if (typeof existingLog.energy_level === 'number') {
          const raw = existingLog.energy_level;
          const percent =
            raw > 5
              ? Math.max(0, Math.min(100, Math.round(raw)))
              : Math.max(0, Math.min(100, Math.round(((raw - 1) / 4) * 100)));
          setSelectedEnergyPercent(percent);
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

          const symptomsById = new Map(symptomData.map((item) => [item.id, item]));
          const moodsById = new Map(moodData.map((item) => [item.id, item]));

          setSelectedSymptoms(symptomIds.map((id) => symptomsById.get(id)).filter(Boolean));
          setSelectedMoods(moodIds.map((id) => moodsById.get(id)).filter(Boolean));
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

  const resolveSymptomIds = useCallback(async () => {
    const selections = selectedSymptoms || [];
    if (!selections.length) return [];

    const resolved = selections.map((option) => {
      const directId = isUuid(option.id) ? option.id : null;
      const mapped = symptomMap.get(normalizeName(option.name));
      const mappedId = isUuid(mapped?.id) ? mapped.id : null;
      return { option, id: directId || mappedId || null };
    });

    const missingNames = Array.from(
      new Set(
        resolved
          .filter((item) => !item.id)
          .map((item) => item.option?.name)
          .filter(Boolean),
      ),
    );

    if (missingNames.length) {
      const buildCategory = (name) => symptomCategoryByName[name] || 'Other';
      const { error: upsertError } = await supabase
        .from('symptom_categories')
        .upsert(
          missingNames.map((name) => ({
            name,
            category: buildCategory(name),
          })),
          { onConflict: 'name' },
        );
      if (upsertError) throw upsertError;

      const { data: fetched, error: fetchError } = await supabase
        .from('symptom_categories')
        .select('id, name')
        .in('name', missingNames);
      if (fetchError) throw fetchError;

      const fetchedMap = new Map((fetched ?? []).map((row) => [normalizeName(row.name), row.id]));
      resolved.forEach((item) => {
        if (!item.id) {
          item.id = fetchedMap.get(normalizeName(item.option?.name)) || null;
        }
      });
    }

    return resolved.filter((item) => item.id).map((item) => item.id);
  }, [normalizeName, selectedSymptoms, symptomMap]);

  const handleSave = useCallback(async () => {
    if (!userIdRef.current || saving) return;
    try {
      setSaving(true);
      const userId = userIdRef.current;
      const todayISO = new Date().toISOString().split('T')[0];
      const snappedPercent = Math.round(Math.max(0, Math.min(100, selectedEnergyPercent)) / 5) * 5;
      const energyValue = Math.max(1, Math.min(5, Math.round((snappedPercent / 100) * 4) + 1));
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
        const symptomIds = await resolveSymptomIds();
        if (symptomIds.length) {
          const symptomPayload = symptomIds.map((id) => ({
            user_id: userId,
            daily_log_id: dailyLogId,
            symptom_id: id,
          }));
          const { error: insertSymptomsError } = await supabase
            .from('user_symptoms')
            .insert(symptomPayload);
          if (insertSymptomsError) throw insertSymptomsError;
        }
      }

      const { error: deleteMoodsError } = await supabase
        .from('user_moods')
        .delete()
        .eq('daily_log_id', dailyLogId);
      if (deleteMoodsError) throw deleteMoodsError;

      if (selectedMoods.length) {
        const moodPayload = selectedMoods
          .filter((option) => option.id && !option.isLocal)
          .map((option) => ({
            user_id: userId,
            daily_log_id: dailyLogId,
            mood_id: option.id,
            intensity: 3,
          }));
        if (moodPayload.length) {
          const { error: insertMoodsError } = await supabase
            .from('user_moods')
            .insert(moodPayload);
          if (insertMoodsError) throw insertMoodsError;
        }
      }

      posthog?.capture('mood_logged', {
        symptoms_count: selectedSymptoms.length,
        moods_count: selectedMoods.length,
        energy_level: energyValue,
        has_notes: Boolean(sanitizedNotes),
      });

      navigation.goBack();
    } catch (error) {
      console.error('SymptomLogScreen handleSave error', error);
      Alert.alert('Unable to save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  }, [navigation, notes, resolveSymptomIds, selectedEnergyPercent, selectedMoods, selectedSymptoms, saving]);

  const handleClose = () => navigation.goBack();

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
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>Symptoms</Text>
                {!searchQuery && (
                  <TouchableOpacity
                    style={[styles.sectionToggle, styles.symptomToggle]}
                    onPress={() => setMoreVisible((prev) => !prev)}
                  >
                    <Ionicons
                      name={moreVisible ? 'remove' : 'add'}
                      size={16}
                      color="#4B4B4B"
                    />
                    <Text style={styles.sectionToggleText}>{moreVisible ? 'Less' : 'More'}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {!moreVisible && !searchQuery && filteredSymptoms.length ? (
                <View style={styles.chipGrid}>
                  {filteredSymptoms.map((option) => {
                    const isSelected = selectedSymptoms.some((item) => item.id === option.id);
                    return (
                      <TouchableOpacity
                        key={option.id || option.name}
                        style={[styles.chip, isSelected && styles.chipSelectedSymptom]}
                        onPress={() => toggleSymptom(option)}
                      >
                        <View style={[styles.chipDot, isSelected && styles.chipDotSelectedSymptom]} />
                        <Text style={[styles.chipText, isSelected && styles.chipTextSelectedSymptom]}>
                          {option.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}

              {(moreVisible || searchQuery) && (
                <View style={styles.moreList}>
                  {groupedSymptoms.map((group) => {
                    const allGroupItems = group.items.map((name) => symptomMap.get(name) || createLocalOption(name));
                    const groupItems = searchQuery
                      ? allGroupItems.filter((option) =>
                          option.name.toLowerCase().includes(searchQuery),
                        )
                      : allGroupItems;
                    if (!groupItems.length) return null;
                    return (
                      <View key={group.title} style={styles.moreSection}>
                        <Text style={styles.moreSectionTitle}>{group.title}</Text>
                        <View style={styles.chipGrid}>
                          {groupItems.map((option) => {
                            const isSelected = selectedSymptoms.some((item) => item.id === option.id);
                            return (
                              <TouchableOpacity
                                key={option.id || option.name}
                                style={[styles.chip, isSelected && styles.chipSelectedSymptom]}
                                onPress={() => toggleSymptom(option)}
                              >
                                <View style={[styles.chipDot, isSelected && styles.chipDotSelectedSymptom]} />
                                <Text style={[styles.chipText, isSelected && styles.chipTextSelectedSymptom]}>
                                  {option.name}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {!filteredSymptoms.length && !searchQuery && (
                <Text style={styles.emptyStateText}>No symptoms match your search.</Text>
              )}
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>Moods</Text>
                {!searchQuery && (
                  <TouchableOpacity
                    style={[styles.sectionToggle, styles.moodToggle]}
                    onPress={() => setMoreMoodsVisible((prev) => !prev)}
                  >
                    <Ionicons
                      name={moreMoodsVisible ? 'remove' : 'add'}
                      size={16}
                      color="#4B4B4B"
                    />
                    <Text style={styles.sectionToggleText}>{moreMoodsVisible ? 'Less' : 'More'}</Text>
                  </TouchableOpacity>
                )}
              </View>
              {!moreMoodsVisible && !searchQuery && filteredMoods.length ? (
                <View style={styles.chipGrid}>
                  {filteredMoods.map((option) => {
                    const isSelected = selectedMoods.some((item) => item.id === option.id);
                    return (
                      <TouchableOpacity
                        key={option.id || option.name}
                        style={[styles.chip, styles.moodChip, isSelected && styles.chipSelectedMood]}
                        onPress={() => toggleMood(option)}
                      >
                        <View style={[styles.chipDot, styles.moodDot, isSelected && styles.chipDotSelectedMood]} />
                        <Text
                          style={[
                            styles.chipText,
                            styles.moodText,
                            isSelected && styles.chipTextSelectedMood,
                          ]}
                        >
                          {option.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
              {(moreMoodsVisible || searchQuery) && (
                <View style={styles.moreList}>
                  {groupedMoods.map((group) => {
                    const allGroupItems = group.items.map((name) => moodMap.get(name) || createLocalOption(name));
                    const groupItems = searchQuery
                      ? allGroupItems.filter((option) =>
                          option.name.toLowerCase().includes(searchQuery),
                        )
                      : allGroupItems;
                    if (!groupItems.length) return null;
                    return (
                      <View key={group.title} style={styles.moreSection}>
                        <Text style={styles.moreSectionTitle}>{group.title}</Text>
                        <View style={styles.chipGrid}>
                          {groupItems.map((option) => {
                            const isSelected = selectedMoods.some((item) => item.id === option.id);
                            return (
                              <TouchableOpacity
                                key={option.id || option.name}
                                style={[styles.chip, styles.moodChip, isSelected && styles.chipSelectedMood]}
                                onPress={() => toggleMood(option)}
                              >
                                <View style={[styles.chipDot, styles.moodDot, isSelected && styles.chipDotSelectedMood]} />
                                <Text
                                  style={[
                                    styles.chipText,
                                    styles.moodText,
                                    isSelected && styles.chipTextSelectedMood,
                                  ]}
                                >
                                  {option.name}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                </View>
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
                      index === nearestEnergyStopIndex && styles.energyLabelActive,
                    ]}
                  >
                    {stop.label}
                  </Text>
                ))}
              </View>
              <View
                ref={trackRef}
                style={styles.energyTrackWrapper}
                onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
                hitSlop={{ top: 6, bottom: 6, left: 12, right: 12 }}
                pointerEvents="box-only"
                {...panResponder.panHandlers}
              >
                <View style={styles.energyTrackBackground} />
                <View style={[styles.energyFill, { width: thumbCenter }]} />
                {ENERGY_STOPS.map((stop, index) => {
                  const isActive = stop.percent <= clampedEnergyPercent;
                  const position = trackWidth ? (stop.percent / 100) * trackWidth : 0;
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
              </View>
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionLabel: { fontSize: 16, fontWeight: '700', color: '#1F1F1F' },
  sectionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#F9F7FB',
    borderWidth: 1,
    borderColor: '#EBE6F2',
    gap: 6,
    minWidth: 88,
    justifyContent: 'center',
  },
  symptomToggle: {
    backgroundColor: '#F9F7FB',
    borderColor: '#EBE6F2',
  },
  moodToggle: {
    backgroundColor: '#F6F4FB',
    borderColor: '#EBE6F2',
  },
  sectionToggleText: { color: '#4B4B4B', fontWeight: '700', fontSize: 13 },
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
  chipSelectedSymptom: { backgroundColor: '#FBE4ED', borderColor: '#F3B7D0' },
  chipSelectedMood: { backgroundColor: '#EDE3FF', borderColor: '#CBB6F6' },
  chipDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#F1D9E4' },
  chipDotSelectedSymptom: { backgroundColor: '#F08AB5' },
  chipDotSelectedMood: { backgroundColor: '#CBB6F6' },
  chipText: { fontSize: 13, fontWeight: '700', color: '#4B4B4B' },
  chipTextSelectedSymptom: { color: '#B8326A' },
  chipTextSelectedMood: { color: '#2D1B4E' },
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
  moreList: { marginTop: 12, gap: 12 },
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
