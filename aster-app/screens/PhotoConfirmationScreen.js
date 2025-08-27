import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const PhotoConfirmationScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { image } = route.params;

  const handleAnalyzePhoto = () => {
    // Mock analysis data for demo
    const mockAnalysisData = {
      name: 'Grilled Salmon Bowl',
      description: 'Lightly grilled salmon with quinoa, roasted vegetables, and a lemon and herb dressing.',
      calories: 550,
      macros: {
        protein: '32g',
        carbs: '32g',
        fats: '32g'
      },
      ingredients: [
        { name: 'Atlantic Salmon 150g', quantity: '150g' },
        { name: 'Quinoa 150g', quantity: '150g' },
        { name: 'Broccoli 150g', quantity: '150g' },
        { name: 'Asparagus 150g', quantity: '150g' },
        { name: 'Lemon and Herb Sauce 150g', quantity: '150g' }
      ],
      micronutrients: [
        { name: 'Vitamin D', value: '0.05 mg' },
        { name: 'Omega-3', value: '0.05 mg' },
        { name: 'Iron', value: '0.05 mg' }
      ],
      servingSize: '1 serving',
      mealType: 'Dinner',
      weight: '350 g'
    };

    navigation.navigate('NutritionSummary', {
      photoUri: image,
      analysisData: mockAnalysisData
    });
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
      <TouchableOpacity style={styles.analyzeButton} onPress={handleAnalyzePhoto}>
        <Text style={styles.analyzeButtonText}>Analyze This Photo</Text>
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
});
