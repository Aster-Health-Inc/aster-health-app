import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { supabase } from '../lib/supabase';
import BottomTaskbar from '../components/BottomTaskbar';
import ChatbotModal from '../components/ChatBotModal';
import { useFeatureFlags } from '../lib/FeatureFlag';

const BACKGROUND = '#EEE7FF';
const CARD_RADIUS = 26;
const CHART_HEIGHT = 180;
const H_PADDING = 24;
const OPTIMIZATION_TIPS = [
  'Try going to bed 30 minutes earlier on weekdays',
  'Schedule important tasks between 10-11 AM when your energy typically peaks',
  'Consider a 10-minute walk after lunch to maintain afternoon energy',
];

const INSIGHT_CARDS = [
  {
    key: 'nutrition',
    title: 'Nutrition Alert',
    description: 'Your iron levels tend to drop during menstruation. Consider iron-rich foods in 5 days.',
    icon: 'nutrition',
    background: '#FCECD4',
    accent: '#D4841F',
  },
  {
    key: 'relationships',
    title: 'Relationship Insight',
    description: "You're more social during your follicular phase. Great time to schedule catch-ups with friends.",
    icon: 'heart',
    background: '#E5F4F6',
    accent: '#0F8C94',
  },
];

const CHART_POINTS = [
  { label: 'Jun', value: 122 },
  { label: 'Jul', value: 135 },
  { label: 'Aug', value: 152 },
  { label: 'Sep', value: 184 },
  { label: 'Oct', value: 148 },
];

const SUMMARY_METRICS = [
  { label: 'Avg Energy', value: '64%', color: '#E4B02A' },
  { label: 'Weekend Boost', value: '+23%', color: '#43C765' },
  { label: 'Peak Energy', value: '10-11 AM', color: '#5140CF' },
];

