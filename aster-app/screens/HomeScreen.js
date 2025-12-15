import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop, SvgXml } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../lib/supabase';
import BottomTaskbar from '../components/BottomTaskbar';
import ChatbotModal from '../components/ChatBotModal';
import { useFeatureFlags } from '../lib/FeatureFlag';
import { ASTER_FLOWER_SVG } from '../assets/logoSvg';

const BACKGROUND = '#EEE7FF';
const CARD_RADIUS = 26;
const CHART_HEIGHT = 180;
const H_PADDING = 24;
const OPTIMIZATION_TIPS = [
  'Try going to bed 30 minutes earlier on weekdays',
  'Schedule important tasks between 10-11 AM when your energy typically peaks',
  'Consider a 10-minute walk after lunch to maintain afternoon energy',
];

// Generate cycle-phase aware insight cards
const getCyclePhaseInsights = (phase) => {
  const insights = {
    Menstrual: [
      {
        key: 'nutrition',
        title: 'Nutrition Focus',
        description: 'Your iron levels may be lower during menstruation. Consider iron-rich foods like spinach, red meat, and lentils.',
        icon: 'nutrition',
        background: '#FCECD4',
        accent: '#D4841F',
      },
      {
        key: 'rest',
        title: 'Rest & Recovery',
        description: 'Your body needs extra rest during your period. Prioritize sleep and gentle movement like yoga or walking.',
        icon: 'bed',
        background: '#E8E5FF',
        accent: '#6B4FD4',
      },
    ],
    Follicular: [
      {
        key: 'energy',
        title: 'High Energy Phase',
        description: "Your energy is rising! This is the perfect time to try new workouts or tackle challenging projects.",
        icon: 'flash',
        background: '#FFF4E5',
        accent: '#E4B02A',
      },
      {
        key: 'social',
        title: 'Social Time',
        description: "You're more social during your follicular phase. Great time to schedule catch-ups with friends or networking events.",
        icon: 'heart',
        background: '#E5F4F6',
        accent: '#0F8C94',
      },
    ],
    Ovulation: [
      {
        key: 'peak',
        title: 'Peak Energy',
        description: "You're at your energetic peak! Great time for important meetings, social events, or intense workouts.",
        icon: 'sunny',
        background: '#FFF4E5',
        accent: '#E4B02A',
      },
      {
        key: 'hydration',
        title: 'Stay Hydrated',
        description: 'Your body temperature rises during ovulation. Make sure to drink plenty of water throughout the day.',
        icon: 'water',
        background: '#E5F4F6',
        accent: '#0F8C94',
      },
    ],
    Luteal: [
      {
        key: 'nutrition',
        title: 'Manage PMS',
        description: 'Complex carbs and magnesium-rich foods can help reduce PMS symptoms. Try dark chocolate, nuts, and whole grains.',
        icon: 'nutrition',
        background: '#FCECD4',
        accent: '#D4841F',
      },
      {
        key: 'selfcare',
        title: 'Self-Care Priority',
        description: 'Hormonal changes may affect mood. Practice stress-reducing activities like meditation, journaling, or gentle exercise.',
        icon: 'heart',
        background: '#FFE5F0',
        accent: '#D4427F',
      },
    ],
    'Late Cycle': [
      {
        key: 'track',
        title: 'Track Symptoms',
        description: 'Your cycle is longer than usual. Log any symptoms or changes you notice to discuss with your healthcare provider.',
        icon: 'clipboard',
        background: '#E8E5FF',
        accent: '#6B4FD4',
      },
      {
        key: 'stress',
        title: 'Stress Management',
        description: 'Stress can delay your period. Try relaxation techniques like deep breathing, yoga, or getting enough sleep.',
        icon: 'heart',
        background: '#FFE5F0',
        accent: '#D4427F',
      },
    ],
    Unknown: [
      {
        key: 'start',
        title: 'Start Tracking',
        description: 'Log your period to unlock personalized insights about nutrition, energy, and wellness tailored to your cycle.',
        icon: 'calendar',
        background: '#E8E5FF',
        accent: '#6B4FD4',
      },
      {
        key: 'general',
        title: 'General Wellness',
        description: 'Maintain a balanced diet, stay hydrated, and get regular exercise for optimal health.',
        icon: 'heart',
        background: '#E5F4F6',
        accent: '#0F8C94',
      },
    ],
  };

  return insights[phase] || insights.Unknown;
};

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

