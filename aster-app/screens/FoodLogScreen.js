import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
  Animated,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Path, Defs, ClipPath, Rect, G, LinearGradient, Stop } from 'react-native-svg';
import { supabase } from '../lib/supabase';
import { ensureUserRecord, getCanonicalUserId } from '../utils/authUser';
import { fetchUserDailyLogs } from '../utils/meallogger';
import { getUserNutritionGoals } from '../utils/nutritionCalculator';
import BottomTaskbar from '../components/BottomTaskbar';
import { BlurView } from 'expo-blur';

const BACKGROUND = '#E9E2F4';
const CARD = '#FFFFFF';
const TEXT_PRIMARY = '#2D1B4E';
const TEXT_MUTED = '#7D7394';
const ACCENT_PURPLE = '#000000';
const ACCENT_TEAL = '#2AA6A2';
const ACCENT_BLUE = '#5EA5FF';
const ACCENT_GOLD = '#D88C4E';
const CAL_ICON_GOLD = '#F2A33C';
const CAL_ICON_PURPLE = '#6B7DF6';
const ML_PER_OZ = 29.5735;
const DATE_FORMAT_OPTIONS = { weekday: 'short', month: 'short', day: 'numeric' };

const ProgressRing = ({
  size = 140,
  strokeWidth = 10,
  progress,
  color,
  trackColor,
  gradient,
  children,
}) => {
  const clamped = Math.max(0, Math.min(progress, 1));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - clamped * circumference;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {gradient ? (
          <Defs>
            <LinearGradient id={gradient.id} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={gradient.from} />
              <Stop offset="100%" stopColor={gradient.to} />
            </LinearGradient>
          </Defs>
        ) : null}
        <Circle
          stroke={trackColor}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke={gradient ? `url(#${gradient.id})` : color}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <View style={styles.ringInner}>{children}</View>
    </View>
  );
};

