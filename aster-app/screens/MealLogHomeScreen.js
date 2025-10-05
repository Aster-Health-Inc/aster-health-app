import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Pressable, Platform, SafeAreaView, Alert, KeyboardAvoidingView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import {
  upsertMealLog,
  upsertWaterLog,
  fetchUserDailyLogs,
} from '../utils/meallogger';
import { supabase } from '../lib/supabase';
import { getUserNutritionGoals } from '../utils/nutritionCalculator';
import DynamicCalorieCard from '../components/DynamicCalorieCard';
import MacroCard from '../components/MacroCard';
import WeekCalendar from '../components/WeekCalendar';

const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const MACROS = [
  { key: 'carbs', label: 'Carbs', color: '#45b3e0' },
  { key: 'protein', label: 'Protein', color: '#3ad29f' },
  { key: 'fat', label: 'Fat', color: '#be8afd' },
];
const LITER_TO_OZ = 33.814;
const formatDateKey = (d) => new Date(d).toISOString().slice(0, 10);
const prettyDate = (d) => {
  const options = { weekday: 'short', month: 'short', day: 'numeric' };
  return d.toLocaleDateString(undefined, options);
};

export default function MealLogHomeScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const [mealInputs, setMealInputs] = useState({});
  const [waterOz, setWaterOz] = useState(0);
  const [waterModalVisible, setWaterModalVisible] = useState(false);
  const [waterUnit, setWaterUnit] = useState('oz');
  const [waterDraft, setWaterDraft] = useState('');
  const [waterEditMode, setWaterEditMode] = useState('add');

  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [calorieGoal, setCalorieGoal] = useState(3500); // 🔹 default now 3500
  const [goalDraft, setGoalDraft] = useState('');

  const [waterGoal, setWaterGoal] = useState(128);
  const [waterGoalModalVisible, setWaterGoalModalVisible] = useState(false);
  const [waterGoalDraft, setWaterGoalDraft] = useState('');

  const [dailyData, setDailyData] = useState(null);
  const [streak, setStreak] = useState(0);
  const [nutritionGoals, setNutritionGoals] = useState({
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 67,
    water: 64
  });

  // Calculate streak
  const calculateStreak = async (userId) => {
    try {
      const today = new Date();
      let currentStreak = 0;
      let checkDate = new Date(today);

      // Check backwards from today
      for (let i = 0; i < 365; i++) { // Max check 365 days
        const dateStr = formatDateKey(checkDate);

        const { data, error } = await supabase
          .from('meal_logs')
          .select('total_calories')
          .eq('user_id', userId)
          .eq('log_date', dateStr)
          .maybeSingle();

        if (error) {
          console.error('Error fetching streak data:', error);
          break;
        }

        // If there's data and calories > 0, increment streak
        if (data && data.total_calories > 0) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          // Streak broken
          break;
        }
      }

      setStreak(currentStreak);
    } catch (err) {
      console.error('Error calculating streak:', err);
      setStreak(0);
    }
  };

  // Load nutrition goals when component mounts
  useEffect(() => {
    const loadNutritionGoals = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        console.log('Loading nutrition goals for user:', user.id);
        const goals = await getUserNutritionGoals(supabase, user.id);
        console.log('Calculated nutrition goals:', goals);
        setNutritionGoals(goals);
        setWaterGoal(goals.water);
      } catch (err) {
        console.error('Error loading nutrition goals:', err);
      }
    };
    loadNutritionGoals();
  }, []);

  // Load daily data
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const dateStr = formatDateKey(selectedDate);
        const data = await fetchUserDailyLogs(user.id, dateStr);
        setDailyData(data);
        setWaterOz(data.water || 0);

        const mealsByType = {};
        MEALS.forEach((mealType) => {
          const mealData = data.meals.find(m => m.meal_type === mealType);
          mealsByType[mealType] = {
            calories: mealData?.calories || 0,
            carbs: mealData?.carbs || 0,
            protein: mealData?.protein || 0,
            fat: mealData?.fat || 0,
          };
        });
        setMealInputs(mealsByType);

        // Calculate streak only once when component mounts or user changes
        if (selectedDate.toDateString() === new Date().toDateString()) {
          calculateStreak(user.id);
        }
      } catch (err) {
        console.error('Error loading daily data:', err);
      }
    };
    loadData();
  }, [selectedDate]);

  useFocusEffect(
    React.useCallback(() => {
      const loadDataOnFocus = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          const dateStr = formatDateKey(selectedDate);
          const data = await fetchUserDailyLogs(user.id, dateStr);
          setDailyData(data);
          setWaterOz(data.water || 0);

          const mealsByType = {};
          MEALS.forEach((mealType) => {
            const mealData = data.meals.find(m => m.meal_type === mealType);
            mealsByType[mealType] = {
              calories: mealData?.calories || 0,
              carbs: mealData?.carbs || 0,
              protein: mealData?.protein || 0,
              fat: mealData?.fat || 0,
            };
          });
          setMealInputs(mealsByType);
        } catch (err) {
          console.error('Error refreshing data:', err);
        }
      };
      loadDataOnFocus();
    }, [selectedDate])
  );

  const totalCalories = useMemo(() => {
    return dailyData?.dailyTotals?.total_calories ||
      MEALS.reduce((sum, key) => sum + (parseFloat(mealInputs[key]?.calories) || 0), 0);
  }, [mealInputs, dailyData]);

  const totalProtein = useMemo(() => {
    return dailyData?.dailyTotals?.total_protein ||
      MEALS.reduce((sum, key) => sum + (parseFloat(mealInputs[key]?.protein) || 0), 0);
  }, [mealInputs, dailyData]);

  const totalCarbs = useMemo(() => {
    return dailyData?.dailyTotals?.total_carbs ||
      MEALS.reduce((sum, key) => sum + (parseFloat(mealInputs[key]?.carbs) || 0), 0);
  }, [mealInputs, dailyData]);

  const totalFat = useMemo(() => {
    return dailyData?.dailyTotals?.total_fat ||
      MEALS.reduce((sum, key) => sum + (parseFloat(mealInputs[key]?.fat) || 0), 0);
  }, [mealInputs, dailyData]);

  const saveGoal = () => {
    const n = parseFloat(goalDraft);
    if (!isNaN(n) && n > 0) setCalorieGoal(Math.min(3500, n)); // 🔹 cap at 3500
    setGoalModalVisible(false);
  };

  const handleLogFood = () => navigation.navigate('MealLog');
  const handleLogWater = (mode = 'add') => {
    setWaterEditMode(mode);
    if (mode === 'edit') {
      setWaterDraft(waterOz.toString());
    } else {
      setWaterDraft('');
    }
    setWaterModalVisible(true);
  };

  const saveWater = async () => {
    const val = parseFloat(waterDraft);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Invalid input', 'Please enter a positive number');
      return;
    }
    let ozToSave = waterUnit === 'oz' ? val : val * LITER_TO_OZ;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.id) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      const dateStr = formatDateKey(selectedDate);

      // Get existing water for this date - try both column names
      const { data: existingWater } = await supabase
        .from('water_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', dateStr)
        .maybeSingle();

      console.log('Existing water log:', existingWater);

      let newTotal;
      if (waterEditMode === 'edit') {
        // Edit mode: replace the total with new value
        newTotal = ozToSave;
      } else {
        // Add mode: add to existing
        const currentAmount = existingWater?.amount_oz || existingWater?.water_intake_ml || 0;
        newTotal = currentAmount + ozToSave;
      }

      // Round to whole number since DB expects integer
      newTotal = Math.round(newTotal);

      // Upsert water log - try the column that exists
      const upsertData = {
        user_id: user.id,
        log_date: dateStr,
      };

      // Try amount_oz first, fallback to water_intake_ml
      if ('amount_oz' in (existingWater || {})) {
        upsertData.amount_oz = newTotal;
      } else {
        upsertData.water_intake_ml = newTotal;
      }

      console.log('Upserting water data:', upsertData);

      const { error } = await supabase
        .from('water_logs')
        .upsert([upsertData], { onConflict: ['user_id', 'log_date'] });

      if (error) {
        console.error('Error saving water:', error);
        Alert.alert('Error', 'Failed to save water log');
        return;
      }

      setWaterOz(newTotal);
      setWaterModalVisible(false);

      // Refresh data
      const data = await fetchUserDailyLogs(user.id, dateStr);
      setWaterOz(data.water || 0);
    } catch (err) {
      console.error('Error saving water:', err);
      Alert.alert('Error', 'Failed to save water log');
    }
  };

  const saveWaterGoal = () => {
    const n = parseFloat(waterGoalDraft);
    if (!isNaN(n) && n > 0) setWaterGoal(n);
    setWaterGoalModalVisible(false);
  };

  const deleteMeal = async (mealItemId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.id) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      // Show confirmation
      Alert.alert(
        'Delete Meal',
        'Are you sure you want to delete this meal?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              // Delete the meal item
              const { error: deleteError } = await supabase
                .from('meal_items')
                .delete()
                .eq('id', mealItemId);

              if (deleteError) {
                console.error('Error deleting meal:', deleteError);
                Alert.alert('Error', 'Failed to delete meal');
                return;
              }

              // Recalculate totals for the day
              const dateStr = formatDateKey(selectedDate);

              // Get all remaining meal items for this date
              const { data: remainingItems } = await supabase
                .from('meal_items')
                .select('calories, protein, carbs, fat')
                .eq('user_id', user.id)
                .eq('log_date', dateStr);

              // Calculate new totals
              const totals = (remainingItems || []).reduce((acc, item) => ({
                calories: acc.calories + (item.calories || 0),
                protein: acc.protein + (parseFloat(item.protein) || 0),
                carbs: acc.carbs + (parseFloat(item.carbs) || 0),
                fat: acc.fat + (parseFloat(item.fat) || 0),
              }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

              // Update meal_logs with new totals
              const { error: updateError } = await supabase
                .from('meal_logs')
                .upsert([{
                  user_id: user.id,
                  log_date: dateStr,
                  total_calories: totals.calories,
                  total_protein: totals.protein,
                  total_carbs: totals.carbs,
                  total_fat: totals.fat,
                }], { onConflict: ['user_id', 'log_date'] });

              if (updateError) {
                console.error('Error updating totals:', updateError);
              }

              // Refresh data
              refreshData();
            }
          }
        ]
      );
    } catch (err) {
      console.error('Error deleting meal:', err);
      Alert.alert('Error', 'Failed to delete meal');
    }
  };

  // Calculate recent meals
  const recentMeals = dailyData?.mealItems?.slice(0, 3).map(item => ({
    id: item.id,
    name: item.name || 'Unknown Food',
    time: new Date(item.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    calories: item.calories || 0,
    protein: item.protein || 0,
    carbs: item.carbs || 0,
    fat: item.fat || 0,
  })) || [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.appIcon}>✨</Text>
            <Text style={styles.appName}>Calories</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => navigation.navigate('DeleteMeals')}
              style={styles.deleteIconButton}
            >
              <Ionicons name="trash-outline" size={24} color="#111111" />
            </TouchableOpacity>
            <View style={styles.streakBadge}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={styles.streakNumber}>{streak}</Text>
            </View>
          </View>
        </View>

        {/* Week Calendar */}
        <WeekCalendar
          selectedDate={selectedDate}
          onDateSelect={(date) => {
            setSelectedDate(date);
          }}
        />

        {/* Dynamic Calorie Card */}
        <DynamicCalorieCard
          caloriesConsumed={totalCalories}
          caloriesGoal={nutritionGoals.calories}
          toggleInterval={3000}
        />

        {/* Macro Cards Row */}
        <View style={styles.macroRow}>
          <MacroCard
            type="Protein"
            consumed={Math.round(totalProtein)}
            goal={nutritionGoals.protein}
            emoji="🍗"
            color="#ff6b6b"
          />
          <MacroCard
            type="Carbs"
            consumed={Math.round(totalCarbs)}
            goal={nutritionGoals.carbs}
            emoji="🌾"
            color="#ffa94d"
          />
          <MacroCard
            type="Fat"
            consumed={Math.round(totalFat)}
            goal={nutritionGoals.fat}
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

        {/* Water Card */}
        <View style={styles.waterCard}>
          <View style={styles.waterHeader}>
            <Text style={styles.waterTitle}>💧 Water Intake</Text>
            <TouchableOpacity onPress={() => {
              setWaterGoalDraft(waterGoal.toString());
              setWaterGoalModalVisible(true);
            }}>
              <Text style={styles.waterGoalText}>Goal: {waterGoal} oz</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.waterContent}>
            <TouchableOpacity
              style={styles.waterCircleButton}
              onPress={() => handleLogWater('edit')}
              onLongPress={() => handleLogWater('edit')}
            >
              <Text style={styles.waterAmount}>{Math.round(waterOz)}</Text>
              <Text style={styles.waterUnit}>oz</Text>
              <View style={styles.waterProgressRing}>
                <Svg width={120} height={120}>
                  <Circle
                    cx={60}
                    cy={60}
                    r={50}
                    stroke="#EFEFEF"
                    strokeWidth={8}
                    fill="none"
                  />
                  <Circle
                    cx={60}
                    cy={60}
                    r={50}
                    stroke="#4dabf7"
                    strokeWidth={8}
                    fill="none"
                    strokeDasharray={2 * Math.PI * 50}
                    strokeDashoffset={2 * Math.PI * 50 * (1 - Math.min(1, waterOz / waterGoal))}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                  />
                </Svg>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.waterButtonRow}>
            <TouchableOpacity style={styles.logWaterButton} onPress={() => handleLogWater('add')}>
              <Text style={styles.logWaterButtonText}>+ Add Water</Text>
            </TouchableOpacity>
            {waterOz > 0 && (
              <TouchableOpacity style={styles.editWaterButton} onPress={() => handleLogWater('edit')}>
                <Text style={styles.editWaterButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Recently Uploaded Section */}
        {recentMeals.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>Recently uploaded</Text>

            {recentMeals.map((meal, index) => (
              <View key={index} style={styles.mealCard}>
                <View style={styles.mealHeader}>
                  <View style={styles.mealHeaderLeft}>
                    <Text style={styles.mealName}>{meal.name}</Text>
                    <Text style={styles.mealTime}>{meal.time}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => deleteMeal(meal.id)}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ff4444" />
                  </TouchableOpacity>
                </View>

                <View style={styles.mealDetails}>
                  <View style={styles.calorieRow}>
                    <Text style={styles.fireEmoji}>🔥</Text>
                    <Text style={styles.calorieText}>{meal.calories} calories</Text>
                  </View>

                  <View style={styles.macroRowInline}>
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
        )}

        {/* Bottom spacing for FAB */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Camera', { selectedDate: selectedDate })}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Water Logging Modal */}
      <Modal
        visible={waterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWaterModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setWaterModalVisible(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>
                {waterEditMode === 'edit' ? 'Edit Water Amount' : 'Add Water'}
              </Text>

              <View style={styles.unitToggle}>
                <TouchableOpacity
                  style={[styles.unitButton, waterUnit === 'oz' && styles.unitButtonActive]}
                  onPress={() => setWaterUnit('oz')}
                >
                  <Text style={[styles.unitButtonText, waterUnit === 'oz' && styles.unitButtonTextActive]}>oz</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unitButton, waterUnit === 'L' && styles.unitButtonActive]}
                  onPress={() => setWaterUnit('L')}
                >
                  <Text style={[styles.unitButtonText, waterUnit === 'L' && styles.unitButtonTextActive]}>L</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.modalInput}
                placeholder={`Enter amount in ${waterUnit}`}
                placeholderTextColor="#666"
                keyboardType="numeric"
                value={waterDraft}
                onChangeText={setWaterDraft}
                autoFocus
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setWaterModalVisible(false)}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSave]}
                  onPress={saveWater}
                >
                  <Text style={styles.modalButtonTextSave}>Save</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Water Goal Modal */}
      <Modal
        visible={waterGoalModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWaterGoalModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setWaterGoalModalVisible(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Set Water Goal</Text>

              <TextInput
                style={styles.modalInput}
                placeholder="Enter goal in oz"
                placeholderTextColor="#666"
                keyboardType="numeric"
                value={waterGoalDraft}
                onChangeText={setWaterGoalDraft}
                autoFocus
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setWaterGoalModalVisible(false)}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSave]}
                  onPress={saveWaterGoal}
                >
                  <Text style={styles.modalButtonTextSave}>Save</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

