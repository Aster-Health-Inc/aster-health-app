// AddFoodScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

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

  const handleAddToLog = () => {
    // Here you would typically save the food data
    // For now, just navigate back
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Food</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Food Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Food Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter food name"
            value={foodName}
            onChangeText={setFoodName}
          />
        </View>

        {/* Weight */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Weight</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Ex. 100"
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
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
          />
        </View>

        {/* Macros Section */}
        <View style={styles.macrosSection}>
          <Text style={styles.sectionTitle}>Macros</Text>
          
          {/* Protein */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Protein</Text>
            <TextInput
              style={styles.textInput}
              placeholder=""
              value={protein}
              onChangeText={setProtein}
              keyboardType="numeric"
            />
          </View>

          {/* Carbs */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Carbs</Text>
            <TextInput
              style={styles.textInput}
              placeholder=""
              value={carbs}
              onChangeText={setCarbs}
              keyboardType="numeric"
            />
          </View>

          {/* Fats */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Fats</Text>
            <TextInput
              style={styles.textInput}
              placeholder=""
              value={fats}
              onChangeText={setFats}
              keyboardType="numeric"
            />
          </View>
        </View>
      </ScrollView>

      {/* Add to Food Log Button */}
      <TouchableOpacity style={styles.addButton} onPress={handleAddToLog}>
        <Text style={styles.addButtonText}>Add to Food Log</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default AddFoodScreen;

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
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
