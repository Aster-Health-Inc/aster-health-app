import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
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

const RING_SIZE = 180;
const RING_STROKE = 14;
const RADIUS = (RING_SIZE - RING_STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

const ranges = ['D', 'W', 'M', '6M', 'Y'];

export default function WorkoutScreen() {
  // segment: 0 = Step Count, 1 = Calories
  const [seg, setSeg] = useState(1); // mock shows Calories selected
  const [range, setRange] = useState('6M'); // mock right side uses 6M

  // dummy series for charts
  const data = useMemo(() => {
    if (range === 'D') return { labels: ['6', '9', '12', '15', '18', '21', '24'], values: [12, 28, 40, 22, 55, 16, 30] };
    if (range === 'W') return { labels: ['S', 'M', 'T', 'W', 'T', 'F', 'S'], values: [40, 62, 35, 80, 48, 66, 51] };
    if (range === 'M') return { labels: ['1', '5', '10', '15', '20', '25', '30'], values: [20, 45, 75, 30, 105, 90, 58] };
    if (range === '6M') return { labels: ['Jun','Jul','Aug','Sep','Oct','Nov'], values: [90, 110, 135, 180, 165, 150] };
    return { labels: ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'], values: [70,82,95,110,140,175,160,150,145,155,170,165] };
  }, [range]);

  // ring numbers (mock)
  const goal = seg === 1 ? 1400 : 10000;               // calories goal OR steps goal
  const current = seg === 1 ? 1102 : 6800;             // current value
  const pct = Math.max(0, Math.min(1, current / goal));
  const dashOffset = CIRC * (1 - pct);

  const BarOrArea = (range === '6M' || range === 'Y')
    ? <AreaChartBasic labels={data.labels} values={data.values} />
    : <BarChartBasic labels={data.labels} values={data.values} />;

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* header mimic */}
      <View style={s.header}>
        <View style={s.avatar}><View style={s.avatarDot} /></View>
        <Text style={s.headerTitle}>Workout</Text>
        <View style={s.smallIcon}/>
      </View>

      {/* segment control */}
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

      {/* ring card */}
      <View style={s.card}>
        <View style={{ width: RING_SIZE, alignSelf: 'center' }}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle cx={RING_SIZE/2} cy={RING_SIZE/2} r={RADIUS} stroke={COLORS.ringTrack} strokeWidth={RING_STROKE} fill="none" />
            <Circle
              cx={RING_SIZE/2}
              cy={RING_SIZE/2}
              r={RADIUS}
              stroke={COLORS.ring}
              strokeWidth={RING_STROKE}
              fill="none"
              strokeDasharray={`${CIRC} ${CIRC}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${RING_SIZE/2} ${RING_SIZE/2})`}
            />
          </Svg>
          <View style={s.ringCenter}>
            <Text style={s.bigValue}>{current.toLocaleString()}</Text>
            <Text style={s.goalText}>/{goal.toLocaleString()}</Text>
            <Text style={s.caption}>{seg === 1 ? 'Calories' : 'Steps'}</Text>
          </View>
        </View>
      </View>

      {/* range chips */}
      <View style={[s.card, { paddingTop: 12, paddingBottom: 16 }]}>
        <View style={s.rangeRow}>
          {ranges.map(r => (
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

        {/* chart */}
        <View style={{ marginTop: 12 }}>
          {BarOrArea}
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, marginBottom: 8 },
  avatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: COLORS.text, alignItems: 'center', justifyContent: 'center' },
  avatarDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.text },
  headerTitle: { fontWeight: '700', fontSize: 16, color: COLORS.text },
  smallIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.card },

  segmentWrap: { marginTop: 6 },
  segmentBg: { backgroundColor: COLORS.tabBg, borderRadius: 18, padding: 4, flexDirection: 'row' },
  segmentBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 14 },
  segmentBtnActive: { backgroundColor: COLORS.pillActive },
  segmentText: { color: COLORS.sub, fontWeight: '700' },
  segmentTextActive: { color: COLORS.text },

  card: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginTop: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },

  ringCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  bigValue: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  goalText: { marginTop: 2, color: COLORS.sub, fontWeight: '700' },
  caption: { marginTop: 2, fontSize: 12, color: COLORS.sub },

  rangeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  rangeChip: { backgroundColor: COLORS.pill, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16 },
  rangeChipActive: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E3E3E3' },
  rangeChipText: { color: COLORS.sub, fontWeight: '700' },
  rangeChipTextActive: { color: COLORS.text },
});