const GoalIcon = ({ size = 14 }) => (
  <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <G clipPath="url(#clip0)">
      <Path
        d="M11.9324 2.06797L13.3989 2.3611C13.4776 2.37685 13.5424 2.4346 13.5651 2.51247C13.5766 2.5503 13.5776 2.59054 13.5681 2.6289C13.5585 2.66727 13.5388 2.70232 13.5109 2.73035L12.3095 3.9326C12.1655 4.07575 11.9709 4.15625 11.7679 4.1566H10.7713L8.26875 6.65997C8.31649 6.84024 8.32527 7.02862 8.29451 7.21254C8.26374 7.39647 8.19413 7.57173 8.09031 7.72665C7.9865 7.88157 7.85087 8.01258 7.69245 8.11097C7.53403 8.20935 7.35646 8.27285 7.17158 8.29723C6.9867 8.32161 6.79874 8.30631 6.62023 8.25236C6.44172 8.1984 6.27676 8.10702 6.13634 7.98431C5.99592 7.8616 5.88326 7.71037 5.80586 7.54071C5.72847 7.37104 5.68812 7.18683 5.6875 7.00035C5.68746 6.79894 5.73377 6.60023 5.82284 6.4196C5.91191 6.23896 6.04136 6.08125 6.20117 5.95867C6.36097 5.83608 6.54684 5.75192 6.74439 5.7127C6.94194 5.67348 7.14586 5.68024 7.34037 5.73247L9.84375 3.22822V2.23335C9.84375 2.03035 9.92425 1.83522 10.0677 1.69172L11.27 0.489473C11.298 0.461586 11.3331 0.441815 11.3714 0.432263C11.4098 0.42271 11.45 0.423733 11.4879 0.435223C11.5657 0.457973 11.6235 0.522723 11.6392 0.601473L11.9324 2.06797Z"
        fill="#FF383C"
      />
      <Path
        d="M1.75 6.9997C1.7509 7.75042 1.91279 8.49221 2.22474 9.17504C2.5367 9.85787 2.99148 10.4659 3.55838 10.958C4.12529 11.4501 4.79115 11.8149 5.51104 12.0278C6.23093 12.2408 6.98811 12.2968 7.73151 12.1922C8.4749 12.0876 9.18722 11.8248 9.8204 11.4215C10.4536 11.0182 10.9929 10.4838 11.402 9.85432C11.8111 9.22486 12.0804 8.51499 12.1919 7.77258C12.3033 7.03018 12.2542 6.27252 12.0479 5.5507C12.0189 5.46637 12.0074 5.37703 12.0141 5.28811C12.0207 5.1992 12.0454 5.11257 12.0866 5.0335C12.1279 4.95443 12.1847 4.88458 12.2538 4.82819C12.3229 4.77181 12.4027 4.73007 12.4884 4.70552C12.5742 4.68097 12.664 4.67412 12.7524 4.68539C12.8409 4.69666 12.9261 4.72581 13.0029 4.77107C13.0797 4.81633 13.1466 4.87676 13.1993 4.94866C13.252 5.02057 13.2896 5.10245 13.3096 5.18933C13.7091 6.58716 13.6332 8.07806 13.0939 9.42812C12.5546 10.7782 11.5824 11.911 10.3297 12.6489C9.07712 13.3868 7.61498 13.6879 6.17273 13.5052C4.73047 13.3224 3.38969 12.666 2.36075 11.639C1.33292 10.6103 0.675826 9.26936 0.492626 7.82677C0.309426 6.38418 0.610496 4.92159 1.34857 3.66864C2.08664 2.41569 3.21992 1.44333 4.57047 0.904226C5.92102 0.365119 7.41237 0.289795 8.81037 0.690078C8.97683 0.738738 9.11727 0.851312 9.20098 1.0032C9.28469 1.15508 9.30488 1.33393 9.25713 1.50066C9.20938 1.66738 9.09757 1.80843 8.94614 1.89297C8.79472 1.97751 8.61598 1.99867 8.449 1.95183C7.66725 1.72735 6.84403 1.68757 6.04428 1.83563C5.24453 1.98369 4.49011 2.31554 3.84054 2.80501C3.19097 3.29448 2.664 3.92818 2.30121 4.65613C1.93842 5.38408 1.74972 6.18636 1.75 6.9997Z"
        fill="#FF383C"
      />
      <Path
        d="M4.375 6.99977C4.37505 7.47804 4.50568 7.94722 4.75279 8.3567C4.99991 8.76617 5.35413 9.10042 5.77725 9.32337C6.20037 9.54632 6.67633 9.64952 7.1538 9.62183C7.63126 9.59415 8.09211 9.43663 8.48662 9.16627C8.88107 8.89523 9.19391 8.52151 9.39131 8.08553C9.58872 7.64954 9.66317 7.16789 9.60662 6.69265C9.59133 6.57732 9.60705 6.46001 9.65217 6.35278C9.69728 6.24555 9.77016 6.15228 9.86331 6.08258C9.95645 6.01288 10.0665 5.96927 10.1821 5.95623C10.2977 5.94319 10.4147 5.9612 10.521 6.0084C10.6273 6.05499 10.7194 6.12893 10.7878 6.2227C10.8562 6.31647 10.8985 6.4267 10.9104 6.54215C11.0054 7.35424 10.8454 8.17578 10.4523 8.89275C10.0593 9.60972 9.45281 10.1866 8.71705 10.5432C7.98129 10.8998 7.15276 11.0186 6.34646 10.883C5.54015 10.7473 4.79606 10.3641 4.21747 9.78635C3.63887 9.20864 3.25448 8.46513 3.11763 7.65903C2.98078 6.85293 3.09827 6.02422 3.45379 5.28792C3.8093 4.55163 4.38522 3.94427 5.10159 3.55014C5.81797 3.15602 6.63927 2.99468 7.4515 3.08852C7.53847 3.09659 7.62295 3.12194 7.7 3.16309C7.77705 3.20423 7.84511 3.26034 7.90019 3.32813C7.95527 3.39592 7.99626 3.47402 8.02076 3.55786C8.04527 3.64169 8.05279 3.72958 8.04289 3.81636C8.03299 3.90314 8.00586 3.98707 7.9631 4.06323C7.92034 4.1394 7.86281 4.20626 7.79388 4.25989C7.72494 4.31353 7.64599 4.35287 7.56166 4.3756C7.47733 4.39833 7.3893 4.404 7.30275 4.39227C6.93495 4.34957 6.56228 4.38516 6.20921 4.4967C5.85614 4.60825 5.53066 4.79323 5.25415 5.03949C4.97765 5.28575 4.75637 5.58772 4.60485 5.92557C4.45333 6.26342 4.375 6.6295 4.375 6.99977Z"
        fill="#FF383C"
      />
    </G>
    <Defs>
      <ClipPath id="clip0">
        <Rect width="14" height="14" fill="white" />
      </ClipPath>
    </Defs>
  </Svg>
);

