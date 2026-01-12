import { SafeAreaView } from 'react-native-safe-area-context';
// AddFoodScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Alert, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { usePostHog } from 'posthog-react-native';
import { supabase } from '../lib/supabase';
import { getUserNutritionGoals } from '../utils/nutritionCalculator';

const formatLocalDateKey = (inputDate) => {
  const d = new Date(inputDate || new Date());
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const AddFoodScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const posthog = usePostHog();
  const { mealType, photoUri, analysisData, selectedDate } = route.params || {};
  const resolvedMealType = mealType || 'Meal';

  const [foodName, setFoodName] = useState('');
  const [weight, setWeight] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAddToLog = async () => {
    // Validate required fields
    if (!foodName.trim()) {
      Alert.alert('Missing Information', 'Please enter a food name');
      return;
    }
    
    if (!calories || parseFloat(calories) <= 0) {
      Alert.alert('Missing Information', 'Please enter valid calories');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user);
      if (!user) {
        Alert.alert('Error', 'Please log in to save food data');
        return;
      }

      const logDate = formatLocalDateKey(selectedDate || new Date());
      
      // Extract numeric values
      const caloriesNum = parseFloat(calories) || 0;
      const proteinNum = parseFloat(protein) || 0;
      const carbsNum = parseFloat(carbs) || 0;
      const fatNum = parseFloat(fats) || 0;

      console.log('Saving manual food data:', {
        foodName,
        calories: caloriesNum,
        protein: proteinNum,
        carbs: carbsNum,
        fat: fatNum,
        mealType: resolvedMealType,
        userId: user.id,
        userEmail: user.email
      });

      // First ensure user exists in public.users table for RLS policy
      console.log('Checking if user exists in public.users table...');
      const { data: existingUser, error: userFetchError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
        
      console.log('Existing user check:', { existingUser, userFetchError });
      
      if (userFetchError && userFetchError.code !== 'PGRST116') {
        console.error('Failed to fetch user:', userFetchError);
        throw new Error('Unable to verify user record. Please try again.');
      }
      
      if (!existingUser) {
        console.log('User not found, inserting via upsert...');
        const { error: userCreateError } = await supabase
          .from('users')
          .upsert(
            { 
              id: user.id, 
              email: user.email,
              average_cycle_length: 28,
              average_period_length: 5
            },
            { onConflict: 'id' }
          );
          
        if (userCreateError && userCreateError.code !== '23505') {
          console.error('Failed to create user:', userCreateError);
          throw new Error('Unable to create user record. Please contact support.');
        }
      }

      // Try using RPC function first, then fallback to direct insert
      console.log('Attempting to save meal log using RPC function...');
      
      const { data: rpcResult, error: rpcError } = await supabase.rpc('insert_meal_data', {
        p_user_id: user.id,
        p_log_date: logDate,
        p_meal_type: resolvedMealType,
        p_calories: caloriesNum,
        p_carbs: carbsNum,
        p_protein: proteinNum,
        p_fat: fatNum
      });
      
      if (rpcError) {
        console.log('RPC function not available, trying direct insert...');
        
        // Get or create the meal_log record
        const { data: existingLog, error: fetchError } = await supabase
          .from('meal_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('log_date', logDate)
          .maybeSingle();
          
        console.log('Existing meal log check:', { existingLog, fetchError });
        
        let logId;
        if (!existingLog) {
          // Create new meal log
          const { data: newLog, error: createError } = await supabase
            .from('meal_logs')
            .insert({
              user_id: user.id,
              log_date: logDate,
              total_calories: caloriesNum,
              total_protein: proteinNum,
              total_carbs: carbsNum,
              total_fat: fatNum
            })
            .select()
            .single();
            
          if (createError) {
            console.error('Failed to create meal log:', createError);
            throw new Error(`Database error: ${createError.message}`);
          }
          logId = newLog.id;
          console.log('Created new meal log:', newLog);
        } else {
          logId = existingLog.id;
          // Update existing totals
          const { error: updateError } = await supabase
            .from('meal_logs')
            .update({
              total_calories: (existingLog.total_calories || 0) + caloriesNum,
              total_protein: (existingLog.total_protein || 0) + proteinNum,
              total_carbs: (existingLog.total_carbs || 0) + carbsNum,
              total_fat: (existingLog.total_fat || 0) + fatNum
            })
            .eq('id', existingLog.id);
            
          if (updateError) {
            console.error('Failed to update meal log:', updateError);
            throw new Error(`Update error: ${updateError.message}`);
          }
          console.log('Updated existing meal log');
        }
        
        // Now insert the individual meal
        const { error: mealError } = await supabase
          .from('meals')
          .upsert({
            log_id: logId,
            meal_type: resolvedMealType,
            calories: caloriesNum,
            protein: proteinNum,
            carbs: carbsNum,
            fat: fatNum
          }, {
            onConflict: 'log_id,meal_type'
          });
          
        if (mealError) {
          console.error('Failed to save individual meal:', mealError);
          throw new Error(`Meal save error: ${mealError.message}`);
        }
        
        console.log('Successfully saved meal data');
      } else {
        console.log('Successfully saved via RPC:', rpcResult);
      }

      let calorieGoal = null;
      try {
        const goals = await getUserNutritionGoals(supabase, user.id);
        calorieGoal = goals?.calories ?? null;
      } catch (goalError) {
        console.log('[PostHog] nutrition goals fetch failed', goalError);
      }

      const normalizedMealType = String(resolvedMealType || '')
        .trim()
        .toLowerCase();
      const mealTypeKey = ['breakfast', 'lunch', 'dinner', 'snack'].includes(normalizedMealType)
        ? normalizedMealType
        : undefined;

      posthog?.capture('meal_logged', {
        meal_type: mealTypeKey,
        calories: caloriesNum || undefined,
        calorie_goal_set: Number.isFinite(calorieGoal) ? calorieGoal > 0 : undefined,
        calorie_goal: Number.isFinite(calorieGoal) ? calorieGoal : undefined,
        water_logged: false,
      });

      Alert.alert('Success!', `${foodName} has been added to your ${resolvedMealType} log`, [
        {
          text: 'View Food Log',
          onPress: () => {
            const params = { refreshData: true, timestamp: Date.now() };
            navigation.replace('FoodLog', params);
          }
        },
        {
          text: 'Add Another Food',
          onPress: () => {
            // Clear form for next entry
            setFoodName('');
            setWeight('');
            setCalories('');
            setProtein('');
            setCarbs('');
            setFats('');
          }
        }
      ]);

    } catch (error) {
      console.error('Error saving food:', error);
      Alert.alert('Error', 'Failed to save food data. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.innerContainer}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.circleButton}>
                <Ionicons name="close" size={20} color="#4B117B" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Add Food</Text>
              <View style={styles.headerSpacer} />
            </View>

            <ScrollView 
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>Food Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter food name"
                  placeholderTextColor="#B3A6C8"
                  value={foodName}
                  onChangeText={setFoodName}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>Weight</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ex. 100"
                  placeholderTextColor="#B3A6C8"
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>Calories</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ex. 100"
                  placeholderTextColor="#B3A6C8"
                  value={calories}
                  onChangeText={setCalories}
                  keyboardType="numeric"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.macrosCard}>
                <Text style={styles.inputLabel}>Macros</Text>
                {[
                  { label: 'Protein', value: protein, setter: setProtein },
                  { label: 'Carbs', value: carbs, setter: setCarbs },
                  { label: 'Fats', value: fats, setter: setFats },
                ].map((item, index) => (
                  <View key={item.label} style={[styles.macroRow, index < 2 && styles.macroDivider]}>
                    <Text style={styles.macroLabel}>{item.label}</Text>
                    <TextInput
                      style={styles.macroInput}
                      placeholder="Ex. 100"
                      placeholderTextColor="#B3A6C8"
                      value={item.value}
                      onChangeText={item.setter}
                      keyboardType="numeric"
                      returnKeyType={index === 2 ? 'done' : 'next'}
                    />
                  </View>
                ))}
              </View>
              
              {/* Extra space for keyboard */}
              <View style={styles.extraSpace} />
            </ScrollView>

            {/* Add to Food Log Button */}
            <TouchableOpacity 
              style={[styles.addButton, saving && styles.addButtonDisabled]} 
              onPress={handleAddToLog}
              disabled={saving}
            >
              {saving ? (
                <View style={styles.savingContainer}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.addButtonText}>Saving...</Text>
                </View>
              ) : (
                <Text style={styles.addButtonText}>Add to Food Log</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AddFoodScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6DFF2',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#E6DFF2',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3F2560',
  },
  circleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D8CFEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 120,
    gap: 14,
  },
  extraSpace: {
    height: 100,
  },
  inputCard: {
    backgroundColor: '#F5F1FB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#8A7AB8',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3F2560',
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#3F2560',
  },
  macrosCard: {
    backgroundColor: '#F5F1FB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#8A7AB8',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  macroRow: {
    paddingVertical: 10,
  },
  macroDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#E3D8F5',
  },
  macroLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3F2560',
    marginBottom: 6,
  },
  macroInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#3F2560',
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#6B4CD9',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: '#4B117B',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  savingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
