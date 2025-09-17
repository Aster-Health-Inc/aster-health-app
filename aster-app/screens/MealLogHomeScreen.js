import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Pressable, Platform, SafeAreaView, Alert } from 'react-native';
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

const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const MACROS = [
  { key: 'carbs', label: 'Carbs', color: '#45b3e0' },
  { key: 'protein', label: 'Protein', color: '#3ad29f' },
  { key: 'fat', label: 'Fat', color: '#be8afd' },
];
const MACROS_GOAL = { carbs: 120, protein: 120, fat: 120 };

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
  const handleLogWater = () => setWaterModalVisible(true);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
        {/* Calories Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Calories</Text>

          <View style={styles.calorieCardWrapper}>
            <CalorieRing
              percent={Math.min(1, totalCalories / calorieGoal)}
              total={totalCalories}
              goal={calorieGoal}
            />

            {/* Four corner-aligned meal labels */}
            <View style={[styles.mealTag, styles.mealTopLeft]}>
              <MaterialIcons name="wb-sunny" size={16} color="#f4c542" />
              <Text style={styles.mealSummaryText}>
                Breakfast {mealInputs.Breakfast?.calories || 0} cals
              </Text>
            </View>
            <View style={[styles.mealTag, styles.mealTopRight]}>
              <MaterialIcons name="wb-sunny" size={16} color="#ff8c42" />
              <Text style={styles.mealSummaryText}>
                Lunch {mealInputs.Lunch?.calories || 0} cals
              </Text>
            </View>
            <View style={[styles.mealTag, styles.mealBottomLeft]}>
              <MaterialIcons name="nightlight" size={16} color="#3b5998" />
              <Text style={styles.mealSummaryText}>
                Dinner {mealInputs.Dinner?.calories || 0} cals
              </Text>
            </View>
            <View style={[styles.mealTag, styles.mealBottomRight]}>
              <MaterialIcons name="nightlight" size={16} color="#9b59b6" />
              <Text style={styles.mealSummaryText}>
                Snacks {mealInputs.Snack?.calories || 0} cals
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.logFoodButton} onPress={handleLogFood}>
            <Text style={styles.logFoodButtonText}>+ Log Food</Text>
          </TouchableOpacity>
        </View>

        {/* Macros Card (unchanged) */}
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
                        width: `${Math.min(
                          100,
                          Math.round(
                            (dailyData?.dailyTotals?.[`total_${macro.key}`] || 0) /
                              MACROS_GOAL[macro.key] * 100
                          )
                        )}%`,
                      }
                    ]}
                  />
                </View>
                <Text style={styles.macroValue}>
                  {Math.round(dailyData?.dailyTotals?.[`total_${macro.key}`] || 0)}g
                </Text>
                <Text style={styles.macroGoal}>{MACROS_GOAL[macro.key]}g</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Water Card → Figma layout (Goal | Circle | Last log) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Water</Text>

          <View style={styles.waterRow}>
            {/* Left: Goal */}
            <TouchableOpacity onPress={() => setWaterGoalModalVisible(true)} style={styles.waterSide}>
              <Text style={styles.waterSideLabel}>Goal</Text>
              <Text style={styles.waterGoalStrong}>{waterGoal} fl oz</Text>
            </TouchableOpacity>

            {/* Center: Circle */}
            <TouchableOpacity style={styles.waterCircle} onPress={handleLogWater}>
              <Text style={styles.waterAmount}>{Math.round(waterOz)}</Text>
              <Text style={styles.waterUnit}>oz</Text>
            </TouchableOpacity>

            {/* Right: Last log (using what we have today; no timestamp stored) */}
            <View style={[styles.waterSide, { alignItems: 'flex-end' }]}>
              <Text style={styles.waterSideLabel}>Last log</Text>
              <Text style={styles.waterLastValue}>
                {waterOz > 0 ? `${Math.round(waterOz)} oz` : '—'}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.logWaterButton} onPress={handleLogWater}>
            <Text style={styles.logWaterButtonText}>+ Log Water</Text>
          </TouchableOpacity>
        </View>
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
  container: { flex: 1, backgroundColor: '#fff' },

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

  /* Calories cluster */
  calorieCardWrapper: {
    alignSelf: 'center',
    width: 300,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginVertical: 10,
  },
  mealTag: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealTopLeft: { top: 0, left: 0 },
  mealTopRight: { top: 0, right: 0 },
  mealBottomLeft: { bottom: 0, left: 0 },
  mealBottomRight: { bottom: 0, right: 0 },
  mealSummaryText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },

  /* Buttons */
  logFoodButton: {
    alignSelf: 'center',
    backgroundColor: '#ededed',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    marginTop: 13,
  },
  logFoodButtonText: { fontWeight: '600', color: '#111' },

  /* Macros */
  macrosContainer: { marginTop: 14 },
  macroRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  macroLabel: { width: 60, fontSize: 13, color: '#555', fontWeight: '600' },
  macroBarContainer: {
    height: 8,
    borderRadius: 5,
    backgroundColor: '#e8ebf0',
    flex: 1,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  macroBar: { height: 8, borderRadius: 5 },
  macroValue: { fontSize: 13, color: '#222', width: 36, textAlign: 'right', fontWeight: '700' },
  macroGoal: { fontSize: 12, color: '#888', width: 33, marginLeft: 2 },

  /* Water — Figma layout */
  waterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 12,
  },
  waterSide: {
    flex: 1,
  },
  waterSideLabel: { color: '#8797a8', fontSize: 12, marginBottom: 2 },
  waterGoalStrong: { fontSize: 14, color: '#4d7ea8', fontWeight: '700' },
  waterLastValue: { fontSize: 14, color: '#333', fontWeight: '600' },

  waterCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#e5f5ff',
    alignItems: 'center', justifyContent: 'center',
  },
  waterAmount: { fontSize: 22, fontWeight: '800', color: '#0077b6', marginBottom: -2 },
  waterUnit: { fontSize: 14, color: '#199ad8', fontWeight: '600' },

  logWaterButton: {
    alignSelf: 'center',
    backgroundColor: '#ededed',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    marginTop: 13,
  },
  logWaterButtonText: { fontWeight: '600', color: '#111' },

  /* Bottom nav */
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
    marginTop: -28, shadowColor: '#007aff', shadowOpacity: 0.15,
    shadowRadius: 10, shadowOffset: { width: 0, height: 2 },
    borderWidth: 3, borderColor: '#fff',
  },
});
