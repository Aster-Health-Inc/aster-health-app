import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const FoodLogScreen = () => {
  const navigation = useNavigation();

  // Mock data for demonstration
  const foodLog = {
    Breakfast: [
      { name: 'Oatmeal with Berries', serving: '1 serving', calories: 300, image: 'https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=100' },
      { name: 'Oatmeal with Berries', serving: '1 serving', calories: 300, image: 'https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=100' }
    ],
    Lunch: [
      { name: 'Oatmeal with Berries', serving: '1 serving', calories: 300, image: 'https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=100' },
      { name: 'Oatmeal with Berries', serving: '1 serving', calories: 300, image: 'https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=100' }
    ],
    Dinner: [],
    Snacks: []
  };

  const getMealIcon = (mealType) => {
    switch (mealType) {
      case 'Breakfast':
        return 'wb-sunny';
      case 'Lunch':
        return 'wb-sunny';
      case 'Dinner':
        return 'nightlight';
      case 'Snacks':
        return 'nightlight';
      default:
        return 'restaurant';
    }
  };

  const getTotalCalories = (mealType) => {
    return foodLog[mealType].reduce((total, item) => total + item.calories, 0);
  };

  const handleEdit = (mealType, index) => {
    // Handle edit functionality
    console.log('Edit', mealType, index);
  };

  const handleDelete = (mealType, index) => {
    // Handle delete functionality
    console.log('Delete', mealType, index);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Food Log</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="checkmark" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {Object.entries(foodLog).map(([mealType, foods]) => (
          <View key={mealType} style={styles.mealSection}>
            <View style={styles.mealHeader}>
              <View style={styles.mealHeaderLeft}>
                <MaterialIcons name={getMealIcon(mealType)} size={20} color="#666" />
                <Text style={styles.mealTitle}>{mealType}</Text>
              </View>
              {foods.length > 0 && (
                <Text style={styles.mealCalories}>{getTotalCalories(mealType)} cals</Text>
              )}
            </View>

            {foods.length > 0 ? (
              foods.map((food, index) => (
                <View key={index} style={styles.foodItem}>
                  <Image source={{ uri: food.image }} style={styles.foodImage} />
                  <View style={styles.foodInfo}>
                    <Text style={styles.foodName}>{food.name}</Text>
                    <Text style={styles.foodDetails}>{food.serving} • {food.calories} cals</Text>
                  </View>
                  <View style={styles.foodActions}>
                    <TouchableOpacity 
                      style={styles.actionButton} 
                      onPress={() => handleEdit(mealType, index)}
                    >
                      <Ionicons name="pencil" size={18} color="#666" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.actionButton} 
                      onPress={() => handleDelete(mealType, index)}
                    >
                      <Ionicons name="trash" size={18} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyMeal}>No food logged</Text>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default FoodLogScreen;

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
    paddingBottom: 40,
  },
  mealSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  mealHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  mealCalories: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  foodImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginRight: 12,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  foodDetails: {
    fontSize: 12,
    color: '#666',
  },
  foodActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  emptyMeal: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