const MacroBar = ({ label, value, goal, color }) => {
  const progress = goal ? Math.min(value / goal, 1) : 0;
  return (
    <View style={styles.macroRow}>
      <View style={styles.macroHeaderRow}>
        <Text style={styles.macroLabel}>{label}</Text>
        <View style={styles.macroGoalWrap}>
          <GoalIcon size={12} />
          <Text style={styles.macroGoal}>{`${goal}g`}</Text>
        </View>
      </View>
      <View style={styles.macroBarTrack}>
        <View style={[styles.macroBarFill, { width: `${progress * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.macroValue}>{`${value}g`}</Text>
    </View>
  );
};

const FoodLogScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [goals, setGoals] = useState(null);
  const [daily, setDaily] = useState(null);
  const [lastWaterLog, setLastWaterLog] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [mealPickerVisible, setMealPickerVisible] = useState(false);
  const [waterModalVisible, setWaterModalVisible] = useState(false);
  const [waterInput, setWaterInput] = useState('');
  const [waterUnit, setWaterUnit] = useState('oz');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [draftGoals, setDraftGoals] = useState({
    calories: '',
    carbs: '',
    protein: '',
    fat: '',
    water: '',
  });
  const [inlineError, setInlineError] = useState(null);
  const slideAnim = useMemo(() => new Animated.Value(300), []);

  const dateKey = useMemo(() => {
    const d = new Date(selectedDate);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [selectedDate]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setInlineError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setDaily(null);
        setGoals(null);
        return;
      }

      await ensureUserRecord(user);
      const canonicalUserId = await getCanonicalUserId(user);

      const [dailyData, goalData] = await Promise.all([
        fetchUserDailyLogs(canonicalUserId, dateKey),
        getUserNutritionGoals(supabase, canonicalUserId),
      ]);

      // Fetch all water logs for the day to compute total + last log time
      const { data: logs, error: waterFetchError } = await supabase
        .from('water_logs')
        .select('water_intake_ml, created_at')
        .eq('user_id', canonicalUserId)
        .eq('log_date', dateKey)
        .order('created_at', { ascending: false });

      if (waterFetchError) {
        setInlineError('Water data could not be refreshed. Pull to retry.');
      }

      const latest = logs?.[0];
      const totalMl = (logs || []).reduce((sum, row) => sum + (row.water_intake_ml || 0), 0);
      const totalOz = totalMl ? totalMl / ML_PER_OZ : 0;
      const mergedDaily = {
        ...dailyData,
        water: dailyData?.water ?? totalOz,
      };

      setDaily(mergedDaily);
      setGoals(goalData);
      setLastWaterLog(latest ? { ounces: (latest.water_intake_ml || 0) / ML_PER_OZ, time: latest.created_at } : null);
    } catch (err) {
      console.error('Error loading food log data:', err);
      setInlineError('We could not refresh your nutrition data. Please pull to refresh or try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    if (route?.params?.refreshData || route?.params?.timestamp) {
      console.log('[FoodLog] Refresh triggered via navigation params');
      loadData();
    }
  }, [route?.params?.refreshData, route?.params?.timestamp, loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const totalCalories = Math.round(daily?.dailyTotals?.total_calories || 0);
  const calorieGoal = Math.round(goals?.calories || 1400);
  const macroTotals = {
    carbs: Math.round(daily?.dailyTotals?.total_carbs || 0),
    protein: Math.round(daily?.dailyTotals?.total_protein || 0),
    fat: Math.round(daily?.dailyTotals?.total_fat || 0),
  };
  const macroGoals = {
    carbs: Math.round(goals?.carbs || 120),
    protein: Math.round(goals?.protein || 120),
    fat: Math.round(goals?.fat || 120),
  };

  const mealBreakdown = useMemo(() => {
    const base = { Breakfast: 0, Lunch: 0, Dinner: 0, Snack: 0 };
    (daily?.meals || []).forEach((meal) => {
      const type = meal.meal_type || meal.type;
      const calories = meal.calories ?? meal.total_calories ?? 0;
      if (type && base.hasOwnProperty(type)) {
        base[type] += Number(calories) || 0;
      }
    });
    return base;
  }, [daily?.meals]);

  const waterConsumed = useMemo(() => {
    const water = daily?.water ?? 0;
    return Math.round(water);
  }, [daily]);

  const waterGoal = Math.round(goals?.water || 0);
  const waterProgress = waterGoal ? waterConsumed / waterGoal : 0;
  const calorieProgress = calorieGoal ? totalCalories / calorieGoal : 0;

  const macrosData = [
    { key: 'carbs', label: 'Carbs', value: macroTotals.carbs, goal: macroGoals.carbs, color: ACCENT_TEAL },
    { key: 'protein', label: 'Protein', value: macroTotals.protein, goal: macroGoals.protein, color: ACCENT_BLUE },
    { key: 'fat', label: 'Fat', value: macroTotals.fat, goal: macroGoals.fat, color: ACCENT_GOLD },
  ];

  const formatRelativeTime = (isoDate) => {
    if (!isoDate) return 'No logs yet';
    const diff = Date.now() - new Date(isoDate).getTime();
    if (diff < 0) return 'Just now';
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    const days = Math.floor(hours / 24);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  };

  const lastLogLabel = lastWaterLog ? formatRelativeTime(lastWaterLog.time) : 'No logs yet';
  const caloriesBreakdownList = [
    { label: 'Breakfast', value: mealBreakdown.Breakfast, icon: 'sunny-outline', color: CAL_ICON_GOLD },
    { label: 'Lunch', value: mealBreakdown.Lunch, icon: 'restaurant-outline', color: CAL_ICON_GOLD },
    { label: 'Dinner', value: mealBreakdown.Dinner, icon: 'moon-outline', color: CAL_ICON_PURPLE },
    { label: 'Snacks', value: mealBreakdown.Snack, icon: 'cafe-outline', color: CAL_ICON_PURPLE },
  ];
  const shiftDay = (delta) => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(prev.getDate() + delta);
      return d;
    });
  };

  const dateLabel = useMemo(
    () => selectedDate.toLocaleDateString(undefined, DATE_FORMAT_OPTIONS),
    [selectedDate]
  );

  const handleLogWater = () => setWaterModalVisible(true);

  const saveWaterLog = async () => {
    const amount = parseFloat(waterInput);
    if (Number.isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid water amount.');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const canonicalUserId = await getCanonicalUserId(user);

      const amountOz = waterUnit === 'oz' ? amount : amount / ML_PER_OZ;
      const amountMl = waterUnit === 'ml' ? amount : amount * ML_PER_OZ;
      const nowIso = new Date().toISOString();

      await supabase.from('water_logs').insert({
        user_id: canonicalUserId,
        log_date: dateKey,
        water_intake_ml: amountMl,
        created_at: nowIso,
      });

      setLastWaterLog({ ounces: amountOz, time: nowIso });
      setDaily((prev) => ({
        ...prev,
        water: (prev?.water || 0) + amountOz,
      }));
      setWaterModalVisible(false);
      setWaterInput('');
      // Refresh after insert; keep UI optimistic even if RPC water is missing
      loadData();
    } catch (err) {
      console.error('Error logging water:', err);
      Alert.alert('Error', 'Could not save water log. Please try again.');
    }
  };

  useEffect(() => {
    if (goals) {
      setDraftGoals({
        calories: String(goals?.calories || ''),
        carbs: String(goals?.carbs || ''),
        protein: String(goals?.protein || ''),
        fat: String(goals?.fat || ''),
        water: String(goals?.water || ''),
      });
    }
  }, [goals]);

  const openEditGoals = () => {
    setDraftGoals({
      calories: String(goals?.calories || ''),
      carbs: String(goals?.carbs || ''),
      protein: String(goals?.protein || ''),
      fat: String(goals?.fat || ''),
      water: String(goals?.water || ''),
    });
    setEditModalVisible(true);
  };

  const saveEditGoals = () => {
    const updated = {
      calories: Number(draftGoals.calories) || 0,
      carbs: Number(draftGoals.carbs) || 0,
      protein: Number(draftGoals.protein) || 0,
      fat: Number(draftGoals.fat) || 0,
      water: Number(draftGoals.water) || 0,
    };
    setGoals(updated);
    setEditModalVisible(false);
  };

  const openMealPicker = () => {
    slideAnim.setValue(300);
    setMealPickerVisible(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 14,
      stiffness: 160,
    }).start();
  };

  const closeMealPicker = () => {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setMealPickerVisible(false));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.iconCircle}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="person-outline" size={20} color={ACCENT_PURPLE} />
        </TouchableOpacity>
        <View style={styles.iconGroup}>
          <TouchableOpacity style={styles.iconCircle} onPress={openEditGoals}>
            <Ionicons name="create-outline" size={18} color={ACCENT_PURPLE} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.dateRow}>
        <TouchableOpacity style={styles.dateArrow} onPress={() => shiftDay(-1)}>
          <Ionicons name="chevron-back" size={18} color={ACCENT_PURPLE} />
        </TouchableOpacity>
        <View style={styles.datePill}>
          <Text style={styles.dateText}>{dateLabel}</Text>
        </View>
        <TouchableOpacity style={styles.dateArrow} onPress={() => shiftDay(1)}>
          <Ionicons name="chevron-forward" size={18} color={ACCENT_PURPLE} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEXT_PRIMARY} />}
      >
        {inlineError && (
          <View style={styles.noticeBanner}>
            <Ionicons name="warning-outline" size={16} color="#8B1A1A" />
            <Text style={styles.noticeText}>{inlineError}</Text>
            <TouchableOpacity onPress={onRefresh} style={styles.noticeAction}>
              <Text style={styles.noticeActionText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={ACCENT_PURPLE} />
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Calories</Text>
                <View style={styles.goalChip}>
                  <GoalIcon size={14} />
                  <Text style={styles.goalChipText}>{`${calorieGoal || '--'} goal`}</Text>
                </View>
              </View>
              <View style={styles.breakdownGrid}>
                <View style={styles.breakdownColumn}>
                  {caloriesBreakdownList.slice(0, 2).map((item) => (
                    <View key={item.label} style={styles.breakdownRowItem}>
                      <Ionicons name={item.icon} size={18} color={item.color} />
                      <Text style={styles.breakdownLabel}>{item.label}</Text>
                      <Text style={styles.breakdownValue}>{`${Math.round(item.value)} cals`}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.calorieRingWrap}>
                  <ProgressRing
                    size={188}
                    strokeWidth={10}
                    progress={calorieProgress}
                    color={ACCENT_PURPLE}
                    gradient={{ id: 'calRingGradient', from: '#4B117B', to: '#7E5BAC' }}
                    trackColor="#F3F3F7"
                  >
                    <Text style={styles.calorieNumber}>{totalCalories.toLocaleString()}</Text>
                    <Text style={styles.calorieGoal}>{`/${calorieGoal.toLocaleString()}`}</Text>
                    <Text style={styles.calorieCaption}>Calories</Text>
                  </ProgressRing>
                </View>

                <View style={styles.breakdownColumn}>
                  {caloriesBreakdownList.slice(2).map((item) => (
                    <View key={item.label} style={styles.breakdownRowItem}>
                      <Ionicons name={item.icon} size={18} color={item.color} />
                      <Text style={styles.breakdownLabel}>{item.label}</Text>
                      <Text style={styles.breakdownValue}>{`${Math.round(item.value)} cals`}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={styles.logButton}
                activeOpacity={0.85}
                onPress={openMealPicker}
              >
                <Text style={styles.logButtonText}>+ Log Food</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Macros</Text>
              <View style={styles.macroList}>
                {macrosData.map((macro) => (
                  <MacroBar
                    key={macro.key}
                    label={macro.label}
                    value={macro.value}
                    goal={macro.goal}
                    color={macro.color}
                  />
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Water</Text>
              <View style={styles.waterTopRow}>
                <View style={styles.waterInfoItem}>
                  <View style={styles.infoRow}>
                    <GoalIcon size={16} />
                    <Text style={styles.waterInfoLabel}>Goal</Text>
                  </View>
                  <Text style={styles.waterInfoValue}>{waterGoal ? `${waterGoal} fl oz` : 'Set Goal'}</Text>
                </View>
                <View style={styles.waterRingWrap}>
                  <View style={styles.waterGlass}>
                    <View style={[styles.waterFill, { height: `${Math.min(1, waterProgress) * 100}%` }]} />
                    <View style={styles.waterInnerContent}>
                      <Text style={styles.waterNumber}>{waterConsumed}</Text>
                      <Text style={styles.waterCaption}>/ {waterGoal || '--'} Ounces</Text>
                    </View>
                  </View>
                </View>
                <View style={[styles.waterInfoItem, { alignItems: 'flex-end' }]}>
                  <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={16} color="#5AA8FF" />
                    <Text style={styles.waterInfoLabel}>Last Log</Text>
                  </View>
                  <Text style={styles.waterInfoValue}>{lastLogLabel}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.logButton}
                activeOpacity={0.85}
                onPress={handleLogWater}
              >
                <Text style={styles.logButtonText}>+ Log Water</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
      <BottomTaskbar activeKey="Food" />

      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setEditModalVisible(false)}>
            <Pressable style={styles.editModalCard} onPress={(e) => e.stopPropagation()}>
              <ScrollView
                contentContainerStyle={styles.editModalContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.modalTitle}>Edit Targets</Text>
                {[
                  { key: 'calories', label: 'Calories (kcal)' },
                  { key: 'carbs', label: 'Carbs (g)' },
                  { key: 'protein', label: 'Protein (g)' },
                  { key: 'fat', label: 'Fat (g)' },
                  { key: 'water', label: 'Water (fl oz)' },
                ].map((item) => (
                  <View key={item.key} style={styles.modalInputGroup}>
                    <Text style={styles.modalLabel}>{item.label}</Text>
                    <TextInput
                      value={draftGoals[item.key]}
                      onChangeText={(text) =>
                        setDraftGoals((prev) => ({ ...prev, [item.key]: text.replace(/[^0-9.]/g, '') }))
                      }
                      keyboardType="numeric"
                      placeholder={`Enter ${item.label.toLowerCase()}`}
                      style={styles.modalInput}
                      placeholderTextColor={TEXT_MUTED}
                      returnKeyType="done"
                    />
                  </View>
                ))}
              </ScrollView>
              <View style={styles.modalActions}>
                <Pressable style={styles.modalGhostButton} onPress={() => setEditModalVisible(false)}>
                  <Text style={styles.modalGhostText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.modalPrimaryButton} onPress={saveEditGoals}>
                  <Text style={styles.modalPrimaryText}>Save</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={waterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWaterModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setWaterModalVisible(false)}>
            <Pressable style={styles.waterModalCard} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Log Water</Text>

              <View style={styles.unitToggleRow}>
                {['oz', 'ml'].map((unit) => (
                  <Pressable
                    key={unit}
                    onPress={() => setWaterUnit(unit)}
                    style={[
                      styles.unitChip,
                      waterUnit === unit && styles.unitChipActive,
                    ]}
                  >
                    <Text style={[styles.unitChipText, waterUnit === unit && styles.unitChipTextActive]}>
                      {unit === 'oz' ? 'fl oz' : 'ml'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <TextInput
                placeholder={`Enter water in ${waterUnit === 'oz' ? 'fl oz' : 'ml'}`}
                keyboardType="numeric"
                value={waterInput}
                onChangeText={setWaterInput}
                style={styles.modalInput}
                placeholderTextColor="#8A819F"
              />

              <View style={styles.modalActions}>
                <Pressable onPress={() => setWaterModalVisible(false)} style={styles.modalGhostButton}>
                  <Text style={styles.modalGhostText}>Cancel</Text>
                </Pressable>
                <Pressable onPress={saveWaterLog} style={styles.modalPrimaryButton}>
                  <Text style={styles.modalPrimaryText}>Save</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={mealPickerVisible}
        animationType="fade"
        transparent
        onRequestClose={closeMealPicker}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeMealPicker}>
          <Animated.View style={[styles.sheetWrapper, { transform: [{ translateY: slideAnim }] }]}>
            <BlurView intensity={30} tint="light" style={styles.mealModalCard}>
              <View style={styles.modalHandleRow}>
                <TouchableOpacity style={styles.modalIconButton} onPress={closeMealPicker}>
                  <Ionicons name="close" size={18} color="#444" />
                </TouchableOpacity>
                <Text style={styles.mealModalTitle}>Select Meal</Text>
                <View style={styles.modalIconButton}>
                  <Ionicons name="arrow-up" size={18} color={ACCENT_PURPLE} />
                </View>
              </View>
              {['Breakfast', 'Lunch', 'Snack', 'Dinner'].map((meal) => (
                <TouchableOpacity
                  key={meal}
                  style={styles.mealOption}
                  activeOpacity={0.85}
                  onPress={() => {
                    closeMealPicker();
                    navigation.navigate('Camera', { mealType: meal });
                  }}
                >
                  <Text style={styles.mealOptionText}>{meal}</Text>
                </TouchableOpacity>
              ))}
            </BlurView>
          </Animated.View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

export default FoodLogScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  content: {
    padding: 16,
    paddingBottom: 120,
    gap: 14,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  iconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C7BDE8',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  datePill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: CARD,
    shadowColor: '#C7BDE8',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '700',
    color: ACCENT_PURPLE,
  },
  dateArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C7BDE8',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 18,
    shadowColor: '#C7BDE8',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  breakdownGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  breakdownColumn: {
    flex: 1,
    gap: 16,
  },
  breakdownRowItem: {
    alignItems: 'center',
    gap: 6,
  },
  breakdownLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  breakdownValue: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  calorieRingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  ringInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calorieNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  calorieGoal: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_MUTED,
    marginTop: -4,
  },
  calorieCaption: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 4,
  },
  logButton: {
    marginTop: 8,
    backgroundColor: '#EAEAEA',
    borderRadius: 24,
    alignItems: 'center',
    paddingVertical: 12,
  },
  logButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3A3A3A',
  },
  macroList: {
    gap: 16,
  },
  macroRow: {
    gap: 6,
  },
  macroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  macroGoalWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  macroLabel: {
    fontSize: 13,
    color: '#5A5A5A',
    fontWeight: '600',
  },
  macroGoal: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  macroBarTrack: {
    width: '100%',
    height: 8,
    borderRadius: 6,
    backgroundColor: '#E8E8ED',
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  macroValue: {
    alignSelf: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: '#2B2B2B',
  },
  waterTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 4,
  },
  waterInfoItem: {
    flex: 1,
  },
  waterInfoLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginLeft: 6,
  },
  waterInfoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginTop: 6,
  },
  waterRingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterGlass: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    borderColor: '#E6F2FF',
    overflow: 'hidden',
    backgroundColor: '#F7FBFF',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  waterFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#8ACDFF',
  },
  waterInnerContent: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  waterNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2D1B4E',
  },
  waterCaption: {
    fontSize: 12,
    color: '#5C5C5C',
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loaderWrap: {
    marginTop: 80,
    alignItems: 'center',
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCECEC',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#F5B7B1',
  },
  noticeText: {
    color: '#8B1A1A',
    fontSize: 13,
    flexShrink: 1,
  },
  noticeAction: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F3D6D6',
    borderRadius: 12,
    marginLeft: 'auto',
  },
  noticeActionText: {
    color: '#8B1A1A',
    fontWeight: '700',
    fontSize: 12,
  },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFE7FF',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  goalChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: ACCENT_PURPLE,
  },
  waterModalCard: {
    backgroundColor: CARD,
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 18,
    padding: 18,
    shadowColor: '#4B117B',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  unitToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  unitChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F1E9FF',
    alignItems: 'center',
  },
  unitChipActive: {
    backgroundColor: '#4B117B',
  },
  unitChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B117B',
  },
  unitChipTextActive: {
    color: '#FFFFFF',
  },
  modalInput: {
    backgroundColor: '#F7F4FF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: TEXT_PRIMARY,
    borderWidth: 1,
    borderColor: '#E3D8F5',
    marginBottom: 12,
  },
  editModalContent: {
    paddingBottom: 12,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 12,
  },
  editModalCard: {
    backgroundColor: CARD,
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 18,
    padding: 18,
    gap: 12,
    shadowColor: '#4B117B',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  modalInputGroup: {
    gap: 6,
  },
  modalLabel: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalGhostButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F1EDF8',
  },
  modalGhostText: {
    color: TEXT_PRIMARY,
    fontWeight: '600',
  },
  modalPrimaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: ACCENT_PURPLE,
  },
  modalPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
  },
  sheetWrapper: {
    width: '100%',
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
  mealModalCard: {
    width: '100%',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 16,
    overflow: 'hidden',
  },
  modalHandleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFEFF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealModalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#242424',
  },
  mealOption: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 16,
    marginBottom: 10,
    backgroundColor: '#EAEAEA',
  },
  mealOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C2C2C',
  },
});