const HomeScreen = () => {
  const [userName, setUserName] = useState('Jessica');
  const [chatbotVisible, setChatbotVisible] = useState(false);
  const navigation = useNavigation();
  const { flags } = useFeatureFlags();
  const chatbotEnabled = flags?.chatbot !== false;

  const today = useMemo(() => new Date(), []);
  const greeting = useMemo(() => {
    const hour = today.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }, [today]);

  useEffect(() => {
    let isMounted = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!isMounted || !user) return;
      const metadata = user.user_metadata ?? {};
      const derivedName =
        metadata.first_name ||
        metadata.full_name ||
        metadata.name ||
        user.email?.split('@')[0] ||
        'there';
      const cleaned = String(derivedName)
        .replace(/[_\.]/g, ' ')
        .trim();
      const formatted =
        cleaned
          .split(' ')
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ') || 'There';
      setUserName(formatted);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const formattedDate = useMemo(
    () =>
      today.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
    [today],
  );

  const chartWidth = useMemo(() => Dimensions.get('window').width - H_PADDING * 2 - 20, []);

  const { areaPath, linePath, minValue, maxValue } = useMemo(() => {
    if (!CHART_POINTS.length) {
      return { areaPath: '', linePath: '', minValue: 0, maxValue: 1 };
    }
    const maxVal = Math.max(...CHART_POINTS.map((point) => point.value));
    const minVal = Math.min(...CHART_POINTS.map((point) => point.value));
    const verticalPadding = 24;
    const height = CHART_HEIGHT - verticalPadding;
    const domain = maxVal - minVal || 1;
    const mapY = (value) =>
      CHART_HEIGHT - verticalPadding / 2 - ((value - minVal) / domain) * height;
    const stepX = chartWidth / (CHART_POINTS.length - 1 || 1);

    let area = `M 0 ${CHART_HEIGHT} L 0 ${mapY(CHART_POINTS[0].value).toFixed(2)}`;
    let line = `M 0 ${mapY(CHART_POINTS[0].value).toFixed(2)}`;

    CHART_POINTS.forEach((point, index) => {
      const x = index * stepX;
      const y = mapY(point.value);
      area += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
      line += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    });

    area += ` L ${chartWidth.toFixed(2)} ${CHART_HEIGHT} Z`;

    return { areaPath: area, linePath: line, minValue: minVal, maxValue: maxVal };
  }, [chartWidth]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.iconButton}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Settings')}
            >
              <Ionicons name="person-outline" size={20} color="#3F2560" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} activeOpacity={0.85}>
              <Ionicons name="calendar-outline" size={20} color="#3F2560" />
            </TouchableOpacity>
          </View>

          <View style={styles.datePill}>
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>

          <Text style={styles.greetingText}>
            {greeting}, <Text style={styles.greetingName}>{userName}</Text>
          </Text>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Energy Optimization</Text>
              <View style={styles.statusPill}>
                <Text style={styles.statusText}>Doing good!</Text>
              </View>
            </View>
            <Text style={styles.cardBodyText}>
              Based on 3 months of data, your energy levels are 23% higher on weekends, likely due to
              better sleep patterns.
            </Text>

            <View style={styles.tipCard}>
              <View style={styles.tipHeader}>
                <Ionicons name="sparkles-outline" size={18} color="#4B117B" />
                <Text style={styles.tipTitle}>Optimize Your Weekday Routine</Text>
              </View>
              {OPTIMIZATION_TIPS.map((tip) => (
                <View key={tip} style={styles.tipRow}>
                  <View style={styles.tipBullet} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Health Patterns</Text>
            <Text style={styles.cardBodyTextSecondary}>
              Energy levels vs predictions for this week
            </Text>
            <View style={styles.chartWrapper}>
              <Svg width={chartWidth} height={CHART_HEIGHT}>
                <Defs>
                  <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#7052FF" stopOpacity="0.28" />
                    <Stop offset="100%" stopColor="#7052FF" stopOpacity="0.04" />
                  </LinearGradient>
                </Defs>
                <Rect x="0" y="0" width={chartWidth} height={CHART_HEIGHT} rx={22} fill="#F5F0FF" />
                <Path d={areaPath} fill="url(#chartGradient)" />
                <Path d={linePath} fill="none" stroke="#7052FF" strokeWidth={3.5} strokeLinecap="round" />
              </Svg>
            </View>
            <View style={styles.chartLabels}>
              {CHART_POINTS.map((point) => (
                <Text key={point.label} style={styles.chartLabelText}>
                  {point.label}
                </Text>
              ))}
            </View>

            <View style={styles.metricRow}>
              {SUMMARY_METRICS.map((metric) => (
                <View key={metric.label} style={styles.metricItem}>
                  <Text style={[styles.metricValue, { color: metric.color }]}>{metric.value}</Text>
                  <Text style={styles.metricLabel}>{metric.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>More Insights</Text>
            <View style={styles.insightStack}>
              {INSIGHT_CARDS.map((insight) => (
                <View
                  key={insight.key}
                  style={[styles.insightCard, { backgroundColor: insight.background }]}
                >
                  <View style={[styles.insightIconWrap, { backgroundColor: `${insight.accent}1A` }]}>
                    <Ionicons
                      name={insight.icon === 'nutrition' ? 'leaf-outline' : 'heart-outline'}
                      size={20}
                      color={insight.accent}
                    />
                  </View>
                  <View style={styles.insightContent}>
                    <Text style={[styles.insightTitle, { color: insight.accent }]}>{insight.title}</Text>
                    <Text style={styles.insightDescription}>{insight.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={`${insight.accent}CC`} />
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
      <BottomTaskbar activeKey="Home" />
      {chatbotEnabled && (
        <>
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={() => setChatbotVisible(true)}
            style={styles.chatbotFab}
          >
            <Ionicons name="sparkles-outline" size={20} color="#FFFFFF" />
            <Text style={styles.chatbotFabText}>Ask Aster</Text>
          </TouchableOpacity>
          <ChatbotModal visible={chatbotVisible} onClose={() => setChatbotVisible(false)} />
        </>
      )}
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  scrollContent: {
    paddingHorizontal: H_PADDING,
    paddingBottom: 140,
    paddingTop: 16,
    gap: 18,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(88,61,147,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#836BCF',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  datePill: {
    alignSelf: 'center',
    paddingHorizontal: 26,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#836BCF',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3F2560',
  },
  greetingText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3F2560',
  },
  greetingName: {
    color: '#4B117B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: CARD_RADIUS,
    padding: 22,
    shadowColor: '#836BCF',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3F2560',
  },
  cardBodyText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#655C7E',
    marginBottom: 18,
  },
  cardBodyTextSecondary: {
    fontSize: 13,
    color: '#7D7396',
    marginBottom: 18,
  },
  statusPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E7F9E9',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2C9A45',
  },
  tipCard: {
    backgroundColor: '#EEF1FF',
    borderRadius: 20,
    padding: 18,
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
    gap: 10,
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
    lineHeight: 20,
    color: '#5F5478',
  },
  chartWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  chartLabelText: {
    fontSize: 12,
    color: '#9C92B5',
    fontWeight: '600',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
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
    marginTop: 14,
    gap: 14,
  },
  insightCard: {
    borderRadius: 22,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  insightIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightContent: {
    flex: 1,
    gap: 4,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  insightDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: '#5F5478',
  },
  chatbotFab: {
    position: 'absolute',
    right: H_PADDING,
    bottom: 110,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: '#4B117B',
    shadowColor: '#3F2560',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  chatbotFabText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
