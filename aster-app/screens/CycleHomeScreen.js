import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Modal, Pressable, Alert, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { usePostHog } from 'posthog-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../lib/supabase';
import { calculateCyclePhase, getPhaseInfo, parseYMD, toUtcMidnight } from '../utils/cycleCalculations';
import { getCanonicalUserId, getVerifiedUser } from '../utils/authUser';
import {
  submitPredictionFeedback,
  updatePredictionsForUser,
  updatePredictionStatus,
} from '../utils/cyclePredictions';
import BottomTaskbar from '../components/BottomTaskbar';
import Disclaimer from '../components/Disclaimer';
import InfoIcon from '../components/InfoIcon';
import PeriodCheckInSheet from '../components/PeriodCheckInSheet';
import SourcesModal from '../components/SourcesModal';
import TabSwipeWrapper from '../components/TabSwipeWrapper';

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
    key: 'confirmed_period',
    label: 'Period',
    dotStyle: {
      backgroundColor: '#F6B8C8',
      borderWidth: 1.4,
      borderColor: '#EA5C7B',
      borderStyle: 'dotted',
    },
  },
  {
    key: 'predicted_period',
    label: 'Predicted',
    dotStyle: {
      backgroundColor: 'transparent',
      borderWidth: 1.4,
      borderColor: '#EA5C7B',
      borderStyle: 'dotted',
    },
  },
  {
    key: 'fertile',
    label: 'Fertile',
    dotStyle: { backgroundColor: '#F0EFF5', borderWidth: 0 },
  },
  {
    key: 'pms',
    label: 'PMS',
    dotStyle: { backgroundColor: '#EEE5FF', borderWidth: 0 },
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

const roundTo5 = (value) => Math.round(value / 5) * 5;
const parseEnergyPercent = (raw) => {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const normalized = raw.trim().toLowerCase();
    if (normalized === 'low') return 20;
    if (normalized === 'medium') return 50;
    if (normalized === 'high') return 80;
  }
  const numeric = Number(raw);
  if (Number.isNaN(numeric)) return null;
  if (numeric <= 5) {
    const legacy = Math.round(((Math.min(Math.max(numeric, 1), 5) - 1) / 4) * 100);
    return roundTo5(Math.max(0, Math.min(100, legacy)));
  }
  return roundTo5(Math.max(0, Math.min(100, Math.round(numeric))));
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const normalizeDateArray = (value) =>
  (Array.isArray(value) ? value : [])
    .filter((v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v));

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
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const addDays = (date, days) => {
  let d;
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map((value) => Number.parseInt(value, 10));
    d = new Date(year, month - 1, day);
  } else {
    d = new Date(date);
  }
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
};

const daysBetween = (laterDateYmd, earlierDateYmd) => {
  const laterDate = parseYMD(laterDateYmd);
  const earlierDate = parseYMD(earlierDateYmd);
  if (!laterDate || !earlierDate) return null;
  return Math.floor((laterDate.getTime() - earlierDate.getTime()) / MS_IN_DAY);
};

