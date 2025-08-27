import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Pressable, Platform, SafeAreaView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';

// Temporarily comment out meallogger for testing
// import {
//   upsertMealLog,
//   upsertWaterLog,
//   upsertDailyCalorie,
//   fetchUserDailyLogs,
// } from '../utils/meallogger';

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
  const USER_ID = 'demo-user-id-123';
  const navigation = useNavigation();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [expandedMealsList, setExpandedMealsList] = useState(false);
  const [openMeal, setOpenMeal] = useState(null);

  const [mealInputs, setMealInputs] = useState({});
  const [waterOz, setWaterOz] = useState(0);
  const [waterModalVisible, setWaterModalVisible] = useState(false);
  const [waterUnit, setWaterUnit] = useState('oz');
  const [waterDraft, setWaterDraft] = useState('');

  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [calorieGoal, setCalorieGoal] = useState(1400);
  const [goalDraft, setGoalDraft] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        // Temporarily use mock data since meallogger is commented out
        const blank = {};
        MEALS.forEach((name) => (blank[name] = { calories: '', carbs: '', protein: '', fat: '' }));
        setMealInputs(blank);
        setWaterOz(0);
      } catch (e) {
        const blank = {};
        MEALS.forEach((name) => (blank[name] = { calories: '', carbs: '', protein: '', fat: '' }));
        setMealInputs(blank);
        setWaterOz(0);
      }
    };
    load();
  }, [selectedDate]);

  const totalCalories = useMemo(() => {
    return MEALS.reduce((sum, key) => sum + (parseFloat(mealInputs[key]?.calories) || 0), 0);
  }, [mealInputs]);

  const totalProtein = useMemo(() => {
    return MEALS.reduce((sum, key) => sum + (parseFloat(mealInputs[key]?.protein) || 0), 0);
  }, [mealInputs]);

  const totalCarbs = useMemo(() => {
    return MEALS.reduce((sum, key) => sum + (parseFloat(mealInputs[key]?.carbs) || 0), 0);
  }, [mealInputs]);

  const totalFat = useMemo(() => {
    return MEALS.reduce((sum, key) => sum + (parseFloat(mealInputs[key]?.fat) || 0), 0);
  }, [mealInputs]);

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
      // Temporarily just close the meal editor since meallogger is commented out
      console.log('Saving meal:', meal, mealInputs[meal]);
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

  const openWaterEdit = () => {
    setWaterDraft(waterDisplayValue);
    setWaterModalVisible(true);
  };

  const saveWater = async () => {
    let amount = parseFloat(waterDraft) || 0;
    if (waterUnit === 'L') amount = amount * LITER_TO_OZ;
    setWaterOz(amount);
    setWaterModalVisible(false);
    try {
      // Temporarily just log since meallogger is commented out
      console.log('Saving water:', amount);
    } catch (e) {
      console.error('Error saving water:', e);
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
              <View style={styles.waterCircle}>
                <Text style={styles.waterAmount}>{Math.round(waterOz)}</Text>
                <Text style={styles.waterUnit}>Ounces</Text>
              </View>
              <View style={styles.waterInfo}>
                <Text style={styles.waterGoal}>Goal 128 fl oz</Text>
                <Text style={styles.waterLast}>Last Log 4 hours</Text>
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
          <TouchableOpacity style={styles.navItem}>
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
            <Text style={styles.modalTitle}>Log Water Intake</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              placeholder="Enter amount"
              value={waterDraft}
              onChangeText={setWaterDraft}
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.saveBtn} onPress={saveWater}>
                <Text style={styles.saveBtnText}>Save</Text>
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
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 14, justifyContent: 'flex-end' },

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
