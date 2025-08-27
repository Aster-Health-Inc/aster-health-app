import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { supabase } from '../lib/supabase'

export default function FlowIntensityScreen() {
  const navigation = useNavigation()
  const typicalDays = 6
  const [flowRatings, setFlowRatings] = useState(Array(typicalDays).fill(null))

  const intensityLabels = {
    1: 'light',
    2: 'medium',
    3: 'heavy'
  }

  const updateRating = (dayIndex, rating) => {
    const updated = [...flowRatings]
    updated[dayIndex] = rating
    setFlowRatings(updated)
  }

  const handleContinue = async () => {
    if (flowRatings.includes(null)) {
      alert('Please rate each day as light, medium, or heavy')
      return
    }

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      const entries = flowRatings.map((intensity, index) => ({
        user_id: user.id,
        day_number: index + 1,
        intensity, // save numeric value (1 = light, 2 = medium, 3 = heavy)
      }))

      const { error: insertError } = await supabase.from('flow_intensity_logs').insert(entries)

      if (insertError) {
        console.log('❌ Insert error:', insertError)
        alert('Something went wrong saving flow ratings.')
      } else {
        console.log('✅ Flow ratings saved:', entries)
        navigation.navigate('OptionalCycleHistory')
      }
    } catch (err) {
      console.log('❌ Unexpected error:', err)
      alert('Unexpected error. Try again.')
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Flow Intensity</Text>
      <Text style={styles.subtitle}>Rate the intensity for each day of your period</Text>

      {flowRatings.map((rating, i) => (
        <View key={i} style={styles.dayRow}>
          <Text style={styles.dayLabel}>Day {i + 1}</Text>
          <View style={styles.ratingGroup}>
            {[1, 2, 3].map(value => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.ratingBox,
                  rating === value && styles.selectedBox,
                ]}
                onPress={() => updateRating(i, value)}
              >
                <Text
                  style={[
                    styles.ratingText,
                    rating === value && styles.selectedText,
                  ]}
                >
                  {intensityLabels[value]}
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
    backgroundColor: '#FFFFFF',
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
  ratingBox: {
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#999',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
    backgroundColor: '#fff',
  },
  selectedBox: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  ratingText: {
    fontSize: 14,
    color: '#333',
    textTransform: 'capitalize',
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
