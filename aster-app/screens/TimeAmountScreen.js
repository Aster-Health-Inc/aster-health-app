import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { log, warn, error } from '../utils/CrashLogger';

log('User pressed button', { id: 42 });
warn('Slow API response');
error('Login failed');
const TimeAmountScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { foodName, weight, calories, protein, carbs, fats } = route.params || {};

  const [selectedTime, setSelectedTime] = useState(new Date());
  const [amount, setAmount] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleTimeChange = (event, date) => {
    setShowTimePicker(false);
    if (date) {
      setSelectedTime(date);
    }
  };

  const handleSave = () => {
    // Here you would typically save the time and amount data
    navigation.goBack();
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nutrition Log Opening</Text>
        <TouchableOpacity onPress={handleSave}>
          <Ionicons name="checkmark" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Time Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Time</Text>
          <TouchableOpacity 
            style={styles.timeInput} 
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={styles.timeText}>{formatTime(selectedTime)}</Text>
            <Ionicons name="time" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Food Name Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Enter food name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter food name"
            value={foodName || ''}
            onChangeText={() => {}}
            editable={false}
          />
        </View>

        {/* Amount Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Amount</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Ex. 100"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />
        </View>

        {showTimePicker && (
          <DateTimePicker
            value={selectedTime}
            mode="time"
            display="default"
            onChange={handleTimeChange}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default TimeAmountScreen;

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
  inputGroup: {
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
  },
  timeText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    backgroundColor: '#f8f9fa',
  },
});
