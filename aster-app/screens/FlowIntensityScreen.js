import React, { useEffect, useMemo, useState } from 'react'
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useOnboardingGuard } from '../utils/useOnboardingGuard'
import { useOnboarding } from '../src/context/OnboardingContext'

const DEFAULT_DAYS = 6
const INTENSITY_LEVELS = [1, 2, 3]

const intensityColors = {
  idle: '#D6CBEF',
  selected: '#4B117B',
  outline: '#8D73C9',
}

const FlowIntensityScreen = ({ navigation }) => {
  const { state, setFlowIntensity } = useOnboarding()
  const parsedPeriodLength = Number.parseInt(state?.cycle?.averagePeriodLength, 10)
  const hasValidPeriodLength = !Number.isNaN(parsedPeriodLength) && parsedPeriodLength > 0

  // Number of flow days to show; fall back to a sensible default if the input is missing/invalid
  const totalDays = useMemo(() => {
    if (!hasValidPeriodLength) return DEFAULT_DAYS
    if (parsedPeriodLength > 4) return DEFAULT_DAYS
    return parsedPeriodLength
  }, [hasValidPeriodLength, parsedPeriodLength])

  // How many days must be rated before continuing
  const requiredDays = useMemo(() => {
    if (!hasValidPeriodLength) return 4
    if (parsedPeriodLength <= 3) return parsedPeriodLength
    if (parsedPeriodLength === 4) return 4
    return 4
  }, [hasValidPeriodLength, parsedPeriodLength])

  const [ratings, setRatings] = useState(Array(totalDays).fill(null))
  const isComplete = useMemo(
    () => ratings.slice(0, requiredDays).every((value) => value !== null),
    [ratings, requiredDays],
  )

  // Adjust ratings array if the number of days changes (e.g., different period length)
  useEffect(() => {
    setRatings((prev) => {
      if (prev.length === totalDays) return prev
      const next = Array(totalDays).fill(null)
      for (let i = 0; i < Math.min(prev.length, next.length); i += 1) {
        next[i] = prev[i]
      }
      return next
    })
  }, [totalDays])

  useOnboardingGuard(navigation)

  const handleSelect = (dayIndex, intensity) => {
    setRatings((prev) => {
      const next = [...prev]
      next[dayIndex] = prev[dayIndex] === intensity ? null : intensity
      return next
    })
  }

  const handleContinue = async () => {
    if (ratings.slice(0, requiredDays).some((v) => v === null)) {
      Alert.alert(
        'Almost there',
        `Please rate at least the first ${requiredDays} day${requiredDays > 1 ? 's' : ''} before continuing.`,
      )
      return
    }
    setFlowIntensity(ratings)
    navigation.navigate('OptionalCycleHistory')
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
