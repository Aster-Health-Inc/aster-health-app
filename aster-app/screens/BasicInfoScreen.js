import React, { useRef, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Keyboard,
  View,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'

import { supabase } from '../lib/supabase'
import { useOnboardingGuard } from '../utils/useOnboardingGuard'
import { useOnboarding } from '../src/context/OnboardingContext'

const DEFAULT_BIRTHDATE = new Date('2000-01-01')
const MAX_DATE = new Date()

const DEFAULT_HEIGHT_IMPERIAL = { feet: 5, inches: 6 }
const DEFAULT_HEIGHT_CM = 168
const DEFAULT_HEIGHT_METRIC = { meters: 1, centimeters: 68 }

const HEIGHT_ITEM_HEIGHT = 44
const HEIGHT_VISIBLE_ROWS = 5
const HEIGHT_PICKER_PADDING = HEIGHT_ITEM_HEIGHT * 2

const heightFeetOptions = Array.from({ length: 9 }, (_, i) => 4 + i) // 4ft - 12ft
const heightInchOptions = Array.from({ length: 12 }, (_, i) => i) // 0 - 11 in

const heightMeterOptions = [0, 1, 2]
const heightCmRemainderOptions = Array.from({ length: 100 }, (_, i) => i)

const lbsToKg = (lbs) => lbs / 2.2046226218
const kgToLbs = (kg) => kg * 2.2046226218
const inchesToCm = (inches) => inches * 2.54
const cmToInches = (cm) => cm / 2.54

const clamp = (n, min, max) => Math.min(Math.max(n, min), max)
const round0 = (n) => Math.round(n)
const round1 = (n) => Math.round(n * 10) / 10

const getAgeFromDate = (date) => {
  const today = new Date()
  let age = today.getFullYear() - date.getFullYear()
  const monthDiff = today.getMonth() - date.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age -= 1
  }
  return age.toString()
}

