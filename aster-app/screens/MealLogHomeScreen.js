import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Pressable, Platform, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomTaskbar from '../components/BottomTaskbar';
import { fetchUserDailyLogs } from '../utils/meallogger';
import { getVerifiedUser } from '../utils/authUser';
import { supabase } from '../lib/supabase';

const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const MACROS = [
  { key: 'carbs', label: 'Carbs', color: '#4BB1B6' },
  { key: 'protein', label: 'Protein', color: '#3AD29F' },
  { key: 'fat', label: 'Fat', color: '#E08F5B' },
];
const MACROS_GOAL = { carbs: 120, protein: 120, fat: 120 };
const ML_PER_OZ = 29.5735;

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
  const [waterGoalModalVisible, setWaterGoalModalVisible] = useState(false);
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');
  const [calorieGoal, setCalorieGoal] = useState(1400);
  const [waterGoal, setWaterGoal] = useState(null);
  const [waterDraft, setWaterDraft] = useState('');
  const [waterGoalDraft, setWaterGoalDraft] = useState('');
  const [dailyData, setDailyData] = useState(null);
  const [lastLog, setLastLog] = useState(null);

  const loadDailyData = useCallback(async () => {
    try {
      const user = await getVerifiedUser();
      if (!user) return;
      const dateStr = formatDateKey(selectedDate);
      const data = await fetchUserDailyLogs(user.id, dateStr);
      setDailyData(data);
      setWaterOz(data.water || 0);

      const mealsByType = {};
      MEALS.forEach((mealType) => {
        const mealData = data.meals.find((m) => m.meal_type === mealType);
        mealsByType[mealType] = {
          calories: mealData?.calories || 0,
          carbs: mealData?.carbs || 0,
          protein: mealData?.protein || 0,
          fat: mealData?.fat || 0,
        };
      });
      setMealInputs(mealsByType);

      const { data: logs } = await supabase
        .from('water_logs')
        .select('water_intake_ml, created_at')
        .eq('user_id', user.id)
        .eq('log_date', dateStr)
        .order('created_at', { ascending: false })
        .limit(1);

      if (logs && logs.length > 0) {
        setLastLog({ amount: logs[0].water_intake_ml, time: logs[0].created_at });
      } else {
        setLastLog(null);
      }

      const { data: goalRows } = await supabase
        .from('water_goals')
        .select('goal_oz, goal_ml')
        .eq('user_id', user.id)
        .limit(1);

      if (goalRows && goalRows.length > 0) {
        const goal = goalRows[0];
        const ozValue = goal.goal_oz || (goal.goal_ml ? goal.goal_ml / ML_PER_OZ : 0);
        setWaterGoal(ozValue ? Math.round(ozValue) : null);
      } else {
        setWaterGoal(null);
      }
    } catch (err) {
      console.error('Error loading daily data:', err);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadDailyData();
  }, [loadDailyData]);

  useEffect(() => {
    if (route?.params?.refreshData || route?.params?.timestamp) {
      loadDailyData();
    }
  }, [route?.params?.timestamp, route?.params?.refreshData, loadDailyData]);

  useFocusEffect(
    useCallback(() => {
      loadDailyData();
    }, [loadDailyData])
  );

  const totalCalories = useMemo(() => {
    return (
      dailyData?.dailyTotals?.total_calories ||
      MEALS.reduce((sum, key) => sum + (parseFloat(mealInputs[key]?.calories) || 0), 0)
    );
  }, [mealInputs, dailyData]);

  const shiftDay = (delta) => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(prev.getDate() + delta);
      return d;
    });
  };

  const handleDatePickerChange = (_, date) => {
    if (date) {
      setSelectedDate(date);
    }
    if (Platform.OS !== 'ios') {
      setShowPicker(false);
    }
  };

  const handleLogFood = () => navigation.navigate('MealLog');
  const handleLogWater = () => setWaterModalVisible(true);

  const openGoalModal = () => {
    setGoalDraft(String(calorieGoal));
    setGoalModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.topActions}>
          <TouchableOpacity style={styles.circleButton}>
            <Ionicons name="person-outline" size={18} color="#4B117B" />
          </TouchableOpacity>
          <View style={styles.rightActions}>
            <TouchableOpacity style={styles.circleButton}>
              <Feather name="pie-chart" size={18} color="#4B117B" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.circleButton} onPress={openGoalModal}>
              <Feather name="edit-3" size={18} color="#4B117B" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.dateArrow} onPress={() => shiftDay(-1)}>
            <Ionicons name="chevron-back" size={18} color="#4B117B" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.datePill} onPress={() => setShowPicker(true)}>
            <Text style={styles.dateText}>{prettyDate(selectedDate)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateArrow} onPress={() => shiftDay(1)}>
            <Ionicons name="chevron-forward" size={18} color="#4B117B" />
          </TouchableOpacity>
        </View>

        {showPicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDatePickerChange}
            style={styles.datePicker}
          />
        )}

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Calories</Text>
              <TouchableOpacity style={styles.goalChip} onPress={openGoalModal}>
                <MaterialIcons name="flag" size={14} color="#4B117B" />
                <Text style={styles.goalChipText}>{calorieGoal} goal</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.calorieCardWrapper}>
              <CalorieRing
                percent={Math.min(1, totalCalories / calorieGoal)}
                total={totalCalories}
                goal={calorieGoal}
              />

              <View style={[styles.mealTag, styles.mealTopLeft]}>
                <MaterialIcons name="wb-sunny" size={16} color="#F4C542" />
                <Text style={styles.mealSummaryText}>
                  Breakfast {mealInputs.Breakfast?.calories || 0} cals
                </Text>
              </View>
              <View style={[styles.mealTag, styles.mealTopRight]}>
                <MaterialIcons name="wb-sunny" size={16} color="#FF8C42" />
                <Text style={styles.mealSummaryText}>
                  Lunch {mealInputs.Lunch?.calories || 0} cals
                </Text>
              </View>
              <View style={[styles.mealTag, styles.mealBottomLeft]}>
                <MaterialIcons name="nightlight" size={16} color="#3B5998" />
                <Text style={styles.mealSummaryText}>
                  Dinner {mealInputs.Dinner?.calories || 0} cals
                </Text>
              </View>
              <View style={[styles.mealTag, styles.mealBottomRight]}>
                <MaterialIcons name="nightlight" size={16} color="#9B59B6" />
                <Text style={styles.mealSummaryText}>
                  Snacks {mealInputs.Snack?.calories || 0} cals
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.logFoodButton} onPress={handleLogFood}>
              <Text style={styles.logFoodButtonText}>+ Log Food</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Macros</Text>
            <View style={styles.macrosContainer}>
              {MACROS.map((macro) => (
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
                              ((dailyData?.dailyTotals?.[`total_${macro.key}`] || 0) /
                                MACROS_GOAL[macro.key]) *
                                100,
                            ),
                          )}%`,
                        },
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

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Water</Text>

            <View style={styles.waterRow}>
              <TouchableOpacity
                onPress={() => {
                  setWaterGoalDraft(waterGoal ? String(Math.round(waterGoal * ML_PER_OZ)) : '');
                  setWaterGoalModalVisible(true);
                }}
                style={styles.waterSide}
              >
                <Text style={styles.waterSideLabel}>Goal</Text>
                <Text style={styles.waterGoalStrong}>
                  {waterGoal ? `${waterGoal} fl oz` : 'Set Goal'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.waterCircle} onPress={handleLogWater}>
                <Text style={styles.waterAmount}>
                  {Math.round(waterOz)}
                  <Text style={styles.waterGoalInline}>/{waterGoal || '--'}</Text>
                </Text>
                <Text style={styles.waterUnit}>Ounces</Text>
              </TouchableOpacity>

              <View style={[styles.waterSide, { alignItems: 'flex-end' }]}>
                <Text style={styles.waterSideLabel}>Last log</Text>
                <Text style={styles.waterLastValue}>
                  {lastLog
                    ? `${Math.round(lastLog.amount / ML_PER_OZ)} oz @ ${new Date(lastLog.time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })}`
                    : '--'}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.logWaterButton} onPress={handleLogWater}>
              <Text style={styles.logWaterButtonText}>+ Log Water</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
      <BottomTaskbar activeKey="Food" />

      <Modal
        visible={waterModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setWaterModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Log Water Intake</Text>

            <TextInput
              placeholder="Enter water in ml"
              keyboardType="numeric"
              value={waterDraft}
              onChangeText={setWaterDraft}
              style={styles.modalInput}
            />

            <View style={styles.modalActions}>
              <Pressable onPress={() => setWaterModalVisible(false)} style={styles.modalGhostButton}>
                <Text style={styles.modalGhostText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={async () => {
                  try {
                    const user = await getVerifiedUser();
                    if (!user) return;

                    const intake = parseInt(waterDraft, 10);
                    if (isNaN(intake) || intake <= 0) {
                      Alert.alert('Invalid input', 'Please enter a valid amount in ml');
                      return;
                    }

                    const todayKey = formatDateKey(new Date());
                    const nowIso = new Date().toISOString();

                    const { data: existing } = await supabase
                      .from('water_logs')
                      .select('water_intake_ml, created_at')
                      .eq('user_id', user.id)
                      .eq('log_date', todayKey)
                      .maybeSingle();

                    const newTotalMl = (existing?.water_intake_ml || 0) + intake;

                    const { data: upserted, error } = await supabase
                      .from('water_logs')
                      .upsert(
                        {
                          user_id: user.id,
                          log_date: todayKey,
                          water_intake_ml: newTotalMl,
                          created_at: existing?.created_at || nowIso,
                        },
                        { onConflict: ['user_id', 'log_date'] }
                      )
                      .select('water_intake_ml, created_at')
                      .single();

                    if (error) {
                      console.error('Error logging water:', error);
                      Alert.alert('Error', 'Could not save water log. Please try again.');
                      return;
                    }

                    const totalMl = upserted?.water_intake_ml || newTotalMl;

                    setWaterOz(totalMl / ML_PER_OZ);
                    setLastLog({ amount: totalMl, time: nowIso });
                    setWaterDraft('');
                    setWaterModalVisible(false);
                  } catch (err) {
                    console.error('Error logging water:', err);
                  }
                }}
                style={styles.modalPrimaryButton}
              >
                <Text style={styles.modalPrimaryText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={waterGoalModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setWaterGoalModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set Daily Water Goal</Text>

            <TextInput
              placeholder="Enter goal in ml"
              keyboardType="numeric"
              value={waterGoalDraft}
              onChangeText={setWaterGoalDraft}
              style={styles.modalInput}
            />

            <View style={styles.modalActions}>
              <Pressable onPress={() => setWaterGoalModalVisible(false)} style={styles.modalGhostButton}>
                <Text style={styles.modalGhostText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={async () => {
                  try {
                    const user = await getVerifiedUser();
                    if (!user) return;

                    const ml = parseInt(waterGoalDraft, 10);
                    if (isNaN(ml) || ml <= 0) {
                      Alert.alert('Invalid input', 'Please enter a valid goal in ml');
                      return;
                    }

                    const oz = ml / ML_PER_OZ;

                    await supabase
                      .from('water_goals')
                      .upsert(
                        {
                          user_id: user.id,
                          goal_ml: ml,
                          goal_oz: oz,
                          updated_at: new Date().toISOString(),
                        },
                        { onConflict: 'user_id' },
                      );

                    setWaterGoal(Math.round(oz));
                    setWaterGoalDraft('');
                    setWaterGoalModalVisible(false);
                  } catch (err) {
                    console.error('Error saving water goal:', err);
                  }
                }}
                style={styles.modalPrimaryButton}
              >
                <Text style={styles.modalPrimaryText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={goalModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setGoalModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Daily Calorie Goal</Text>
            <TextInput
              placeholder="Enter calories"
              keyboardType="numeric"
              value={goalDraft}
              onChangeText={setGoalDraft}
              style={styles.modalInput}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setGoalModalVisible(false)} style={styles.modalGhostButton}>
                <Text style={styles.modalGhostText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const parsed = parseFloat(goalDraft);
                  if (isNaN(parsed) || parsed <= 0) {
                    Alert.alert('Invalid input', 'Please enter a positive calorie goal.');
                    return;
                  }
                  setCalorieGoal(Math.min(3500, Math.round(parsed)));
                  setGoalModalVisible(false);
                }}
                style={styles.modalPrimaryButton}
              >
                <Text style={styles.modalPrimaryText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

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
            <Stop offset="70%" stopColor="#E8E0FB" />
            <Stop offset="100%" stopColor={clamp < 1 ? '#310C82' : '#FFB84D'} />
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F0EBFF' },
  screen: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  scrollContent: { paddingBottom: 140 },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  rightActions: { flexDirection: 'row', gap: 10 },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(92,75,140,0.15)',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5C4B8C',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
  },
  dateArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(92,75,140,0.2)',
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(92,75,140,0.2)',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2F1963',
  },
  datePicker: { alignSelf: 'center' },
  card: {
    marginTop: 16,
    borderRadius: 20,
    padding: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6EEF9',
    marginBottom: 8,
    shadowColor: '#3F2D76',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 8 },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0E9FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  goalChipText: { fontSize: 12, fontWeight: '600', color: '#4B117B' },
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
  logFoodButton: {
    alignSelf: 'center',
    backgroundColor: '#F1F1F5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    marginTop: 4,
  },
  logFoodButtonText: { fontWeight: '600', color: '#111' },
  macrosContainer: { marginTop: 14 },
  macroRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  macroLabel: { width: 60, fontSize: 13, color: '#555', fontWeight: '600' },
  macroBarContainer: {
    height: 8,
    borderRadius: 5,
    backgroundColor: '#E8EBF0',
    flex: 1,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  macroBar: { height: 8, borderRadius: 5 },
  macroValue: { fontSize: 13, color: '#222', width: 40, textAlign: 'right', fontWeight: '700' },
  macroGoal: { fontSize: 12, color: '#888', width: 36, marginLeft: 2 },
  waterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 12,
  },
  waterSide: { flex: 1 },
  waterSideLabel: { color: '#8797A8', fontSize: 12, marginBottom: 2 },
  waterGoalStrong: { fontSize: 14, color: '#4D7EA8', fontWeight: '700' },
  waterLastValue: { fontSize: 14, color: '#333', fontWeight: '600' },
  waterCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#E2F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 6,
    borderColor: '#CFE8FF',
  },
  waterAmount: { fontSize: 22, fontWeight: '800', color: '#0077B6', marginBottom: -2 },
  waterGoalInline: { fontSize: 16, color: '#5E6B76' },
  waterUnit: { fontSize: 14, color: '#199AD8', fontWeight: '600' },
  logWaterButton: {
    alignSelf: 'center',
    backgroundColor: '#F1F1F5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    marginTop: 4,
  },
  logWaterButtonText: { fontWeight: '600', color: '#111' },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 14 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D6D6E7',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 18,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalGhostButton: { paddingVertical: 8, paddingHorizontal: 10 },
  modalGhostText: { color: '#7A7497', fontWeight: '600' },
  modalPrimaryButton: {
    backgroundColor: '#4B117B',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  modalPrimaryText: { color: '#fff', fontWeight: '700' },
});
