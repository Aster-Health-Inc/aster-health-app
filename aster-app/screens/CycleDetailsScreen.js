import React, { useRef, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Ionicons } from '@expo/vector-icons'

import { supabase } from '../lib/supabase'
import { useOnboardingGuard } from '../utils/useOnboardingGuard'

const DEFAULT_LAST_PERIOD = new Date()
const MAX_DATE = new Date()

const formatDate = (date) =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const sanitizeNumber = (value, maxLength = 2) => value.replace(/[^0-9]/g, '').slice(0, maxLength)

const CycleDetailsScreen = ({ navigation }) => {
  const [lastPeriod, setLastPeriod] = useState(null)
  const [tempLastPeriod, setTempLastPeriod] = useState(DEFAULT_LAST_PERIOD)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [cycleLength, setCycleLength] = useState('')
  const [periodLength, setPeriodLength] = useState('')

  const periodLengthRef = useRef(null)

  useOnboardingGuard(navigation)

  const isFormValid =
    !!lastPeriod &&
    !!cycleLength &&
    !!periodLength &&
    Number.parseInt(cycleLength, 10) > 0 &&
    Number.parseInt(periodLength, 10) > 0

  const openDatePicker = () => {
    setTempLastPeriod(lastPeriod || DEFAULT_LAST_PERIOD)
    setShowDatePicker(true)
  }

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      if (event.type === 'set' && selectedDate) {
        setLastPeriod(selectedDate)
      }
      setShowDatePicker(false)
    } else if (selectedDate) {
      setTempLastPeriod(selectedDate)
    }
  }

  const confirmDateIOS = () => {
    setLastPeriod(tempLastPeriod)
    setShowDatePicker(false)
  }

  const cancelDateIOS = () => setShowDatePicker(false)

  const handleContinue = async () => {
    if (!isFormValid) {
      Alert.alert('Missing info', 'Please complete all fields before continuing.')
      return
    }

    const numericCycle = Number.parseInt(cycleLength, 10)
    const numericPeriod = Number.parseInt(periodLength, 10)

    if (Number.isNaN(numericCycle) || Number.isNaN(numericPeriod)) {
      Alert.alert('Invalid info', 'Please enter valid numbers for cycle and period length.')
      return
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user?.id) throw userError || new Error('Missing user')

      const formattedDate = lastPeriod.toISOString().split('T')[0]

      await supabase
        .from('periods')
        .upsert([{ user_id: user.id, start_date: formattedDate }], {
          onConflict: 'user_id,start_date',
        })

      await supabase
        .from('users')
        .upsert(
          [
            {
              id: user.id,
              email: user.email ?? null,
              average_cycle_length: numericCycle,
              average_period_length: numericPeriod,
            },
          ],
          { onConflict: 'id' },
        )

      navigation.navigate('FlowIntensity')
    } catch (error) {
      console.log('[warn] cycleDetails submit error:', error)
      Alert.alert(
        'Saved with issues',
        'We had trouble storing your details, but you can continue and update them later.',
        [{ text: 'Continue', onPress: () => navigation.navigate('FlowIntensity') }],
      )
    }
  }

  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack()
    } else {
      navigation.navigate('BasicInfo')
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        >
          <View style={styles.container}>
            <View style={styles.headerRow}>
              <TouchableOpacity style={styles.backButton} activeOpacity={0.7} onPress={goBack}>
                <Ionicons name="chevron-back" size={24} color="#4B117B" />
              </TouchableOpacity>
            </View>

            <View style={styles.textBlock}>
              <Text style={styles.subtitle}>Let's get to know you!</Text>
              <Text style={styles.title}>When and how Long . . .</Text>
            </View>

            <View style={styles.card}>
              <TouchableOpacity
                style={[styles.field, styles.fieldRow]}
                activeOpacity={0.85}
                onPress={openDatePicker}
              >
                <Text style={styles.fieldLabel}>Last period</Text>
                <Text style={[styles.valueText, !lastPeriod && styles.placeholderText]}>
                  {lastPeriod ? formatDate(lastPeriod) : 'Select date'}
                </Text>
              </TouchableOpacity>

              <View style={[styles.field, styles.fieldRow]}>
                <Text style={styles.fieldLabel}>Cycle length</Text>
                <View style={[styles.inputField, styles.inputWithUnit]}>
                  <TextInput
                    value={cycleLength}
                    onChangeText={(value) => setCycleLength(sanitizeNumber(value))}
                    style={[styles.textInput, styles.numericInput]}
                    keyboardType="number-pad"
                    returnKeyType="next"
                    maxLength={2}
                    onSubmitEditing={() => periodLengthRef.current?.focus()}
                  />
                  <View style={styles.unitBadge}>
                    <Text style={styles.unitBadgeText}>days</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.field, styles.lastField, styles.fieldRow]}>
                <Text style={styles.fieldLabel}>Period length</Text>
                <View style={[styles.inputField, styles.inputWithUnit]}>
                  <TextInput
                    ref={periodLengthRef}
                    value={periodLength}
                    onChangeText={(value) => setPeriodLength(sanitizeNumber(value))}
                    style={[styles.textInput, styles.numericInput]}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    maxLength={2}
                    onSubmitEditing={handleContinue}
                  />
                  <View style={styles.unitBadge}>
                    <Text style={styles.unitBadgeText}>days</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.detailsText}>
              <Text style={styles.detailHeading}>Cycle Length</Text>
              <Text style={styles.detailBody}>
                Cycle Length is the number of days between the first day of one period to the first
                day of the next.
              </Text>
              <Text style={[styles.detailHeading, { marginTop: 16 }]}>Period Length</Text>
              <Text style={styles.detailBody}>
                Period Length is the number of days you experience menstrual bleeding within your
                typical cycle.
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.cta, !isFormValid && styles.ctaDisabled]}
            activeOpacity={0.85}
            onPress={handleContinue}
            disabled={!isFormValid}
          >
            <Text style={styles.ctaText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          mode="date"
          value={lastPeriod || DEFAULT_LAST_PERIOD}
          maximumDate={MAX_DATE}
          onChange={handleDateChange}
        />
      )}

      {showDatePicker && Platform.OS === 'ios' && (
        <Modal transparent animationType="fade" onRequestClose={cancelDateIOS}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <DateTimePicker
                mode="date"
                display="spinner"
                maximumDate={MAX_DATE}
                value={tempLastPeriod}
                onChange={handleDateChange}
                style={styles.datePicker}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalButton} onPress={cancelDateIOS}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalConfirm]}
                  onPress={confirmDateIOS}
                >
                  <Text style={[styles.modalButtonText, styles.modalConfirmText]}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 24,
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
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4B117B',
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F103B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 20,
    shadowColor: '#2A1B47',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 6,
  },
  field: {
    marginBottom: 20,
    minHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E3DAF5',
    paddingBottom: 12,
    justifyContent: 'center',
  },
  lastField: {
    marginBottom: 0,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldLabel: {
    flexShrink: 0,
    fontSize: 14,
    fontWeight: '600',
    color: '#7F6AAE',
  },
  textInput: {
    fontSize: 18,
    color: '#2E1C4F',
    paddingVertical: 0,
    textAlign: 'right',
    flex: 1,
  },
  numericInput: {
    paddingRight: 4,
  },
  inputField: {
    flex: 1,
    marginLeft: 12,
  },
  inputWithUnit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  valueText: {
    fontSize: 18,
    color: '#2E1C4F',
    textAlign: 'right',
    flex: 1,
  },
  placeholderText: {
    color: '#B6A9D3',
  },
  unitBadge: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F0E8FF',
  },
  unitBadgeText: {
    color: '#4B117B',
    fontWeight: '600',
    fontSize: 12,
  },
  detailsText: {
    marginTop: 28,
  },
  detailHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B117B',
  },
  detailBody: {
    fontSize: 13,
    lineHeight: 20,
    color: '#5E4A82',
    marginTop: 6,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  cta: {
    width: '100%',
    backgroundColor: '#4B117B',
    borderRadius: 28,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: {
    backgroundColor: '#C8BEDB',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
  },
  datePicker: {
    backgroundColor: '#FFF',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    marginTop: 12,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalButtonText: {
    fontSize: 16,
    color: '#7F6AAE',
    fontWeight: '600',
  },
  modalConfirm: {
    backgroundColor: '#4B117B',
    borderRadius: 18,
    marginLeft: 12,
  },
  modalConfirmText: {
    color: '#FFFFFF',
  },
})

export default CycleDetailsScreen
