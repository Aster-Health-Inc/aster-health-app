import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
const MealLogScreen = () => {
  const navigation = useNavigation();

  const mealTypes = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];

  const handleMealTypeSelect = (mealType) => {
    navigation.navigate('AddFoodScreen', { mealType });
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const handleUnavailable = () => {
    Alert.alert('Coming soon', 'This feature is not available yet.');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Modal Header */}
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={handleClose}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.modalTitle}>Select Meal Type</Text>
        <TouchableOpacity onPress={handleUnavailable}>
          <Ionicons name="arrow-up" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Meal Options */}
      <View style={styles.mealOptions}>
        {mealTypes.map((mealType) => (
          <TouchableOpacity
            key={mealType}
            style={styles.mealOption}
            onPress={() => handleMealTypeSelect(mealType)}
          >
            <Text style={styles.mealOptionText}>{mealType}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
};

export default MealLogScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: '90%',
    maxWidth: 350,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  mealOptions: {
    backgroundColor: '#fff',
    width: '90%',
    maxWidth: 350,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingBottom: 20,
  },
  mealOption: {
    backgroundColor: '#f8f9fa',
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  mealOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
});
