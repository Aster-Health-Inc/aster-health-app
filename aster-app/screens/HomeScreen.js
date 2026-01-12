import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop, SvgXml } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../lib/supabase';
import BottomTaskbar from '../components/BottomTaskbar';
import TabSwipeWrapper from '../components/TabSwipeWrapper';
import ChatbotModal from '../components/ChatBotModal';
import { useFeatureFlags } from '../lib/FeatureFlag';
import { ASTER_FLOWER_SVG } from '../assets/logoSvg';

const BACKGROUND = '#EEE7FF';
const CARD_RADIUS = 26;
const CHART_HEIGHT = 180;
const H_PADDING = 24;

// Minimum data points required to show insights
const MIN_DATA_DAYS = 7;
const MIN_DATA_FOR_WEEKEND_COMPARISON = 14;

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

// Helper function to calculate insights from energy data
const calculateEnergyInsights = (energyLogs) => {
  if (!energyLogs || energyLogs.length < MIN_DATA_DAYS) {
    return null;
  }

  const validLogs = energyLogs.filter(log => log.energy_level != null);
  if (validLogs.length < MIN_DATA_DAYS) {
    return null;
  }

  // Calculate average energy (convert 1-5 scale to percentage)
  const avgEnergy = validLogs.reduce((sum, log) => sum + log.energy_level, 0) / validLogs.length;
  const avgEnergyPercent = Math.round((avgEnergy / 5) * 100);

  // Weekend vs weekday comparison (need at least 14 days)
  let weekendBoost = null;
  let weekendComparison = null;
  if (validLogs.length >= MIN_DATA_FOR_WEEKEND_COMPARISON) {
    const weekdayLogs = validLogs.filter(log => {
      const dayOfWeek = new Date(log.date).getDay();
      return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
    });
    const weekendLogs = validLogs.filter(log => {
      const dayOfWeek = new Date(log.date).getDay();
      return dayOfWeek === 0 || dayOfWeek === 6; // Saturday and Sunday
    });

    if (weekdayLogs.length > 0 && weekendLogs.length > 0) {
      const weekdayAvg = weekdayLogs.reduce((sum, log) => sum + log.energy_level, 0) / weekdayLogs.length;
      const weekendAvg = weekendLogs.reduce((sum, log) => sum + log.energy_level, 0) / weekendLogs.length;
      const boost = ((weekendAvg - weekdayAvg) / weekdayAvg) * 100;
      weekendBoost = Math.round(boost);
      weekendComparison = { weekdayAvg, weekendAvg, boost };
    }
  }

  // Calculate chart data (last 5 months or available data)
  const chartData = [];
  const now = new Date();
  const months = [];
  for (let i = 4; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: date.toLocaleDateString('en-US', { month: 'short' }),
      month: date.getMonth(),
      year: date.getFullYear(),
    });
  }

  months.forEach(({ label, month, year }) => {
    const monthLogs = validLogs.filter(log => {
      const logDate = new Date(log.date);
      return logDate.getMonth() === month && logDate.getFullYear() === year;
    });
    if (monthLogs.length > 0) {
      const monthAvg = monthLogs.reduce((sum, log) => sum + log.energy_level, 0) / monthLogs.length;
      // Convert to a scale similar to the original (multiply by ~30 to get similar range)
      chartData.push({ label, value: Math.round(monthAvg * 30) });
    }
  });

  // Calculate actual months of data based on date range
  const sortedDates = validLogs.map(log => new Date(log.date)).sort((a, b) => a - b);
  const firstDate = sortedDates[0];
  const lastDate = sortedDates[sortedDates.length - 1];
  const daysDiff = Math.floor((lastDate - firstDate) / (1000 * 60 * 60 * 24));
  const monthsOfData = Math.max(0.1, Math.round((daysDiff / 30) * 10) / 10); // At least 0.1 months

  // Peak energy time (this would require time-of-day data, which we don't have)
  // For now, we'll skip this or use a placeholder
  const peakEnergy = null;

  return {
    avgEnergy: avgEnergyPercent,
    weekendBoost,
    weekendComparison,
    chartData: chartData.length > 0 ? chartData : null,
    peakEnergy,
    dataPoints: validLogs.length,
    monthsOfData,
  };
};

