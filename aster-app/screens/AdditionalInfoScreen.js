import { SafeAreaView } from 'react-native-safe-area-context';
﻿import React, { useMemo, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons'
import { useOnboardingGuard } from '../utils/useOnboardingGuard'
import { useOnboarding } from '../src/context/OnboardingContext'

const OPTION_VALUES = ['Yes', 'No', 'Prefer not to say']
const CONDITION_CHOICES = ['No', 'Prefer not to say']

const AdditionalInfoScreen = ({ navigation }) => {
  const { updateAdditionalInfo } = useOnboarding()
  const [unusualBleeding, setUnusualBleeding] = useState(null)
  const [fertileWindowIntercourse, setFertileWindowIntercourse] = useState(null)
  const [conditionsChoice, setConditionsChoice] = useState(null)
  const [conditionsText, setConditionsText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useOnboardingGuard(navigation)

  const canContinue = useMemo(() => {
    if (!unusualBleeding || !fertileWindowIntercourse) return false
    if (conditionsChoice === 'No' || conditionsChoice === 'Prefer not to say') return true
    return conditionsText.trim().length > 0
  }, [unusualBleeding, fertileWindowIntercourse, conditionsChoice, conditionsText])

  const handleConditionsChoice = (choice) => {
    setConditionsChoice(choice)
    if (choice === 'No' || choice === 'Prefer not to say') {
      setConditionsText('')
    }
  }

  const normalizeConditions = () => {
    if (conditionsChoice === 'No') return 'none'
    if (conditionsChoice === 'Prefer not to say') return 'prefer_not_to_say'
    return conditionsText.trim()
  }

  const handleContinue = async () => {
    const promptIncomplete = !canContinue
    if (promptIncomplete || submitting) {
      if (promptIncomplete) {
        Alert.alert('Almost there', 'Please answer each question or choose "Prefer not to say".')
      }
      return
    }

    setSubmitting(true)
    updateAdditionalInfo({
      unusualBleeding,
      fertileWindowIntercourse,
      conditionsChoice,
      conditionsText,
    })
    setSubmitting(false)
    navigation.navigate('ReminderSetup')
  }

  const handleSkip = () => {
    navigation.navigate('ReminderSetup')
  }

  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack()
    } else {
      navigation.navigate('OptionalCycleHistory')
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backButton} activeOpacity={0.7} onPress={goBack}>
              <Ionicons name="chevron-back" size={24} color="#4B117B" />
            </TouchableOpacity>
          </View>

          <View style={styles.textBlock}>
            <Text style={styles.subtitle}>Tell me about you</Text>
            <Text style={styles.title}>Additional Information</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.question}>
              Do you face any unusual bleeding other than your menstrual period?
            </Text>
            <View style={styles.optionsColumn}>
              {OPTION_VALUES.map((label, index) => {
                const selected = unusualBleeding === label
                const isLast = index === OPTION_VALUES.length - 1
                return (
                  <TouchableOpacity
                    key={label}
                    style={[
                      styles.optionButton,
                      selected && styles.optionButtonSelected,
                      isLast && styles.optionButtonLast,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => setUnusualBleeding(label)}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.question}>
              Do you have intercourse during your fertile window?
            </Text>
            <View style={styles.optionsColumn}>
              {OPTION_VALUES.map((label, index) => {
                const selected = fertileWindowIntercourse === label
                const isLast = index === OPTION_VALUES.length - 1
                return (
                  <TouchableOpacity
                    key={label}
                    style={[
                      styles.optionButton,
                      selected && styles.optionButtonSelected,
                      isLast && styles.optionButtonLast,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => setFertileWindowIntercourse(label)}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.question}>
              Are there any other medical conditions you'd like to mention?
            </Text>
            <TextInput
              value={conditionsText}
              onChangeText={(value) => {
                setConditionsText(value)
                if (value.trim().length > 0) {
                  setConditionsChoice(null)
                }
              }}
              placeholder="Type here..."
              placeholderTextColor="#9A89C8"
              style={styles.textInput}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.optionsColumn}>
              {CONDITION_CHOICES.map((label, index) => {
                const selected = conditionsChoice === label
                const isLast = index === CONDITION_CHOICES.length - 1
                return (
                  <TouchableOpacity
                    key={label}
                    style={[
                      styles.optionButton,
                      selected && styles.optionButtonSelected,
                      isLast && styles.optionButtonLast,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => handleConditionsChoice(label)}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.cta,
              (!canContinue || submitting) && styles.ctaDisabled,
            ]}
            activeOpacity={0.85}
            onPress={handleContinue}
            disabled={!canContinue || submitting}
          >
            <Text style={styles.ctaText}>{submitting ? 'Saving...' : 'Continue'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EDE5F7',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
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
  textBlock: {
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4B117B',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F103B',
  },
  card: {
    backgroundColor: '#F8F2FF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E1656',
    lineHeight: 22,
    marginBottom: 16,
  },
  optionsColumn: {
  },
  optionButton: {
    backgroundColor: '#E8DFFF',
    borderRadius: 22,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  optionButtonSelected: {
    backgroundColor: '#4B117B',
  },
  optionButtonLast: {
    marginBottom: 0,
  },
  optionText: {
    fontSize: 16,
    color: '#4B117B',
    fontWeight: '600',
  },
  optionTextSelected: {
    color: '#FFFFFF',
  },
  textInput: {
    minHeight: 96,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#EFE4FF',
    color: '#2E1656',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
  },
  cta: {
    backgroundColor: '#4B117B',
    borderRadius: 28,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: {
    backgroundColor: '#C8B7EB',
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

export default AdditionalInfoScreen
