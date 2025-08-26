// screens/BasicInfoScreen.js
import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  InputAccessoryView,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { supabase } from '../lib/supabase'

export default function BasicInfoScreen() {
  const navigation = useNavigation()

  // form fields
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('imperial') // 'imperial' | 'metric'

  // birthdate & age
  const [birthdate, setBirthdate] = useState(null) // committed value
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [tempBirthdate, setTempBirthdate] = useState(new Date('2000-01-01')) // used on iOS spinner until user taps Done

  // height pickers
  const [feet, setFeet] = useState(5)
  const [inches, setInches] = useState(6)
  const [heightCm, setHeightCm] = useState(168)
  const [showFeetPicker, setShowFeetPicker] = useState(false)
  const [showInchesPicker, setShowInchesPicker] = useState(false)
  const [showCmPicker, setShowCmPicker] = useState(false)

  // weight
  const [weight, setWeight] = useState('')

  const getAgeFromDate = (date) => {
    const today = new Date()
    let age = today.getFullYear() - date.getFullYear()
    const m = today.getMonth() - date.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < date.getDate())) age--
    return age.toString()
  }

  const age = birthdate ? getAgeFromDate(birthdate) : ''

  // --- Birthdate Picker handlers ---
  const openBirthdate = () => {
    // start the temp at current value or a sensible default
    setTempBirthdate(birthdate || new Date('2000-01-01'))
    setShowDatePicker(true)
  }

  const handleBirthdateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      // Android shows a dialog with OK/Cancel; we only commit on 'set'
      if (event.type === 'set' && selectedDate) {
        setBirthdate(selectedDate)
      }
      setShowDatePicker(false)
    } else {
      // iOS spinner updates continuously — do not close here, just update temp
      if (selectedDate) {
        setTempBirthdate(selectedDate)
      }
    }
  }

  const confirmBirthdateIOS = () => {
    setBirthdate(tempBirthdate)
    setShowDatePicker(false)
  }

  const cancelBirthdateIOS = () => {
    setShowDatePicker(false)
  }

  // --- Height helpers ---
  const feetOptions = Array.from({ length: 5 }, (_, i) => 4 + i) // 4–8 ft
  const inchOptions = Array.from({ length: 12 }, (_, i) => i) // 0–11 in
  const cmOptions = Array.from({ length: 121 }, (_, i) => 120 + i) // 120–240 cm

  const heightDisplay =
    unit === 'imperial' ? `${feet}′ ${inches}″` : `${heightCm} cm`

  // --- Submit ---
  const handleSubmit = async () => {
    if (!name || !birthdate || !weight) {
      Alert.alert('Please fill all required fields before continuing.')
      return
    }

    // normalize height as a number; we also store unit_system separately
    const numericHeight = unit === 'imperial' ? feet * 12 + inches : heightCm
    const numericWeight = parseFloat(weight)
    if (Number.isNaN(numericWeight)) {
      Alert.alert('Please enter a valid weight.')
      return
    }

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      const { error: upsertError } = await supabase
        .from('user_profiles')
        .upsert([
          {
            user_id: user.id,
            name,
            birthdate: birthdate.toISOString().split('T')[0],
            height: numericHeight, // inches if imperial, centimeters if metric
            weight: numericWeight,  // lbs if imperial, kg if metric
            unit_system: unit,      // this tells you how to interpret height/weight
          }
        ])

      if (upsertError) {
        console.log('❌ Supabase upsert error:', upsertError)
        Alert.alert('Error saving your info. Please try again.')
      } else {
        navigation.navigate('CycleDetails')
      }
    } catch (err) {
      console.log('❌ Unexpected error:', err)
      Alert.alert('Something went wrong. Please try again.')
    }
  }

  const weightPlaceholder = unit === 'imperial' ? 'Ex. 150 (lb)' : 'Ex. 68 (kg)'

  // Native input accessory bar for iOS above the keyboard
  const weightAccessoryId = 'weightAccessory'

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <Text style={styles.header}>Tell us about you</Text>

        {/* Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>What’s your name?</Text>
          <TextInput
            style={styles.input}
            placeholder="Name"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Birthdate */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>How old are you?</Text>

          <TouchableOpacity style={styles.input} onPress={openBirthdate} activeOpacity={0.8}>
            <Text style={{ color: birthdate ? '#000' : '#999' }}>
              {birthdate ? birthdate.toDateString() : 'Select birthdate'}
            </Text>
          </TouchableOpacity>

          {/* iOS: spinner + custom confirm/cancel; Android: default dialog */}
          {showDatePicker && (
            Platform.OS === 'ios' ? (
              <Modal transparent animationType="fade" visible>
                <View style={styles.modalOverlay}>
                  <View style={styles.modalBox}>
                    <DateTimePicker
                      value={tempBirthdate}
                      mode="date"
                      display="spinner"
                      maximumDate={new Date()}
                      minimumDate={new Date(1900, 0, 1)}
                      onChange={handleBirthdateChange}
                    />
                    <View style={styles.modalActions}>
                      <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={cancelBirthdateIOS}>
                        <Text style={styles.modalBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.modalBtn, styles.modalConfirm]} onPress={confirmBirthdateIOS}>
                        <Text style={[styles.modalBtnText, { color: '#fff' }]}>Done</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            ) : (
              <DateTimePicker
                value={birthdate || new Date('2000-01-01')}
                mode="date"
                display="default"
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
                onChange={handleBirthdateChange}
              />
            )
          )}

          {/* Auto age display */}
          {age !== '' && (
            <TextInput
              style={[styles.input, { marginTop: 12, backgroundColor: '#f0f0f0' }]}
              value={`${age} years`}
              editable={false}
            />
          )}
        </View>

        {/* Weight */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Weight ({unit === 'imperial' ? 'lb' : 'kg'}):</Text>
          <TextInput
            style={styles.input}
            placeholder={weightPlaceholder}
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            returnKeyType="done"
            blurOnSubmit={false}
            onSubmitEditing={handleSubmit} // Pressing the keyboard Done key submits
            inputAccessoryViewID={Platform.OS === 'ios' ? weightAccessoryId : undefined}
          />
        </View>

        {/* Height */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Height ({unit === 'imperial' ? `ft/in` : 'cm'}):</Text>

          {/* Display / open picker */}
          <TouchableOpacity
            style={styles.input}
            onPress={() => (unit === 'imperial' ? setShowFeetPicker(true) : setShowCmPicker(true))}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#000' }}>{heightDisplay}</Text>
          </TouchableOpacity>

          {/* Imperial: pick feet, then inches */}
          <Modal transparent visible={showFeetPicker} animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>Select Feet</Text>
                <FlatList
                  data={feetOptions}
                  keyExtractor={(item) => `ft-${item}`}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.optionRow}
                      onPress={() => {
                        setFeet(item)
                        setShowFeetPicker(false)
                        setShowInchesPicker(true)
                      }}
                    >
                      <Text style={styles.optionText}>{item} ft</Text>
                    </TouchableOpacity>
                  )}
                />
                <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={() => setShowFeetPicker(false)}>
                  <Text style={styles.modalBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Modal transparent visible={showInchesPicker} animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>Select Inches</Text>
                <FlatList
                  data={inchOptions}
                  keyExtractor={(item) => `in-${item}`}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.optionRow}
                      onPress={() => {
                        setInches(item)
                        setShowInchesPicker(false)
                      }}
                    >
                      <Text style={styles.optionText}>{item} in</Text>
                    </TouchableOpacity>
                  )}
                />
                <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={() => setShowInchesPicker(false)}>
                  <Text style={styles.modalBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Metric: pick centimeters */}
          <Modal transparent visible={showCmPicker} animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>Select Height (cm)</Text>
                <FlatList
                  data={cmOptions}
                  keyExtractor={(item) => `cm-${item}`}
                  initialScrollIndex={Math.max(cmOptions.indexOf(heightCm), 0)}
                  getItemLayout={(_, index) => ({ length: 48, offset: 48 * index, index })}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.optionRow}
                      onPress={() => {
                        setHeightCm(item)
                        setShowCmPicker(false)
                      }}
                    >
                      <Text style={styles.optionText}>{item} cm</Text>
                    </TouchableOpacity>
                  )}
                />
                <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={() => setShowCmPicker(false)}>
                  <Text style={styles.modalBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>

        {/* Unit toggle */}
        <View style={styles.unitToggle}>
          <TouchableOpacity onPress={() => setUnit('metric')}>
            <Text style={[styles.unitText, unit === 'metric' && styles.unitActive]}>Metric</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setUnit('imperial')}>
            <Text style={[styles.unitText, unit === 'imperial' && styles.unitActive]}>Imperial</Text>
          </TouchableOpacity>
        </View>

        {/* Continue */}
        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Continue →</Text>
        </TouchableOpacity>
      </View>

      {/* iOS native accessory bar */}
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={weightAccessoryId}>
          <View style={styles.accessoryBar}>
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={handleSubmit} style={styles.accessoryBtn}>
              <Text style={styles.accessoryText}>Done</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF4EF', padding: 24, justifyContent: 'center' },
  header: { fontSize: 28, fontWeight: '700', marginBottom: 32, color: '#000' },

  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 },
  input: {
    backgroundColor: '#FFF8F1',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 32,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E8E6E1',
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },

  unitToggle: { flexDirection: 'row', justifyContent: 'center', marginTop: 8, marginBottom: 36 },
  unitText: { fontSize: 16, color: '#999', marginHorizontal: 16, fontWeight: '500' },
  unitActive: { color: '#5C3A00', fontWeight: '700' },

  button: { backgroundColor: '#000', paddingVertical: 16, borderRadius: 30, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { width: '85%', maxHeight: '70%', backgroundColor: '#fff', borderRadius: 14, padding: 14 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  modalCancel: { backgroundColor: '#eee', marginRight: 8 },
  modalConfirm: { backgroundColor: '#000' },
  modalBtnText: { color: '#000', fontWeight: '600' },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10, textAlign: 'center' },

  optionRow: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' },
  optionText: { fontSize: 16, textAlign: 'center' },

  // iOS input accessory bar
  accessoryBar: {
    backgroundColor: '#FFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  accessoryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#000',
    borderRadius: 18,
  },
  accessoryText: { color: '#fff', fontWeight: '700' },
})
