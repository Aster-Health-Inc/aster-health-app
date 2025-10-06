import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const DeleteMealsScreen = ({ navigation }) => {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllMeals();
  }, []);

  const fetchAllMeals = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Error', 'Not authenticated');
        return;
      }

      // Fetch meals from last 30 days
      const allMealsArray = [];
      const today = new Date();

      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'get_user_daily_logs',
          {
            p_user_id: user.id,
            p_log_date: dateStr,
          }
        );

        if (!rpcError && rpcData?.meals) {
          const mealsForDate = rpcData.meals.map(meal => ({
            ...meal,
            name: meal.meal_type || 'Meal',
            log_date: dateStr,
          }));
          allMealsArray.push(...mealsForDate);
        }
      }

      console.log('Fetched meals from last 30 days:', allMealsArray.length);
      setMeals(allMealsArray);
    } catch (err) {
      console.error('Error:', err);
      Alert.alert('Error', 'Failed to load meals');
    } finally {
      setLoading(false);
    }
  };

  const deleteMeal = async (mealId, logDate, logId) => {
    try {
      console.log('Deleting meal:', { mealId, logDate, logId });

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Error', 'Not authenticated');
        return;
      }

      // Use RPC to delete the meal (bypasses RLS)
      const { data: result, error: deleteError } = await supabase.rpc(
        'delete_meal_and_recalculate',
        {
          p_meal_id: mealId,
          p_user_id: user.id,
        }
      );

      console.log('Delete result:', result);
      console.log('Delete error:', deleteError);

      if (deleteError) {
        console.error('Error deleting meal:', deleteError);
        Alert.alert('Error', `Failed to delete meal: ${deleteError.message}`);
        return;
      }

      // Remove the meal from the local state immediately
      setMeals(prevMeals => prevMeals.filter(m => m.id !== mealId));

      Alert.alert('Success', 'Meal deleted! Go back to see updated totals.');
    } catch (err) {
      console.error('Error deleting meal:', err);
      Alert.alert('Error', 'Failed to delete meal');
    }
  };

  const confirmDelete = (meal) => {
    Alert.alert(
      'Delete Meal',
      `Delete "${meal.name}"?\n${meal.calories} calories`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMeal(meal.id, meal.log_date, meal.log_id),
        },
      ]
    );
  };

  const renderMealItem = ({ item }) => (
    <View style={styles.mealCard}>
      <View style={styles.mealInfo}>
        <Text style={styles.mealName}>{item.name}</Text>
        <Text style={styles.mealDate}>
          {new Date(item.created_at).toLocaleDateString()} at{' '}
          {new Date(item.created_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
        <View style={styles.mealStats}>
          <Text style={styles.calorieText}>🔥 {item.calories} cal</Text>
          <Text style={styles.macroText}>
            🍗 {item.protein}g · 🌾 {item.carbs}g · 🧈 {item.fat}g
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => confirmDelete(item)}
      >
        <Ionicons name="trash-outline" size={24} color="#ff4444" />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color="#111111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Delete Meals</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#111111" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#111111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delete Meals</Text>
        <TouchableOpacity onPress={fetchAllMeals}>
          <Ionicons name="refresh" size={24} color="#111111" />
        </TouchableOpacity>
      </View>

      {meals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No meals found</Text>
        </View>
      ) : (
        <>
          <View style={styles.countBanner}>
            <Text style={styles.countText}>
              Total: {meals.length} meal{meals.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <FlatList
            data={meals}
            renderItem={renderMealItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
          />
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8C8C8C',
  },
  countBanner: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8C8C8C',
  },
  listContainer: {
    padding: 16,
  },
  mealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 4,
  },
  mealDate: {
    fontSize: 13,
    color: '#8C8C8C',
    marginBottom: 8,
  },
  mealStats: {
    gap: 4,
  },
  calorieText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111111',
  },
  macroText: {
    fontSize: 13,
    color: '#666666',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 12,
  },
});

export default DeleteMealsScreen;
