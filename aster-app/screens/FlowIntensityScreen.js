// screens/FlowIntensityScreen.js
import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { useNavigation } from '@react-navigation/native'

export default function FlowIntensityScreen() {
  const navigation = useNavigation()

  const typicalDays = 6 // This can be dynamic later
  const [flowRatings, setFlowRatings] = useState(Array(typicalDays).fill(null))

  const updateRating = (dayIndex, rating) => {
    const updated = [...flowRatings]
    updated[dayIndex] = rating
    setFlowRatings(updated)
  }

  const handleContinue = () => {
    if (flowRatings.includes(null)) {
      alert('Please rate each day from 1 to 3')
      return
    }

    console.log('Flow ratings:', flowRatings)

    // Optionally save to Supabase here

    navigation.navigate('OptionalCycleHistory')
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Flow intensity</Text>
      <Text style={styles.subtitle}>Rate flow intensity for each day (1 = light, 3 = heavy)</Text>

      {flowRatings.map((rating, i) => (
        <View key={i} style={styles.dayRow}>
          <Text style={styles.dayLabel}>Day {i + 1}</Text>
          <View style={styles.ratingGroup}>
            {[1, 2, 3].map(value => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.ratingCircle,
                  rating === value && styles.selectedCircle,
                ]}
                onPress={() => updateRating(i, value)}
              >
                <Text
                  style={[
                    styles.ratingText,
                    rating === value && styles.selectedText,
                  ]}
                >
                  {value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Continue →</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('OptionalCycleHistory')}>
        <Text style={styles.skipText}>I’m not sure</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#fdf6f3',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    color: '#555',
  },
  dayRow: {
    marginBottom: 20,
  },
  dayLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: '#444',
  },
  ratingGroup: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  ratingCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedCircle: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  ratingText: {
    fontSize: 16,
    color: '#333',
  },
  selectedText: {
    color: '#fff',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 20,
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
  },
  skipText: {
    color: '#777',
    fontSize: 14,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
})
