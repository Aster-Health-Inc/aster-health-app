import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { analyzeFood } from '../services/geminiService';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKGROUND = '#E6E0F3';
const SURFACE = '#FFFFFF';
const ACCENT = '#4B117B';

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
      <View style={styles.header}>
        <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={22} color="#4A4A4A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Photo</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.photoContainer}>
          <Image source={{ uri: image }} style={styles.photo} />
          <TouchableOpacity style={styles.retakeButton} onPress={handleRetake} activeOpacity={0.85}>
            <Text style={styles.retakeButtonText}>Retake</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.qualityCard}>
          <Text style={styles.sectionTitle}>Photo Quality</Text>
          <View style={styles.qualityRow}>
            <Ionicons name="checkmark-circle" size={18} color="#3CB371" />
            <Text style={styles.qualityText}>Excellent, ready for analysis</Text>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.primaryButton, analyzing && styles.primaryButtonDisabled]}
        onPress={handleAnalyzePhoto}
        disabled={analyzing}
        activeOpacity={0.85}
      >
        {analyzing ? (
          <View style={styles.analyzingContainer}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.primaryButtonText}>Analyzing...</Text>
          </View>
        ) : (
          <Text style={styles.primaryButtonText}>Analyze This Photo</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default PhotoConfirmationScreen;

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
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#2E2E2E',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    paddingTop: 12,
  },
  photoContainer: {
    position: 'relative',
    marginBottom: 18,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#C4B9DF',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  photo: {
    width: '100%',
    height: 300,
    backgroundColor: '#f0f0f0',
  },
  retakeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  qualityCard: {
    backgroundColor: SURFACE,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#C4B9DF',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
    marginBottom: 10,
  },
  qualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qualityText: {
    fontSize: 14,
    color: '#4B4B4B',
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
  analyzingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