// Generate personalized optimization tips based on actual data
const generateOptimizationTips = (insights) => {
  if (!insights) return [];

  const tips = [];

  if (insights.weekendComparison) {
    if (insights.weekendBoost > 10) {
      tips.push('Your energy is significantly higher on weekends. Consider adjusting your weekday sleep schedule to match your weekend routine.');
    } else if (insights.weekendBoost < -10) {
      tips.push('You have lower energy on weekends. Try maintaining a consistent sleep schedule throughout the week.');
    }
  }

  if (insights.avgEnergy < 50) {
    tips.push('Your average energy levels are on the lower side. Focus on getting adequate sleep and maintaining a balanced diet.');
  }

  // Generic helpful tips that are always relevant
  if (tips.length === 0) {
    tips.push('Maintain a consistent sleep schedule for better energy levels');
    tips.push('Stay hydrated throughout the day to maintain energy');
    tips.push('Regular light exercise can help boost your energy levels');
  }

  return tips.slice(0, 3); // Limit to 3 tips
};

// Generate helpful empty state content for Energy Optimization
const getEnergyOptimizationEmptyContent = (cyclePhase) => {
  const phaseBasedTips = {
    Menstrual: {
      title: 'Energy Tips for Your Period',
      description: 'During your period, your body needs extra rest. Here are some ways to support your energy:',
      tips: [
        'Prioritize 7-9 hours of sleep to help your body recover',
        'Include iron-rich foods like spinach and lean meats to combat fatigue',
        'Gentle movement like walking or yoga can actually boost energy',
      ],
    },
    Follicular: {
      title: 'Building Your Energy',
      description: 'Your energy is naturally rising during this phase. Here\'s how to maximize it:',
      tips: [
        'This is a great time to try new workouts or activities',
        'Maintain consistent sleep to support rising energy levels',
        'Stay hydrated to keep your energy stable throughout the day',
      ],
    },
    Ovulation: {
      title: 'Peak Energy Phase',
      description: 'You\'re at your energetic peak! Make the most of it:',
      tips: [
        'Schedule important tasks and social activities during this time',
        'Stay hydrated as your body temperature rises slightly',
        'Listen to your body and rest when needed, even at peak energy',
      ],
    },
    Luteal: {
      title: 'Managing Energy in Luteal Phase',
      description: 'Energy may fluctuate as your cycle progresses. Support yourself with:',
      tips: [
        'Complex carbs and magnesium-rich foods can help stabilize energy',
        'Practice stress-reducing activities like meditation or gentle exercise',
        'Maintain a consistent sleep schedule to support mood and energy',
      ],
    },
    'Late Cycle': {
      title: 'Supporting Your Energy',
      description: 'Your cycle is longer than usual. Here are ways to maintain energy:',
      tips: [
        'Stress management techniques can help regulate your cycle and energy',
        'Ensure you\'re getting adequate sleep and rest',
        'Stay hydrated and maintain a balanced diet',
      ],
    },
    Unknown: {
      title: 'Energy Optimization Tips',
      description: 'Track your energy levels to discover personalized patterns. In the meantime, here are general tips:',
      tips: [
        'Aim for 7-9 hours of consistent sleep each night',
        'Stay hydrated throughout the day (aim for 8 glasses of water)',
        'Regular light exercise like walking can boost energy levels',
      ],
    },
  };

  return phaseBasedTips[cyclePhase] || phaseBasedTips.Unknown;
};

