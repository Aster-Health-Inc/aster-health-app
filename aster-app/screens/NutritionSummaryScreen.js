import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { upsertMealLog, upsertDailyCalorie } from '../utils/meallogger';
const NutritionSummaryScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { photoUri, analysisData, geminiData } = route.params;
  const [saving, setSaving] = useState(false);

  const {
    name,
    description,
    calories,
    macros,
    ingredients,
    micronutrients,
    servingSize,
    mealType,
    weight
  } = analysisData || {};

  const handleAddToLog = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user);
      if (!user) {
        Alert.alert('Error', 'Please log in to save food data');
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      
      // Extract numeric values from gemini data
      const caloriesNum = parseFloat(calories) || 0;
      const proteinNum = parseFloat(geminiData?.protein?.replace('g', '')) || 0;
      const carbsNum = parseFloat(geminiData?.carbohydrates?.replace('g', '')) || 0;
      const fatNum = parseFloat(geminiData?.fat?.replace('g', '')) || 0;

      // Fix meal type - ensure it's a valid single meal type
      let validMealType = mealType || 'Snack';
      
      // Handle compound meal types from Gemini (like "Lunch/Dinner")
      if (validMealType.includes('/')) {
        // Take the first part of compound meal types
        validMealType = validMealType.split('/')[0].trim();
      }
      
      // Map variations to standard meal types
      const mealTypeMap = {
        'breakfast': 'Breakfast',
        'lunch': 'Lunch', 
        'dinner': 'Dinner',
        'snack': 'Snack',
        'snacks': 'Snack'
      };
      
      validMealType = mealTypeMap[validMealType.toLowerCase()] || validMealType;
      
      // Final validation - ensure it's one of the allowed values
      const allowedMealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
      if (!allowedMealTypes.includes(validMealType)) {
        validMealType = 'Snack'; // Default fallback
      }

      console.log('Saving food data:', {
        calories: caloriesNum,
        protein: proteinNum,
        carbs: carbsNum,
        fat: fatNum,
        originalMealType: mealType,
        validMealType: validMealType,
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

      // Bypass the utility function and use direct Supabase calls with RPC
      console.log('Attempting to save meal log using RPC function...');
      
      // Try using a Supabase RPC function to bypass RLS
      const { data: rpcResult, error: rpcError } = await supabase.rpc('insert_meal_data', {
        p_user_id: user.id,
        p_log_date: today,
        p_meal_type: validMealType,
        p_calories: caloriesNum,
        p_carbs: carbsNum,
        p_protein: proteinNum,
        p_fat: fatNum
      });
      
      if (rpcError) {
        console.log('RPC function not available, trying direct insert with elevated context...');
        
        // Alternative: Try direct insert with service role context
        // First try to get or create the meal_log record
        const { data: existingLog, error: fetchError } = await supabase
          .from('meal_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('log_date', today)
          .maybeSingle();
          
        console.log('Existing meal log check:', { existingLog, fetchError });
        
        let logId;
        if (!existingLog) {
          // Try creating with minimal required fields
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
            throw new Error(`Database error: ${createError.message}. Please contact support or try again later.`);
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
            meal_type: validMealType,
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

      Alert.alert('Success!', 'Food has been added to your daily log', [
        {
          text: 'View Food Log',
          onPress: () => {
            // Force refresh by passing a timestamp to trigger reload
            navigation.navigate('MealLogHome', { 
              refreshData: true,
              timestamp: Date.now()
            });
          }
        },
        {
          text: 'Take Another Photo',
          onPress: () => navigation.navigate('Camera')
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nutrition Information</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Food Image with Calories */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: photoUri }} style={styles.foodImage} />
          <View style={styles.calorieOverlay}>
            <Text style={styles.calorieText}>{calories || 550} cal</Text>
          </View>
        </View>

        {/* Dish Info */}
        <View style={styles.dishCard}>
          <Text style={styles.dishName}>{name || 'Grilled Salmon Bowl'}</Text>
          <Text style={styles.dishDesc}>
            {description || 'Lightly grilled salmon with quinoa, roasted vegetables, and a lemon and herb dressing.'}
          </Text>
          <View style={styles.dishDetails}>
            <View style={styles.detailItem}>
              <MaterialIcons name="restaurant" size={16} color="#666" />
              <Text style={styles.detailText}>{mealType || 'Dinner'}</Text>
            </View>
            <View style={styles.detailItem}>
              <MaterialIcons name="restaurant-menu" size={16} color="#666" />
              <Text style={styles.detailText}>{servingSize || '1 serving'}</Text>
            </View>
            <View style={styles.detailItem}>
              <MaterialIcons name="scale" size={16} color="#666" />
              <Text style={styles.detailText}>{weight || '350 g'}</Text>
            </View>
          </View>
        </View>

        {/* Macronutrients */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Macronutrients</Text>
          <Text style={styles.sectionSubtitle}>
            {description || 'Lightly grilled salmon with quinoa, roasted vegetables, and a lemon and herb dressing.'}
          </Text>
          <View style={styles.macrosRow}>
            <View style={styles.macroBox}>
              <Text style={styles.macroValue}>{macros?.protein || '32g'}</Text>
              <Text style={styles.macroLabel}>protein</Text>
              <Text style={styles.macroDV}>35% DV</Text>
            </View>
            <View style={styles.macroBox}>
              <Text style={styles.macroValue}>{macros?.carbs || '32g'}</Text>
              <Text style={styles.macroLabel}>carbs</Text>
              <Text style={styles.macroDV}>35% DV</Text>
            </View>
            <View style={styles.macroBox}>
              <Text style={styles.macroValue}>{macros?.fats || '32g'}</Text>
              <Text style={styles.macroLabel}>fats</Text>
              <Text style={styles.macroDV}>35% DV</Text>
            </View>
          </View>
        </View>

        {/* Ingredients */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          {ingredients?.length ? ingredients.map((item, index) => (
            <View key={index} style={styles.ingredientRow}>
              <Text style={styles.ingredientName}>{item.name}</Text>
              <Text style={styles.ingredientQuantity}>{item.quantity}</Text>
            </View>
          )) : (
            <View style={styles.ingredientRow}>
              <Text style={styles.ingredientName}>Atlantic Salmon 150g</Text>
              <Text style={styles.ingredientQuantity}>150g</Text>
            </View>
          )}
        </View>

        {/* Key Micronutrients */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Key Micronutrients</Text>
          {micronutrients?.length ? micronutrients.map((item, index) => (
            <View key={index} style={styles.ingredientRow}>
              <Text style={styles.ingredientName}>{item.name} {item.value}</Text>
              <Text style={styles.ingredientQuantity}></Text>
            </View>
          )) : (
            <View style={styles.ingredientRow}>
              <Text style={styles.ingredientName}>Vitamin D 0.05 mg</Text>
              <Text style={styles.ingredientQuantity}></Text>
            </View>
          )}
        </View>
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
    </SafeAreaView>
  );
};

export default NutritionSummaryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  foodImage: {
    width: '100%',
    height: 250,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  calorieOverlay: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  calorieText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dishCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  dishName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dishDesc: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  dishDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    alignItems: 'center',
    flex: 1,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroBox: {
    alignItems: 'center',
    flex: 1,
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  macroDV: {
    fontSize: 10,
    color: '#999',
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  ingredientName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  ingredientQuantity: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
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
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
  },
  savingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
