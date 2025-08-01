import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import DateTimePicker from '@react-native-community/datetimepicker'


export default function BasicInfoScreen() {
  const navigation = useNavigation()
  const [birthdate, setBirthdate] = useState(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [unit, setUnit] = useState('imperial')

  const handleSubmit = () => {
    navigation.navigate('CycleDetails')
  }

  const weightPlaceholder = unit === 'imperial' ? 'Ex. 150 lb' : 'Ex. 68 kg'
  const heightPlaceholder = unit === 'imperial' ? 'Ex. 5\'10"' : 'Ex. 178 cm'

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Tell us about you</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>What’s your name?</Text>
        <TextInput
          style={styles.input}
          placeholder="Name"
          value={name}
          onChangeText={setName}
        />
      </View>

<View style={styles.inputGroup}>
  <Text style={styles.label}>How old are you?</Text>

  {/* Birthdate Picker */}
  <TouchableOpacity
    style={styles.input}
    onPress={() => setShowDatePicker(true)}
    activeOpacity={0.8}
  >
    <Text style={{ color: birthdate ? '#000' : '#999' }}>
      {birthdate ? birthdate.toDateString() : 'Select birthdate'}
    </Text>
  </TouchableOpacity>

  {/* Web-specific input */}
  {Platform.OS === 'web' && showDatePicker && (
    <View style={{ marginTop: 10 }}>
      <input
        type="date"
        onChange={(e) => {
          const date = new Date(e.target.value)
          setBirthdate(date)
          setShowDatePicker(false)
          setAge(getAgeFromDate(date))
        }}
        autoFocus
      />
    </View>
  )}

  {/* iOS/Android native DateTimePicker */}
  {Platform.OS !== 'web' && showDatePicker && (
    <DateTimePicker
      value={birthdate || new Date('2000-01-01')}
      mode="date"
      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
      maximumDate={new Date()}
      onChange={(event, selectedDate) => {
        if (event.type !== 'dismissed') {
          const picked = selectedDate || new Date()
          setBirthdate(picked)
          setAge(getAgeFromDate(picked))
        }
        setShowDatePicker(false)
      }}
    />
  )}

  {/* Auto-calculated age */}
  {age !== '' && (
    <TextInput
      style={[styles.input, { marginTop: 12, backgroundColor: '#f0f0f0' }]}
      value={`${age} years`}
      editable={false}
    />
  )}
</View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Weight:</Text>
        <TextInput
          style={styles.input}
          placeholder={weightPlaceholder}
          value={weight}
          onChangeText={setWeight}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Height:</Text>
        <TextInput
          style={styles.input}
          placeholder={heightPlaceholder}
          value={height}
          onChangeText={setHeight}
        />
      </View>

      <View style={styles.unitToggle}>
        <TouchableOpacity onPress={() => setUnit('metric')}>
          <Text style={[styles.unitText, unit === 'metric' && styles.unitActive]}>
            Metric
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setUnit('imperial')}>
          <Text style={[styles.unitText, unit === 'imperial' && styles.unitActive]}>
            Imperial
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Continue →</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF4EF',
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 32,
    color: '#000',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFF8F1',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 32,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E8E6E1',
    ...Platform.select({
      web: { outlineStyle: 'none' },
    }),
  },
  unitToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 36,
  },
  unitText: {
    fontSize: 16,
    color: '#999',
    marginHorizontal: 16,
    fontWeight: '500',
  },
  unitActive: {
    color: '#5C3A00',
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
function getAgeFromDate(date) {
  const today = new Date()
  let age = today.getFullYear() - date.getFullYear()
  const m = today.getMonth() - date.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
    age--
  }
  return age.toString()
}
