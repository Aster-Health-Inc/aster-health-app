import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { readTodaySummary } from '../lib/healthkit';
import BarChartBasic from '../src/workouts/components/BarChartBasic';
import AreaChartBasic from '../src/workouts/components/AreaChartBasic';

const COLORS = {
  bg: '#F4F5F7',
  card: '#FFFFFF',
  text: '#111111',
  sub: '#9AA0A6',
  chip: '#EFE8FF',
  chipText: '#6D58FF',
  ring: '#2F7D78',
  ringTrack: '#F0F1F3',
  pill: '#ECEDEF',
  pillActive: '#FFFFFF',
  tabBg: '#E9E9EB',
};

const S = {
  shadow: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
};

const RING_SIZE = 180;
const RING_STROKE = 14;
const RADIUS = (RING_SIZE - RING_STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

const ranges = ['D', 'W', 'M', '6M', 'Y'];
const RANGE_NAMES = {
  D: 'Today',
  W: 'This Week',
  M: 'This Month',
  '6M': 'Last 6 Months',
  Y: 'Last Year',
};
const SERIES = {
  steps: {
    D: { labels: ['6', '9', '12', '15', '18', '21', '24'], values: [1350, 2890, 4680, 6120, 7840, 9050, 10120] },
    W: { labels: ['S', 'M', 'T', 'W', 'T', 'F', 'S'], values: [9800, 11640, 10350, 12880, 12450, 14200, 13320] },
    M: { labels: ['1', '5', '10', '15', '20', '25', '30'], values: [23500, 26840, 31220, 29810, 33450, 35210, 36580] },
    '6M': { labels: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'], values: [182400, 191350, 205120, 218680, 209540, 198310] },
    Y: {
      labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
      values: [190240, 201380, 214950, 229110, 238440, 247175, 236600, 225500, 214450, 223355, 239700, 232540],
    },
  },
  calories: {
    D: { labels: ['6', '9', '12', '15', '18', '21', '24'], values: [68, 125, 182, 140, 205, 156, 174] },
    W: { labels: ['S', 'M', 'T', 'W', 'T', 'F', 'S'], values: [520, 640, 680, 750, 720, 810, 790] },
    M: { labels: ['1', '5', '10', '15', '20', '25', '30'], values: [2100, 2350, 2480, 2650, 2750, 2680, 2900] },
    '6M': { labels: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'], values: [11800, 12640, 13310, 14820, 14210, 13540] },
    Y: {
      labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
      values: [12400, 12840, 13390, 14210, 15120, 16250, 15810, 14960, 14640, 15230, 16120, 15840],
    },
  },
};

const formatMetric = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '0';
  const abs = Math.abs(numeric);
  if (abs >= 1000) {
    const scaled = Math.round((abs / 1000) * 10) / 10;
    const formatted = scaled % 1 === 0 ? scaled.toFixed(0) : scaled.toFixed(1);
    return `${numeric < 0 ? '-' : ''}${formatted}k`;
  }
  return `${numeric < 0 ? '-' : ''}${Math.round(abs).toLocaleString()}`;
};

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

const SOURCE_LABELS = {
  healthkit: null,
  pedometer: 'Pedometer',
  accelerometer: 'Accelerometer',
  none: 'Not Synced',
};

// Try to require expo-sensors at runtime to work in web/Expo Go gracefully
let Pedometer, Accelerometer;
try {
  ({ Pedometer, Accelerometer } = require('expo-sensors'));
} catch (_) {
  Pedometer = undefined;
  Accelerometer = undefined;
}

export default function WorkoutScreen() {
  const navigation = useNavigation();
  const [source, setSource] = useState('none'); // 'healthkit'|'pedometer'|'accelerometer'|'none'
  const [stepsToday, setStepsToday] = useState(0);
  const [caloriesToday, setCaloriesToday] = useState(0);
  const accelSub = useRef(null);

  useEffect(() => {
    let pedometerSub;
    let cancelled = false;
    (async () => {
      // Try HealthKit first on iOS
      if (Platform.OS === 'ios') {
        try {
          const hk = await readTodaySummary();
          if (!cancelled && hk) {
            const hasData =
              Number.isFinite(hk.steps) || Number.isFinite(hk.activeEnergy) || Number.isFinite(hk.distance);
            if (hasData) {
              setStepsToday(Math.round(hk.steps || 0));
              setCaloriesToday(Math.round(hk.activeEnergy || 0));
              setSource('healthkit');
              return;
            }
          }
        } catch (_) {
          // fall back below
        }
      }
      // Default to Pedometer if available
      const usePedometer = !!Pedometer;
      if (usePedometer) {
        try {
          // Check availability and read today's steps
          const available = Pedometer && (await Pedometer.isAvailableAsync());
          if (!available) throw new Error('Pedometer not available');

          const now = new Date();
          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const { steps } = await Pedometer.getStepCountAsync(start, now);
          if (!cancelled) {
            setStepsToday(steps || 0);
            setCaloriesToday(Math.round((steps || 0) * 0.05)); // naive kcal estimate
          }
          // Live updates during session
          pedometerSub = Pedometer.watchStepCount((res) => {
            if (cancelled) return;
            setStepsToday((prev) => prev + (res.steps || 0));
            setCaloriesToday((prev) => Math.round(prev + (res.steps || 0) * 0.05));
          });
          if (!cancelled) setSource('pedometer');
          return;
        } catch (e) {
          // fall through to accelerometer
        }
      }
      if (Accelerometer) {
        // very naive step inference from acceleration magnitude
        try {
          Accelerometer.setUpdateInterval(500);
          let lastStepTime = 0;
          const threshold = 1.2; // g approx
          accelSub.current = Accelerometer.addListener(({ x, y, z }) => {
            const mag = Math.sqrt(x * x + y * y + z * z);
            const nowTs = Date.now();
            if (mag > threshold && nowTs - lastStepTime > 500) {
              if (cancelled) return;
              lastStepTime = nowTs;
              setStepsToday((s) => s + 1);
              setCaloriesToday((k) => k + Math.round(0.05));
            }
          });
          if (!cancelled) setSource('accelerometer');
        } catch (_) {
          if (!cancelled) setSource('none');
        }
      } else {
        if (!cancelled) setSource('none');
      }
    })();
    return () => {
      cancelled = true;
      try {
        pedometerSub && pedometerSub.remove && pedometerSub.remove();
      } catch (_) {}
      try {
        accelSub.current && accelSub.current.remove();
      } catch (_) {}
    };
  }, []);
  // segment: 0 = Step Count, 1 = Calories
  const [seg, setSeg] = useState(0);
  const [range, setRange] = useState('6M'); // mock right side uses 6M

  // dummy series for charts
  const data = useMemo(() => {
    const key = seg === 1 ? 'calories' : 'steps';
    const preset = SERIES[key] || SERIES.steps;
    return preset[range] || preset.Y;
  }, [range, seg]);

  // ring numbers from selected source
  const goal = seg === 1 ? 1400 : 10000;
  const currentRaw = seg === 1 ? caloriesToday : stepsToday;
  const current = Math.max(0, Math.round(currentRaw));
  const pct = Math.max(0, Math.min(1, goal ? current / goal : 0));
  const dashOffset = CIRC * (1 - pct);

  const BarOrArea =
    range === '6M' || range === 'Y' ? (
      <AreaChartBasic labels={data.labels} values={data.values} />
    ) : (
      <BarChartBasic labels={data.labels} values={data.values} />
    );

  const highlight = useMemo(() => {
    const values = data.values || [];
    if (!values.length) {
      return { label: '--', value: 0 };
    }
    let index = 0;
    for (let i = 1; i < values.length; i += 1) {
      if (values[i] > values[index]) index = i;
    }
    return {
      label: data.labels?.[index] ?? '--',
      value: values[index],
    };
  }, [data]);
  const highlightValue = Number(highlight.value) || 0;
  const unitsLabel = seg === 1 ? 'kCal' : 'steps';
  const unitsDisplay = unitsLabel === 'kCal' ? 'kCal' : 'Steps';

  return (
    <SafeAreaView style={s.safeArea}>
      <View style={s.container}>
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
          <View style={s.header}>
            <TouchableOpacity style={s.headerIcon} onPress={() => navigation.navigate('Home')} activeOpacity={0.8}>
              <Ionicons name="person-outline" size={20} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Workout</Text>
            <TouchableOpacity style={s.headerIcon} onPress={() => {}} activeOpacity={0.8}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={s.segmentWrap}>
            <View style={s.segmentBg}>
              <TouchableOpacity
                onPress={() => setSeg(0)}
                activeOpacity={0.9}
                style={[s.segmentBtn, seg === 0 && s.segmentBtnActive]}
              >
                <Text style={[s.segmentText, seg === 0 && s.segmentTextActive]}>Step Count</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSeg(1)}
                activeOpacity={0.9}
                style={[s.segmentBtn, seg === 1 && s.segmentBtnActive]}
              >
                <Text style={[s.segmentText, seg === 1 && s.segmentTextActive]}>Calories</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[s.card, s.cardLarge]}>
            <View style={s.ringShell}>
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
              <View style={s.ringCenter}>
                <Text style={s.bigValue}>{current.toLocaleString()}</Text>
                <Text style={s.goalText}>/{goal.toLocaleString()}</Text>
                <Text style={s.caption}>{seg === 1 ? 'Calories' : 'Steps'}</Text>
                {SOURCE_LABELS[source] ? (
                  <View style={s.sourcePill}>
                    <Text style={s.sourceText}>{SOURCE_LABELS[source]}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          <View style={[s.card, s.cardLarge]}>
            <View style={s.chartHeadline}>
              <View>
                <Text style={s.chartRangeLabel}>{RANGE_NAMES[range] || 'Overview'}</Text>
                <Text style={s.chartRangeSub}>{seg === 1 ? 'Active calories (kCal)' : 'Step count'}</Text>
              </View>
              <View style={s.chartBadge}>
                <Text style={s.chartBadgeValue}>
                  {data.values.length ? formatMetric(highlightValue) : '--'}
                </Text>
                <Text style={s.chartBadgeLabel}>
                  {data.values.length && highlight.label !== '--'
                    ? `${highlight.label} - ${unitsDisplay}`
                    : unitsDisplay}
                </Text>
              </View>
            </View>

            <View style={s.rangeRow}>
              {ranges.map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRange(r)}
                  style={[s.rangeChip, range === r && s.rangeChipActive]}
                  activeOpacity={0.9}
                >
                  <Text style={[s.rangeChipText, range === r && s.rangeChipTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.chartWrap}>{BarOrArea}</View>
          </View>

          <View style={s.bottomSpacer} />
        </ScrollView>

        <View pointerEvents="box-none" style={s.bottomWrap}>
          <Glass style={s.bottomBar}>
            {[
              {
                key: 'Home',
                label: 'Home',
                icon: <Ionicons name="home-outline" size={22} color={COLORS.text} />,
                onPress: () => navigation.navigate('Home'),
              },
              {
                key: 'Food',
                label: 'Food',
                icon: <MaterialCommunityIcons name="silverware-fork-knife" size={22} color={COLORS.text} />,
                onPress: () => navigation.navigate('MealLogHome'),
              },
              {
                key: 'Add',
                label: 'Add',
                icon: <Feather name="plus" size={22} color={COLORS.text} />,
                onPress: () => {},
              },
              {
                key: 'Workout',
                label: 'Workout',
                icon: <MaterialCommunityIcons name="arm-flex-outline" size={22} color={COLORS.text} />,
                onPress: () => {},
              },
              {
                key: 'Analysis',
                label: 'Analysis',
                icon: <Feather name="bar-chart-2" size={22} color={COLORS.text} />,
                onPress: () => {},
              },
            ].map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[s.tabItem, item.key === 'Workout' && s.tabActive]}
                onPress={item.onPress}
                activeOpacity={0.85}
              >
                {item.icon}
                <Text style={[s.tabText, item.key === 'Workout' && s.tabTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </Glass>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 120 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginBottom: 12,
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...S.shadow,
  },
  headerTitle: { fontWeight: '700', fontSize: 18, color: COLORS.text },

  segmentWrap: { marginBottom: 16 },
  segmentBg: { backgroundColor: COLORS.tabBg, borderRadius: 20, padding: 4, flexDirection: 'row' },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 16 },
  segmentBtnActive: { backgroundColor: COLORS.pillActive, ...S.shadow },
  segmentText: { color: COLORS.sub, fontWeight: '700', fontSize: 13 },
  segmentTextActive: { color: COLORS.text },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 20,
    marginBottom: 18,
    ...S.shadow,
  },
  cardLarge: { alignItems: 'center' },

  ringShell: { width: RING_SIZE },
  ringCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigValue: { fontSize: 30, fontWeight: '800', color: COLORS.text },
  goalText: { marginTop: 4, color: COLORS.sub, fontWeight: '700' },
  caption: { marginTop: 4, fontSize: 13, color: COLORS.sub },
  sourcePill: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: '#EDF4F4',
  },
  sourceText: { color: '#2F7D78', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

  chartHeadline: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  chartRangeLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  chartRangeSub: { marginTop: 4, fontSize: 12, color: COLORS.sub, textTransform: 'capitalize' },
  chartBadge: {
    backgroundColor: '#F2F9F8',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'flex-end',
  },
  chartBadgeValue: { fontSize: 18, fontWeight: '800', color: '#2F7D78' },
  chartBadgeLabel: { fontSize: 11, fontWeight: '600', color: '#5F7372', marginTop: 2 },

  rangeRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  rangeChip: {
    flex: 1,
    backgroundColor: COLORS.pill,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 18,
    marginHorizontal: 4,
  },
  rangeChipActive: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E3E3E3', ...S.shadow },
  rangeChipText: { color: COLORS.sub, fontWeight: '700', fontSize: 12 },
  rangeChipTextActive: { color: COLORS.text },
  chartWrap: { marginTop: 18, width: '100%' },

  bottomSpacer: { height: 40 },
  bottomWrap: { position: 'absolute', left: 0, right: 0, bottom: 16, alignItems: 'center' },
  bottomBar: {
    width: '92%',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...S.shadow,
    overflow: 'hidden',
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 6, gap: 4, borderRadius: 16 },
  tabActive: { backgroundColor: 'rgba(0,0,0,0.06)' },
  tabText: { fontSize: 11, color: '#7C7C7C', fontWeight: '600' },
  tabTextActive: { color: COLORS.text },
});
