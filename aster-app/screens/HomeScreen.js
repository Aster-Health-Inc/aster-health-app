import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView,
  StatusBar,
  RefreshControl 
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { calculateCyclePhase, getPhaseInfo } from '../utils/cycleCalculations';
import { log, warn, error } from '../utils/CrashLogger';

log('User pressed button', { id: 42 });
warn('Slow API response');
error('Login failed', err);
const HomeScreen = ({ navigation: navigationProp }) => {
  const navigation = useNavigation();
  
  const [currentMonth, setCurrentMonth] = useState('');
  const [currentDay, setCurrentDay] = useState(0);
  const [cycleData, setCycleData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCycleData();
    
    // Set current month and day
    const today = new Date();
    setCurrentMonth(today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
    setCurrentDay(today.getDate());
  }, []);



  const loadCycleData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's profile data and cycle information
      const [{ data: profile }, { data: userData }, { data: periods }] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('users')
          .select('average_cycle_length, average_period_length')
          .eq('id', user.id)
          .single(),
        supabase
          .from('periods')
          .select('start_date, end_date')
          .eq('user_id', user.id)
          .order('start_date', { ascending: false })
          .limit(1)
      ]);

      if (profile && userData) {
        // Calculate cycle information using the most recent period
        let lastPeriodDate = null;
        let cycleLength = userData.average_cycle_length || 28;
        let periodLength = userData.average_period_length || 5;

        if (periods && periods.length > 0) {
          lastPeriodDate = periods[0].start_date;
        }

        if (lastPeriodDate) {
          const cycleInfo = calculateCyclePhase(lastPeriodDate, cycleLength);
          
          // Calculate next period date
          const nextPeriodDate = new Date(lastPeriodDate);
          nextPeriodDate.setDate(nextPeriodDate.getDate() + cycleLength);
          
          setCycleData({
            ...cycleInfo,
            periodLength,
            lastPeriodDate,
            nextPeriodDate: nextPeriodDate.toISOString().split('T')[0],
            cycleLength
          });
        } else {
          // No period data yet, show setup message
          setCycleData(null);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading cycle data:', error);
      setLoading(false);
    }
  };



  // Generate calendar data based on real cycle information
  const generateCalendarDays = () => {
    if (!cycleData) return [];
    
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Get the first day of the month and how many days it has
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const firstDayOfWeek = firstDay.getDay();
    
    const calendarDays = [];
    
    // Add previous month's days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0);
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthLastDay.getDate() - i;
      calendarDays.push({
        day,
        month: 'prev',
        type: 'none'
      });
    }
    
    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(currentYear, currentMonth, day);
      const daysSinceLastPeriod = Math.floor((currentDate - new Date(cycleData.lastPeriodDate)) / (1000 * 60 * 60 * 24));
      const cycleDay = (daysSinceLastPeriod % cycleData.cycleLength) + 1;
      
      let type = 'none';
      if (cycleDay <= cycleData.periodLength) {
        type = 'period';
      } else if (cycleDay >= 13 && cycleDay <= 16) {
        type = 'fertile';
      }
      
      calendarDays.push({
        day,
        month: 'current',
        type,
        cycleDay,
        isCurrentDay: day === today.getDate()
      });
    }
    
    // Add next month's days to fill the grid
    const totalDays = calendarDays.length;
    const remainingSlots = 42 - totalDays; // 6 rows * 7 days
    
    for (let day = 1; day <= remainingSlots; day++) {
      calendarDays.push({
        day,
        month: 'next',
        type: 'none'
      });
    }
    
    return calendarDays;
  };

  const calendarDays = generateCalendarDays();

  const renderCalendarDay = (dayData, index) => {
    const isCurrentDay = dayData.day === currentDay && dayData.month === 'current';
    const isPeriod = dayData.type === 'period';
    const isFertile = dayData.type === 'fertile';
    const isPrevMonth = dayData.month === 'prev';
    const isNextMonth = dayData.month === 'next';

    let dayStyle = [styles.calendarDay];
    let textStyle = [styles.calendarDayText];

    if (isCurrentDay) {
      dayStyle.push(styles.currentDay);
      textStyle.push(styles.currentDayText);
    } else if (isPeriod) {
      dayStyle.push(styles.periodDay);
      textStyle.push(styles.periodDayText);
    } else if (isFertile) {
      dayStyle.push(styles.fertileDay);
      textStyle.push(styles.fertileDayText);
    } else if (isPrevMonth || isNextMonth) {
      textStyle.push(styles.otherMonthText);
    }

    return (
      <View key={index} style={dayStyle}>
        <Text style={textStyle}>{dayData.day}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.profileIcon}>
          <View style={styles.profileIconInner} />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.calendarIcon}>
            <Text style={styles.calendarIconText}>📅</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.resetButton}
            onPress={async () => {
              await supabase.auth.signOut();
              navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
            }}
          >
            <Text style={styles.resetButtonText}>🔁 Reset App</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              loadCycleData();
            }}
            colors={['#8B5CF6']}
            tintColor="#8B5CF6"
          />
        }
      >
        {/* Cycle Day Summary Card */}
        <View style={styles.cycleDayCard}>
          <View style={styles.cycleDayHeader}>
            <Text style={styles.cycleDayTitle}>Cycle Day</Text>
            <View style={styles.phaseTag}>
              <Text style={styles.phaseTagText}>
                {cycleData ? getPhaseInfo(cycleData.phase)?.name : 'Loading...'}
              </Text>
            </View>
          </View>
          
          <View style={styles.cycleDayContent}>
            <View style={styles.cycleDayCircle}>
              <Text style={styles.cycleDayNumber}>
                {cycleData ? cycleData.currentCycleDay : '...'}
              </Text>
            </View>
            <View style={styles.cycleDayInfo}>
              <Text style={styles.nextPeriodText}>
                {cycleData ? (
                  cycleData.daysUntilNext === 0 
                    ? "Your period is here!" 
                    : `Next period in ${cycleData.daysUntilNext} days`
                ) : 'Loading...'}
              </Text>
              <Text style={styles.cycleInfoText}>
                {cycleData ? `Cycle length: ${cycleData.cycleLength} days` : ''}
              </Text>
              {cycleData?.nextPeriodDate && (
                <Text style={styles.nextPeriodDateText}>
                  Next period: {new Date(cycleData.nextPeriodDate).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </Text>
              )}
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { width: `${cycleData ? cycleData.progress : 0}%` }
                    ]} 
                  />
                </View>
              </View>
            </View>
          </View>
        </View>



        {/* Show message if no cycle data available */}
        {!loading && !cycleData && (
          <View style={styles.noDataCard}>
            <Text style={styles.noDataText}>
              No cycle data available. Please complete your profile setup.
            </Text>
            <TouchableOpacity 
              style={styles.setupButton}
              onPress={() => navigation.navigate('BasicInfo')}
            >
              <Text style={styles.setupButtonText}>Complete Setup</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Calendar Card */}
        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <View style={styles.monthSection}>
              <Text style={styles.monthText}>{currentMonth}</Text>
              <TouchableOpacity style={styles.monthChevron}>
                <Text style={styles.chevronText}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.navigationArrows}>
              <TouchableOpacity style={styles.arrowButton}>
                <Text style={styles.arrowText}>‹</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.arrowButton}>
                <Text style={styles.arrowText}>›</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Days of Week */}
          <View style={styles.daysOfWeek}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <Text key={index} style={styles.dayOfWeekText}>{day}</Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {calendarDays.map((dayData, index) => renderCalendarDay(dayData, index))}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={styles.legendDot} />
              <Text style={styles.legendText}>Period</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendDotFertile]} />
              <Text style={styles.legendText}>Fertile</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendDotPMS]} />
              <Text style={styles.legendText}>PMS</Text>
            </View>
          </View>
        </View>

        {/* Todays Section */}
        <View style={styles.todaysCard}>
          <Text style={styles.todaysTitle}>Todays</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.todaysContent}>
            {/* Placeholder for today's items */}
            <View style={styles.todayItem}>
              <Text style={styles.todayItemText}>Mood</Text>
            </View>
            <View style={styles.todayItem}>
              <Text style={styles.todayItemText}>Symptoms</Text>
            </View>
            <View style={styles.todayItem}>
              <Text style={styles.todayItemText}>Notes</Text>
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity style={[styles.navItem, styles.activeNavItem]}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={[styles.navText, styles.activeNavText]}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => {
            console.log('Food button pressed, navigating to MealLogHome');
            try {
              navigation.navigate('MealLogHome');
              console.log('Navigation successful');
            } catch (error) {
              console.error('Navigation error:', error);
            }
          }}
        >
          <Text style={styles.navIcon}>🍽️</Text>
          <Text style={styles.navText}>Food</Text>
        </TouchableOpacity>
        

        
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>➕</Text>
          <Text style={styles.navText}>Lumi</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>😊</Text>
          <Text style={styles.navText}>Mood</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
  },
  profileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIconInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#000',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  calendarIcon: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarIconText: {
    fontSize: 20,
  },
  resetButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Cycle Day Card
  cycleDayCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cycleDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cycleDayTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  phaseTag: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  phaseTagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  cycleDayContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cycleDayCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  cycleDayNumber: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  cycleDayInfo: {
    flex: 1,
  },
  nextPeriodText: {
    fontSize: 16,
    color: '#000',
    marginBottom: 8,
  },
  cycleInfoText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  nextPeriodDateText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
    marginBottom: 12,
  },
  progressBarContainer: {
    width: '100%',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
  },
  progressBarFill: {
    height: 6,
    backgroundColor: '#000',
    borderRadius: 3,
    width: '0%', // Will be set dynamically
  },

  // Calendar Card
  calendarCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  monthSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginRight: 8,
  },
  monthChevron: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronText: {
    fontSize: 18,
    color: '#000',
  },
  navigationArrows: {
    flexDirection: 'row',
    gap: 12,
  },
  arrowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 18,
    color: '#000',
  },
  daysOfWeek: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dayOfWeekText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  calendarDay: {
    width: '14.28%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDayText: {
    fontSize: 16,
    color: '#000',
  },
  currentDay: {
    borderWidth: 2,
    borderColor: '#000',
    borderStyle: 'dashed',
    borderRadius: 20,
  },
  currentDayText: {
    fontWeight: '600',
  },
  periodDay: {
    backgroundColor: '#000',
    borderRadius: 20,
  },
  periodDayText: {
    color: '#fff',
    fontWeight: '600',
  },
  fertileDay: {
    backgroundColor: '#E9D5FF',
    borderRadius: 20,
  },
  fertileDayText: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  otherMonthText: {
    color: '#9CA3AF',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#000',
    marginRight: 6,
  },
  legendDotFertile: {
    backgroundColor: '#8B5CF6',
  },
  legendDotPMS: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#000',
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },



  // No Data Card
  noDataCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  noDataText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  setupButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Todays Section
  todaysCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  todaysTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  todaysContent: {
    flexDirection: 'row',
  },
  todayItem: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 12,
  },
  todayItemText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },

  // Bottom Navigation
  bottomNavigation: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeNavItem: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingVertical: 8,
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  navText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeNavText: {
    color: '#000',
    fontWeight: '600',
  },
});

export default HomeScreen;