export default function BasicInfoScreen() {
  const navigation = useNavigation()
  const { updateProfile } = useOnboarding()

  const [name, setName] = useState('')
  const [birthdate, setBirthdate] = useState(null)
  const [tempBirthdate, setTempBirthdate] = useState(DEFAULT_BIRTHDATE)
  const [showDatePicker, setShowDatePicker] = useState(false)

  const [weightUnit, setWeightUnit] = useState('lbs')
  const [heightUnit, setHeightUnit] = useState('imperial')

  const [weight, setWeight] = useState('')

  const [heightFeet, setHeightFeet] = useState(null)
  const [heightInches, setHeightInches] = useState(null)

  const [heightCm, setHeightCm] = useState(null)
  const [heightMeters, setHeightMeters] = useState(null)
  const [heightCentimeters, setHeightCentimeters] = useState(null)

  const [showHeightPicker, setShowHeightPicker] = useState(false)

  const [tempHeightFeet, setTempHeightFeet] = useState(DEFAULT_HEIGHT_IMPERIAL.feet)
  const [tempHeightInches, setTempHeightInches] = useState(DEFAULT_HEIGHT_IMPERIAL.inches)

  const [tempHeightMeters, setTempHeightMeters] = useState(DEFAULT_HEIGHT_METRIC.meters)
  const [tempHeightCentimeters, setTempHeightCentimeters] = useState(DEFAULT_HEIGHT_METRIC.centimeters)

  const weightRef = useRef(null)
  const feetListRef = useRef(null)
  const inchListRef = useRef(null)

  const meterListRef = useRef(null)
  const cmRemainderListRef = useRef(null)

  useOnboardingGuard(navigation)

  const age = birthdate ? getAgeFromDate(birthdate) : ''

  const hasHeightImperial = heightFeet !== null && heightInches !== null
  const hasHeightMetric = heightMeters !== null && heightCentimeters !== null

  const sanitizeDigits = (value, maxLength = 4) => value.replace(/[^0-9]/g, '').slice(0, maxLength)

  const handleWeightChange = (value) => {
    const digitsOnly = sanitizeDigits(value, 3)
    setWeight(digitsOnly)
  }

  const toggleWeightUnit = (nextUnit) => {
    if (nextUnit === weightUnit) return
    const numeric = parseFloat(weight)
    if (!Number.isNaN(numeric) && numeric > 0) {
      const converted = nextUnit === 'kg' ? lbsToKg(numeric) : kgToLbs(numeric)
      setWeight(String(round0(converted)))
    }
    setWeightUnit(nextUnit)
  }

  const toggleHeightUnit = (nextUnit) => {
    if (nextUnit === heightUnit) return

    if (nextUnit === 'metric') {
      let totalCm = heightCm

      if ((totalCm === null || Number.isNaN(totalCm)) && hasHeightImperial) {
        const totalIn = heightFeet * 12 + heightInches
        totalCm = round0(inchesToCm(totalIn))
      }

      if (totalCm === null || Number.isNaN(totalCm)) totalCm = DEFAULT_HEIGHT_CM

      const m = Math.floor(totalCm / 100)
      const cm = totalCm % 100

      setHeightCm(totalCm)
      setHeightMeters(m)
      setHeightCentimeters(cm)
    }

    if (nextUnit === 'imperial') {
      let totalCm = heightCm
      if ((totalCm === null || Number.isNaN(totalCm)) && hasHeightMetric) {
        totalCm = heightMeters * 100 + heightCentimeters
      }
      if (totalCm === null || Number.isNaN(totalCm)) totalCm = DEFAULT_HEIGHT_CM

      const totalInRounded = round0(cmToInches(totalCm))
      const ft = Math.floor(totalInRounded / 12)
      const inch = totalInRounded % 12

      setHeightCm(totalCm)
      setHeightFeet(ft)
      setHeightInches(inch)
    }

    setHeightUnit(nextUnit)
  }

  const openHeightPicker = () => {
    Keyboard.dismiss()

    if (heightUnit === 'imperial') {
      const currentFeet = heightFeet ?? DEFAULT_HEIGHT_IMPERIAL.feet
      const currentInches = heightInches ?? DEFAULT_HEIGHT_IMPERIAL.inches
      setTempHeightFeet(currentFeet)
      setTempHeightInches(currentInches)
      setShowHeightPicker(true)

      setTimeout(() => {
        const feetIndex = Math.max(heightFeetOptions.indexOf(currentFeet), 0)
        const inchIndex = Math.max(heightInchOptions.indexOf(currentInches), 0)
        feetListRef.current?.scrollToOffset({
          offset: feetIndex * HEIGHT_ITEM_HEIGHT,
          animated: false,
        })
        inchListRef.current?.scrollToOffset({
          offset: inchIndex * HEIGHT_ITEM_HEIGHT,
          animated: false,
        })
      }, 0)
      return
    }

    let currentM = heightMeters
    let currentCm = heightCentimeters

    if (currentM === null || currentCm === null) {
      const totalCm = heightCm ?? DEFAULT_HEIGHT_CM
      currentM = Math.floor(totalCm / 100)
      currentCm = totalCm % 100
    }

    currentM = clamp(currentM, heightMeterOptions[0], heightMeterOptions[heightMeterOptions.length - 1])
    currentCm = clamp(currentCm, 0, 99)

    setTempHeightMeters(currentM)
    setTempHeightCentimeters(currentCm)
    setShowHeightPicker(true)

    setTimeout(() => {
      const mIndex = Math.max(heightMeterOptions.indexOf(currentM), 0)
      const cmIndex = Math.max(heightCmRemainderOptions.indexOf(currentCm), 0)

      meterListRef.current?.scrollToOffset({
        offset: mIndex * HEIGHT_ITEM_HEIGHT,
        animated: false,
      })
      cmRemainderListRef.current?.scrollToOffset({
        offset: cmIndex * HEIGHT_ITEM_HEIGHT,
        animated: false,
      })
    }, 0)
  }

  const closeHeightPicker = () => setShowHeightPicker(false)

  const confirmHeightPicker = () => {
    if (heightUnit === 'imperial') {
      setHeightFeet(tempHeightFeet)
      setHeightInches(tempHeightInches)

      const totalIn = tempHeightFeet * 12 + tempHeightInches
      const totalCm = round0(inchesToCm(totalIn))
      setHeightCm(totalCm)
      setHeightMeters(Math.floor(totalCm / 100))
      setHeightCentimeters(totalCm % 100)
    } else {
      const totalCm = tempHeightMeters * 100 + tempHeightCentimeters

      setHeightMeters(tempHeightMeters)
      setHeightCentimeters(tempHeightCentimeters)
      setHeightCm(totalCm)

      const totalInRounded = round0(cmToInches(totalCm))
      const ft = Math.floor(totalInRounded / 12)
      const inch = totalInRounded % 12
      setHeightFeet(ft)
      setHeightInches(inch)
    }

    setShowHeightPicker(false)
  }

  const handleFeetMomentumEnd = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.y / HEIGHT_ITEM_HEIGHT)
    const safeIndex = Math.min(Math.max(index, 0), heightFeetOptions.length - 1)
    setTempHeightFeet(heightFeetOptions[safeIndex])
  }

  const handleInchesMomentumEnd = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.y / HEIGHT_ITEM_HEIGHT)
    const safeIndex = Math.min(Math.max(index, 0), heightInchOptions.length - 1)
    setTempHeightInches(heightInchOptions[safeIndex])
  }

  const handleMetersMomentumEnd = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.y / HEIGHT_ITEM_HEIGHT)
    const safeIndex = Math.min(Math.max(index, 0), heightMeterOptions.length - 1)
    setTempHeightMeters(heightMeterOptions[safeIndex])
  }

  const handleCmRemainderMomentumEnd = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.y / HEIGHT_ITEM_HEIGHT)
    const safeIndex = Math.min(Math.max(index, 0), heightCmRemainderOptions.length - 1)
    setTempHeightCentimeters(heightCmRemainderOptions[safeIndex])
  }

  const openBirthdatePicker = () => {
    setTempBirthdate(birthdate || DEFAULT_BIRTHDATE)
    setShowDatePicker(true)
  }

  const handleBirthdateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      if (event.type === 'set' && selectedDate) {
        setBirthdate(selectedDate)
      }
      setShowDatePicker(false)
    } else if (selectedDate) {
      setTempBirthdate(selectedDate)
    }
  }

  const confirmBirthdateIOS = () => {
    setBirthdate(tempBirthdate)
    setShowDatePicker(false)
  }

  const cancelBirthdateIOS = () => {
    setShowDatePicker(false)
  }

  const handleSubmit = async () => {
    const hasHeight = hasHeightImperial || hasHeightMetric

    if (!name || !birthdate || !weight || !hasHeight) {
      Alert.alert('Please complete all fields before continuing.')
      return
    }

    const numericWeight = parseFloat(weight)
    if (Number.isNaN(numericWeight) || numericWeight <= 0) {
      Alert.alert('Please enter a valid weight.')
      return
    }

    const weightLbs =
      weightUnit === 'lbs'
        ? numericWeight
        : round1(kgToLbs(numericWeight))

    const weightKg =
      weightUnit === 'kg'
        ? numericWeight
        : round1(lbsToKg(numericWeight))

    let totalCm = heightCm
    if ((totalCm === null || Number.isNaN(totalCm)) && hasHeightMetric) {
      totalCm = heightMeters * 100 + heightCentimeters
    }
    if ((totalCm === null || Number.isNaN(totalCm)) && hasHeightImperial) {
      const totalIn = heightFeet * 12 + heightInches
      totalCm = round0(inchesToCm(totalIn))
    }

    if (totalCm === null || Number.isNaN(totalCm) || totalCm <= 0) {
      Alert.alert('Please select a valid height.')
      return
    }

    const totalInRounded = round0(cmToInches(totalCm))
    const ensuredFeet = Math.floor(totalInRounded / 12)
    const ensuredInches = totalInRounded % 12

    const ensuredMeters = Math.floor(totalCm / 100)
    const ensuredCentimeters = totalCm % 100

    updateProfile({
      name: name.trim(),
      birthdate,

      unitSystem: heightUnit === 'imperial' ? 'imperial' : 'metric',

      weightUnit,
      weightLbs: weightLbs.toString(),
      weightKg: weightKg.toString(),

      heightUnit,
      heightFeet: ensuredFeet,
      heightInches: ensuredInches,

      heightCm: round0(totalCm).toString(),
      heightMeters: ensuredMeters.toString(),
      heightCentimeters: ensuredCentimeters.toString(),
    })

    navigation.navigate('CycleDetails')
  }

  const handleBack = async () => {
    if (navigation.canGoBack()) {
      navigation.goBack()
      return
    }

    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.log('[warn] basicInfo back signOut error:', error)
    } finally {
      navigation.reset({
        index: 0,
        routes: [{ name: 'SignUp' }],
      })
    }
  }

  const heightDisplay =
    heightUnit === 'imperial'
      ? hasHeightImperial
        ? `${heightFeet}' ${heightInches}"`
        : '\u00A0'
      : hasHeightMetric
        ? `${heightMeters} m ${heightCentimeters} cm`
        : '\u00A0'

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
          contentContainerStyle={styles.avoidingContent}
        >
          <View style={styles.container}>
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={handleBack} activeOpacity={0.7} style={styles.backButton}>
                <Ionicons name="chevron-back" size={24} color="#4B117B" />
              </TouchableOpacity>
            </View>

            <View style={styles.textBlock}>
              <Text style={styles.subtitle}>Let's talk about you!</Text>
              <Text style={styles.title}>What is your . . .</Text>
            </View>

            <View style={styles.card}>
              <View style={[styles.field, styles.fieldRow]}>
                <Text style={styles.fieldLabel}>Preferred Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  style={[styles.textInput, styles.inputField]}
                  returnKeyType="next"
                  onSubmitEditing={() => weightRef.current?.focus()}
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.field, styles.fieldRow]}
                onPress={openBirthdatePicker}
              >
                <Text style={styles.fieldLabel}>Age</Text>
                <Text style={[styles.touchableValue, !age && styles.placeholderText]}>
                  {age || 'Enter Birthdate'}
                </Text>
              </TouchableOpacity>

              {/* Weight */}
              <View style={[styles.field, styles.fieldRow]}>
                <Text style={styles.fieldLabel}>Weight</Text>

                <View style={[styles.inputField, styles.inputWithUnit]}>
                  <TextInput
                    ref={weightRef}
                    value={weight}
                    onChangeText={handleWeightChange}
                    style={[styles.textInput, styles.weightInput]}
                    keyboardType="numeric"
                    returnKeyType="next"
                    maxLength={3}
                    onSubmitEditing={openHeightPicker}
                  />

                  <View style={styles.unitToggle}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => toggleWeightUnit('kg')}
                      style={[
                        styles.unitToggleOption,
                        weightUnit === 'kg' && styles.unitToggleOptionActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.unitToggleText,
                          weightUnit === 'kg' && styles.unitToggleTextActive,
                        ]}
                      >
                        kg
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => toggleWeightUnit('lbs')}
                      style={[
                        styles.unitToggleOption,
                        weightUnit === 'lbs' && styles.unitToggleOptionActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.unitToggleText,
                          weightUnit === 'lbs' && styles.unitToggleTextActive,
                        ]}
                      >
                        lbs
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Height */}
              <TouchableOpacity
                style={[styles.field, styles.lastField, styles.fieldRow]}
                activeOpacity={0.85}
                onPress={openHeightPicker}
              >
                <Text style={styles.fieldLabel}>Height</Text>

                <View style={[styles.inputField, styles.heightValueWrapper]}>
                  <Text
                    style={[
                      styles.touchableValue,
                      (heightUnit === 'imperial' ? !hasHeightImperial : !hasHeightMetric) &&
                        styles.placeholderText,
                    ]}
                  >
                    {(heightUnit === 'imperial' && !hasHeightImperial) ||
                    (heightUnit === 'metric' && !hasHeightMetric)
                      ? 'Set height'
                      : heightDisplay}
                  </Text>

                  <View style={styles.unitToggle}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => toggleHeightUnit('metric')}
                      style={[
                        styles.unitToggleOption,
                        heightUnit === 'metric' && styles.unitToggleOptionActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.unitToggleText,
                          heightUnit === 'metric' && styles.unitToggleTextActive,
                        ]}
                      >
                        m/cm
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => toggleHeightUnit('imperial')}
                      style={[
                        styles.unitToggleOption,
                        heightUnit === 'imperial' && styles.unitToggleOptionActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.unitToggleText,
                          heightUnit === 'imperial' && styles.unitToggleTextActive,
                        ]}
                      >
                        ft/in
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cta} onPress={handleSubmit} activeOpacity={0.85}>
            <Text style={styles.ctaText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={birthdate || DEFAULT_BIRTHDATE}
          mode="date"
          display="default"
          maximumDate={MAX_DATE}
          onChange={handleBirthdateChange}
        />
      )}

      {/* Height Picker */}
      {showHeightPicker && (
        <Modal transparent animationType="fade" onRequestClose={closeHeightPicker}>
          <View style={styles.modalOverlay}>
            <View style={styles.heightModal}>
              <Text style={styles.heightTitle}>
                {heightUnit === 'imperial' ? 'Select Height' : 'Select Height'}
              </Text>

              <View style={styles.heightPickerContainer}>
                <View style={styles.heightHighlight} pointerEvents="none" />

                {heightUnit === 'imperial' ? (
                  <View style={styles.heightPickerRow}>
                    <View style={styles.heightColumn}>
                      <FlatList
                        ref={feetListRef}
                        data={heightFeetOptions}
                        keyExtractor={(item) => `feet-${item}`}
                        snapToInterval={HEIGHT_ITEM_HEIGHT}
                        snapToAlignment="center"
                        bounces={false}
                        decelerationRate="fast"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.heightListContent}
                        getItemLayout={(_, index) => ({
                          length: HEIGHT_ITEM_HEIGHT,
                          offset: HEIGHT_ITEM_HEIGHT * index,
                          index,
                        })}
                        onMomentumScrollEnd={handleFeetMomentumEnd}
                        renderItem={({ item }) => {
                          const selected = item === tempHeightFeet
                          return (
                            <TouchableOpacity
                              style={styles.heightOption}
                              onPress={() => {
                                setTempHeightFeet(item)
                                const idx = heightFeetOptions.indexOf(item)
                                if (idx >= 0) {
                                  feetListRef.current?.scrollToOffset({
                                    offset: idx * HEIGHT_ITEM_HEIGHT,
                                    animated: true,
                                  })
                                }
                              }}
                            >
                              <Text
                                style={[
                                  styles.heightOptionText,
                                  selected && styles.heightOptionTextSelected,
                                ]}
                              >
                                {item}
                              </Text>
                            </TouchableOpacity>
                          )
                        }}
                      />
                    </View>

                    <Text style={styles.heightUnitLabel}>ft</Text>

                    <View style={styles.heightColumn}>
                      <FlatList
                        ref={inchListRef}
                        data={heightInchOptions}
                        keyExtractor={(item) => `inch-${item}`}
                        snapToInterval={HEIGHT_ITEM_HEIGHT}
                        snapToAlignment="center"
                        bounces={false}
                        decelerationRate="fast"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.heightListContent}
                        getItemLayout={(_, index) => ({
                          length: HEIGHT_ITEM_HEIGHT,
                          offset: HEIGHT_ITEM_HEIGHT * index,
                          index,
                        })}
                        onMomentumScrollEnd={handleInchesMomentumEnd}
                        renderItem={({ item }) => {
                          const selected = item === tempHeightInches
                          return (
                            <TouchableOpacity
                              style={styles.heightOption}
                              onPress={() => {
                                setTempHeightInches(item)
                                const idx = heightInchOptions.indexOf(item)
                                if (idx >= 0) {
                                  inchListRef.current?.scrollToOffset({
                                    offset: idx * HEIGHT_ITEM_HEIGHT,
                                    animated: true,
                                  })
                                }
                              }}
                            >
                              <Text
                                style={[
                                  styles.heightOptionText,
                                  selected && styles.heightOptionTextSelected,
                                ]}
                              >
                                {item}
                              </Text>
                            </TouchableOpacity>
                          )
                        }}
                      />
                    </View>

                    <Text style={styles.heightUnitLabel}>in</Text>
                  </View>
                ) : (
                  <View style={styles.heightPickerRow}>
                    <View style={styles.heightColumn}>
                      <FlatList
                        ref={meterListRef}
                        data={heightMeterOptions}
                        keyExtractor={(item) => `m-${item}`}
                        snapToInterval={HEIGHT_ITEM_HEIGHT}
                        snapToAlignment="center"
                        bounces={false}
                        decelerationRate="fast"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.heightListContent}
                        getItemLayout={(_, index) => ({
                          length: HEIGHT_ITEM_HEIGHT,
                          offset: HEIGHT_ITEM_HEIGHT * index,
                          index,
                        })}
                        onMomentumScrollEnd={handleMetersMomentumEnd}
                        renderItem={({ item }) => {
                          const selected = item === tempHeightMeters
                          return (
                            <TouchableOpacity
                              style={styles.heightOption}
                              onPress={() => {
                                setTempHeightMeters(item)
                                const idx = heightMeterOptions.indexOf(item)
                                if (idx >= 0) {
                                  meterListRef.current?.scrollToOffset({
                                    offset: idx * HEIGHT_ITEM_HEIGHT,
                                    animated: true,
                                  })
                                }
                              }}
                            >
                              <Text
                                style={[
                                  styles.heightOptionText,
                                  selected && styles.heightOptionTextSelected,
                                ]}
                              >
                                {item}
                              </Text>
                            </TouchableOpacity>
                          )
                        }}
                      />
                    </View>

                    <Text style={styles.heightUnitLabel}>m</Text>

                    <View style={styles.heightColumn}>
                      <FlatList
                        ref={cmRemainderListRef}
                        data={heightCmRemainderOptions}
                        keyExtractor={(item) => `cm-${item}`}
                        snapToInterval={HEIGHT_ITEM_HEIGHT}
                        snapToAlignment="center"
                        bounces={false}
                        decelerationRate="fast"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.heightListContent}
                        getItemLayout={(_, index) => ({
                          length: HEIGHT_ITEM_HEIGHT,
                          offset: HEIGHT_ITEM_HEIGHT * index,
                          index,
                        })}
                        onMomentumScrollEnd={handleCmRemainderMomentumEnd}
                        renderItem={({ item }) => {
                          const selected = item === tempHeightCentimeters
                          return (
                            <TouchableOpacity
                              style={styles.heightOption}
                              onPress={() => {
                                setTempHeightCentimeters(item)
                                const idx = heightCmRemainderOptions.indexOf(item)
                                if (idx >= 0) {
                                  cmRemainderListRef.current?.scrollToOffset({
                                    offset: idx * HEIGHT_ITEM_HEIGHT,
                                    animated: true,
                                  })
                                }
                              }}
                            >
                              <Text
                                style={[
                                  styles.heightOptionText,
                                  selected && styles.heightOptionTextSelected,
                                ]}
                              >
                                {item}
                              </Text>
                            </TouchableOpacity>
                          )
                        }}
                      />
                    </View>

                    <Text style={styles.heightUnitLabel}>cm</Text>
                  </View>
                )}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalButton} onPress={closeHeightPicker}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalConfirm]}
                  onPress={confirmHeightPicker}
                >
                  <Text style={[styles.modalButtonText, styles.modalConfirmText]}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {showDatePicker && Platform.OS === 'ios' && (
        <Modal transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <DateTimePicker
                value={tempBirthdate}
                mode="date"
                display="spinner"
                maximumDate={MAX_DATE}
                onChange={handleBirthdateChange}
                style={styles.datePicker}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalButton} onPress={cancelBirthdateIOS}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalConfirm]}
                  onPress={confirmBirthdateIOS}
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
  safeArea: { flex: 1, backgroundColor: '#EDE5F7' },
  flex: { flex: 1 },
  avoidingContent: { flexGrow: 1 },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 24 },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2D4F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: { marginBottom: 32, alignItems: 'flex-start' },
  subtitle: { fontSize: 16, fontWeight: '500', color: '#4B117B', marginBottom: 6, textAlign: 'left' },
  title: { fontSize: 28, fontWeight: '700', color: '#1F103B', textAlign: 'left' },
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
  lastField: { marginBottom: 0 },
  fieldRow: { flexDirection: 'row', alignItems: 'center' },
  fieldLabel: { flexShrink: 0, fontSize: 14, fontWeight: '600', color: '#7F6AAE' },
  textInput: { fontSize: 18, color: '#2E1C4F', paddingVertical: 0, textAlign: 'right', flex: 1 },
  inputField: { flex: 1, marginLeft: 12 },
  touchableValue: { fontSize: 18, color: '#2E1C4F', textAlign: 'right', flex: 1 },
  placeholderText: { color: '#B6A9D3' },
  inputWithUnit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },

  // left exactly as you had it (no change)
  weightInput: { paddingRight: 0.09 },

  unitToggle: {
    flexDirection: 'row',
    backgroundColor: '#F0E8FF',
    borderRadius: 16,
    padding: 2,
    marginLeft: 8,
  },
  unitToggleOption: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  unitToggleOptionActive: { backgroundColor: '#FFFFFF' },
  unitToggleText: { color: '#7F6AAE', fontWeight: '700', fontSize: 12 },
  unitToggleTextActive: { color: '#4B117B' },

  heightValueWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },

  footer: { paddingHorizontal: 24, paddingBottom: 32 },
  cta: {
    width: '100%',
    backgroundColor: '#4B117B',
    borderRadius: 28,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

  heightModal: {
    backgroundColor: '#FFF',
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  heightTitle: { fontSize: 18, fontWeight: '700', color: '#2E1C4F', textAlign: 'center', marginBottom: 12 },
  heightPickerContainer: {
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: 16,
    height: HEIGHT_ITEM_HEIGHT * HEIGHT_VISIBLE_ROWS,
  },
  heightPickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly' },
  heightHighlight: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: HEIGHT_PICKER_PADDING,
    height: HEIGHT_ITEM_HEIGHT,
    borderRadius: 12,
    backgroundColor: 'rgba(75, 17, 123, 0.08)',
  },
  heightColumn: { flex: 1 },
  heightListContent: { paddingVertical: HEIGHT_PICKER_PADDING },
  heightOption: { height: HEIGHT_ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' },
  heightOptionText: { fontSize: 18, color: '#B6A9D3' },
  heightOptionTextSelected: { color: '#2E1C4F', fontWeight: '600' },
  heightUnitLabel: { width: 36, textAlign: 'center', fontSize: 14, color: '#7F6AAE', fontWeight: '600', marginHorizontal: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', width: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 24 },
  datePicker: { backgroundColor: '#FFF' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, marginTop: 12 },
  modalButton: { paddingVertical: 10, paddingHorizontal: 16 },
  modalButtonText: { fontSize: 16, color: '#7F6AAE', fontWeight: '600' },
  modalConfirm: { backgroundColor: '#4B117B', borderRadius: 18, marginLeft: 12 },
  modalConfirmText: { color: '#FFFFFF' },
})
