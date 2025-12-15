import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Modal, Pressable, Alert, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../lib/supabase';
import { calculateCyclePhase, getPhaseInfo } from '../utils/cycleCalculations';
import { getCanonicalUserId } from '../utils/authUser';
import { updatePredictionsForUser } from '../utils/cyclePredictions';
import BottomTaskbar from '../components/BottomTaskbar';

const BACKGROUND_COLOR = '#EEE7FF';
const CARD_BORDER = 'rgba(255,255,255,0.6)';
const RING_SIZE = 206;
const RING_STROKE = 14;
const RADIUS = (RING_SIZE - RING_STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;
const MS_IN_DAY = 1000 * 60 * 60 * 24;

const PHASE_BADGE = {
  menstrual: { bg: '#FDE4EE', text: '#DB3F70' },
  follicular: { bg: '#E8F5EE', text: '#2F8B57' },
  ovulation: { bg: '#FFF2E1', text: '#C05A00' },
  luteal: { bg: '#EDE3FF', text: '#6C3CCF' },
};

const LEGEND_ITEMS = [
  {
    key: 'menstrual',
    label: 'Period',
    dotStyle: { backgroundColor: '#EEE5FF', borderWidth: 0 },
  },
  {
    key: 'fertile',
    label: 'Fertile',
    dotStyle: { backgroundColor: '#F0EFF5', borderWidth: 0 },
  },
  {
    key: 'pms',
    label: 'PMS',
    dotStyle: {
      backgroundColor: 'transparent',
      borderWidth: 1.4,
      borderColor: '#EA5C7B',
      borderStyle: 'dotted',
    },
  },
];

const TODAY_CARDS = [
  {
    key: 'symptoms',
    label: 'Add symptoms',
    icon: (color) => <MaterialCommunityIcons name="heart-pulse" size={20} color={color} />,
    background: '#FFE8F0',
    iconBackground: '#F7D8E5',
    tint: '#D74B6A',
  },
  {
    key: 'mood',
    label: 'Add mood',
    icon: (color) => <Ionicons name="happy-outline" size={20} color={color} />,
    background: '#E8F1FF',
    iconBackground: '#D5E5FF',
    tint: '#3D70B2',
  },
  {
    key: 'energy',
    label: 'Energy',
    icon: (color) => <MaterialCommunityIcons name="battery-medium" size={20} color={color} />,
    background: '#FFF7E0',
    iconBackground: '#FBE8BC',
    tint: '#C0943A',
  },
];

const getDefaultSymptomCards = () => TODAY_CARDS.map((card) => ({ ...card }));

const FLOW_OPTIONS = [
  { key: 'none', label: 'None', drops: 0, color: '#E8D7E8' },
  { key: 'light', label: 'Light', drops: 1, color: '#FDD7DF' },
  { key: 'medium', label: 'Medium', drops: 2, color: '#F8A8BE' },
  { key: 'heavy', label: 'Heavy', drops: 3, color: '#FB6887' },
];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const FIRST_OPEN_KEY = 'aster_first_open_at';
const RATING_DONE_KEY = 'aster_rating_done';
const APP_STORE_URL = 'https://apps.apple.com';

const AsterPetalIcon = ({ filled }) => (
  <Svg width={34} height={34} viewBox="0 0 33 33" fill="none">
    <Path
      d="M17.1848 16.9584C17.1848 16.9584 23.1539 16.0091 25.8631 17.4694C27.9866 18.6141 28.8775 19.8137 29.8503 21.6851C30.8231 23.5566 30.8658 23.6014 30.9643 25.5177C31.0535 27.2525 30.9643 29.2865 29.8503 30.053C28.1409 31.2291 27.0357 31.1389 24.5729 30.6917C21.773 30.1834 20.5196 28.7699 19.0024 26.1565C17.2356 23.113 18.1816 15.8086 18.1816 15.8086"
      stroke="url(#aster_grad_1)"
      strokeWidth={4}
      fill={filled ? 'url(#aster_grad_fill)' : 'none'}
    />
    <Path
      d="M18.2315 17.1905C18.2315 17.1905 17.3687 10.6225 18.6959 7.64156C19.7362 5.30495 20.8264 4.3247 22.5272 3.25433C24.228 2.18396 24.2688 2.13693 26.0104 2.0285C27.587 1.93035 29.4355 2.02855 30.1321 3.25433C31.201 5.13519 31.119 6.3513 30.7126 9.06113C30.2506 12.1419 28.9661 13.5211 26.5909 15.1905C23.8249 17.1346 17.1865 16.0936 17.1865 16.0936"
      stroke="url(#aster_grad_2)"
      strokeWidth={4}
      fill={filled ? 'url(#aster_grad_fill)' : 'none'}
    />
    <Path
      d="M17.186 16.0416C17.186 16.0416 10.62 16.9909 7.63989 15.5306C5.30397 14.3859 4.32401 13.1863 3.25395 11.3149C2.1839 9.44343 2.13689 9.39857 2.02849 7.48226C1.93037 5.74753 2.02854 3.71354 3.25395 2.94702C5.13426 1.77085 6.35001 1.86112 9.05903 2.30825C12.1389 2.8166 13.5177 4.23006 15.1866 6.8435C17.1301 9.88704 16.0895 17.1914 16.0895 17.1914"
      stroke="url(#aster_grad_3)"
      strokeWidth={4}
      fill={filled ? 'url(#aster_grad_fill)' : 'none'}
    />
    <Path
      d="M16.0371 15.8095C16.0371 15.8095 16.9861 22.3775 15.5262 25.3584C14.3819 27.695 13.1826 28.6753 11.3117 29.7457C9.44085 30.816 9.396 30.8631 7.48027 30.9715C5.74605 31.0697 3.71266 30.9715 2.94637 29.7457C1.77056 27.8648 1.86079 26.6487 2.30779 23.9389C2.81599 20.8581 4.22903 19.4789 6.84169 17.8095C9.88433 15.8654 17.1865 16.9064 17.1865 16.9064"
      stroke="url(#aster_grad_4)"
      strokeWidth={4}
      fill={filled ? 'url(#aster_grad_fill)' : 'none'}
    />
    <Defs>
      <LinearGradient id="aster_grad_1" x1="30.9902" y1="23.4038" x2="17.1848" y2="23.4038">
        <Stop stopColor="#400B6B" />
        <Stop offset="1" stopColor="#CB52AD" />
      </LinearGradient>
      <LinearGradient id="aster_grad_2" x1="24.0892" y1="2" x2="24.0892" y2="17.1905">
        <Stop stopColor="#400B6B" />
        <Stop offset="1" stopColor="#CB52AD" />
      </LinearGradient>
      <LinearGradient id="aster_grad_3" x1="2" y1="9.59617" x2="17.186" y2="9.59617">
        <Stop stopColor="#400B6B" />
        <Stop offset="1" stopColor="#CB52AD" />
      </LinearGradient>
      <LinearGradient id="aster_grad_4" x1="9.59354" y1="31" x2="9.59354" y2="15.8095">
        <Stop stopColor="#400B6B" />
        <Stop offset="1" stopColor="#CB52AD" />
      </LinearGradient>
      <LinearGradient id="aster_grad_fill" x1="5" y1="5" x2="27" y2="27">
        <Stop stopColor="#52147A" />
        <Stop offset="1" stopColor="#CB52AD" />
      </LinearGradient>
    </Defs>
  </Svg>
);

const chunk = (array, size) => {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

const toYMD = (date) => {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
};

function addMonths(date, value) {
  const next = new Date(date);
  next.setDate(1);
  next.setMonth(next.getMonth() + value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const CycleHomeScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [cycleData, setCycleData] = useState(null);
  const [symptomCards, setSymptomCards] = useState(() => getDefaultSymptomCards());
  const [calendarDate, setCalendarDate] = useState(() => {
    const initial = new Date();
    initial.setHours(0, 0, 0, 0);
    return initial;
  });
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const [dayModalVisible, setDayModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [periodDay, setPeriodDay] = useState(1);
  const [flowLevel, setFlowLevel] = useState('none'); // none | light | medium | heavy
  const [savingDay, setSavingDay] = useState(false);
  const [toast, setToast] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingFollowUp, setRatingFollowUp] = useState(null); // 'low' | 'high' | null
  const [submittingRating, setSubmittingRating] = useState(false);

  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    const checkRatingPrompt = async () => {
      try {
        const now = Date.now();
        const storedFirstOpen = await AsyncStorage.getItem(FIRST_OPEN_KEY);
        const firstOpenTs = storedFirstOpen ? Number(storedFirstOpen) : now;
        if (!storedFirstOpen) {
          await AsyncStorage.setItem(FIRST_OPEN_KEY, String(firstOpenTs));
        }
        const done = await AsyncStorage.getItem(RATING_DONE_KEY);
        const fortyEightHours = 48 * 60 * 60 * 1000;
        if (!done && now - firstOpenTs >= fortyEightHours) {
          setShowRatingModal(true);
        }
      } catch (err) {
        console.log('Rating prompt check failed', err);
      }
    };
    checkRatingPrompt();
  }, []);

  const loadCycleData = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setCycleData(null);
        setSymptomCards(getDefaultSymptomCards());
        return;
      }

      const todayISO = new Date().toISOString().split('T')[0];

      const canonicalUserId = await getCanonicalUserId(user);

      const [
        { data: userData, error: userDataError },
        { data: periods, error: periodsError },
        dailyLogResult,
      ] = await Promise.all([
        supabase
          .from('users')
          .select('average_cycle_length, average_period_length')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('periods')
          .select('user_id, start_date, end_date')
          .in('user_id', canonicalUserId === user.id ? [canonicalUserId] : [canonicalUserId, user.id])
          .order('start_date', { ascending: false })
          .limit(12),
        supabase
          .from('daily_logs')
          .select('id, energy_level')
          .eq('user_id', user.id)
          .eq('date', todayISO)
          .maybeSingle(),
      ]);

      if (userDataError) throw userDataError;
      if (periodsError) throw periodsError;
      if (dailyLogResult.error) throw dailyLogResult.error;

      let periodRows = periods ?? [];
      const canonicalRows = periodRows.filter((p) => p.user_id === canonicalUserId);
      const legacyRows = periodRows.filter((p) => p.user_id === user.id);

      if (!canonicalRows.length && legacyRows.length && canonicalUserId !== user.id) {
        const migrated = legacyRows.map((p) => ({
          user_id: canonicalUserId,
          start_date: p.start_date,
          end_date: p.end_date ?? null,
        }));
        try {
          await supabase.from('periods').upsert(migrated, { onConflict: 'user_id,start_date' });
          await updatePredictionsForUser(canonicalUserId);
        } catch (migrateErr) {
          console.log('CycleHome migrate legacy periods failed', migrateErr);
        }
      }

      periodRows = canonicalRows.length ? canonicalRows : legacyRows;

      if (periodRows.length) {
        try {
          await updatePredictionsForUser(canonicalUserId, { includeUserIds: [user.id] });
        } catch (predictionErr) {
          console.log('CycleHome update predictions error', predictionErr);
        }
      }

      let computedCycleData = null;
      if (periodRows?.length) {
        const cycleLength = userData?.average_cycle_length ?? 28;
        const periodLength = userData?.average_period_length ?? 5;
        const lastPeriodDate = periodRows[0].start_date;
        const info = calculateCyclePhase(lastPeriodDate, cycleLength);

        if (info) {
          computedCycleData = {
            ...info,
            periodLength,
            lastPeriodDate,
          };
        }
      }

      setCycleData(computedCycleData);

      const logData = dailyLogResult.data ?? null;
      if (logData?.id) {
        const [symptomRes, moodRes] = await Promise.all([
          supabase
            .from('user_symptoms')
            .select('symptom: symptom_id (name)')
            .eq('daily_log_id', logData.id),
          supabase
            .from('user_moods')
            .select('mood: mood_id (name)')
            .eq('daily_log_id', logData.id),
        ]);

        if (symptomRes.error) throw symptomRes.error;
        if (moodRes.error) throw moodRes.error;

        const symptomNames =
          (symptomRes.data?.map((row) => row.symptom?.name).filter(Boolean) ?? []).sort((a, b) =>
            a.localeCompare(b),
          );
        const moodNames =
          (moodRes.data?.map((row) => row.mood?.name).filter(Boolean) ?? []).sort((a, b) =>
            a.localeCompare(b),
          );
        const updatedCards = getDefaultSymptomCards();

        if (symptomNames.length) {
          updatedCards[0].label = symptomNames.join(', ');
        }
        if (moodNames.length) {
          updatedCards[1].label = moodNames.join(', ');
        }
        if (typeof logData.energy_level === 'number') {
          const bounded = Math.min(Math.max(logData.energy_level, 1), 5);
          const percent = Math.round(((bounded - 1) / 4) * 100);
          updatedCards[2].label = `${percent}%`;
        }

        setSymptomCards(updatedCards);
      } else {
        setSymptomCards(getDefaultSymptomCards());
      }

    } catch (error) {
      console.error('CycleHomeScreen loadCycleData error', error);
      setCycleData(null);
      setSymptomCards(getDefaultSymptomCards());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCycleData();
    }, [loadCycleData]),
  );

  const handleRefresh = useCallback(() => {
    loadCycleData();
  }, [loadCycleData]);

  const getCycleStateForDate = useCallback(
    (date) => {
      if (!cycleData?.lastPeriodDate) return 'default';

      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);

      const lastPeriod = new Date(cycleData.lastPeriodDate);
      lastPeriod.setHours(0, 0, 0, 0);

      const diff = Math.floor((targetDate.getTime() - lastPeriod.getTime()) / MS_IN_DAY);
      if (diff < 0) return 'default';

      const cycleDay = (diff % cycleData.cycleLength) + 1;

      if (cycleDay <= cycleData.periodLength) return 'menstrual';
      if (cycleDay >= 13 && cycleDay <= 16) return 'fertile';
      if (cycleDay >= cycleData.cycleLength - 5) return 'pms';
      return 'default';
    },
    [cycleData],
  );

  const calendarMatrix = useMemo(() => {
    const base = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
    const firstWeekday = base.getDay();
    const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

    const cells = [];
    for (let index = 0; index < totalCells; index += 1) {
      const cellDate = new Date(base);
      cellDate.setDate(1 + (index - firstWeekday));

      const isCurrentMonth = cellDate.getMonth() === calendarDate.getMonth();
      const state = getCycleStateForDate(cellDate);

      cells.push({
        key: `${cellDate.toISOString()}-${index}`,
        label: cellDate.getDate(),
        date: cellDate,
        isCurrentMonth,
        state,
        isToday: isSameDay(cellDate, today),
      });
    }

    return chunk(cells, 7);
  }, [calendarDate, getCycleStateForDate, today]);

  const compactWeeks = useMemo(() => calendarMatrix.slice(0, 2), [calendarMatrix]);

  const monthLabel = useMemo(
    () =>
      calendarDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
    [calendarDate],
  );

  const phaseInfo = cycleData ? getPhaseInfo(cycleData.phase) : null;
  const phaseBadgeStyle = cycleData
    ? PHASE_BADGE[cycleData.phase] ?? { bg: '#EEE', text: '#555' }
    : { bg: '#EEE', text: '#555' };

  const cycleDayLabel = cycleData ? String(cycleData.currentCycleDay) : '--';
  const phaseLabel = phaseInfo ? `${phaseInfo.name} Phase` : 'Cycle Phase';

  const progressPercent = cycleData ? clamp(cycleData.progress, 0, 100) : 0;
  const dashOffset = CIRC * (1 - progressPercent / 100);

  const nextPeriodDays = cycleData?.daysUntilNext ?? null;
  const nextPeriodCopy = (() => {
    if (nextPeriodDays == null) return 'Track your cycle to see predictions';
    if (nextPeriodDays === 0) return 'Next period starts tomorrow';
    if (nextPeriodDays === 1) return 'Next period in 1 day';
    return `Next period in ${nextPeriodDays} days`;
  })();

  const todayLabel = today.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const toggleCalendar = () => setCalendarExpanded((prev) => !prev);

  const handlePrevMonth = () => setCalendarDate((prev) => addMonths(prev, -1));
  const handleNextMonth = () => setCalendarDate((prev) => addMonths(prev, 1));

  const handleLogSymptoms = () => {
    navigation.navigate('SymptomLog');
  };

  const handleDayPress = (date) => {
    setSelectedDay(date);
    setPeriodDay(1);
    setFlowLevel('heavy');
    setDayModalVisible(true);
  };

  const handleSaveDay = async () => {
    if (!selectedDay) return;
    setSavingDay(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Sign in required', 'Please sign in to log your period day.');
        return;
      }

      const canonicalUserId = await getCanonicalUserId(user);
      const startDate = addDays(selectedDay, -(periodDay - 1));
      const endDate = addDays(startDate, Math.max(periodDay, 4)); // basic default duration

      await supabase
        .from('periods')
        .upsert(
          [{
            user_id: canonicalUserId,
            start_date: toYMD(startDate),
            end_date: toYMD(endDate),
          }],
          { onConflict: 'user_id,start_date' },
        );

      try {
        await updatePredictionsForUser(canonicalUserId);
      } catch (err) {
        console.log('Prediction refresh failed', err);
      }

      setDayModalVisible(false);
      setToast('Period day saved');
      setTimeout(() => setToast(null), 1800);
      loadCycleData();
    } catch (err) {
      console.error('Save period day failed', err);
      Alert.alert('Save failed', err?.message ?? 'Please try again.');
    } finally {
      setSavingDay(false);
    }
  };

  const closeRatingModal = () => {
    setShowRatingModal(false);
    setRatingFollowUp(null);
  };

  const submitRating = useCallback(
    async (value) => {
      setSubmittingRating(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const payload = {
          rating: value,
          source: 'cycle_home_prompt',
        };

        if (user?.id) {
          payload.user_id = await getCanonicalUserId(user);
        }

        await supabase.from('app_ratings').insert(payload);
      } catch (err) {
        console.log('Rating submit failed', err);
      } finally {
        await AsyncStorage.setItem(RATING_DONE_KEY, '1');
        setSubmittingRating(false);
      }
    },
    [],
  );

  const handleSelectRating = (value) => {
    setRatingValue(value);
    setRatingFollowUp(value <= 2 ? 'low' : 'high');
    submitRating(value);
  };

  const handleFeedbackPress = () => {
    closeRatingModal();
    navigation.navigate('Feedback');
  };

  const handleAppStorePress = async () => {
    try {
      const supported = await Linking.canOpenURL(APP_STORE_URL);
      if (supported) {
        await Linking.openURL(APP_STORE_URL);
      }
    } catch (err) {
      console.log('Open app store failed', err);
    } finally {
      closeRatingModal();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={handleRefresh}
              tintColor="#6C3CCF"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.avatarButton}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Settings')}
            >
              <Ionicons name="person-outline" size={20} color="#4B117B" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Cycle</Text>
            <TouchableOpacity
              style={styles.avatarButton}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('PastAnalytics', {
                  mode: 'cycle',
                  cycleContext: {
                    lastPeriodDate: cycleData?.lastPeriodDate,
                    cycleLength: cycleData?.cycleLength,
                    periodLength: cycleData?.periodLength,
                  },
                })
              }
            >
              <Ionicons name="calendar-outline" size={20} color="#4B117B" />
            </TouchableOpacity>
          </View>

          {calendarExpanded ? (
            <>
              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <Text style={styles.summaryTitle}>Cycle Day</Text>
                  <View style={[styles.phaseBadge, { backgroundColor: phaseBadgeStyle.bg }]}>
                    <Text style={[styles.phaseBadgeText, { color: phaseBadgeStyle.text }]}>
                      {phaseLabel}
                    </Text>
                  </View>
                </View>
                <View style={styles.summaryBody}>
                  <View style={styles.summaryDayCircle}>
                    <Text style={styles.summaryDayValue}>{cycleDayLabel}</Text>
                  </View>
                  <View style={styles.summaryInfo}>
                    <Text style={styles.summaryInfoTitle}>{nextPeriodCopy}</Text>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.summaryToggle}
                    activeOpacity={0.85}
                    onPress={toggleCalendar}
                  >
                    <Ionicons name="remove" size={18} color="#4B117B" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.calendarCard}>
                <View style={styles.calendarHeader}>
                  <Text style={styles.calendarTitle}>{monthLabel}</Text>
                  <View style={styles.calendarArrows}>
                    <TouchableOpacity
                      style={styles.calendarArrowButton}
                      onPress={handlePrevMonth}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="chevron-back" size={18} color="#4B117B" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.calendarArrowButton}
                      onPress={handleNextMonth}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="chevron-forward" size={18} color="#4B117B" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.calendarWeekLabels}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, index) => (
                    <Text key={`${label}-${index}`} style={styles.calendarWeekLabel}>
                      {label}
                    </Text>
                  ))}
                </View>
                <View style={styles.calendarGrid}>
                  {calendarMatrix.map((week, row) => (
                    <View key={`week-${row}`} style={styles.calendarRow}>
                      {week.map((day) => {
                        const dayStyles = [styles.calendarDay];
                        const textStyles = [styles.calendarDayText];

                        if (!day.isCurrentMonth) {
                          dayStyles.push(styles.calendarDayMuted);
                          textStyles.push(styles.calendarDayMutedText);
                        }

                        if (day.state === 'menstrual') {
                          dayStyles.push(styles.calendarDayMenstrual);
                          textStyles.push(styles.calendarDayMenstrualText);
                        } else if (day.state === 'fertile') {
                          dayStyles.push(styles.calendarDayFertile);
                          textStyles.push(styles.calendarDayFertileText);
                        } else if (day.state === 'pms') {
                          dayStyles.push(styles.calendarDayPms);
                          textStyles.push(styles.calendarDayPmsText);
                        }

                        if (day.isToday) {
                          dayStyles.push(styles.calendarDayToday);
                          textStyles.push(styles.calendarDayTodayText);
                        }

                        return (
                          <TouchableOpacity
                            key={day.key}
                            style={dayStyles}
                            activeOpacity={0.8}
                            onPress={() => handleDayPress(day.date)}
                          >
                            <Text style={textStyles}>{day.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </View>
                <View style={styles.calendarLegend}>
                  {LEGEND_ITEMS.map((item) => (
                    <View key={item.key} style={styles.legendItem}>
                      <View style={[styles.legendDot, item.dotStyle]} />
                      <Text style={styles.legendText}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={styles.compactCalendarCard}>
                <View style={styles.compactCalendarHeader}>
                  <Text style={styles.compactCalendarMonth}>{monthLabel}</Text>
                  <View style={styles.calendarArrows}>
                    <TouchableOpacity
                      style={styles.calendarArrowButton}
                      onPress={handlePrevMonth}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="chevron-back" size={18} color="#4B117B" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.calendarArrowButton}
                      onPress={handleNextMonth}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="chevron-forward" size={18} color="#4B117B" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.compactCalendarWeekLabels}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, index) => (
                    <Text key={`compact-${label}-${index}`} style={styles.compactCalendarWeekLabel}>
                      {label}
                    </Text>
                  ))}
                </View>
                {compactWeeks.map((week, row) => (
                  <View key={`compact-week-${row}`} style={styles.compactCalendarRow}>
                    {week.map((day) => {
                      const dayStyles = [styles.compactCalendarDay];
                      const textStyles = [styles.compactCalendarDayText];

                      if (!day.isCurrentMonth) {
                        dayStyles.push(styles.calendarDayMuted);
                        textStyles.push(styles.compactCalendarDayMutedText);
                      }

                      if (day.state === 'menstrual') {
                        dayStyles.push(styles.calendarDayMenstrual);
                        textStyles.push(styles.calendarDayMenstrualText);
                      } else if (day.state === 'fertile') {
                        dayStyles.push(styles.calendarDayFertile);
                        textStyles.push(styles.calendarDayFertileText);
                      } else if (day.state === 'pms') {
                        dayStyles.push(styles.calendarDayPms);
                        textStyles.push(styles.calendarDayPmsText);
                      }

                      if (day.isToday) {
                        dayStyles.push(styles.calendarDayToday);
                        textStyles.push(styles.calendarDayTodayText);
                      }

                      return (
                        <TouchableOpacity
                          key={`compact-${day.key}`}
                          style={dayStyles}
                          activeOpacity={0.8}
                          onPress={() => handleDayPress(day.date)}
                        >
                          <Text style={textStyles}>{day.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>

              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Monthly Cycle</Text>
                  <View style={[styles.phaseBadge, { backgroundColor: phaseBadgeStyle.bg }]}>
                    <Text style={[styles.phaseBadgeText, { color: phaseBadgeStyle.text }]}>
                      {phaseLabel}
                    </Text>
                  </View>
                </View>
                <View style={styles.ringWrapper}>
                  <Svg width={RING_SIZE} height={RING_SIZE}>
                    <Circle
                      cx={RING_SIZE / 2}
                      cy={RING_SIZE / 2}
                      r={RADIUS}
                      stroke="#ECE7FF"
                      strokeWidth={RING_STROKE}
                      fill="none"
                    />
                    <Circle
                      cx={RING_SIZE / 2}
                      cy={RING_SIZE / 2}
                      r={RADIUS}
                      stroke="#4B117B"
                      strokeWidth={RING_STROKE}
                      fill="none"
                      strokeDasharray={CIRC}
                      strokeDashoffset={dashOffset}
                      strokeLinecap="round"
                      transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                    />
                  </Svg>
                  <View style={styles.ringCenter}>
                    <Text style={styles.cycleDay}>{`Day ${cycleDayLabel}`}</Text>
                    <Text style={styles.cyclePhaseText}>{phaseLabel}</Text>
                    <TouchableOpacity
                      style={styles.ringCenterButton}
                      activeOpacity={0.85}
                      onPress={toggleCalendar}
                    >
                      <Ionicons name="add" size={22} color="#4B117B" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </>
          )}

          <View style={[styles.card, styles.moodCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Today's symptoms</Text>
              <Text style={styles.cardSubtitle}>{todayLabel}</Text>
            </View>
            <View style={styles.symptomRow}>
              {symptomCards.map((item) => (
                <View
                  key={item.key}
                  style={[styles.symptomCard, { backgroundColor: item.background }]}
                >
                  <View style={[styles.symptomIcon, { backgroundColor: item.iconBackground }]}>
                    {item.icon(item.tint)}
                  </View>
                  <Text
                    style={[styles.symptomLabel, { color: item.tint }]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={styles.symptomButton}
              activeOpacity={0.85}
              onPress={handleLogSymptoms}
            >
              <Ionicons name="add" size={18} color="#4B117B" />
              <Text style={styles.symptomButtonText}>Log symptoms</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {toast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <Modal
        visible={dayModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDayModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setDayModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Log period day</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedDay
                    ? selectedDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : ''}
                </Text>
              </View>
              <Pressable
                onPress={() => setDayModalVisible(false)}
                style={styles.modalClose}
                accessibilityRole="button"
              >
                <Ionicons name="close" size={18} color="#4B117B" />
              </Pressable>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Period day</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  onPress={() => setPeriodDay((v) => Math.max(1, v - 1))}
                  style={styles.stepperBtn}
                >
                  <Ionicons name="remove" size={18} color="#4B117B" />
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{periodDay}</Text>
                <TouchableOpacity
                  onPress={() => setPeriodDay((v) => Math.min(10, v + 1))}
                  style={styles.stepperBtn}
                >
                  <Ionicons name="add" size={18} color="#4B117B" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Flow</Text>
              <View style={styles.flowRow}>
                {FLOW_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.flowPill,
                      flowLevel === opt.key && { borderColor: opt.color, backgroundColor: '#FFF5F7' },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => setFlowLevel(opt.key)}
                  >
                    <View style={styles.flowIconRow}>
                      {Array.from({ length: Math.max(1, opt.drops) }).map((_, idx) => (
                        <Ionicons
                          key={`${opt.key}-${idx}`}
                          name="water"
                          size={16}
                          color={flowLevel === opt.key ? '#FB6887' : '#D4C4D4'}
                          style={{ marginLeft: idx === 0 ? 0 : 2 }}
                        />
                      ))}
                      {opt.drops === 0 && (
                        <Ionicons name="water-outline" size={16} color="#D4C4D4" />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.flowLabel,
                        flowLevel === opt.key && { color: '#4B117B', fontWeight: '700' },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, savingDay && { opacity: 0.6 }]}
              disabled={savingDay}
              onPress={handleSaveDay}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>{savingDay ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
            <Text style={styles.helperText}>
              We backfill earlier days of this period based on the chosen day to keep predictions in sync.
            </Text>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showRatingModal}
        transparent
        animationType="fade"
        onRequestClose={closeRatingModal}
      >
        <Pressable style={styles.ratingOverlay} onPress={closeRatingModal}>
          <Pressable style={styles.ratingCard} onPress={(e) => e.stopPropagation()}>
            {ratingFollowUp ? (
              <>
                <Text style={styles.ratingTitle}>
                  {ratingFollowUp === 'low'
                    ? "We're sorry to hear that. Can you tell us what went wrong?"
                    : 'Happy to hear! Would you mind sharing this on the App Store?'}
                </Text>
                <TouchableOpacity
                  style={styles.ratingCta}
                  activeOpacity={0.88}
                  onPress={ratingFollowUp === 'low' ? handleFeedbackPress : handleAppStorePress}
                >
                  <Text style={styles.ratingCtaText}>
                    {ratingFollowUp === 'low' ? 'Give Feedback' : 'Go to the Apple Store'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.ratingTitle}>How’re you liking Aster? Rate us!</Text>
                <View style={styles.ratingRow}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <TouchableOpacity
                      key={value}
                      style={styles.ratingIconWrap}
                      activeOpacity={0.85}
                      onPress={() => handleSelectRating(value)}
                      disabled={submittingRating}
                    >
                      <AsterPetalIcon filled={value <= ratingValue} />
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <BottomTaskbar activeKey="Cycle" />
    </SafeAreaView>
  );
};

export default CycleHomeScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 140,
    paddingTop: 12,
    gap: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3A1F78',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    shadowColor: '#7E6B9B',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3A1F78',
  },
  summaryBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  summaryDayCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4B117B',
  },
  summaryDayValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  summaryInfo: {
    flex: 1,
  },
  summaryInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5B4F76',
    marginBottom: 10,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EFE9FF',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#4B117B',
  },
  summaryToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9CBFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F2FF',
  },
  compactCalendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: 'rgba(108,60,207,0.12)',
    shadowColor: '#7E6B9B',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  compactCalendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  compactCalendarMonth: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3A1F78',
  },
  compactCalendarWeekLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  compactCalendarWeekLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9C92B5',
    width: 32,
    textAlign: 'center',
  },
  compactCalendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  compactCalendarDay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  compactCalendarDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5B4F76',
  },
  compactCalendarDayMutedText: {
    color: '#B7AFCF',
  },
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowColor: '#7E6B9B',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3A1F78',
  },
  calendarArrows: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarArrowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4EEFF',
  },
  calendarWeekLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  calendarWeekLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9C92B5',
    width: 32,
    textAlign: 'center',
  },
  calendarGrid: {
    gap: 10,
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calendarDay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  calendarDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5B4F76',
  },
  calendarDayMuted: {
    opacity: 0.36,
  },
  calendarDayMutedText: {
    color: '#5B4F76',
  },
  calendarDayMenstrual: {
    backgroundColor: '#EEE5FF',
  },
  calendarDayMenstrualText: {
    color: '#4B117B',
  },
  calendarDayFertile: {
    backgroundColor: '#F0EFF5',
  },
  calendarDayPms: {
    backgroundColor: 'transparent',
    borderWidth: 1.6,
    borderStyle: 'dotted',
    borderColor: '#EA5C7B',
  },
  calendarDayFertileText: {
    color: '#9C6BFF',
  },
  calendarDayPmsText: {
    color: '#DA4F7B',
  },
  calendarDayToday: {
    backgroundColor: '#4B117B',
    borderWidth: 0,
  },
  calendarDayTodayText: {
    color: '#FFFFFF',
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginTop: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#7D7396',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    shadowColor: '#7E6B9B',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3A1F78',
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8D84A6',
  },
  phaseBadge: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  phaseBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ringWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingBottom: 36,
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ringCenterButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2DCFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4B117B',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  cycleDay: {
    fontSize: 28,
    fontWeight: '800',
    color: '#3A1F78',
  },
  cyclePhaseText: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: '#8D84A6',
  },
  moodCard: {
    paddingBottom: 24,
  },
  symptomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  symptomCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 10,
  },
  symptomIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symptomLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  symptomButton: {
    marginTop: 12,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2DCFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#836BCF',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  symptomButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3A1F78',
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 24,
    right: 24,
    backgroundColor: '#3A1F78',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#3A1F78',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  toastText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    gap: 14,
    shadowColor: '#2F1E57',
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3A1F78',
  },
  modalSubtitle: {
    color: '#6A5A9B',
    marginTop: 4,
  },
  modalClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F0EAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSection: {
    gap: 8,
  },
  modalLabel: {
    fontWeight: '700',
    color: '#3A1F78',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D6C8F3',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F3FF',
  },
  stepperValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3A1F78',
    minWidth: 36,
    textAlign: 'center',
  },
  flowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  flowPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6DFF1',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  flowIconRow: {
    flexDirection: 'row',
  },
  flowLabel: {
    color: '#7A708C',
    fontWeight: '600',
    fontSize: 12,
  },
  primaryBtn: {
    backgroundColor: '#4B117B',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  helperText: {
    color: '#6E6483',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  ratingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  ratingCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  ratingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F103B',
    textAlign: 'center',
    marginBottom: 20,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
  },
  ratingIconWrap: {
    padding: 6,
  },
  ratingCta: {
    marginTop: 4,
    backgroundColor: '#4B117B',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 22,
    minWidth: 180,
    alignItems: 'center',
  },
  ratingCtaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
