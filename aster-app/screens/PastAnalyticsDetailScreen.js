import React, { useMemo } from 'react';
import {
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

const H_PADDING = 24;
const CARD_RADIUS = 20;
const CHART_HEIGHT = 170;

const buildChartPoints = (offset = 0) => {
  const base = [122, 135, 152, 184, 148];
  return base.map((value, index) => ({
    label: `W${index + 1}`,
    value: Math.max(72, value - offset * 6 + index * 3),
  }));
};

const buildSummaryMetrics = (offset = 0) => [
  { label: 'Avg Energy', value: `${Math.max(52, 66 - offset * 3)}%`, color: '#E4B02A' },
  { label: 'Weekend Boost', value: `+${Math.max(8, 20 - offset)}%`, color: '#43C765' },
  { label: 'Peak Energy', value: '10-11 AM', color: '#5140CF' },
];

const buildInsights = (monthLabel) => [
  {
    title: 'Sleep wins',
    detail: `Earlier bedtimes improved recovery during ${monthLabel}. Keep the same rhythm on weekdays.`,
  },
  {
    title: 'Movement balance',
    detail: 'Mixing in two low-impact sessions kept energy steady. Repeat that cadence this month.',
  },
  {
    title: 'Hydration',
    detail: 'You logged more water on high-energy days. Set mid-day reminders to stay consistent.',
  },
];

const buildChartPaths = (points, chartWidth) => {
  if (!points.length) {
    return { areaPath: '', linePath: '', minValue: 0, maxValue: 1 };
  }

  const maxVal = Math.max(...points.map((point) => point.value));
  const minVal = Math.min(...points.map((point) => point.value));
  const verticalPadding = 24;
  const height = CHART_HEIGHT - verticalPadding;
  const domain = maxVal - minVal || 1;
  const mapY = (value) =>
    CHART_HEIGHT - verticalPadding / 2 - ((value - minVal) / domain) * height;
  const stepX = chartWidth / (points.length - 1 || 1);

  let area = `M 0 ${CHART_HEIGHT} L 0 ${mapY(points[0].value).toFixed(2)}`;
  let line = `M 0 ${mapY(points[0].value).toFixed(2)}`;

  points.forEach((point, index) => {
    const x = index * stepX;
    const y = mapY(point.value);
    area += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    line += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
  });

  area += ` L ${chartWidth.toFixed(2)} ${CHART_HEIGHT} Z`;

  return { areaPath: area, linePath: line, minValue: minVal, maxValue: maxVal };
};

export default function PastAnalyticsDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const monthLabel = route.params?.month || 'Previous Month';
  const monthOffset = route.params?.offset || 0;

  const chartWidth = useMemo(
    () => Dimensions.get('window').width - H_PADDING * 2 - 8,
    [],
  );
  const chartPoints = useMemo(() => buildChartPoints(monthOffset), [monthOffset]);
  const summaryMetrics = useMemo(
    () => buildSummaryMetrics(monthOffset),
    [monthOffset],
  );
  const insights = useMemo(() => buildInsights(monthLabel), [monthLabel]);
  const { areaPath, linePath } = useMemo(
    () => buildChartPaths(chartPoints, chartWidth),
    [chartPoints, chartWidth],
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
              navigation.navigate('PastAnalytics');
            }
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#3F2560" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{monthLabel}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Analytics Recap</Text>
          <Text style={styles.cardSubtitle}>Overview for {monthLabel}</Text>
          <View style={styles.metricRow}>
            {summaryMetrics.map((metric) => (
              <View key={metric.label} style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: metric.color }]}>{metric.value}</Text>
                <Text style={styles.metricLabel}>{metric.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Energy Optimization</Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusText}>Past trend</Text>
            </View>
          </View>
          <Text style={styles.cardBodyText}>
            Your weekend energy held a {summaryMetrics[1].value} lift versus weekdays. Doubling down on
            steady sleep kept weekdays balanced too.
          </Text>

          <View style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <Ionicons name="sparkles-outline" size={18} color="#4B117B" />
              <Text style={styles.tipTitle}>Repeat what worked</Text>
            </View>
            {[
              'Protect the same bedtime window you used on high-energy days.',
              'Keep two lighter movement days ahead of heavier sessions.',
              'Add a short walk after lunch to avoid the afternoon dip.',
            ].map((tip) => (
              <View key={tip} style={styles.tipRow}>
                <View style={styles.tipBullet} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Health Patterns</Text>
          <Text style={styles.cardBodyTextSecondary}>
            Energy levels tracked across {monthLabel}
          </Text>
          <View style={styles.chartWrapper}>
            <Svg width={chartWidth} height={CHART_HEIGHT}>
              <Defs>
                <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#7052FF" stopOpacity="0.28" />
                  <Stop offset="100%" stopColor="#7052FF" stopOpacity="0.04" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width={chartWidth} height={CHART_HEIGHT} rx={18} fill="#F5F0FF" />
              <Path d={areaPath} fill="url(#chartGradient)" />
              <Path d={linePath} fill="none" stroke="#7052FF" strokeWidth={3.5} strokeLinecap="round" />
            </Svg>
          </View>
          <View style={styles.chartLabels}>
            {chartPoints.map((point) => (
              <Text key={point.label} style={styles.chartLabelText}>
                {point.label}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Insights to carry forward</Text>
          <View style={styles.insightStack}>
            {insights.map((insight) => (
              <View key={insight.title} style={styles.insightRow}>
                <View style={styles.insightDot} />
                <View style={styles.insightCopy}>
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                  <Text style={styles.insightDetail}>{insight.detail}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E5DCF0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: H_PADDING,
    paddingTop: 12,
    paddingBottom: 4,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#836BCF',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3F2560',
  },
  headerSpacer: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: H_PADDING,
    paddingBottom: 32,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: CARD_RADIUS,
    padding: 18,
    shadowColor: '#836BCF',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3F2560',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#655C7E',
    marginTop: 6,
    marginBottom: 12,
  },
  cardBodyText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#655C7E',
    marginBottom: 14,
  },
  cardBodyTextSecondary: {
    fontSize: 13,
    color: '#7D7396',
    marginBottom: 16,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#E7F9E9',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2C9A45',
  },
  tipCard: {
    backgroundColor: '#EEF1FF',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B117B',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tipBullet: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginTop: 6,
    backgroundColor: '#4B117B',
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#5F5478',
  },
  chartWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 12,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  chartLabelText: {
    fontSize: 12,
    color: '#9C92B5',
    fontWeight: '600',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 12,
    color: '#7D7396',
    marginTop: 4,
  },
  insightStack: {
    gap: 12,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  insightDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4B117B',
    marginTop: 5,
  },
  insightCopy: {
    flex: 1,
    gap: 4,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3F2560',
  },
  insightDetail: {
    fontSize: 13,
    lineHeight: 19,
    color: '#5F5478',
  },
});
