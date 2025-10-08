import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
const EditGoalsScreen = () => {
  const navigation = useNavigation();
  
  const [calories, setCalories] = useState('2560');
  const [water, setWater] = useState('128');
  const [protein, setProtein] = useState('128');
  const [fats, setFats] = useState('128');
  const [carbs, setCarbs] = useState('128');

  const handleSave = () => {
    // Here you would typically save the goals
    navigation.goBack();
  };

  const handleReset = () => {
    // Reset to suggested goals
    setCalories('2000');
    setWater('128');
    setProtein('150');
    setFats('65');
    setCarbs('250');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Goals</Text>
        <TouchableOpacity onPress={handleSave}>
          <Ionicons name="checkmark" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Daily Goals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Goals</Text>
          
          <View style={styles.goalRow}>
            <Text style={styles.goalLabel}>Calories</Text>
            <TextInput
              style={styles.goalInput}
              value={calories}
              onChangeText={setCalories}
              keyboardType="numeric"
              placeholder="2560"
            />
          </View>
          
          <View style={styles.goalRow}>
            <Text style={styles.goalLabel}>Water</Text>
            <Text style={styles.goalValue}>{water} fl. oz.</Text>
          </View>
        </View>

        {/* Macros */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Macros</Text>
          
          <View style={styles.goalRow}>
            <Text style={styles.goalLabel}>Protein</Text>
            <Text style={styles.goalValue}>{protein} grams</Text>
          </View>
          
          <View style={styles.goalRow}>
            <Text style={styles.goalLabel}>Fats</Text>
            <Text style={styles.goalValue}>{fats} grams</Text>
          </View>
          
          <View style={styles.goalRow}>
            <Text style={styles.goalLabel}>Carbohydrates</Text>
            <Text style={styles.goalValue}>{carbs} grams</Text>
          </View>
        </View>

        {/* Micronutrients */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Micronutrients</Text>
          <TouchableOpacity style={styles.addButton}>
            <Text style={styles.addButtonText}>Add Goal +</Text>
          </TouchableOpacity>
        </View>

        {/* Reset Button */}
        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Ionicons name="refresh" size={20} color="#FF6B9D" />
          <Text style={styles.resetButtonText}>Reset to Suggested Goals</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default EditGoalsScreen;

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
  section: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  goalLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  goalValue: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  goalInput: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    textAlign: 'right',
    minWidth: 80,
  },
  addButton: {
    backgroundColor: '#FF6B9D',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FF6B9D',
    marginTop: 20,
  },
  resetButtonText: {
    color: '#FF6B9D',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