// Generate personalized messages based on cycle phase
const getCyclePhaseInsight = (phase, daysSince) => {
  switch (phase) {
    case 'Menstrual':
      return `Your period started ${daysSince} day${daysSince !== 1 ? 's' : ''} ago. Focus on rest and iron-rich foods to replenish nutrients.`;
    case 'Follicular':
      return `You're in your follicular phase! Energy levels are rising - great time for trying new workouts or activities.`;
    case 'Ovulation':
      return `You're in your ovulation phase! You may feel more energetic and social. Stay hydrated and listen to your body.`;
    case 'Luteal':
      return `You're in your luteal phase. You may experience PMS symptoms soon. Focus on stress management and self-care.`;
    case 'Late Cycle':
      return `Your cycle is running longer than usual. If your period is late, consider logging any symptoms you're experiencing.`;
    default:
      return 'Log your period to start tracking personalized cycle insights and wellness recommendations!';
  }
};

const HomeScreen = () => {
  const [userName, setUserName] = useState('Jessica');
  const [chatbotVisible, setChatbotVisible] = useState(false);
  const [healthData, setHealthData] = useState({
    lastPeriod: null,
    daysSinceLastPeriod: 0,
    cyclePhase: 'Unknown',
    activitiesCompleted: 0,
    totalActivities: 4,
  });
  const navigation = useNavigation();
  const route = useRoute();
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

    async function fetchUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isMounted || !user) return;

      // Get user name
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

      // Get health data - periods
      const { data: periods } = await supabase
        .from('periods')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false })
        .limit(1);

      // Calculate today's activities completed
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const todayISO = startOfToday.toISOString();

      let activitiesCount = 0;

      // Check if period logged today
      const { data: todayPeriod } = await supabase
        .from('periods')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', todayISO)
        .limit(1);
      if (todayPeriod && todayPeriod.length > 0) activitiesCount++;

      // Check if symptoms logged today
      const { data: todaySymptoms } = await supabase
        .from('symptoms')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', todayISO)
        .limit(1);
      if (todaySymptoms && todaySymptoms.length > 0) activitiesCount++;

      // Check if meals logged today
      const { data: todayMeals } = await supabase
        .from('meals')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', todayISO)
        .limit(1);
      if (todayMeals && todayMeals.length > 0) activitiesCount++;

      // Check if water logged today
      const { data: todayWater } = await supabase
        .from('daily_water')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', startOfToday.toISOString().split('T')[0])
        .limit(1);
      if (todayWater && todayWater.length > 0) activitiesCount++;

      if (periods && periods.length > 0) {
        const lastPeriod = periods[0];
        const daysSince = Math.floor(
          (new Date() - new Date(lastPeriod.start_date)) / (1000 * 60 * 60 * 24)
        );

        // Determine cycle phase
        let phase = 'Unknown';
        if (daysSince <= 5) phase = 'Menstrual';
        else if (daysSince <= 14) phase = 'Follicular';
        else if (daysSince <= 16) phase = 'Ovulation';
        else if (daysSince <= 28) phase = 'Luteal';
        else phase = 'Late Cycle';

        setHealthData(prev => ({
          ...prev,
          lastPeriod: lastPeriod.start_date,
          daysSinceLastPeriod: daysSince,
          cyclePhase: phase,
          activitiesCompleted: activitiesCount,
        }));
      } else {
        setHealthData(prev => ({
          ...prev,
          activitiesCompleted: activitiesCount,
        }));
      }
    }

    fetchUserData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const trigger = route?.params?.openChatbot;
    if (!trigger) return;

    setChatbotVisible(true);

    if (navigation.setParams) {
      navigation.setParams({ openChatbot: undefined });
    }
  }, [navigation, route?.params?.openChatbot]);

  const formattedDate = useMemo(
    () =>
      today.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
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
            <View style={styles.logoInline}>
              <SvgXml xml={ASTER_FLOWER_SVG} width={28} height={28} />
            </View>
            <TouchableOpacity
              style={styles.iconButton}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('PastAnalytics')}
            >
              <Ionicons name="calendar-outline" size={20} color="#3F2560" />
            </TouchableOpacity>
          </View>

          <View style={styles.datePill}>
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>

          <Text style={styles.greetingText}>
            {greeting}, <Text style={styles.greetingName}>{userName}</Text>
          </Text>

          {/* Wellness Progress Card */}
          <View style={[styles.card, styles.wellnessCard]}>
            <View style={styles.wellnessHeader}>
              <View>
                <Text style={styles.wellnessTitle}>Your Wellness Progress</Text>
                <Text style={styles.wellnessStatus}>
                  {healthData.cyclePhase} Phase
                </Text>
              </View>
              <View style={styles.improvementBadge}>
                <Ionicons name="trending-up" size={16} color="#2C9A45" />
                <Text style={styles.improvementText}>Improved</Text>
              </View>
            </View>

            <Text style={styles.wellnessMessage}>
              {getCyclePhaseInsight(healthData.cyclePhase, healthData.daysSinceLastPeriod)}
            </Text>

            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${(healthData.activitiesCompleted / healthData.totalActivities) * 100}%`,
                    },
                  ]}
                />
              </View>
            </View>

            <Text style={styles.activitiesText}>
              {healthData.activitiesCompleted}/{healthData.totalActivities} activities completed today
            </Text>

            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={() => navigation.navigate('SymptomLog')}
              >
                <Ionicons name="fitness-outline" size={18} color="#4B117B" />
                <Text style={styles.quickActionText}>Log Symptoms</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={() => navigation.navigate('FoodLog')}
              >
                <Ionicons name="restaurant-outline" size={18} color="#4B117B" />
                <Text style={styles.quickActionText}>Log Food</Text>
              </TouchableOpacity>
            </View>
          </View>

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
            <Text style={styles.cardTitle}>
              {healthData.cyclePhase !== 'Unknown'
                ? `${healthData.cyclePhase} Phase Insights`
                : 'More Insights'}
            </Text>
            <View style={styles.insightStack}>
              {getCyclePhaseInsights(healthData.cyclePhase).map((insight) => {
                // Map icon names to Ionicons
                const iconMap = {
                  nutrition: 'leaf-outline',
                  heart: 'heart-outline',
                  bed: 'bed-outline',
                  flash: 'flash-outline',
                  sunny: 'sunny-outline',
                  water: 'water-outline',
                  clipboard: 'clipboard-outline',
                  calendar: 'calendar-outline',
                };

                return (
                  <View
                    key={insight.key}
                    style={[styles.insightCard, { backgroundColor: insight.background }]}
                  >
                    <View style={[styles.insightIconWrap, { backgroundColor: `${insight.accent}1A` }]}>
                      <Ionicons
                        name={iconMap[insight.icon] || 'heart-outline'}
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
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
      <BottomTaskbar activeKey="Home" />
      {chatbotEnabled && (
        <ChatbotModal visible={chatbotVisible} onClose={() => setChatbotVisible(false)} />
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
  logoInline: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
  wellnessCard: {
    backgroundColor: '#7FD99F',
    borderRadius: CARD_RADIUS,
    padding: 22,
    shadowColor: '#2C9A45',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
  wellnessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  wellnessTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  wellnessStatus: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  improvementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  improvementText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2C9A45',
  },
  wellnessMessage: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: 18,
  },
  progressBarContainer: {
    marginBottom: 8,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  activitiesText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    shadowColor: '#2C9A45',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B117B',
  },
});
