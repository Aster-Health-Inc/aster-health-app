import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Pressable, Platform, SafeAreaView, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { log, warn, error } from '../utils/CrashLogger';

log('User pressed button', { id: 42 });
warn('Slow API response');
error('Login failed');
import {
  upsertMealLog,
  upsertWaterLog,
  upsertDailyCalorie,
  fetchUserDailyLogs,
} from '../utils/meallogger';
import { supabase } from '../lib/supabase';

const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const MACROS = [
  { key: 'carbs', label: 'Carbs', color: '#45b3e0' },
  { key: 'protein', label: 'Protein', color: '#3ad29f' },
  { key: 'fat', label: 'Fat', color: '#be8afd' },
];
const MACROS_GOAL = { carbs: 120, protein: 120, fat: 120 };

const LITER_TO_OZ = 33.814;
const OZ_TO_ML = 29.5735;

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
  const [expandedMealsList, setExpandedMealsList] = useState(false);
  const [openMeal, setOpenMeal] = useState(null);

  const [mealInputs, setMealInputs] = useState({});
  const [waterOz, setWaterOz] = useState(0);
  const [waterModalVisible, setWaterModalVisible] = useState(false);
  const [waterUnit, setWaterUnit] = useState('oz');
  const [waterDraft, setWaterDraft] = useState('');
  const [waterEditMode, setWaterEditMode] = useState('add'); // 'add' or 'edit'

  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [calorieGoal, setCalorieGoal] = useState(1400);
  const [goalDraft, setGoalDraft] = useState('');
  
  const [waterGoal, setWaterGoal] = useState(128);
  const [waterGoalModalVisible, setWaterGoalModalVisible] = useState(false);
  const [waterGoalDraft, setWaterGoalDraft] = useState('');
  
  const [dailyData, setDailyData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Handle refresh when navigating back from food logging
  useEffect(() => {
    if (route.params?.refreshData) {
      console.log('Force refreshing data due to navigation params...');
      // Clear the params to prevent repeated refreshes
      navigation.setParams({ refreshData: undefined, timestamp: undefined });
      
      // Force reload data
      const forceReload = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const dateStr = formatDateKey(selectedDate);
          console.log('Force reloading data for:', dateStr);
          
          const data = await fetchUserDailyLogs(user.id, dateStr);
          console.log('Force reload result:', data);
          
          setDailyData(data);
          setWaterOz(data.water || 0);

          // Update meal inputs with real data
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
        } catch (error) {
          console.error('Error force reloading data:', error);
        }
      };
      
      forceReload();
    }
  }, [route.params?.refreshData, route.params?.timestamp]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('No user found');
          return;
        }

        const dateStr = formatDateKey(selectedDate);
        console.log('Loading data for:', dateStr, 'User:', user.id);
        
        const data = await fetchUserDailyLogs(user.id, dateStr);
        console.log('Fetched daily data:', data);
        
        setDailyData(data);
        setWaterOz(data.water || 0);

        // Update meal inputs with real data
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

      } catch (error) {
        console.error('Error loading daily data:', error);
        // Initialize with empty data on error
        const blank = {};
        MEALS.forEach((name) => (blank[name] = { calories: 0, carbs: 0, protein: 0, fat: 0 }));
        setMealInputs(blank);
        setWaterOz(0);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedDate]);

  // Refresh data when screen comes into focus
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

          // Update meal inputs with real data
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
        } catch (error) {
          console.error('Error refreshing data:', error);
        }
      };
      
      loadDataOnFocus();
    }, [selectedDate])
  );

  const totalCalories = useMemo(() => {
    // Use daily totals if available, otherwise calculate from meals
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

  const macroTotals = {
    carbs: totalCarbs,
    protein: totalProtein,
    fat: totalFat,
  };

  const waterDisplayValue = useMemo(() => {
    if (waterUnit === 'oz') return waterOz.toFixed(0);
    return (waterOz / LITER_TO_OZ).toFixed(2);
  }, [waterOz, waterUnit]);

  const onChangeDate = (event, date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (date) setSelectedDate(date);
  };

  const nudgeDay = (delta) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + delta);
    setSelectedDate(next);
  };

  const toggleMealsList = () => setExpandedMealsList((v) => !v);

  const handleMealFieldChange = (meal, field, value) => {
    setMealInputs((prev) => ({
      ...prev,
      [meal]: { ...prev[meal], [field]: value },
    }));
  };

  const saveMeal = async (meal) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const dateStr = formatDateKey(selectedDate);
      const mealData = mealInputs[meal];
      
      await upsertMealLog({
        user_id: user.id,
        date: dateStr,
        meal_type: meal,
        calories: parseFloat(mealData.calories) || 0,
        carbs: parseFloat(mealData.carbs) || 0,
        protein: parseFloat(mealData.protein) || 0,
        fat: parseFloat(mealData.fat) || 0,
      });

      // Reload data to refresh UI
      const updatedData = await fetchUserDailyLogs(user.id, dateStr);
      setDailyData(updatedData);
      
      setOpenMeal(null);
    } catch (e) {
      console.error('Error saving meal:', e);
    }
  };

  const openGoalEdit = () => {
    setGoalDraft(String(calorieGoal));
    setGoalModalVisible(true);
  };

  const saveGoal = () => {
    const n = parseFloat(goalDraft);
    if (!isNaN(n) && n > 0) setCalorieGoal(n);
    setGoalModalVisible(false);
  };

  const openWaterGoalEdit = () => {
    setWaterGoalDraft(String(waterGoal));
    setWaterGoalModalVisible(true);
  };

  const saveWaterGoal = () => {
    const n = parseFloat(waterGoalDraft);
    if (!isNaN(n) && n > 0) setWaterGoal(n);
    setWaterGoalModalVisible(false);
  };

  const openWaterEdit = (mode = 'add') => {
    if (mode === 'edit') {
      // Edit mode: show current total
      setWaterDraft(waterDisplayValue);
      setWaterEditMode('edit');
    } else {
      // Add mode: empty field for new amount
      setWaterDraft('');
      setWaterEditMode('add');
    }
    setWaterModalVisible(true);
  };

  const saveWater = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let amount = parseFloat(waterDraft) || 0;
      if (waterUnit === 'L') amount = amount * LITER_TO_OZ;
      
      const dateStr = formatDateKey(selectedDate);
      
      console.log('Saving water data:', {
        user_id: user.id,
        date: dateStr,
        water_intake_oz: amount
      });

      // Use the proper utility function with fixed RLS policies
      await upsertWaterLog({
        user_id: user.id,
        date: dateStr,
        water_intake: amount,
        mode: waterEditMode
      });

      console.log('Water logged successfully');

      setWaterOz(amount);
      setWaterModalVisible(false);
      
      // Refresh the data to show updated water intake
      const updatedData = await fetchUserDailyLogs(user.id, dateStr);
      setDailyData(updatedData);
      setWaterOz(updatedData.water || amount);
      
    } catch (e) {
      console.error('Error saving water:', e);
      // Show user-friendly error message
      Alert.alert('Error', 'Failed to save water intake. Please try again.');
    }
  };

  const handleLogFood = () => {
    navigation.navigate('MealLog');
  };

  const handleLogWater = () => {
    openWaterEdit();
  };

  const handleEditLog = () => {
    toggleMealsList();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1 }}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.profileIcon}>
            <Ionicons name="person-circle" size={32} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateSelector} onPress={() => setShowPicker(true)}>
            <Text style={styles.dateText}>{prettyDate(selectedDate)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editIcon} onPress={handleEditLog}>
            <Feather name="edit-3" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {showPicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={onChangeDate}
            style={{ alignSelf: 'center' }}
          />
        )}

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 130 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Calorie Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Calories</Text>
            <View style={styles.calorieRingContainer}>
              <CalorieRing
                percent={Math.min(1, totalCalories / calorieGoal)}
                total={totalCalories}
                goal={calorieGoal}
              />
            </View>
            <View style={styles.mealSummaryRow}>
              <View style={styles.mealSummaryItem}>
                <MaterialIcons name="wb-sunny" size={16} color="#666" />
                <Text style={styles.mealSummaryText}>Breakfast {mealInputs.Breakfast?.calories || 0} cals</Text>
              </View>
              <View style={styles.mealSummaryItem}>
                <MaterialIcons name="wb-sunny" size={16} color="#666" />
                <Text style={styles.mealSummaryText}>Lunch {mealInputs.Lunch?.calories || 0} cals</Text>
              </View>
              <View style={styles.mealSummaryItem}>
                <MaterialIcons name="nightlight" size={16} color="#666" />
                <Text style={styles.mealSummaryText}>Dinner {mealInputs.Dinner?.calories || 0} cals</Text>
              </View>
              <View style={styles.mealSummaryItem}>
                <MaterialIcons name="nightlight" size={16} color="#666" />
                <Text style={styles.mealSummaryText}>Snacks {mealInputs.Snack?.calories || 0} cals</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.logFoodButton} onPress={handleLogFood}>
              <Text style={styles.logFoodButtonText}>+ Log Food</Text>
            </TouchableOpacity>
          </View>

          {/* Macros Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Macros</Text>
            <View style={styles.macrosContainer}>
              {MACROS.map(macro => (
                <View key={macro.key} style={styles.macroRow}>
                  <Text style={styles.macroLabel}>{macro.label}</Text>
                  <View style={styles.macroBarContainer}>
                    <View
                      style={[
                        styles.macroBar,
                        {
                          backgroundColor: macro.color,
                          width: `${Math.min(100, Math.round((macroTotals[macro.key] || 0) / MACROS_GOAL[macro.key] * 100))}%`,
                        }
                      ]}
                    />
                  </View>
                  <Text style={styles.macroValue}>{Math.round(macroTotals[macro.key] || 0)}g</Text>
                  <Text style={styles.macroGoal}>{MACROS_GOAL[macro.key]}g</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Water Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Water</Text>
            <View style={styles.waterContainer}>
              <TouchableOpacity style={styles.waterCircle} onPress={() => openWaterEdit('edit')}>
                <Text style={styles.waterAmount}>{Math.round(waterOz)}</Text>
                <Text style={styles.waterUnit}>Ounces</Text>
              </TouchableOpacity>
              <View style={styles.waterInfo}>
                <TouchableOpacity onPress={openWaterGoalEdit}>
                  <Text style={styles.waterGoal}>Goal {waterGoal} fl oz</Text>
                </TouchableOpacity>
                <Text style={styles.waterLast}>
                  {waterOz > 0 ? `${Math.round((waterOz/waterGoal)*100)}% of goal` : 'No water logged today'}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.logWaterButton} onPress={handleLogWater}>
              <Text style={styles.logWaterButtonText}>+ Log Water</Text>
            </TouchableOpacity>
          </View>

          {/* Edit Log Button */}
          <TouchableOpacity style={styles.editLogButton} onPress={handleEditLog}>
            <Text style={styles.editLogButtonText}>Edit Log</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Home')}>
            <Ionicons name="home" size={22} color="#999" />
            <Text style={styles.navTextInactive}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="restaurant" size={22} color="#0a84ff" />
            <Text style={styles.navText}>Food</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('Camera')}>
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="barbell" size={22} color="#999" />
            <Text style={styles.navTextInactive}>Workout</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="stats-chart" size={22} color="#999" />
            <Text style={styles.navTextInactive}>Analysis</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Water Modal */}
      <Modal visible={waterModalVisible} animationType="slide" transparent>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {waterEditMode === 'edit' ? 'Edit Total Water Intake' : 'Add Water Intake'}
            </Text>
            
            {waterEditMode === 'edit' && (
              <Text style={styles.modalSubtext}>
                Current total: {Math.round(waterOz)} oz
              </Text>
            )}
            
            {/* Mode Switcher */}
            <View style={styles.unitSwitch}>
              <Pressable
                style={[styles.unitChip, waterEditMode === 'add' && styles.unitChipActive]}
                onPress={() => {
                  setWaterEditMode('add');
                  setWaterDraft('');
                }}
              >
                <Text style={[styles.unitChipText, waterEditMode === 'add' && styles.unitChipTextActive]}>Add More</Text>
              </Pressable>
              <Pressable
                style={[styles.unitChip, waterEditMode === 'edit' && styles.unitChipActive]}
                onPress={() => {
                  setWaterEditMode('edit');
                  setWaterDraft(waterDisplayValue);
                }}
              >
                <Text style={[styles.unitChipText, waterEditMode === 'edit' && styles.unitChipTextActive]}>Edit Total</Text>
              </Pressable>
            </View>
            
            {/* Unit Switcher */}
            <View style={styles.unitSwitch}>
              <Pressable
                style={[styles.unitChip, waterUnit === 'oz' && styles.unitChipActive]}
                onPress={() => setWaterUnit('oz')}
              >
                <Text style={[styles.unitChipText, waterUnit === 'oz' && styles.unitChipTextActive]}>oz</Text>
              </Pressable>
              <Pressable
                style={[styles.unitChip, waterUnit === 'L' && styles.unitChipActive]}
                onPress={() => setWaterUnit('L')}
              >
                <Text style={[styles.unitChipText, waterUnit === 'L' && styles.unitChipTextActive]}>L</Text>
              </Pressable>
            </View>
            
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              placeholder={
                waterEditMode === 'edit' 
                  ? `Set total amount in ${waterUnit}` 
                  : `Add amount in ${waterUnit}`
              }
              value={waterDraft}
              onChangeText={setWaterDraft}
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.saveBtn} onPress={saveWater}>
                <Text style={styles.saveBtnText}>
                  {waterEditMode === 'edit' ? 'Update Total' : 'Add Water'}
                </Text>
              </Pressable>
              <Pressable style={styles.cancelBtn} onPress={() => setWaterModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Goal Modal */}
      <Modal visible={goalModalVisible} animationType="slide" transparent>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set Daily Calorie Goal</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              placeholder="e.g., 1400"
              value={goalDraft}
              onChangeText={setGoalDraft}
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.saveBtn} onPress={saveGoal}>
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
              <Pressable style={styles.cancelBtn} onPress={() => setGoalModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Water Goal Modal */}
      <Modal visible={waterGoalModalVisible} animationType="slide" transparent>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set Daily Water Goal</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              placeholder="e.g., 128"
              value={waterGoalDraft}
              onChangeText={setWaterGoalDraft}
            />
            <Text style={styles.modalSubtext}>Goal in fluid ounces (fl oz)</Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.saveBtn} onPress={saveWaterGoal}>
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
              <Pressable style={styles.cancelBtn} onPress={() => setWaterGoalModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Calorie Ring as an SVG Progress Ring
function CalorieRing({ percent, total, goal }) {
  const R = 54; // radius
  const strokeWidth = 13;
  const C = 2 * Math.PI * R;
  const clamp = Math.min(1, percent);

  // Gradient color shifts: blue->green->orange if >100%
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
        {/* Background Circle */}
        <Circle
          cx={65}
          cy={65}
          r={R}
          stroke="#e6eef9"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress Circle */}
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
      <Text style={{ fontWeight: 'bold', fontSize: 19, color: '#111', marginTop: -92 }}>{total}</Text>
      <Text style={{ color: '#a3b4c3', fontWeight: '600', fontSize: 13 }}>{`/ ${goal} Calories`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#f4f8fc',
    borderBottomWidth: 1,
    borderBottomColor: '#e6eef9',
  },
  profileIcon: { padding: 8, borderRadius: 999, backgroundColor: 'transparent' },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#f4f8fc',
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e6eef9',
  },
  dateText: { fontSize: 16, fontWeight: '600', color: '#222', marginLeft: 2 },
  editIcon: { padding: 8, borderRadius: 999, backgroundColor: 'transparent' },

  card: {
    marginHorizontal: 14,
    marginTop: 16,
    borderRadius: 17,
    padding: 17,
    backgroundColor: '#f9fbfc',
    borderWidth: 1,
    borderColor: '#e6eef9',
    marginBottom: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 8 },
  calorieRingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  mealSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  mealSummaryItem: {
    alignItems: 'center',
  },
  mealSummaryText: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  logFoodButton: {
    alignSelf: 'center',
    backgroundColor: '#ededed',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    marginTop: 13,
  },
  logFoodButtonText: { fontWeight: '600', color: '#111' },

  macrosContainer: {
    marginTop: 14,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  macroLabel: { width: 60, fontSize: 13, color: '#555', fontWeight: '600' },
  macroBarContainer: {
    height: 8,
    borderRadius: 5,
    backgroundColor: '#e8ebf0',
    flex: 1,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  macroBar: {
    height: 8,
    borderRadius: 5,
  },
  macroValue: { fontSize: 13, color: '#222', width: 36, textAlign: 'right', fontWeight: '700' },
  macroGoal: { fontSize: 12, color: '#888', width: 33, marginLeft: 2 },

  waterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  waterCircle: {
    width: 63, height: 63, borderRadius: 35, backgroundColor: '#e5f5ff',
    alignItems: 'center', justifyContent: 'center',
  },
  waterAmount: { fontSize: 20, fontWeight: '800', color: '#0077b6', marginBottom: -1 },
  waterUnit: { fontSize: 13, color: '#199ad8', fontWeight: '600' },
  waterInfo: { marginLeft: 8 },
  waterGoal: { fontSize: 13, color: '#4d7ea8', fontWeight: '700' },
  waterLast: { fontSize: 11, color: '#aaa', marginTop: 2 },
  logWaterButton: {
    alignSelf: 'center',
    backgroundColor: '#ededed',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    marginTop: 13,
  },
  logWaterButtonText: { fontWeight: '600', color: '#111' },

  editLogButton: {
    alignSelf: 'center',
    backgroundColor: '#ededed',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    marginTop: 13,
  },
  editLogButtonText: { fontWeight: '600', color: '#111' },

  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e6eef9',
    height: 63,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingBottom: Platform.OS === 'ios' ? 14 : 0,
  },
  navItem: { alignItems: 'center', flex: 1 },
  navText: { color: '#0a84ff', fontSize: 13, fontWeight: '700', marginTop: 2 },
  navTextInactive: { color: '#888', fontSize: 13, fontWeight: '600', marginTop: 2 },
  addBtn: {
    width: 48, height: 48, backgroundColor: '#0a84ff',
    borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    marginTop: -28, shadowColor: '#007aff', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 2 },
    borderWidth: 3, borderColor: '#fff',
  },

  // Modals
  modalWrap: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    width: '92%',
    borderWidth: 1,
    borderColor: '#eee',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 10, color: '#111' },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    marginBottom: 6,
  },
  modalSubtext: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 14, justifyContent: 'flex-end' },
  saveBtn: {
    backgroundColor: '#0a84ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  cancelBtn: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelBtnText: {
    color: '#333',
    fontWeight: '600',
  },

  unitSwitch: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  unitChip: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  unitChipActive: { backgroundColor: '#111' },
  unitChipText: { color: '#111', fontWeight: '700' },
  unitChipTextActive: { color: '#fff' },
});
