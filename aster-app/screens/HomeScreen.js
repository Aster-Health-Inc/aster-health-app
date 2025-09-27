import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StatusBar,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

import { supabase } from '../lib/supabase';
import { calculateCyclePhase, getPhaseInfo } from '../utils/cycleCalculations';
import FloatingChatButton from '../components/FloatingChatButton';
import ChatBotModal from '../components/ChatBotModal';

// Simple “glass” fallback with no native blur (no extra deps / no warnings)
const Glass = ({ style, children }) => (
  <View
    style={[
      style,
      {
        backgroundColor: 'rgba(255,255,255,0.72)',
        borderWidth: 0.5,
        borderColor: 'rgba(0,0,0,0.06)',
      },
    ]}
  >
    {children}
  </View>
);

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const COLORS = {
  bg: '#F4F5F7',
  card: '#FFFFFF',
  text: '#111111',
  sub: '#8C8C8C',

  chipPinkBg: '#FFECEF',
  chipPinkText: '#FF6B7A',
  chipLavBg: '#EFE8FF',
  chipLavText: '#6D58FF',

  ring: '#2F7D78',
  ringTrack: '#EFEFEF',

  progressTrack: '#EAEAEA',
  progressFill: '#111111',

  pill: '#F1F2F4',            // soft light gray like mock
  fertile: '#EFE7FF',         // light lavender fill for fertile days
  fertileDot: '#6B5CF6',      // legend dot for fertile
  black: '#111111',
  danger: '#EF4444',
};


const S = {
  cardRadius: 16,
  shadow: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
};