// Generate helpful empty state content for Health Patterns
const getHealthPatternsEmptyContent = (cyclePhase) => {
  const phaseBasedContent = {
    Menstrual: {
      title: 'Understanding Your Health Patterns',
      description: 'Tracking your energy, symptoms, and cycle together helps reveal patterns unique to your body. During your period, you might notice:',
      insights: [
        'Energy levels often dip during menstruation',
        'Symptoms like cramps and fatigue are common',
        'Rest and iron-rich foods can help support recovery',
      ],
    },
    Follicular: {
      title: 'Your Health Journey',
      description: 'As you track your data, you\'ll discover how your cycle affects your energy and wellness. In your follicular phase:',
      insights: [
        'Energy typically increases as estrogen rises',
        'This is often a great time for new activities',
        'Tracking helps you identify your personal patterns',
      ],
    },
    Ovulation: {
      title: 'Discovering Your Patterns',
      description: 'Tracking helps you understand your body\'s unique rhythms. During ovulation:',
      insights: [
        'Many people experience peak energy and mood',
        'Body temperature may rise slightly',
        'Staying hydrated becomes especially important',
      ],
    },
    Luteal: {
      title: 'Learning Your Body\'s Patterns',
      description: 'Every body is unique. Tracking helps you understand yours. In the luteal phase:',
      insights: [
        'Energy and mood may fluctuate as hormones change',
        'PMS symptoms can vary from cycle to cycle',
        'Self-care and stress management are especially valuable',
      ],
    },
    'Late Cycle': {
      title: 'Building Your Health Profile',
      description: 'The more you track, the more insights you\'ll unlock. While waiting for your period:',
      insights: [
        'Stress and lifestyle factors can affect cycle length',
        'Tracking symptoms helps identify patterns',
        'Consistent logging reveals your personal health trends',
      ],
    },
    Unknown: {
      title: 'Start Your Health Tracking Journey',
      description: 'Track your energy levels, symptoms, and cycle to discover personalized insights about your body. You\'ll learn:',
      insights: [
        'How your energy fluctuates throughout your cycle',
        'Patterns between your symptoms and cycle phases',
        'Personalized tips based on your unique data',
      ],
    },
  };

  return phaseBasedContent[cyclePhase] || phaseBasedContent.Unknown;
};

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
  const [energyInsights, setEnergyInsights] = useState(null);
  const [energyChartData, setEnergyChartData] = useState(null);
  const [optimizationTips, setOptimizationTips] = useState([]);
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

      // Fetch energy level data for insights
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const threeMonthsAgoISO = threeMonthsAgo.toISOString().split('T')[0];

      const { data: energyLogs, error: energyError } = await supabase
        .from('daily_logs')
        .select('date, energy_level')
        .eq('user_id', user.id)
        .gte('date', threeMonthsAgoISO)
        .not('energy_level', 'is', null)
        .order('date', { ascending: true });

      if (!energyError && energyLogs) {
        const insights = calculateEnergyInsights(energyLogs);
        setEnergyInsights(insights);
        
        if (insights?.chartData) {
          setEnergyChartData(insights.chartData);
        }
        
        const tips = generateOptimizationTips(insights);
        setOptimizationTips(tips);
      } else {
        setEnergyInsights(null);
        setEnergyChartData(null);
        setOptimizationTips([]);
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

  const { areaPath, linePath, minValue, maxValue, chartPoints } = useMemo(() => {
    const points = energyChartData || [];
    if (!points.length) {
      return { areaPath: '', linePath: '', minValue: 0, maxValue: 1, chartPoints: [] };
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

    return { areaPath: area, linePath: line, minValue: minVal, maxValue: maxVal, chartPoints: points };
  }, [chartWidth, energyChartData]);

  return (
    <TabSwipeWrapper activeKey="Home">
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

          {energyInsights && energyInsights.dataPoints >= MIN_DATA_DAYS ? (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Energy Optimization</Text>
                {energyInsights.avgEnergy >= 60 ? (
                  <View style={styles.statusPill}>
                    <Text style={styles.statusText}>Doing good!</Text>
                  </View>
                ) : null}
              </View>
              {energyInsights.weekendBoost != null ? (
                <Text style={styles.cardBodyText}>
                  Based on {energyInsights.monthsOfData} {energyInsights.monthsOfData === 1 ? 'month' : 'months'} of data, your energy levels are {Math.abs(energyInsights.weekendBoost)}% {energyInsights.weekendBoost > 0 ? 'higher' : 'lower'} on weekends{energyInsights.weekendBoost > 0 ? ', likely due to better sleep patterns' : ''}.
                </Text>
              ) : (
                <Text style={styles.cardBodyText}>
                  Based on {energyInsights.dataPoints} days of data, your average energy level is {energyInsights.avgEnergy}%. Keep tracking to unlock more personalized insights!
                </Text>
              )}

              {optimizationTips.length > 0 && (
                <View style={styles.tipCard}>
                  <View style={styles.tipHeader}>
                    <Ionicons name="sparkles-outline" size={18} color="#4B117B" />
                    <Text style={styles.tipTitle}>Optimize Your Routine</Text>
                  </View>
                  {optimizationTips.map((tip, index) => (
                    <View key={index} style={styles.tipRow}>
                      <View style={styles.tipBullet} />
                      <Text style={styles.tipText}>{tip}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Energy Optimization</Text>
              </View>
              {(() => {
                const emptyContent = getEnergyOptimizationEmptyContent(healthData.cyclePhase);
                return (
                  <>
                    <Text style={styles.cardBodyText}>
                      {emptyContent.description}
                    </Text>
                    <View style={styles.tipCard}>
                      <View style={styles.tipHeader}>
                        <Ionicons name="bulb-outline" size={18} color="#4B117B" />
                        <Text style={styles.tipTitle}>{emptyContent.title}</Text>
                      </View>
                      {emptyContent.tips.map((tip, index) => (
                        <View key={index} style={styles.tipRow}>
                          <View style={styles.tipBullet} />
                          <Text style={styles.tipText}>{tip}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.emptyStateFooter}>
                      <Ionicons name="trending-up-outline" size={16} color="#7D7396" />
                      <Text style={styles.emptyStateFooterText}>
                        Log your energy levels daily to unlock personalized insights
                      </Text>
                    </View>
                  </>
                );
              })()}
            </View>
          )}

          {energyInsights && energyChartData && energyChartData.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Your Health Patterns</Text>
              <Text style={styles.cardBodyTextSecondary}>
                Energy levels over the past {energyChartData.length} {energyChartData.length === 1 ? 'month' : 'months'}
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
                  {areaPath && <Path d={areaPath} fill="url(#chartGradient)" />}
                  {linePath && <Path d={linePath} fill="none" stroke="#7052FF" strokeWidth={3.5} strokeLinecap="round" />}
                </Svg>
              </View>
              <View style={styles.chartLabels}>
                {chartPoints.map((point) => (
                  <Text key={point.label} style={styles.chartLabelText}>
                    {point.label}
                  </Text>
                ))}
              </View>

              <View style={styles.metricRow}>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricValue, { color: '#E4B02A' }]}>{energyInsights.avgEnergy}%</Text>
                  <Text style={styles.metricLabel}>Avg Energy</Text>
                </View>
                {energyInsights.weekendBoost != null ? (
                  <View style={styles.metricItem}>
                    <Text style={[styles.metricValue, { color: energyInsights.weekendBoost > 0 ? '#43C765' : '#E4B02A' }]}>
                      {energyInsights.weekendBoost > 0 ? '+' : ''}{energyInsights.weekendBoost}%
                    </Text>
                    <Text style={styles.metricLabel}>Weekend {energyInsights.weekendBoost > 0 ? 'Boost' : 'Change'}</Text>
                  </View>
                ) : (
                  <View style={styles.metricItem}>
                    <Text style={[styles.metricValue, { color: '#5140CF' }]}>{energyInsights.dataPoints}</Text>
                    <Text style={styles.metricLabel}>Days Tracked</Text>
                  </View>
                )}
                <View style={styles.metricItem}>
                  <Text style={[styles.metricValue, { color: '#5140CF' }]}>
                    {energyInsights.monthsOfData} {energyInsights.monthsOfData === 1 ? 'mo' : 'mos'}
                  </Text>
                  <Text style={styles.metricLabel}>Data Period</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Your Health Patterns</Text>
              {(() => {
                const emptyContent = getHealthPatternsEmptyContent(healthData.cyclePhase);
                return (
                  <>
                    <Text style={styles.cardBodyTextSecondary}>
                      {emptyContent.description}
                    </Text>
                    <View style={styles.emptyInsightsContainer}>
                      {emptyContent.insights.map((insight, index) => (
                        <View key={index} style={styles.emptyInsightItem}>
                          <View style={styles.emptyInsightIcon}>
                            <Ionicons name="checkmark-circle" size={20} color="#7052FF" />
                          </View>
                          <Text style={styles.emptyInsightText}>{insight}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.emptyStateFooter}>
                      <Ionicons name="analytics-outline" size={16} color="#7D7396" />
                      <Text style={styles.emptyStateFooterText}>
                        Start tracking to see your personalized health patterns
                      </Text>
                    </View>
                  </>
                );
              })()}
            </View>
          )}

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
    </TabSwipeWrapper>
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
  emptyStateFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(125, 115, 150, 0.15)',
  },
  emptyStateFooterText: {
    fontSize: 12,
    color: '#7D7396',
    fontStyle: 'italic',
    flex: 1,
  },
  emptyInsightsContainer: {
    marginTop: 12,
    marginBottom: 16,
    gap: 12,
  },
  emptyInsightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  emptyInsightIcon: {
    marginTop: 2,
  },
  emptyInsightText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: '#5F5478',
  },
});
