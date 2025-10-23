import React, { useMemo, useState } from 'react'
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'

const DAYS = 6
const INTENSITY_LEVELS = [1, 2, 3]

const intensityColors = {
  idle: '#D6CBEF',
  selected: '#4B117B',
  outline: '#8D73C9',
}

const FlowIntensityScreen = ({ navigation }) => {
  const [ratings, setRatings] = useState(Array(DAYS).fill(null))
  const isComplete = useMemo(() => ratings.slice(0, 4).every((value) => value !== null), [ratings])

  const handleSelect = (dayIndex, intensity) => {
    setRatings((prev) => {
      const next = [...prev]
      next[dayIndex] = prev[dayIndex] === intensity ? null : intensity
      return next
    })
  }

  const handleContinue = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user?.id) throw userError || new Error('Missing user')

      const entries = ratings
        .map((intensity, index) => ({
          user_id: user.id,
          day_number: index + 1,
          intensity,
        }))
        .filter((entry) => entry.intensity !== null)

      if (entries.length < 4) {
        Alert.alert('Almost there', 'Please rate at least the first four days before continuing.')
        return
      }

      const { error: insertError } = await supabase.from('flow_intensity_logs').insert(entries)
      if (insertError) throw insertError

      navigation.navigate('OptionalCycleHistory')
    } catch (error) {
      console.log('[warn] flowIntensity submit error:', error)
      Alert.alert('Error', 'We could not save your flow intensity. Please try again.')
    }
  }

  const handleSkip = () => {
    navigation.navigate('OptionalCycleHistory')
  }

  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack()
    } else {
      navigation.navigate('CycleDetails')
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.7} onPress={goBack}>
            <Ionicons name="chevron-back" size={24} color="#4B117B" />
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>Tell me about your period!</Text>
        <Text style={styles.title}>Flow Intensity</Text>

        <Text style={styles.instructions}>
          For each day of your period, rate flow intensity from 1 (light) to 3 (heavy).
        </Text>

        <View style={styles.legendRow}>
          <View style={styles.legendSpacer} />
          {INTENSITY_LEVELS.map((level) => (
            <Text key={level} style={styles.legendLabel}>
              {level}
            </Text>
          ))}
        </View>

        {ratings.map((selectedIntensity, dayIndex) => (
          <View key={dayIndex} style={styles.dayRow}>
            <Text style={styles.dayLabel}>Day {dayIndex + 1}</Text>
            <View style={styles.dayOptions}>
              {INTENSITY_LEVELS.map((level) => {
                const isSelected = selectedIntensity === level
                return (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.intensityButton,
                      isSelected ? styles.intensityButtonSelected : styles.intensityButtonIdle,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => handleSelect(dayIndex, level)}
                  >
                    <Ionicons
                      name="water"
                      size={20}
                      color={isSelected ? '#FFFFFF' : intensityColors.outline}
                    />
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.cta, !isComplete && styles.ctaIncomplete]}
          activeOpacity={0.85}
          onPress={handleContinue}
          disabled={!isComplete}
        >
          <Text style={styles.ctaText}>Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EDE5F7',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2D4F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4B117B',
    marginBottom: 6,
    textAlign: 'left',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F103B',
    marginBottom: 16,
    textAlign: 'left',
  },
  instructions: {
    fontSize: 14,
    color: '#5E4A82',
    lineHeight: 20,
    marginBottom: 24,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  legendSpacer: {
    width: 68,
  },
  legendLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    color: '#4B117B',
    fontWeight: '600',
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dayLabel: {
    width: 68,
    fontSize: 16,
    color: '#4B117B',
    fontWeight: '600',
  },
  dayOptions: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  intensityButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intensityButtonIdle: {
    backgroundColor: '#F1E7FF',
    borderColor: intensityColors.outline,
  },
  intensityButtonSelected: {
    backgroundColor: intensityColors.selected,
    borderColor: intensityColors.selected,
  },
  cta: {
    marginTop: 28,
    backgroundColor: '#4B117B',
    borderRadius: 28,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaIncomplete: {
    backgroundColor: '#C1B1E4',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  skipText: {
    marginTop: 12,
    fontSize: 14,
    color: '#4B117B',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
})

export default FlowIntensityScreen
