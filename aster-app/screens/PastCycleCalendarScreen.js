import React, { useCallback, useMemo, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

const MS_IN_DAY = 1000 * 60 * 60 * 24;

const addMonths = (date, value) => {
  const next = new Date(date);
  next.setDate(1);
  next.setMonth(next.getMonth() + value);
  next.setHours(0, 0, 0, 0);
  return next;
};

const chunk = (array, size) => {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

const LEGEND = [
  { key: 'menstrual', label: 'Period', dot: { backgroundColor: '#111111' } },
  { key: 'fertile', label: 'Fertile', dot: { backgroundColor: '#6C4CCF' } },
  {
    key: 'pms',
    label: 'PMS',
    dot: { borderWidth: 1.3, borderColor: '#111111', borderStyle: 'dashed' },
  },
];

export default function PastCycleCalendarScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const monthLabel = route.params?.month || 'Previous Month';
  const offset = route.params?.offset || 0;
  const cycleContext = route.params?.cycleContext;

  const [currentMonth, setCurrentMonth] = useState(() => addMonths(new Date(), -offset));

  const getCycleStateForDate = useCallback(
    (date) => {
      if (!cycleContext?.lastPeriodDate || !cycleContext?.cycleLength || !cycleContext?.periodLength) {
        return 'default';
      }

      const target = new Date(date);
      target.setHours(0, 0, 0, 0);

      const lastPeriod = new Date(cycleContext.lastPeriodDate);
      lastPeriod.setHours(0, 0, 0, 0);

      const diff = Math.floor((target.getTime() - lastPeriod.getTime()) / MS_IN_DAY);
      if (diff < 0) return 'default';

      const cycleDay = (diff % cycleContext.cycleLength) + 1;
      if (cycleDay <= cycleContext.periodLength) return 'menstrual';
      if (cycleDay >= 13 && cycleDay <= 16) return 'fertile';
      if (cycleDay >= cycleContext.cycleLength - 5) return 'pms';
      return 'default';
    },
    [cycleContext],
  );

  const calendarMatrix = useMemo(() => {
    const base = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const firstWeekday = base.getDay();
    const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

    const cells = [];
    for (let index = 0; index < totalCells; index += 1) {
      const cellDate = new Date(base);
      cellDate.setDate(1 + (index - firstWeekday));

      const isCurrentMonth = cellDate.getMonth() === currentMonth.getMonth();
      const state = getCycleStateForDate(cellDate);

      cells.push({
        key: `${cellDate.toISOString()}-${index}`,
        label: cellDate.getDate(),
        isCurrentMonth,
        state,
      });
    }

    return chunk(cells, 7);
  }, [currentMonth, getCycleStateForDate]);

  const currentLabel = useMemo(
    () =>
      currentMonth.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
    [currentMonth],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('PastAnalytics', { mode: 'cycle' });
            }
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={20} color="#3F2560" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{monthLabel}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setCurrentMonth((prev) => addMonths(prev, -1))}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={18} color="#111111" />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{currentLabel}</Text>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setCurrentMonth((prev) => addMonths(prev, 1))}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-forward" size={18} color="#111111" />
          </TouchableOpacity>
        </View>

        <View style={styles.weekLabels}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, index) => (
            <Text key={`${label}-${index}`} style={styles.weekLabel}>
              {label}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {calendarMatrix.map((week, row) => (
            <View key={`week-${row}`} style={styles.row}>
              {week.map((day) => {
                const dayStyles = [styles.day];
                const textStyles = [styles.dayText];

                if (!day.isCurrentMonth) {
                  dayStyles.push(styles.dayMuted);
                  textStyles.push(styles.dayMutedText);
                }

                if (day.state === 'menstrual') {
                  dayStyles.push(styles.dayPeriod);
                  textStyles.push(styles.dayPeriodText);
                } else if (day.state === 'fertile') {
                  dayStyles.push(styles.dayFertile);
                  textStyles.push(styles.dayFertileText);
                } else if (day.state === 'pms') {
                  dayStyles.push(styles.dayPms);
                }

                return (
                  <View key={day.key} style={dayStyles}>
                    <Text style={textStyles}>{day.label}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.legendRow}>
          {LEGEND.map((item) => (
            <View key={item.key} style={styles.legendItem}>
              <View style={[styles.legendDot, item.dot]} />
              <Text style={styles.legendLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E5DCF0',
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFE7F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3F2560',
  },
  headerSpacer: {
    width: 36,
  },
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 18,
    shadowColor: '#836BCF',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
  },
  weekLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  weekLabel: {
    fontSize: 12,
    color: '#9E9E9E',
    width: 36,
    textAlign: 'center',
  },
  grid: {
    gap: 6,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F2F7',
  },
  dayText: {
    fontSize: 14,
    color: '#111111',
    fontWeight: '500',
  },
  dayMuted: {
    backgroundColor: 'transparent',
  },
  dayMutedText: {
    color: '#C1C1C1',
  },
  dayPeriod: {
    backgroundColor: '#111111',
  },
  dayPeriodText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayFertile: {
    backgroundColor: '#F2ECFF',
  },
  dayFertileText: {
    color: '#6C4CCF',
    fontWeight: '700',
  },
  dayPms: {
    borderWidth: 1.4,
    borderColor: '#111111',
    borderStyle: 'dashed',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLabel: {
    fontSize: 12,
    color: '#333333',
    fontWeight: '600',
  },
});
