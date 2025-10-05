import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DynamicCalorieCard from '../components/DynamicCalorieCard';
import MacroCard from '../components/MacroCard';
import WeekCalendar from '../components/WeekCalendar';

const FoodLogScreen = () => {
  const navigation = useNavigation();
  const [selectedDate, setSelectedDate] = useState(5);

  // Mock data
  const nutritionData = {
    caloriesConsumed: 100,
    caloriesGoal: 1522,
    protein: { consumed: 12, goal: 76 },
    carbs: { consumed: 2, goal: 148 },
    fat: { consumed: 6, goal: 50 },
    recentMeals: [
      {
        name: 'Cheese Heads 100% Natural Light Strin...',
        time: '04:43',
        calories: 100,
        protein: 12,
        carbs: 2,
        fat: 6,
      },
    ],
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.appIcon}>🍎</Text>
            <Text style={styles.appName}>Cal AI</Text>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakNumber}>18</Text>
          </View>
        </View>

        {/* Week Calendar */}
        <WeekCalendar onDateSelect={setSelectedDate} />

        {/* Dynamic Calorie Card */}
        <DynamicCalorieCard
          caloriesConsumed={nutritionData.caloriesConsumed}
          caloriesGoal={nutritionData.caloriesGoal}
          toggleInterval={3000}
        />

        {/* Macro Cards Row */}
        <View style={styles.macroRow}>
          <MacroCard
            type="Protein"
            consumed={nutritionData.protein.consumed}
            goal={nutritionData.protein.goal}
            emoji="🍗"
            color="#ff6b6b"
          />
          <MacroCard
            type="Carbs"
            consumed={nutritionData.carbs.consumed}
            goal={nutritionData.carbs.goal}
            emoji="🌾"
            color="#ffa94d"
          />
          <MacroCard
            type="Fat"
            consumed={nutritionData.fat.consumed}
            goal={nutritionData.fat.goal}
            emoji="🧈"
            color="#4dabf7"
          />
        </View>

        {/* Page Indicator */}
        <View style={styles.pageIndicator}>
          <View style={[styles.dot, styles.activeDot]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        {/* Recently Uploaded Section */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recently uploaded</Text>

          {nutritionData.recentMeals.map((meal, index) => (
            <View key={index} style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <Text style={styles.mealName}>{meal.name}</Text>
                <Text style={styles.mealTime}>{meal.time}</Text>
              </View>

              <View style={styles.mealDetails}>
                <View style={styles.calorieRow}>
                  <Text style={styles.fireEmoji}>🔥</Text>
                  <Text style={styles.calorieText}>{meal.calories} calories</Text>
                </View>

                <View style={styles.macroRow}>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroEmoji}>🍗</Text>
                    <Text style={styles.macroText}>{meal.protein}g</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroEmoji}>🌾</Text>
                    <Text style={styles.macroText}>{meal.carbs}g</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroEmoji}>🧈</Text>
                    <Text style={styles.macroText}>{meal.fat}g</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Bottom spacing for FAB */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('MealLogHome')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default FoodLogScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1115',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appIcon: {
    fontSize: 32,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2d35',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  streakEmoji: {
    fontSize: 16,
  },
  streakNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  macroRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 12,
  },
  pageIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2a2d35',
  },
  activeDot: {
    backgroundColor: '#ffffff',
  },
  recentSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  mealCard: {
    backgroundColor: '#1a1d24',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealName: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  mealTime: {
    fontSize: 14,
    color: '#9ca3af',
  },
  mealDetails: {
    gap: 8,
  },
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fireEmoji: {
    fontSize: 18,
  },
  calorieText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  macroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 16,
  },
  macroEmoji: {
    fontSize: 14,
  },
  macroText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  bottomSpacer: {
    height: 100,
  },
  fab: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    fontWeight: '300',
    color: '#000000',
  },
});
