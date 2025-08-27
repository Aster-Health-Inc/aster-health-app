import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const NutritionSummaryScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { photoUri, analysisData } = route.params;

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

  const handleAddToLog = () => {
    navigation.navigate('AddFoodScreen', {
      photoUri,
      analysisData
    });
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
      <TouchableOpacity style={styles.addButton} onPress={handleAddToLog}>
        <Text style={styles.addButtonText}>Add to Food Log</Text>
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
});