const RING_SIZE = 168;
const RING_STROKE = 12;
const RADIUS = (RING_SIZE - RING_STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

const HomeScreen = () => {
  const navigation = useNavigation();
  const [chatOpen, setChatOpen] = useState(false);

  const [currentMonthLabel, setCurrentMonthLabel] = useState('');
  const [currentDay, setCurrentDay] = useState(0);
  const [cycleData, setCycleData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Default collapsed: Monthly Cycle visible; pressing "+" opens Calendar.
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadCycleData();
    const today = new Date();
    setCurrentMonthLabel(today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
    setCurrentDay(today.getDate());
  }, []);

  const loadCycleData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [{ data: profile }, { data: userData }, { data: periods }] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('users').select('average_cycle_length, average_period_length').eq('id', user.id).single(),
        supabase.from('periods').select('start_date, end_date').eq('user_id', user.id).order('start_date', { ascending: false }).limit(1),
      ]);

      if (profile && userData) {
        const cycleLength = userData.average_cycle_length || 28;
        const periodLength = userData.average_period_length || 5;
        const lastPeriodDate = periods?.[0]?.start_date ?? null;

        if (lastPeriodDate) {
          const cycleInfo = calculateCyclePhase(lastPeriodDate, cycleLength);
          const nextPeriodDate = new Date(lastPeriodDate);
          nextPeriodDate.setDate(nextPeriodDate.getDate() + cycleLength);
          setCycleData({
            ...cycleInfo,
            periodLength,
            lastPeriodDate,
            nextPeriodDate: nextPeriodDate.toISOString().split('T')[0],
            cycleLength,
          });
        } else {
          setCycleData(null);
        }
      }
      setLoading(false);
    } catch (e) {
      console.error('loadCycleData error', e);
      setLoading(false);
    }
  };

  // Calendar generation (current month only)
  const generateCalendarDays = () => {
    if (!cycleData) return [];
    const today = new Date();
    const m = today.getMonth(), y = today.getFullYear();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const daysInMonth = last.getDate();
    const firstDow = first.getDay();

    const days = [];
    const prevLast = new Date(y, m, 0);
    for (let i = firstDow - 1; i >= 0; i--) {
      days.push({ day: prevLast.getDate() - i, month: 'prev', type: 'none' });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(y, m, d);
      const since = Math.floor((dt - new Date(cycleData.lastPeriodDate)) / (1000 * 60 * 60 * 24));
      const cday = (since % cycleData.cycleLength) + 1;
      let type = 'none';
      // Period
      if (cday <= cycleData.periodLength) {
        type = 'period';
      }
      // Fertile
      else if (cday >= 13 && cday <= 16) {
        type = 'fertile';
      }
      // PMS (last 5 days before day 1)
      else if (cday >= (cycleData.cycleLength - 5) && cday < cycleData.cycleLength) {
        type = 'pms';
      }

      days.push({ day: d, month: 'current', type, isToday: d === currentDay });
    }
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) days.push({ day: d, month: 'next', type: 'none' });
    return days;
  };
  const calendarDays = generateCalendarDays();

  const ringProgress = cycleData ? Math.min(Math.max(cycleData.progress, 0), 100) : 0;
  const dashOffset = CIRC * (1 - ringProgress / 100);
  const phaseName = cycleData ? getPhaseInfo(cycleData.phase)?.name ?? '—' : '—';

  const showCalendar = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(true);
  };
  const showMonthlyCycle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(false);
  };

  const CalendarDay = ({ d }) => {
  const isOther = d.month !== 'current';

  const pillStyle = [
    styles.pillBase,
    styles.pillLight, // default light gray
    d.type === 'period' && styles.pillPeriod,
    d.type === 'fertile' && styles.pillFertile,
    d.type === 'pms' && styles.pillPMS,
    d.isToday && styles.pillToday, // outline for today (keeps text visible)
    isOther && styles.pillOther,   // dim for other months
  ];

  const textStyle = [
    styles.pillText,
    d.type === 'period' && styles.pillTextInvert, // white on black
    isOther && styles.pillOtherText,
  ];

  return (
    <View style={styles.dayCell}>
      <View style={pillStyle}>
        <Text style={textStyle}>{d.day}</Text>
      </View>
    </View>
  );
};


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.avatar}>
          <View style={styles.avatarDot} />
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity style={styles.smallIconBtn}>
            <Ionicons name="calendar-outline" size={18} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={async () => {
              await supabase.auth.signOut();
              navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
            }}
          >
            <Text style={styles.resetText}>Reset App</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadCycleData} tintColor={COLORS.chipLavText} />
        }
      >
        {/* TOP REGION:
            Collapsed → Mini calendar strip
            Expanded  → Cycle Day summary card (replaces mini strip) */}
        {!expanded ? (
          <View style={[styles.card, styles.monthStrip]}>
            <View style={styles.monthRow}>
              <Text style={styles.monthTitle}>{currentMonthLabel}</Text>
              <View style={styles.navArrows}>
                <TouchableOpacity style={styles.arrowBtn}><Text style={styles.arrowText}>‹</Text></TouchableOpacity>
                <TouchableOpacity style={styles.arrowBtn}><Text style={styles.arrowText}>›</Text></TouchableOpacity>
              </View>
            </View>
            <View style={styles.weekRow}>
              {[30, 31, 1, 2, 3, 4, 5].map((n, i) => (
                <View key={i} style={[styles.weekPill, i >= 2 && i <= 5 && styles.weekPillActive]}>
                  <Text style={[styles.weekPillText, i >= 2 && i <= 5 && styles.weekPillTextActive]}>{n}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <TouchableOpacity activeOpacity={0.9} onPress={showMonthlyCycle} style={[styles.card, styles.cycleDayCard]}>
            <View style={styles.cycleTopRow}>
              <Text style={styles.sectionTitle}>Cycle Day</Text>
              <View style={[styles.phaseChip, { backgroundColor: COLORS.chipLavBg }]}>
                <Text style={[styles.phaseChipText, { color: COLORS.chipLavText }]}>
                  {phaseName || 'Follicular Phase'}
                </Text>
              </View>
            </View>

            <View style={styles.cycleContentRow}>
              <View style={styles.blackDayCircle}>
                <Text style={styles.blackDayText}>
                  {cycleData ? cycleData.currentCycleDay : '—'}
                </Text>
              </View>

              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.cycleNextText}>
                  {cycleData
                    ? (cycleData.daysUntilNext === 0 ? 'Next period in 0 days' : `Next period in ${cycleData.daysUntilNext} days`)
                    : 'Loading...'}
                </Text>
                <View style={styles.slimTrack}>
                  <View style={[styles.slimFill, { width: `${ringProgress}%` }]} />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* MIDDLE REGION:
            Collapsed → Monthly Cycle ring card (with + that opens calendar)
            Expanded  → Full Monthly Calendar */}
        {!expanded ? (
          <View style={[styles.card, styles.monthlyCard]}>
            <View style={styles.monthlyHeaderRow}>
              <Text style={styles.sectionTitle}>Monthly Cycle</Text>
              <View style={[styles.phaseChip, { backgroundColor: COLORS.chipPinkBg }]}>
                <Text style={[styles.phaseChipText, { color: COLORS.chipPinkText }]}>
                  {phaseName || 'Menstrual Phase'}
                </Text>
              </View>
            </View>

            <View style={styles.ringRow}>
              <View style={{ width: RING_SIZE, height: RING_SIZE }}>
                <Svg width={RING_SIZE} height={RING_SIZE}>
                  <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS} stroke={COLORS.ringTrack} strokeWidth={RING_STROKE} fill="none" />
                  <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RADIUS}
                    stroke={COLORS.ring}
                    strokeWidth={RING_STROKE}
                    fill="none"
                    strokeDasharray={`${CIRC} ${CIRC}`}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                  />
                </Svg>
                <View style={styles.ringCenter}>
                  <Text style={styles.dayBig}>{cycleData ? `Day ${cycleData.currentCycleDay}` : 'Day —'}</Text>
                  <Text style={styles.phaseSmall}>{phaseName || 'Menstrual Phase'}</Text>

                  {/* "+" opens Calendar view */}
                  <TouchableOpacity style={styles.plusBtn} onPress={showCalendar} activeOpacity={0.9}>
                    <Feather name="plus" size={18} color={COLORS.text} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.sideInfo}>
                <Text style={styles.nextPeriod}>
                  {cycleData
                    ? (cycleData.daysUntilNext === 0 ? 'Period is here' : `Next period in ${cycleData.daysUntilNext} days`)
                    : 'Loading...'}
                </Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${ringProgress}%` }]} />
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.card, styles.calendarCard]}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>{currentMonthLabel}</Text>
              <View style={styles.navArrows}>
                <TouchableOpacity style={styles.arrowBtn}><Text style={styles.arrowText}>‹</Text></TouchableOpacity>
                <TouchableOpacity style={styles.arrowBtn}><Text style={styles.arrowText}>›</Text></TouchableOpacity>
              </View>
            </View>

            <View style={styles.dowRow}>
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <Text key={i} style={styles.dowText}>{d}</Text>
              ))}
            </View>

            <View style={styles.grid}>
              {calendarDays.map((d, i) => <CalendarDay key={i} d={d} />)}
            </View>

<View style={styles.legend}>
  <View style={styles.legendItem}>
    <View style={[styles.legendDot, { backgroundColor: COLORS.black }]} />
    <Text style={styles.legendText}>Period</Text>
  </View>
  <View style={styles.legendItem}>
    <View style={[styles.legendDot, { backgroundColor: COLORS.fertileDot }]} />
    <Text style={styles.legendText}>Fertile</Text>
  </View>
  <View style={styles.legendItem}>
    <View style={[styles.legendDot, styles.legendDotDashed]} />
    <Text style={styles.legendText}>PMS</Text>
  </View>
</View>

          </View>
        )}

        {/* PERSISTENT: Todays Mood */}
        <View style={[styles.card, styles.moodCard]}>
          <View style={styles.moodHeaderRow}>
            <Text style={styles.moodTitle}>Todays Mood</Text>
            <Text style={styles.moodDate}>
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
          </View>

          <View style={styles.moodRow}>
            {[
              { label: 'Cramps', icon: <MaterialCommunityIcons name="emoticon-sick-outline" size={22} color="#6AA5A9" /> },
              { label: 'Happy',  icon: <MaterialCommunityIcons name="emoticon-happy-outline" size={22} color="#7D83FF" /> },
              { label: 'Medium', icon: <MaterialCommunityIcons name="battery-medium" size={22} color="#C7A36D" /> },
            ].map((m, i) => (
              <View key={i} style={styles.moodTile}>
                {m.icon}
                <Text style={styles.moodTileText}>{m.label}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.logMoodBtn} activeOpacity={0.9}>
            <Text style={styles.logMoodText}>+ Log Mood</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Floating Chat */}
      <View style={styles.chatWrap}>
        <FloatingChatButton onPress={() => setChatOpen(true)} />
      </View>
      <ChatBotModal visible={chatOpen} onClose={() => setChatOpen(false)} />

      {/* Glass floating bottom bar with 5 buttons */}
      <View pointerEvents="box-none" style={styles.bottomWrap}>
        <Glass style={styles.glassBar}>
          {[
            { label: 'Home',    icon: <Ionicons name="home-outline" size={22} color={COLORS.text} /> , onPress: () => {} },
            { label: 'Food',    icon: <MaterialCommunityIcons name="silverware-fork-knife" size={22} color={COLORS.text} /> , onPress: () => navigation.navigate('MealLogHome') },
            { label: 'Add',     icon: <Feather name="plus" size={22} color={COLORS.text} /> , onPress: () => {} },
            { label: 'Workout', icon: <MaterialCommunityIcons name="arm-flex-outline" size={22} color={COLORS.text} /> , onPress: () => navigation.navigate('Workout') },
            { label: 'Analysis',icon: <Feather name="bar-chart-2" size={22} color={COLORS.text} /> , onPress: () => {} },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={[styles.tabItem, i === 0 && styles.tabActive]} onPress={item.onPress} activeOpacity={0.8}>
              {item.icon}
              <Text style={[styles.tabText, i === 0 && styles.tabTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </Glass>
      </View>
    </SafeAreaView>
  );
};

/* ---------------------- Styles ---------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 12, backgroundColor: COLORS.bg,
  },
  avatar: {
    width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: COLORS.black,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.black },
  smallIconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', ...S.shadow },

  resetBtn: { backgroundColor: COLORS.danger, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14 },
  resetText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  scroll: { flex: 1, paddingHorizontal: 16 },

  card: { backgroundColor: COLORS.card, borderRadius: S.cardRadius, padding: 16, marginTop: 14, ...S.shadow },

  /* Mini month strip */
  monthStrip: { paddingTop: 16, paddingBottom: 14 },
  monthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  monthTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  navArrows: { flexDirection: 'row', gap: 10 },
  arrowBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F2F3F5', justifyContent: 'center', alignItems: 'center' },
  arrowText: { fontSize: 18, color: COLORS.text },

  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekPill: { width: 44, height: 34, borderRadius: 17, backgroundColor: COLORS.pill, justifyContent: 'center', alignItems: 'center' },
  weekPillActive: { backgroundColor: '#ECECEC' },
  weekPillText: { fontSize: 12, color: '#9CA3AF' },
  weekPillTextActive: { color: COLORS.text },

  /* Monthly cycle (collapsed state) */
  monthlyCard: { paddingBottom: 18 },
  monthlyHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  phaseChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  phaseChipText: { fontWeight: '700', fontSize: 12 },

  ringRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  ringCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  dayBig: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  phaseSmall: { marginTop: 2, fontSize: 12, color: '#7C7C7C' },
  plusBtn: { marginTop: 10, width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#E6E6E6', justifyContent: 'center', alignItems: 'center' },

  sideInfo: { flex: 1, paddingLeft: 18, justifyContent: 'center' },
  nextPeriod: { fontSize: 16, color: COLORS.text, marginBottom: 10 },
  progressTrack: { height: 8, backgroundColor: COLORS.progressTrack, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: COLORS.progressFill },

  /* Cycle Day summary (expanded state, replaces mini strip) */
  cycleDayCard: { paddingBottom: 14 },
  cycleTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cycleContentRow: { flexDirection: 'row', alignItems: 'center' },
  blackDayCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.black, justifyContent: 'center', alignItems: 'center',
  },
  blackDayText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  cycleNextText: { fontSize: 14, color: COLORS.text, marginBottom: 6 },
  slimTrack: { height: 6, backgroundColor: COLORS.progressTrack, borderRadius: 3 },
  slimFill: { height: 6, borderRadius: 3, backgroundColor: COLORS.black },

  /* Expanded calendar */
  calendarCard: {},
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  calendarTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },

  dowRow: { flexDirection: 'row', marginBottom: 8 },
  dowText: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#9AA0A6' },
// Calendar grid
grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, marginBottom: 12 },
dayCell: { width: '14.28%', paddingVertical: 6, alignItems: 'center' },

// Pill base
pillBase: {
  width: 38,
  height: 38,
  borderRadius: 19,
  justifyContent: 'center',
  alignItems: 'center',
},
// default day (light gray)
pillLight: { backgroundColor: COLORS.pill },

// States
// Period — in your mock month, period dots aren’t shown; keep subtle if needed
pillPeriod: { backgroundColor: '#D6D8DC' }, // softer gray (not black)
pillFertile: { backgroundColor: COLORS.fertile }, // lavender fill
pillPMS: {
  backgroundColor: 'transparent',
  borderWidth: 2,
  borderColor: '#CFCFD4',
  borderStyle: 'dashed', // dotted/dashed open circle
},
// Today — dashed outline, transparent fill
pillToday: {
  backgroundColor: 'transparent',
  borderWidth: 2,
  borderColor: COLORS.black,
  borderStyle: 'dashed',
},

// Other month days
pillOther: { opacity: 0.42 },

// Text
pillText: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
pillTextInvert: { color: '#fff' },
pillOtherText: { color: '#8F8F8F' },


  legend: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#ECECEC' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
legendDotDashed: {
  width: 12,
  height: 12,
  borderRadius: 6,
  borderWidth: 1.5,
  borderColor: COLORS.black,
  backgroundColor: 'transparent',
  borderStyle: 'dashed',
},
  legendText: { fontSize: 12, color: '#6B7280' },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
legendDotDashed: {
  width: 12,
  height: 12,
  borderRadius: 6,
  borderWidth: 1.5,
  borderColor: COLORS.black,
  backgroundColor: 'transparent',
  borderStyle: 'dashed',
},

  // Calendar grid cells
dayCell: { width: '14.28%', paddingVertical: 6, alignItems: 'center' },

// Base pill
pillBase: {
  width: 38,
  height: 38,
  borderRadius: 19,
  justifyContent: 'center',
  alignItems: 'center',
},
// default day = light gray background
pillLight: { backgroundColor: COLORS.pill },

// States
pillPeriod: { backgroundColor: COLORS.black },               // filled black, white text
pillFertile: { backgroundColor: COLORS.fertile },            // soft lavender
pillPMS: {
  backgroundColor: 'transparent',
  borderWidth: 2,
  borderColor: '#CFCFCF',
  borderStyle: 'dashed',                                     // dotted/dashed circle
},
pillToday: {
  backgroundColor: '#FFFFFF',
  borderWidth: 2,
  borderColor: COLORS.black,                                 // solid outline so the number is visible
},
pillOther: { opacity: 0.42 },                                 // gray out prev/next month

pillText: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
pillTextInvert: { color: '#fff' },
pillOtherText: { color: '#8F8F8F' },

  /* PERSISTENT mood board */
  moodCard: { paddingBottom: 16 },
  moodHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  moodTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  moodDate: { fontSize: 12, color: '#8C8C8C' },
  moodRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  moodTile: { flex: 1, backgroundColor: '#FAFAFA', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#F0F0F0' },
  moodTileText: { marginTop: 6, fontSize: 12, color: COLORS.text, fontWeight: '600' },
  logMoodBtn: { height: 40, borderRadius: 12, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  logMoodText: { color: '#fff', fontWeight: '700' },

  /* Floating chat above everything */
  chatWrap: { position: 'absolute', right: 16, bottom: 108, zIndex: 999 },

  /* Glass bottom bar */
  bottomWrap: { position: 'absolute', left: 0, right: 0, bottom: 16, alignItems: 'center' },
  glassBar: {
    width: '92%',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...S.shadow,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 6, gap: 4, borderRadius: 16 },
  tabActive: { backgroundColor: 'rgba(0,0,0,0.06)' },
  tabText: { fontSize: 11, color: '#7C7C7C', fontWeight: '600' },
  tabTextActive: { color: COLORS.text },
});

export default HomeScreen;
