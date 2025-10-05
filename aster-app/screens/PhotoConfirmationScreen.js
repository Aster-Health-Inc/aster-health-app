import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { analyzeFood } from '../services/geminiService';
import { log, warn, error } from '../utils/CrashLogger';

log('User pressed button', { id: 42 });
warn('Slow API response');
error('Login failed');
const PhotoConfirmationScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { image, base64, selectedDate } = route.params;
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyzePhoto = async () => {
    if (!base64) {
      Alert.alert('Error', 'Image data not available for analysis');
      return;
    }

    setAnalyzing(true);
    try {
      const nutritionData = await analyzeFood(base64);
      
      // Convert Gemini response to match existing NutritionSummaryScreen format
      const analysisData = {
        name: nutritionData.food_name,
        description: nutritionData.description,
        calories: nutritionData.calories,
        macros: {
          protein: nutritionData.protein,
          carbs: nutritionData.carbohydrates,
          fats: nutritionData.fat
        },
        ingredients: nutritionData.ingredients.map(ing => ({
          name: ing.name,
          quantity: ing.amount
        })),
        micronutrients: Object.entries(nutritionData.micronutrients).map(([key, value]) => ({
          name: key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value: value
        })),
        servingSize: nutritionData.serving_info.servings,
        mealType: nutritionData.serving_info.type,
        weight: nutritionData.serving_info.weight
      };

      navigation.navigate('NutritionSummary', {
        photoUri: image,
        analysisData: analysisData,
        geminiData: nutritionData, // Keep original format for database saving
        selectedDate: selectedDate || new Date()
      });
    } catch (error) {
      Alert.alert('Analysis Failed', error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRetake = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Photo</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Photo */}
        <View style={styles.photoContainer}>
          <Image source={{ uri: image }} style={styles.photo} />
          <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
            <Text style={styles.retakeButtonText}>Retake</Text>
          </TouchableOpacity>
        </View>

        {/* Photo Quality */}
        <View style={styles.qualityContainer}>
          <View style={styles.qualityCheck}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.qualityText}>Excellent, ready for analysis</Text>
          </View>
        </View>
      </ScrollView>

      {/* Analyze Button */}
      <TouchableOpacity 
        style={[styles.analyzeButton, analyzing && styles.analyzeButtonDisabled]} 
        onPress={handleAnalyzePhoto}
        disabled={analyzing}
      >
        {analyzing ? (
          <View style={styles.analyzingContainer}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.analyzeButtonText}>Analyzing...</Text>
          </View>
        ) : (
          <Text style={styles.analyzeButtonText}>Analyze This Photo</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default PhotoConfirmationScreen;

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
  photoContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  photo: {
    width: '100%',
    height: 300,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  retakeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#ff4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  qualityContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  qualityCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qualityText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '500',
  },
  analyzeButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FF6B9D',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  analyzeButtonDisabled: {
    backgroundColor: '#ccc',
  },
  analyzingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
