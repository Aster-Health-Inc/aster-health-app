import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { usePostHog } from 'posthog-react-native';
import { supabase } from '../lib/supabase';
import { upsertMealLog, upsertDailyCalorie } from '../utils/meallogger';
import { getUserNutritionGoals } from '../utils/nutritionCalculator';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKGROUND = '#E6E0F3';
const SURFACE = '#FFFFFF';
const ACCENT = '#4B117B';
const TEXT_PRIMARY = '#1F1F1F';
const TEXT_MUTED = '#6A6A6A';

const NutritionSummaryScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const posthog = usePostHog();
  const { photoUri, analysisData, geminiData } = route.params;
  const [saving, setSaving] = useState(false);

  const { name, description, calories, macros, ingredients, micronutrients, servingSize, mealType, weight } =
    analysisData || {};

  const handleAddToLog = async () => {
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please log in to save food data');
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      const caloriesNum = parseFloat(calories) || 0;
      const proteinNum = parseFloat(geminiData?.protein?.replace('g', '')) || 0;
      const carbsNum = parseFloat(geminiData?.carbohydrates?.replace('g', '')) || 0;
      const fatNum = parseFloat(geminiData?.fat?.replace('g', '')) || 0;

      let validMealType = mealType || 'Snack';
      if (validMealType.includes('/')) {
        validMealType = validMealType.split('/')[0].trim();
      }
      const mealTypeMap = {
        breakfast: 'Breakfast',
        lunch: 'Lunch',
        dinner: 'Dinner',
        snack: 'Snack',
        snacks: 'Snack',
      };
      validMealType = mealTypeMap[validMealType.toLowerCase()] || validMealType;
      const allowedMealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
      if (!allowedMealTypes.includes(validMealType)) validMealType = 'Snack';

      const { data: existingUser, error: userFetchError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (userFetchError && userFetchError.code !== 'PGRST116') {
        throw new Error('Unable to verify user record. Please try again.');
      }

      if (!existingUser) {
        const { error: userCreateError } = await supabase
          .from('users')
          .upsert(
            {
              id: user.id,
              email: user.email,
              average_cycle_length: 28,
              average_period_length: 5,
            },
            { onConflict: 'id' },
          );
        if (userCreateError && userCreateError.code !== '23505') {
          throw new Error('Unable to create user record. Please contact support.');
        }
      }

      const { data: rpcResult, error: rpcError } = await supabase.rpc('insert_meal_data', {
        p_user_id: user.id,
        p_log_date: today,
        p_meal_type: validMealType,
        p_calories: caloriesNum,
        p_carbs: carbsNum,
        p_protein: proteinNum,
        p_fat: fatNum,
      });

      if (rpcError) {
        const { data: existingLog, error: fetchError } = await supabase
          .from('meal_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('log_date', today)
          .maybeSingle();

        let logId;
        if (!existingLog) {
          const { data: newLog, error: createError } = await supabase
            .from('meal_logs')
            .insert({
              user_id: user.id,
              log_date: today,
              total_calories: caloriesNum,
              total_protein: proteinNum,
              total_carbs: carbsNum,
              total_fat: fatNum,
            })
            .select()
            .single();

          if (createError) {
            throw new Error(`Database error: ${createError.message}. Please try again.`);
          }
          logId = newLog.id;
        } else {
          logId = existingLog.id;
          const { error: updateError } = await supabase
            .from('meal_logs')
            .update({
              total_calories: (existingLog.total_calories || 0) + caloriesNum,
              total_protein: (existingLog.total_protein || 0) + proteinNum,
              total_carbs: (existingLog.total_carbs || 0) + carbsNum,
              total_fat: (existingLog.total_fat || 0) + fatNum,
            })
            .eq('id', existingLog.id);
          if (updateError) {
            throw new Error(`Update error: ${updateError.message}`);
          }
        }

        const { error: mealError } = await supabase
          .from('meals')
          .upsert(
            {
              log_id: logId,
              meal_type: validMealType,
              calories: caloriesNum,
              protein: proteinNum,
              carbs: carbsNum,
              fat: fatNum,
            },
            {
              onConflict: 'log_id,meal_type',
            },
          );

        if (mealError) {
          throw new Error(`Meal save error: ${mealError.message}`);
        }
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

      const mealTypeKey = String(validMealType || '')
        .trim()
        .toLowerCase();

      posthog?.capture('meal_logged', {
        meal_type: ['breakfast', 'lunch', 'dinner', 'snack'].includes(mealTypeKey)
          ? mealTypeKey
          : undefined,
        calories: caloriesNum || undefined,
        calorie_goal_set: Number.isFinite(calorieGoal) ? calorieGoal > 0 : undefined,
        calorie_goal: Number.isFinite(calorieGoal) ? calorieGoal : undefined,
        water_logged: false,
      });

      Alert.alert('Success!', 'Food has been added to your daily log', [
        {
          text: 'View Food Log',
          onPress: () => {
            navigation.navigate('FoodLog', {
              refreshData: true,
              timestamp: Date.now(),
            });
          },
        },
        {
          text: 'Take Another Photo',
          onPress: () => navigation.navigate('Camera'),
        },
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
      <View style={styles.header}>
        <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={22} color="#4A4A4A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nutrition Information</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: photoUri }} style={styles.foodImage} />
          <View style={styles.calorieBadge}>
            <Text style={styles.calorieBadgeText}>{calories || 550} cal</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.dishName}>{name || 'Grilled Salmon Bowl'}</Text>
          <Text style={styles.dishDesc}>
            {description || 'Lightly grilled salmon with quinoa, roasted vegetables, and a lemon and herb dressing.'}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="restaurant-outline" size={16} color={styles.metaIcon.color} />
              <Text style={styles.metaText}>{mealType || 'Dinner'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={16} color={styles.metaIcon.color} />
              <Text style={styles.metaText}>{servingSize ? `${servingSize} serving` : '1 serving'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="scale-outline" size={16} color={styles.metaIcon.color} />
              <Text style={styles.metaText}>{weight ? `${weight} g` : '350 g'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Macronutrients</Text>
          <Text style={styles.sectionDesc}>
            Lightly grilled salmon with quinoa, roasted vegetables, and a lemon and herb dressing.
          </Text>
          <View style={styles.macroPills}>
            <View style={styles.macroPill}>
              <Text style={styles.macroValue}>{macros?.protein || '32g'}</Text>
              <Text style={styles.macroLabel}>protein</Text>
              <Text style={styles.macroDV}>35% DV</Text>
            </View>
            <View style={styles.macroPill}>
              <Text style={styles.macroValue}>{macros?.carbs || '32g'}</Text>
              <Text style={styles.macroLabel}>carbs</Text>
              <Text style={styles.macroDV}>35% DV</Text>
            </View>
            <View style={styles.macroPill}>
              <Text style={styles.macroValue}>{macros?.fats || '32g'}</Text>
              <Text style={styles.macroLabel}>fats</Text>
              <Text style={styles.macroDV}>35% DV</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            <Ionicons name="create-outline" size={18} color={styles.metaIcon.color} />
          </View>
          {(ingredients && ingredients.length > 0
            ? ingredients
            : [
                { name: 'Atlantic Salmon', quantity: '150g' },
                { name: 'Quinoa', quantity: '150g' },
                { name: 'Broccoli', quantity: '150g' },
                { name: 'Asparagus', quantity: '150g' },
                { name: 'Lemon and Herb Sauce', quantity: '150g' },
              ]
          ).map((item, idx) => (
            <View key={`${item.name}-${idx}`} style={styles.ingredientRow}>
              <Text style={styles.ingredientName}>{item.name}</Text>
              <Text style={styles.ingredientQuantity}>{item.quantity}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Key Micronutrients</Text>
          {(micronutrients && micronutrients.length > 0
            ? micronutrients
            : [
                { name: 'Vitamin D', value: '0.05 mg' },
                { name: 'Omega - 3', value: '0.05 mg' },
                { name: 'Iron', value: '0.05 mg' },
              ]
          ).map((item, idx) => (
            <View key={`${item.name}-${idx}`} style={styles.ingredientRow}>
              <Text style={styles.ingredientName}>{item.name}</Text>
              <Text style={styles.ingredientQuantity}>{item.value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
        onPress={handleAddToLog}
        disabled={saving}
        activeOpacity={0.9}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Add to Food Log</Text>}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default NutritionSummaryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B9AFD6',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E2E2E',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    paddingTop: 12,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 16,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#C4B9DF',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  foodImage: {
    width: '100%',
    height: 240,
    backgroundColor: '#f0f0f0',
  },
  calorieBadge: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  calorieBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#C4B9DF',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  dishName: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  dishDesc: {
    fontSize: 14,
    color: TEXT_MUTED,
    marginTop: 6,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#F6F4FB',
    borderRadius: 12,
  },
  metaIcon: {
    color: '#7A7A7A',
  },
  metaText: {
    fontSize: 13,
    color: TEXT_PRIMARY,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  sectionDesc: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 6,
    marginBottom: 12,
    lineHeight: 18,
  },
  macroPills: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  macroPill: {
    flex: 1,
    backgroundColor: '#F6F4FB',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#C4B9DF',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  macroLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
    textTransform: 'lowercase',
  },
  macroDV: {
    fontSize: 12,
    color: '#9A9A9A',
    marginTop: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EFEFF2',
  },
  ingredientName: {
    fontSize: 14,
    color: TEXT_PRIMARY,
  },
  ingredientQuantity: {
    fontSize: 14,
    color: TEXT_MUTED,
  },
  primaryButton: {
    position: 'absolute',
    bottom: 28,
    left: 20,
    right: 20,
    backgroundColor: ACCENT,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: '#4B117B',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  primaryButtonDisabled: {
    backgroundColor: '#AAA',
  },
});
