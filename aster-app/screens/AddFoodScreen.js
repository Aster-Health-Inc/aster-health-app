// AddFoodScreen.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableWithoutFeedback, 
  Keyboard,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { log, warn, error } from '../utils/CrashLogger';

log('User pressed button', { id: 42 });
warn('Slow API response');
error('Login failed', err);
const AddFoodScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { mealType, photoUri, analysisData } = route.params || {};

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

      const today = new Date().toISOString().split('T')[0];
      
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
        mealType,
        userId: user.id,
        userEmail: user.email
      });

      // First ensure user exists in public.users table for RLS policy
      console.log('Checking if user exists in public.users table...');
      const { data: existingUser, error: userFetchError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();
        
      console.log('Existing user check:', { existingUser, userFetchError });
      
      if (!existingUser) {
        console.log('User not found, creating user in public.users table...');
        const { data: newUser, error: userCreateError } = await supabase
          .from('users')
          .insert([{ 
            id: user.id, 
            email: user.email,
            average_cycle_length: 28,
            average_period_length: 5
          }])
          .select()
          .single();
          
        console.log('User creation result:', { newUser, userCreateError });
        
        if (userCreateError) {
          console.error('Failed to create user:', userCreateError);
          throw new Error('Unable to create user record. Please contact support.');
        }
      }

      // Try using RPC function first, then fallback to direct insert
      console.log('Attempting to save meal log using RPC function...');
      
      const { data: rpcResult, error: rpcError } = await supabase.rpc('insert_meal_data', {
        p_user_id: user.id,
        p_log_date: today,
        p_meal_type: mealType,
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
          .eq('log_date', today)
          .maybeSingle();
          
        console.log('Existing meal log check:', { existingLog, fetchError });
        
        let logId;
        if (!existingLog) {
          // Create new meal log
          const { data: newLog, error: createError } = await supabase
            .from('meal_logs')
            .insert({
              user_id: user.id,
              log_date: today,
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
            meal_type: mealType,
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

      Alert.alert('Success!', `${foodName} has been added to your ${mealType} log`, [
        {
          text: 'View Food Log',
          onPress: () => {
            navigation.navigate('MealLogHome', { 
              refreshData: true,
              timestamp: Date.now()
            });
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
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="close" size={28} color="black" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Add Food</Text>
              <TouchableOpacity onPress={Keyboard.dismiss}>
                <Text style={styles.doneButton}>Done</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              {/* Food Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Food Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter food name"
                  value={foodName}
                  onChangeText={setFoodName}
                  returnKeyType="next"
                />
              </View>

              {/* Weight */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Weight (grams)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ex. 100"
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
                  returnKeyType="next"
                />
              </View>

              {/* Calories */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Calories</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ex. 100"
                  value={calories}
                  onChangeText={setCalories}
                  keyboardType="numeric"
                  returnKeyType="next"
                />
              </View>

              {/* Macros Section */}
              <View style={styles.macrosSection}>
                <Text style={styles.sectionTitle}>Macros</Text>
                
                {/* Protein */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Protein (grams)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ex. 25"
                    value={protein}
                    onChangeText={setProtein}
                    keyboardType="numeric"
                    returnKeyType="next"
                  />
                </View>

                {/* Carbs */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Carbs (grams)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ex. 30"
                    value={carbs}
                    onChangeText={setCarbs}
                    keyboardType="numeric"
                    returnKeyType="next"
                  />
                </View>

                {/* Fats */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Fats (grams)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ex. 15"
                    value={fats}
                    onChangeText={setFats}
                    keyboardType="numeric"
                    returnKeyType="done"
                  />
                </View>
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
    backgroundColor: '#fff',
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
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  doneButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B9D',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  extraSpace: {
    height: 100,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  macrosSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FF6B9D',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  savingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
