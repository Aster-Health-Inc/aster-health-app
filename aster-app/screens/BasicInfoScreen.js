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
  FlatList,
  Keyboard,
  View,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'

import { supabase } from '../lib/supabase'
import { useOnboardingGuard } from '../utils/useOnboardingGuard'

const DEFAULT_BIRTHDATE = new Date('2000-01-01')
const MAX_DATE = new Date()
const DEFAULT_HEIGHT = { feet: 5, inches: 6 }
const HEIGHT_ITEM_HEIGHT = 44
const HEIGHT_VISIBLE_ROWS = 5
const HEIGHT_PICKER_PADDING = HEIGHT_ITEM_HEIGHT * 2
const heightFeetOptions = Array.from({ length: 9 }, (_, i) => 4 + i) // 4ft - 12ft
const heightInchOptions = Array.from({ length: 12 }, (_, i) => i) // 0 - 11 in

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

  const [name, setName] = useState('')
  const [birthdate, setBirthdate] = useState(null)
  const [tempBirthdate, setTempBirthdate] = useState(DEFAULT_BIRTHDATE)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [weight, setWeight] = useState('')
  const [heightFeet, setHeightFeet] = useState(null)
  const [heightInches, setHeightInches] = useState(null)
  const [showHeightPicker, setShowHeightPicker] = useState(false)
  const [tempHeightFeet, setTempHeightFeet] = useState(DEFAULT_HEIGHT.feet)
  const [tempHeightInches, setTempHeightInches] = useState(DEFAULT_HEIGHT.inches)

  const weightRef = useRef(null)
  const feetListRef = useRef(null)
  const inchListRef = useRef(null)

  useOnboardingGuard(navigation)

  const age = birthdate ? getAgeFromDate(birthdate) : ''
  const hasHeight = heightFeet !== null && heightInches !== null
  const heightDisplay = hasHeight
    ? `${heightFeet}' ${heightInches}"`
    : '\u00A0'

  const handleWeightChange = (value) => {
    const digitsOnly = value.replace(/[^0-9]/g, '')
    setWeight(digitsOnly)
  }

  const openHeightPicker = () => {
    Keyboard.dismiss()
    const currentFeet = heightFeet ?? DEFAULT_HEIGHT.feet
    const currentInches = heightInches ?? DEFAULT_HEIGHT.inches
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
  }

  const closeHeightPicker = () => setShowHeightPicker(false)

  const confirmHeightPicker = () => {
    setHeightFeet(tempHeightFeet)
    setHeightInches(tempHeightInches)
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
    if (!name || !birthdate || !weight || !hasHeight) {
      Alert.alert('Please complete all fields before continuing.')
      return
    }

    const numericWeight = parseFloat(weight)
    const normalizedHeight = hasHeight ? heightFeet * 12 + heightInches : Number.NaN

    if (Number.isNaN(numericWeight) || numericWeight <= 0) {
      Alert.alert('Please enter a valid weight.')
      return
    }

    if (Number.isNaN(normalizedHeight) || normalizedHeight <= 0) {
      Alert.alert('Please select a valid height.')
      return
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError) throw userError

      const { error: upsertError } = await supabase
        .from('user_profiles')
        .upsert([
          {
            user_id: user.id,
            name,
            birthdate: birthdate.toISOString().split('T')[0],
            height: normalizedHeight,
            weight: numericWeight,
            unit_system: 'imperial',
          },
        ])

      if (upsertError) {
        console.log('[warn] Supabase upsert error:', upsertError)
        Alert.alert('Error saving your info. Please try again.')
      } else {
        navigation.navigate('CycleDetails')
      }
    } catch (error) {
      console.log('[warn] handleSubmit error:', error)
      Alert.alert('Error saving your info. Please try again.')
    }
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
              <TouchableOpacity
                onPress={handleBack}
                activeOpacity={0.7}
                style={styles.backButton}
              >
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
                  <View style={styles.unitBadge}>
                    <Text style={styles.unitBadgeText}>lbs</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.field, styles.lastField, styles.fieldRow]}
                activeOpacity={0.85}
                onPress={openHeightPicker}
              >
                <Text style={styles.fieldLabel}>Height</Text>
                <View style={[styles.inputField, styles.heightValueWrapper]}>
                  <Text style={[styles.touchableValue, !hasHeight && styles.placeholderText]}>
                    {hasHeight ? heightDisplay : 'Set height'}
                  </Text>
                  <View style={styles.unitBadge}>
                    <Text style={styles.unitBadgeText}>ft/in</Text>
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

      {showHeightPicker && (
        <Modal transparent animationType="fade" onRequestClose={closeHeightPicker}>
          <View style={styles.modalOverlay}>
            <View style={styles.heightModal}>
              <Text style={styles.heightTitle}>Select Height</Text>
              <View style={styles.heightPickerContainer}>
                <View style={styles.heightHighlight} pointerEvents="none" />
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
  safeArea: {
    flex: 1,
    backgroundColor: '#EDE5F7',
  },
  flex: {
    flex: 1,
  },
  avoidingContent: {
    flexGrow: 1,
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
    marginBottom: 32,
    alignItems: 'flex-start',
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
    textAlign: 'left',
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
  inputField: {
    flex: 1,
    marginLeft: 12,
  },
  touchableValue: {
    fontSize: 18,
    color: '#2E1C4F',
    textAlign: 'right',
    flex: 1,
  },
  placeholderText: {
    color: '#B6A9D3',
  },
  inputWithUnit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  weightInput: {
    paddingRight: 4,
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
  heightValueWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
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
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heightModal: {
    backgroundColor: '#FFF',
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  heightTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E1C4F',
    textAlign: 'center',
    marginBottom: 12,
  },
  heightPickerContainer: {
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: 16,
    height: HEIGHT_ITEM_HEIGHT * HEIGHT_VISIBLE_ROWS,
  },
  heightPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  heightHighlight: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: HEIGHT_PICKER_PADDING,
    height: HEIGHT_ITEM_HEIGHT,
    borderRadius: 12,
    backgroundColor: 'rgba(75, 17, 123, 0.08)',
  },
  heightColumn: {
    flex: 1,
  },
  heightListContent: {
    paddingVertical: HEIGHT_PICKER_PADDING,
  },
  heightOption: {
    height: HEIGHT_ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heightOptionText: {
    fontSize: 18,
    color: '#B6A9D3',
  },
  heightOptionTextSelected: {
    color: '#2E1C4F',
    fontWeight: '600',
  },
  heightUnitLabel: {
    width: 36,
    textAlign: 'center',
    fontSize: 14,
    color: '#7F6AAE',
    fontWeight: '600',
    marginHorizontal: 8,
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