const addDaysUtc = (date, days) => {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
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
  const posthog = usePostHog();
  const [loading, setLoading] = useState(true);
  const [cycleData, setCycleData] = useState(null);
  const [periodHistory, setPeriodHistory] = useState([]);
  const [activePrediction, setActivePrediction] = useState(null);
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [avgPeriodLength, setAvgPeriodLength] = useState(5);
  const [symptomCards, setSymptomCards] = useState(() => getDefaultSymptomCards());
  const [calendarDate, setCalendarDate] = useState(() => {
    const initial = new Date();
    initial.setHours(0, 0, 0, 0);
    return initial;
  });
  const [periodCheckInVisible, setPeriodCheckInVisible] = useState(false);
  const [selectedDayMeta, setSelectedDayMeta] = useState(null);
  const [periodCheckInView, setPeriodCheckInView] = useState('log');
  const [periodDay, setPeriodDay] = useState(1);
  const [flowLevel, setFlowLevel] = useState('none'); // none | light | medium | heavy
  const [savingDay, setSavingDay] = useState(false);
  const [toast, setToast] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingFollowUp, setRatingFollowUp] = useState(null); // 'low' | 'high' | null
  const [submittingRating, setSubmittingRating] = useState(false);
  const [activeSourcesKey, setActiveSourcesKey] = useState(null);

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
      const user = await getVerifiedUser();

      if (!user) {
        setCycleData(null);
        setPeriodHistory([]);
        setActivePrediction(null);
        setFeedbackHistory([]);
        setAvgPeriodLength(5);
        setSymptomCards(getDefaultSymptomCards());
        return;
      }

      const todayISO = new Date().toISOString().split('T')[0];

      const canonicalUserId = await getCanonicalUserId(user);

      const [
        { data: userData, error: userDataError },
        { data: periods, error: periodsError },
        dailyLogResult,
        predictionResult,
        feedbackResult,
      ] = await Promise.all([
        supabase
          .from('users')
          .select('average_cycle_length, average_period_length')
          .eq('id', canonicalUserId)
          .maybeSingle(),
        supabase
          .from('periods')
          .select('id, user_id, start_date, end_date, created_at')
          .in('user_id', canonicalUserId === user.id ? [canonicalUserId] : [canonicalUserId, user.id])
          .order('start_date', { ascending: false }),
        supabase
          .from('daily_logs')
          .select('id, energy_level')
          .eq('user_id', user.id)
          .eq('date', todayISO)
          .maybeSingle(),
        supabase
          .from('cycle_predictions')
          .select('*')
          .eq('user_id', canonicalUserId)
          .order('created_at', { ascending: false })
          .limit(12),
        supabase
          .from('prediction_feedback')
          .select('id, predicted_start_date, feedback_type, corrected_start_date, created_at')
          .eq('user_id', canonicalUserId)
          .order('created_at', { ascending: false })
          .limit(8),
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
      const latestByStart = new Map();
      periodRows.forEach((row) => {
        if (!row.start_date) return;
        const key = row.start_date;
        const existing = latestByStart.get(key);
        if (!existing) {
          latestByStart.set(key, row);
          return;
        }
        if (row.created_at && existing.created_at) {
          if (new Date(row.created_at) > new Date(existing.created_at)) {
            latestByStart.set(key, row);
          }
          return;
        }
        if ((row.id || '').localeCompare(existing.id || '') > 0) {
          latestByStart.set(key, row);
        }
      });
      const dedupedRows = Array.from(latestByStart.values()).sort((a, b) =>
        b.start_date.localeCompare(a.start_date),
      );

      const predictionRows = predictionResult?.data ?? [];
      let activePredictionRow =
        predictionRows.find((row) => row.is_active && (!row.status || row.status === 'predicted')) ??
        predictionRows.find((row) => row.status === 'predicted') ??
        null;

      if (!activePredictionRow && dedupedRows.length) {
        try {
          await updatePredictionsForUser(canonicalUserId, { includeUserIds: [user.id] });
          const refetch = await supabase
            .from('cycle_predictions')
            .select('*')
            .eq('user_id', canonicalUserId)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1);
          activePredictionRow = refetch.data?.[0] || null;
        } catch (predictionErr) {
          console.log('CycleHome update predictions error', predictionErr);
        }
      }

      let computedCycleData = null;
      if (dedupedRows?.length) {
        const cycleLength =
          Number(activePredictionRow?.predicted_cycle_length) || userData?.average_cycle_length || 28;
        const periodLength = userData?.average_period_length ?? 5;
        const lastPeriodDate = dedupedRows[0].start_date;
        const info = calculateCyclePhase(lastPeriodDate, cycleLength);

        if (info) {
          computedCycleData = {
            ...info,
            periodLength,
            lastPeriodDate,
          };
        }
      }

      setAvgPeriodLength(userData?.average_period_length ?? 5);
      setPeriodHistory(dedupedRows);
      setActivePrediction(activePredictionRow);
      setFeedbackHistory(feedbackResult?.error ? [] : feedbackResult?.data ?? []);
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
          const [first, ...rest] = symptomNames;
          updatedCards[0].label = rest.length ? `${first} + ${rest.length}` : first;
        }
        if (moodNames.length) {
          const [first, ...rest] = moodNames;
          updatedCards[1].label = rest.length ? `${first} + ${rest.length}` : first;
        }
        if (typeof logData.energy_level === 'number') {
          const percent = parseEnergyPercent(logData.energy_level);
          if (percent != null) {
            updatedCards[2].label = `${percent}%`;
          }
        }

        setSymptomCards(updatedCards);
      } else {
        setSymptomCards(getDefaultSymptomCards());
      }

    } catch (error) {
      console.error('CycleHomeScreen loadCycleData error', error);
      setCycleData(null);
      setPeriodHistory([]);
      setActivePrediction(null);
      setFeedbackHistory([]);
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

  const activePredictionAnchor = activePrediction?.cycle_anchor_date || activePrediction?.predicted_period_date || null;
  const fallbackPredictedAnchor = cycleData?.nextPeriodDate || null;

  const confirmedDayMap = useMemo(() => {
    const result = new Map();
    periodHistory.forEach((period) => {
      const startYmd = toYMD(period.start_date);
      if (!startYmd) return;
      const endYmd = toYMD(period.end_date || addDays(startYmd, Math.max(1, avgPeriodLength - 1)));
      if (!endYmd) return;

      const distance = daysBetween(endYmd, startYmd);
      if (distance == null || distance < 0) return;

      for (let idx = 0; idx <= distance; idx += 1) {
        const day = toYMD(addDays(startYmd, idx));
        if (day) result.set(day, period);
      }
    });
    return result;
  }, [avgPeriodLength, periodHistory]);

  const confirmedStartSet = useMemo(
    () => new Set(periodHistory.map((row) => row.start_date).filter(Boolean)),
    [periodHistory],
  );

  const predictedPeriodDays = useMemo(() => {
    if (!activePrediction || activePrediction.status === 'rejected') return [];
    const fromPrediction = normalizeDateArray(activePrediction.predicted_period_days);
    if (fromPrediction.length) return fromPrediction;
    if (!activePredictionAnchor) return [];
    return Array.from({ length: Math.max(2, avgPeriodLength) }, (_, idx) =>
      toYMD(addDays(activePredictionAnchor, idx)),
    );
  }, [activePrediction, activePredictionAnchor, avgPeriodLength]);

  const predictedPeriodDaysWithFallback = useMemo(() => {
    if (predictedPeriodDays.length) return predictedPeriodDays;
    if (!fallbackPredictedAnchor) return [];
    return Array.from({ length: Math.max(2, avgPeriodLength) }, (_, idx) =>
      toYMD(addDays(fallbackPredictedAnchor, idx)),
    );
  }, [avgPeriodLength, fallbackPredictedAnchor, predictedPeriodDays]);

  const predictedPeriodSet = useMemo(
    () => new Set(predictedPeriodDaysWithFallback),
    [predictedPeriodDaysWithFallback],
  );

  const predictedStartAnchor = activePredictionAnchor || fallbackPredictedAnchor || null;
  const predictedStartSet = useMemo(
    () => new Set(predictedStartAnchor ? [predictedStartAnchor] : []),
    [predictedStartAnchor],
  );

  const fertileSet = useMemo(() => {
    const fromPrediction = normalizeDateArray(activePrediction?.predicted_fertile_days);
    if (fromPrediction.length) return new Set(fromPrediction);
    return new Set();
  }, [activePrediction]);

  const pmsSet = useMemo(() => {
    const fromPrediction = normalizeDateArray(activePrediction?.predicted_pms_days);
    if (fromPrediction.length) return new Set(fromPrediction);
    return new Set();
  }, [activePrediction]);

  const markedDates = useMemo(() => {
    const next = {};
    const precedence = {
      default: 0,
      fertile: 1,
      pms: 1,
      predicted_period: 2,
      confirmed_period: 3,
    };

    const mergeState = (ymd, state) => {
      if (!ymd) return;
      const current = next[ymd]?.state || 'default';
      if (precedence[state] >= precedence[current]) {
        next[ymd] = { state };
      }
    };

    fertileSet.forEach((ymd) => mergeState(ymd, 'fertile'));
    pmsSet.forEach((ymd) => mergeState(ymd, 'pms'));
    predictedPeriodSet.forEach((ymd) => mergeState(ymd, 'predicted_period'));
    confirmedDayMap.forEach((_, ymd) => mergeState(ymd, 'confirmed_period'));

    return next;
  }, [confirmedDayMap, fertileSet, pmsSet, predictedPeriodSet]);

  const getCycleStateForDate = useCallback(
    (date) => {
      const ymd = toYMD(date);
      if (!ymd) return 'default';

      if (markedDates[ymd]?.state) return markedDates[ymd].state;

      const targetDate = toUtcMidnight(date);
      if (!targetDate || !cycleData?.lastPeriodDate) return 'default';
      const lastPeriod = parseYMD(cycleData.lastPeriodDate) || toUtcMidnight(cycleData.lastPeriodDate);
      if (!lastPeriod) return 'default';
      const diff = Math.floor((targetDate.getTime() - lastPeriod.getTime()) / MS_IN_DAY);
      if (diff < 0) return 'default';
      const cycleDay = (diff % cycleData.cycleLength) + 1;
      const daysUntilNextPeriod = Math.max(0, cycleData.cycleLength - cycleDay);
      if (cycleDay >= 13 && cycleDay <= 16) return 'fertile';
      if (daysUntilNextPeriod <= 5) return 'pms';
      return 'default';
    },
    [markedDates, cycleData],
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
      const ymd = toYMD(cellDate);
      const state = getCycleStateForDate(cellDate);

      cells.push({
        key: `${cellDate.toISOString()}-${index}`,
        label: cellDate.getDate(),
        date: cellDate,
        ymd,
        isCurrentMonth,
        state,
        isToday: isSameDay(cellDate, today),
        isPredictedStart: predictedStartSet.has(ymd) && !confirmedStartSet.has(ymd),
        confirmedPeriod: confirmedDayMap.get(ymd) || null,
      });
    }

    return chunk(cells, 7);
  }, [calendarDate, confirmedDayMap, confirmedStartSet, getCycleStateForDate, predictedStartSet, today]);

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
  const openSourcesModal = (categoryKey) => setActiveSourcesKey(categoryKey || 'cycle_estimates');
  const closeSourcesModal = () => setActiveSourcesKey(null);

  const todayLabel = today.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const handlePrevMonth = () => setCalendarDate((prev) => addMonths(prev, -1));
  const handleNextMonth = () => setCalendarDate((prev) => addMonths(prev, 1));

  const handleLogSymptoms = () => {
    navigation.navigate('SymptomLog');
  };

  const openPeriodCheckInSheet = (meta) => {
    const inferredPeriodDay =
      meta?.period?.start_date && meta?.ymd
        ? Math.max(1, (daysBetween(meta.ymd, meta.period.start_date) ?? 0) + 1)
        : 1;
    setSelectedDayMeta(meta);
    setPeriodDay(meta?.periodDay || inferredPeriodDay || 1);
    setFlowLevel('heavy');
    setPeriodCheckInView(meta?.initialView || 'log');
    setPeriodCheckInVisible(true);
  };

  const closePeriodCheckInSheet = () => {
    setPeriodCheckInVisible(false);
    setSelectedDayMeta(null);
    setPeriodCheckInView('log');
  };

  const getUserContext = async () => {
    const user = await getVerifiedUser();
    if (!user) throw new Error('Please sign in to track your cycle.');
    const canonicalUserId = await getCanonicalUserId(user);
    return { user, canonicalUserId };
  };

  const clearOverlappingPeriods = async (canonicalUserId, startYmd, endYmd, excludedPeriodId = null) => {
    const { data: existingRows, error } = await supabase
      .from('periods')
      .select('id, start_date, end_date')
      .eq('user_id', canonicalUserId)
      .order('start_date', { ascending: false });
    if (error || !existingRows?.length) return;

    const incomingStart = parseYMD(startYmd);
    const incomingEnd = parseYMD(endYmd);
    if (!incomingStart || !incomingEnd) return;

    const overlappingIds = existingRows
      .filter((row) => row.id !== excludedPeriodId)
      .filter((row) => {
        const rowStart = parseYMD(row.start_date);
        if (!rowStart) return false;
        const rowEnd = row.end_date ? parseYMD(row.end_date) : addDaysUtc(rowStart, Math.max(1, avgPeriodLength - 1));
        if (!rowEnd) return false;
        return rowStart <= incomingEnd && rowEnd >= incomingStart;
      })
      .map((row) => row.id);

    if (!overlappingIds.length) return;
    await supabase.from('periods').delete().in('id', overlappingIds);
  };

  const handleDayPress = (date, dayMeta) => {
    if (dayMeta?.isPredictedStart) {
      openPeriodCheckInSheet({
        mode: 'predicted_start',
        ymd: dayMeta.ymd,
        date,
        predictionId: activePrediction?.id || null,
        isPredictedStartDay: true,
        initialView: 'confirm',
      });
      return;
    }

    if (dayMeta?.confirmedPeriod) {
      openPeriodCheckInSheet({
        mode: 'confirmed_day',
        ymd: dayMeta.ymd,
        date,
        period: dayMeta.confirmedPeriod,
        initialView: 'log',
      });
      return;
    }

    openPeriodCheckInSheet({
      mode: 'manual',
      ymd: dayMeta?.ymd || toYMD(date),
      date,
      initialView: 'log',
    });
  };

  const handleOpenEditDates = () => {
    setPeriodCheckInView('log');
  };

  const handleConfirmPredictedStart = async () => {
    if (!selectedDayMeta?.ymd) return;
    setSavingDay(true);
    try {
      const { user, canonicalUserId } = await getUserContext();
      const startYmd = selectedDayMeta.ymd;
      const endYmd = toYMD(addDays(startYmd, Math.max(1, avgPeriodLength - 1)));

      await clearOverlappingPeriods(canonicalUserId, startYmd, endYmd);
      await supabase
        .from('periods')
        .upsert(
          [
            {
              user_id: canonicalUserId,
              start_date: startYmd,
              end_date: endYmd,
            },
          ],
          { onConflict: 'user_id,start_date' },
        );

      await submitPredictionFeedback({
        userId: canonicalUserId,
        predictionId: activePrediction?.id || null,
        predictedStartDate: startYmd,
        feedbackType: 'confirmed',
        correctedStartDate: startYmd,
      });

      await updatePredictionStatus({
        predictionId: activePrediction?.id || null,
        userId: canonicalUserId,
        status: 'confirmed',
        isActive: false,
      });

      await updatePredictionsForUser(canonicalUserId, { includeUserIds: [user.id] });

      posthog?.capture('cycle_prediction_feedback', {
        action: 'confirmed',
        source: 'cycle_calendar',
        predicted_start_date: startYmd,
      });

      closePeriodCheckInSheet();
      setToast('Period confirmed');
      setTimeout(() => setToast(null), 1800);
      loadCycleData();
    } catch (err) {
      console.error('Confirm predicted start failed', err);
      Alert.alert('Update failed', err?.message ?? 'Please try again.');
    } finally {
      setSavingDay(false);
    }
  };

  const handleRejectPredictedStart = async () => {
    if (!selectedDayMeta?.ymd) return;
    setSavingDay(true);
    try {
      const { user, canonicalUserId } = await getUserContext();

      await submitPredictionFeedback({
        userId: canonicalUserId,
        predictionId: activePrediction?.id || null,
        predictedStartDate: selectedDayMeta.ymd,
        feedbackType: 'rejected',
      });

      await updatePredictionStatus({
        predictionId: activePrediction?.id || null,
        userId: canonicalUserId,
        status: 'rejected',
        isActive: false,
      });

      await updatePredictionsForUser(canonicalUserId, { includeUserIds: [user.id] });

      posthog?.capture('cycle_prediction_feedback', {
        action: 'rejected',
        source: 'cycle_calendar',
        predicted_start_date: selectedDayMeta.ymd,
      });

      closePeriodCheckInSheet();
      setToast('Prediction updated');
      setTimeout(() => setToast(null), 1800);
      loadCycleData();
    } catch (err) {
      console.error('Reject predicted start failed', err);
      Alert.alert('Update failed', err?.message ?? 'Please try again.');
    } finally {
      setSavingDay(false);
    }
  };

  const handleMarkConfirmedIncorrect = async () => {
    if (!selectedDayMeta?.period?.id) return;
    setSavingDay(true);
    try {
      const { user, canonicalUserId } = await getUserContext();
      await supabase
        .from('periods')
        .delete()
        .eq('id', selectedDayMeta.period.id)
        .eq('user_id', canonicalUserId);

      await submitPredictionFeedback({
        userId: canonicalUserId,
        predictionId: activePrediction?.id || null,
        predictedStartDate: activePredictionAnchor || selectedDayMeta.period.start_date,
        feedbackType: 'corrected',
      });

      await updatePredictionsForUser(canonicalUserId, { includeUserIds: [user.id] });
      closePeriodCheckInSheet();
      setToast('Period entry removed');
      setTimeout(() => setToast(null), 1800);
      loadCycleData();
    } catch (err) {
      console.error('Mark incorrect failed', err);
      Alert.alert('Update failed', err?.message ?? 'Please try again.');
    } finally {
      setSavingDay(false);
    }
  };

  const handleSaveDay = async () => {
    if (!selectedDayMeta?.date) return;
    setSavingDay(true);
    try {
      const { user, canonicalUserId } = await getUserContext();
      const startDate = addDays(selectedDayMeta.date, -(periodDay - 1));
      const estimatedPeriodLength = Math.max(2, avgPeriodLength, periodDay);
      const endDate = addDays(startDate, estimatedPeriodLength - 1);
      const startYmd = toYMD(startDate);
      const endYmd = toYMD(endDate);
      if (!startYmd || !endYmd) throw new Error('Invalid date selected');

      await clearOverlappingPeriods(canonicalUserId, startYmd, endYmd, selectedDayMeta?.period?.id || null);

      await supabase
        .from('periods')
        .upsert(
          [{
            user_id: canonicalUserId,
            start_date: startYmd,
            end_date: endYmd,
          }],
          { onConflict: 'user_id,start_date' },
        );

      if (selectedDayMeta?.mode === 'predicted_start' || selectedDayMeta?.mode === 'confirmed_day') {
        await submitPredictionFeedback({
          userId: canonicalUserId,
          predictionId: selectedDayMeta?.predictionId || activePrediction?.id || null,
          predictedStartDate: selectedDayMeta?.ymd || activePredictionAnchor || startYmd,
          feedbackType: 'corrected',
          correctedStartDate: startYmd,
        });
        await updatePredictionStatus({
          predictionId: selectedDayMeta?.predictionId || activePrediction?.id || null,
          userId: canonicalUserId,
          status: 'superseded',
          isActive: false,
        });
      }

      try {
        await updatePredictionsForUser(canonicalUserId, { includeUserIds: [user.id] });
      } catch (err) {
        console.log('Prediction refresh failed', err);
      }

      posthog?.capture('cycle_logged', {
        source: 'cycle_home',
        start_date: startYmd,
        end_date: endYmd,
        period_day: periodDay,
      });

      closePeriodCheckInSheet();
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
        const user = await getVerifiedUser();

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
    <TabSwipeWrapper activeKey="Cycle">
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

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.summaryTitleRow}>
                <Text style={styles.cardTitle}>Monthly Cycle</Text>
                <InfoIcon onPress={() => openSourcesModal('cycle_phase_patterns')} />
              </View>
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
              </View>
            </View>
          </View>

          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <View style={styles.calendarTitleRow}>
                <Text style={styles.calendarTitle}>{monthLabel}</Text>
                <InfoIcon onPress={() => openSourcesModal('cycle_estimates')} />
              </View>
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

                    if (day.state === 'confirmed_period') {
                      dayStyles.push(styles.calendarDayConfirmedPeriod);
                      textStyles.push(styles.calendarDayConfirmedPeriodText);
                    } else if (day.state === 'predicted_period') {
                      dayStyles.push(styles.calendarDayPredictedPeriod);
                      textStyles.push(styles.calendarDayPredictedPeriodText);
                    } else if (day.state === 'fertile') {
                      dayStyles.push(styles.calendarDayFertile);
                      textStyles.push(styles.calendarDayFertileText);
                    } else if (day.state === 'pms') {
                      dayStyles.push(styles.calendarDayPms);
                      textStyles.push(styles.calendarDayPmsText);
                    }

                    if (day.isToday && day.state !== 'confirmed_period' && day.state !== 'predicted_period') {
                      dayStyles.push(styles.calendarDayToday);
                      textStyles.push(styles.calendarDayTodayText);
                    }

                    return (
                      <TouchableOpacity
                        key={day.key}
                        style={dayStyles}
                        activeOpacity={0.8}
                        onPress={() => handleDayPress(day.date, day)}
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

          <View style={[styles.card, styles.moodCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Today's symptoms</Text>
              <Text style={styles.cardSubtitle}>{todayLabel}</Text>
            </View>
            <View style={styles.symptomRow}>
              {symptomCards.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.symptomCard, { backgroundColor: item.background }]}
                  activeOpacity={0.85}
                  onPress={handleLogSymptoms}
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
                </TouchableOpacity>
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
          {__DEV__ ? (
            <View style={styles.devCard}>
              <Text style={styles.devTitle}>Cycle debug</Text>
              <Text style={styles.devLine}>
                {`period logs: ${periodHistory.length} | active prediction: ${activePredictionAnchor || 'none'}`}
              </Text>
              <Text style={styles.devLine}>
                {`feedback entries: ${feedbackHistory.length}`}
              </Text>
            </View>
          ) : null}
          <Disclaimer compact style={styles.disclaimerBlock} />
        </ScrollView>
      </View>

      {toast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <PeriodCheckInSheet
        visible={periodCheckInVisible}
        selectedDate={selectedDayMeta?.date || null}
        viewMode={periodCheckInView}
        isPredictedStartDay={Boolean(selectedDayMeta?.isPredictedStartDay)}
        isConfirmedPeriodDay={selectedDayMeta?.mode === 'confirmed_day'}
        periodDay={periodDay}
        flowLevel={flowLevel}
        flowOptions={FLOW_OPTIONS}
        saving={savingDay}
        onClose={closePeriodCheckInSheet}
        onSwitchToLog={handleOpenEditDates}
        onConfirmStart={handleConfirmPredictedStart}
        onRejectStart={handleRejectPredictedStart}
        onPeriodDayChange={setPeriodDay}
        onFlowLevelChange={setFlowLevel}
        onSave={handleSaveDay}
        onMarkIncorrect={handleMarkConfirmedIncorrect}
      />

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

      <SourcesModal
        visible={Boolean(activeSourcesKey)}
        onClose={closeSourcesModal}
        categoryKey={activeSourcesKey || 'cycle_estimates'}
      />

        <BottomTaskbar activeKey="Cycle" />
      </SafeAreaView>
    </TabSwipeWrapper>
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
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  calendarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  calendarDayConfirmedPeriod: {
    backgroundColor: '#F6B8C8',
    borderWidth: 1.6,
    borderStyle: 'dotted',
    borderColor: '#EA5C7B',
  },
  calendarDayConfirmedPeriodText: {
    color: '#922B4A',
    fontWeight: '700',
  },
  calendarDayPredictedPeriod: {
    backgroundColor: 'transparent',
    borderWidth: 1.6,
    borderStyle: 'dotted',
    borderColor: '#EA5C7B',
  },
  calendarDayPredictedPeriodText: {
    color: '#C2446C',
  },
  calendarDayFertile: {
    backgroundColor: '#F0EFF5',
  },
  calendarDayPms: {
    backgroundColor: '#EEE5FF',
  },
  calendarDayFertileText: {
    color: '#9C6BFF',
  },
  calendarDayPmsText: {
    color: '#4B117B',
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
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
  devCard: {
    backgroundColor: '#F7F1FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6D7FF',
    padding: 12,
    gap: 3,
  },
  devTitle: {
    color: '#43206B',
    fontWeight: '700',
    fontSize: 12,
  },
  devLine: {
    color: '#655283',
    fontSize: 12,
  },
  disclaimerBlock: {
    marginTop: 2,
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