/* --- Calorie Ring --- */
function CalorieRing({ percent, total, goal }) {
  const R = 54;
  const strokeWidth = 13;
  const C = 2 * Math.PI * R;
  const clamp = Math.min(1, percent);
  const gradId = 'calGradient';

  return (
    <View style={{ width: 130, height: 130, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={130} height={130}>
        <Defs>
          <LinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#00C6FB" />
            <Stop offset="70%" stopColor="#00fbab" />
            <Stop offset="100%" stopColor={clamp < 1 ? "#00fbab" : "#ffb84d"} />
          </LinearGradient>
        </Defs>
        <Circle cx={65} cy={65} r={R} stroke="#e6eef9" strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={65}
          cy={65}
          r={R}
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={`${C} ${C}`}
          strokeDashoffset={C * (1 - clamp)}
          fill="none"
          strokeLinecap="round"
          rotation="-90"
          origin="65,65"
        />
      </Svg>
      <Text style={{ fontWeight: 'bold', fontSize: 19, color: '#111', marginTop: -92 }}>
        {total}
      </Text>
      <Text style={{ color: '#a3b4c3', fontWeight: '600', fontSize: 13 }}>
        / {goal} Calories
      </Text>
    </View>
  );
}

/* --- Styles --- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5F7',
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteIconButton: {
    padding: 4,
  },
  appIcon: {
    fontSize: 32,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111111',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  streakEmoji: {
    fontSize: 16,
  },
  streakNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
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
    backgroundColor: '#D1D5DB',
  },
  activeDot: {
    backgroundColor: '#111111',
  },
  recentSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 16,
  },
  mealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  mealHeaderLeft: {
    flex: 1,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  mealName: {
    fontSize: 15,
    color: '#111111',
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  mealTime: {
    fontSize: 14,
    color: '#8C8C8C',
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
    color: '#111111',
  },
  macroRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
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
    color: '#8C8C8C',
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
  // Water Card Styles
  waterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  waterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  waterTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
  },
  waterGoalText: {
    fontSize: 14,
    color: '#4dabf7',
    fontWeight: '600',
  },
  waterContent: {
    alignItems: 'center',
    marginVertical: 16,
  },
  waterCircleButton: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  waterProgressRing: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  waterAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#4dabf7',
    marginBottom: 0,
    zIndex: 1,
  },
  waterUnit: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '600',
    zIndex: 1,
  },
  waterButtonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  logWaterButton: {
    backgroundColor: '#F1F2F4',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  logWaterButtonText: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '600',
  },
  editWaterButton: {
    backgroundColor: '#4dabf7',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  editWaterButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 20,
    textAlign: 'center',
  },
  unitToggle: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#F1F2F4',
    borderRadius: 12,
    padding: 4,
  },
  unitButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  unitButtonActive: {
    backgroundColor: '#4dabf7',
  },
  unitButtonText: {
    color: '#8C8C8C',
    fontSize: 16,
    fontWeight: '600',
  },
  unitButtonTextActive: {
    color: '#ffffff',
  },
  modalInput: {
    backgroundColor: '#F1F2F4',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111111',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F1F2F4',
  },
  modalButtonSave: {
    backgroundColor: '#4dabf7',
  },
  modalButtonTextCancel: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextSave: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
