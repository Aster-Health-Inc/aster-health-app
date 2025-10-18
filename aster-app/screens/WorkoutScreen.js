import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

import BottomTaskbar from '../components/BottomTaskbar';
import {
  healthKitAvailable,
  readActivitySeries,
  readTodaySummary,
} from '../lib/healthkit';
import BarChartBasic from '../src/workouts/components/BarChartBasic';
import AreaChartBasic from '../src/workouts/components/AreaChartBasic';

const THEME = {
  background: '#EEE7FF',
  surface: '#FFFFFF',
  lavender: '#F3EDFF',
  textPrimary: '#3F2560',
  textSecondary: '#7D7396',
  textMuted: '#A49DC0',
  accent: '#5B26CF',
  accentSoft: '#D8C8FF',
  outline: 'rgba(91,38,207,0.12)',
};

const METRICS = [
  { key: 'steps', label: 'Step Count', goal: 10000, unitLabel: 'Steps' },
  { key: 'calories', label: 'Calories', goal: 1400, unitLabel: 'Calories' },
];

const RANGES = ['D', 'W', 'M', '6M', 'Y'];

const RING_SIZE = 208;
const RING_STROKE = 14;
const RADIUS = (RING_SIZE - RING_STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

const formatValue = (value) => {
  const number = Number(value) || 0;
  return Math.round(number).toLocaleString();
};

export default function WorkoutScreen() {
  const navigation = useNavigation();
  const [activeMetricKey, setActiveMetricKey] = useState('steps');
  const [range, setRange] = useState('D');

  const [summary, setSummary] = useState({ steps: 0, calories: 0 });
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(null);

  const [seriesState, setSeriesState] = useState({
    labels: [],
    values: [],
    highlight: null,
    highlightIndex: -1,
    loading: true,
    error: null,
  });

  const activeMetric =
    METRICS.find((metric) => metric.key === activeMetricKey) || METRICS[0];

  useEffect(() => {
    if (!healthKitAvailable || Platform.OS !== 'ios') {
      setSummaryLoading(false);
      setSummaryError(
        Platform.OS !== 'ios'
          ? 'Apple Health is only available on iOS devices.'
          : 'Apple Health permissions are required to display your workouts.',
      );
      return;
    }

    let isMounted = true;
    setSummaryLoading(true);
    readTodaySummary()
      .then((res) => {
        if (!isMounted) return;
        setSummary({
          steps: Number(res?.steps || 0),
          calories: Number(res?.activeEnergy || 0),
        });
        setSummaryError(null);
      })
      .catch((err) => {
        if (!isMounted) return;
        setSummaryError(
          err?.message || 'Unable to read Apple Health data right now.',
        );
      })
      .finally(() => {
        if (isMounted) setSummaryLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!healthKitAvailable || Platform.OS !== 'ios') {
      setSeriesState((prev) => ({
        ...prev,
        loading: false,
        error:
          Platform.OS !== 'ios'
            ? 'Apple Health activity history is only available on iOS.'
            : 'Apple Health permissions are required to show your history.',
      }));
      return;
    }

    let isMounted = true;
    setSeriesState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    readActivitySeries({ metric: activeMetricKey, range })
      .then((res) => {
        if (!isMounted) return;
        if (!res.available) {
          setSeriesState({
            labels: [],
            values: [],
            highlight: null,
            highlightIndex: -1,
            loading: false,
            error:
              'Apple Health permissions are required to show your activity history.',
          });
          return;
        }
        setSeriesState({
          labels: res.labels,
          values: res.values,
          highlight: res.highlight,
          highlightIndex: res.highlightIndex ?? -1,
          loading: false,
          error: null,
        });
      })
      .catch((err) => {
        if (!isMounted) return;
        setSeriesState({
          labels: [],
          values: [],
          highlight: null,
          highlightIndex: -1,
          loading: false,
          error: err?.message || 'Unable to load Apple Health activity data.',
        });
      });

    return () => {
      isMounted = false;
    };
  }, [activeMetricKey, range]);

  const ringGoal = activeMetric.goal;
  const ringCurrent =
    activeMetric.key === 'calories' ? summary.calories : summary.steps;
  const ringPct = ringGoal
    ? Math.min(Math.max(ringCurrent / ringGoal, 0), 1)
    : 0;
  const dashOffset = CIRC * (1 - ringPct);

  const ringValue = formatValue(ringCurrent);
  const ringGoalValue = formatValue(ringGoal);

  const highlightLabel = seriesState.highlight?.label ?? '';
  const highlightValue = formatValue(seriesState.highlight?.value ?? 0);

  const chartProps = {
    labels: seriesState.labels,
    values: seriesState.values,
    highlightIndex: seriesState.highlightIndex,
    color: THEME.accent,
    backgroundColor: THEME.lavender,
  };

  const ChartComponent =
    range === '6M' || range === 'Y' ? (
      <AreaChartBasic {...chartProps} />
    ) : (
      <BarChartBasic {...chartProps} />
    );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.headerIcon}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.85}
            >
              <Ionicons name="person-outline" size={20} color={THEME.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Workout</Text>
            <TouchableOpacity style={styles.headerIcon} activeOpacity={0.85}>
              <Ionicons name="pencil-outline" size={20} color={THEME.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.segmentControl}>
            {METRICS.map((metric) => {
              const active = metric.key === activeMetric.key;
              return (
                <TouchableOpacity
                  key={metric.key}
                  style={[
                    styles.segmentItem,
                    active && styles.segmentItemActive,
                  ]}
                  onPress={() => setActiveMetricKey(metric.key)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.segmentLabel,
                      active && styles.segmentLabelActive,
                    ]}
                  >
                    {metric.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.ringCard}>
            {summaryLoading ? (
              <View style={styles.loadingHolder}>
                <ActivityIndicator color={THEME.accent} />
              </View>
            ) : summaryError ? (
              <Text style={styles.errorText}>{summaryError}</Text>
            ) : (
              <View style={styles.ringWrapper}>
                <Svg width={RING_SIZE} height={RING_SIZE}>
                  <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RADIUS}
                    stroke={THEME.accentSoft}
                    strokeWidth={RING_STROKE}
                    fill="none"
                  />
                  <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RADIUS}
                    stroke={THEME.accent}
                    strokeWidth={RING_STROKE}
                    fill="none"
                    strokeDasharray={CIRC}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                  />
                </Svg>
                <View style={styles.ringCenter}>
                  <Text style={styles.ringValue}>{ringValue}</Text>
                  <Text style={styles.ringGoal}>/{ringGoalValue}</Text>
                  <Text style={styles.ringUnit}>{activeMetric.unitLabel}</Text>
                </View>
              </View>
            )}

            {activeMetric.key === 'calories' ? (
              <TouchableOpacity style={styles.logButton} activeOpacity={0.85}>
                <Text style={styles.logButtonText}>+ Log Activity</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.chartCard}>
            <View style={styles.rangeTabs}>
              {RANGES.map((key) => {
                const active = key === range;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.rangeTab,
                      active && styles.rangeTabActive,
                    ]}
                    onPress={() => setRange(key)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.rangeTabLabel,
                        active && styles.rangeTabLabelActive,
                      ]}
                    >
                      {key}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {seriesState.loading ? (
              <View style={styles.loadingHolder}>
                <ActivityIndicator color={THEME.accent} />
              </View>
            ) : seriesState.error ? (
              <Text style={styles.errorText}>{seriesState.error}</Text>
            ) : (
              <>
                {seriesState.highlight && (
                  <View style={styles.highlightPill}>
                    <Text style={styles.highlightLabel}>
                      {highlightLabel}
                    </Text>
                    <Text style={styles.highlightValue}>
                      {highlightValue}{' '}
                      {activeMetric.key === 'calories' ? 'kcal' : 'Steps'}
                    </Text>
                  </View>
                )}
                <View style={styles.chartWrapper}>{ChartComponent}</View>
              </>
            )}
          </View>

        </ScrollView>
      </View>
      <BottomTaskbar activeKey="Workout" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 140,
    paddingTop: 20,
    gap: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.outline,
    backgroundColor: THEME.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B8A6E8',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  segmentControl: {
    flexDirection: 'row',
    backgroundColor: THEME.lavender,
    borderRadius: 24,
    padding: 6,
  },
  segmentItem: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentItemActive: {
    backgroundColor: THEME.surface,
    shadowColor: '#B8A6E8',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textMuted,
  },
  segmentLabelActive: {
    color: THEME.textPrimary,
  },
  ringCard: {
    backgroundColor: THEME.surface,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#B8A6E8',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
    gap: 22,
  },
  ringWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  ringValue: {
    fontSize: 32,
    fontWeight: '800',
    color: THEME.textPrimary,
  },
  ringGoal: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  ringUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  logButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: THEME.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  chartCard: {
    backgroundColor: THEME.surface,
    borderRadius: 28,
    paddingVertical: 20,
    paddingHorizontal: 18,
    shadowColor: '#B8A6E8',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
    gap: 16,
  },
  rangeTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  rangeTab: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: THEME.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeTabActive: {
    backgroundColor: THEME.surface,
    shadowColor: '#B8A6E8',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  rangeTabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.textMuted,
  },
  rangeTabLabelActive: {
    color: THEME.textPrimary,
  },
  highlightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: THEME.lavender,
  },
  highlightLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  highlightValue: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.accent,
  },
  chartWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: THEME.lavender,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  loadingHolder: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 13,
    color: THEME.textSecondary,
    textAlign: 'center',
  },
});
