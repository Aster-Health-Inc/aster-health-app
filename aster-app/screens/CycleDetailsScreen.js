import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, Alert } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { supabase } from '../lib/supabase'
import { format, differenceInDays } from 'date-fns'
import { useRef } from 'react'
import { useNavigation } from '@react-navigation/native'

export default function CycleDetailsScreen() {
  const [currentPeriod, setCurrentPeriod] = useState(null)
  const periodLengthRef = useRef()
  const navigation = useNavigation()
  // Form states
  const [startDate, setStartDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [cycleLength, setCycleLength] = useState('')
  const [periodLength, setPeriodLength] = useState('')

  useEffect(() => {
    const fetchCurrentPeriod = async () => {
      const user = await supabase.auth.getUser()
      const { data: userData } = user

      const { data, error } = await supabase
        .from('periods')
        .select('*')
        .eq('user_id', userData.id)
        .order('start_date', { ascending: false })
        .limit(1)

      if (!error && data.length > 0) {
        setCurrentPeriod(data[0])
      }
    }

    fetchCurrentPeriod()
  }, [])

const handleSave = async () => {
  const user = await supabase.auth.getUser()
  const { data: userData } = user

  if (!cycleLength || !periodLength || isNaN(cycleLength) || isNaN(periodLength)) {
    Alert.alert('Error', 'Please enter valid cycle and period lengths')
    return
  }

  const { error: insertError } = await supabase
    .from('periods')
    .insert([
      {
        user_id: userData.id,
        start_date: startDate.toISOString().split('T')[0],
        end_date: null,
        flow_level: null,
        symptoms: [],
        notes: '',
      },
    ])

  const { error: updateError } = await supabase
    .from('users')
    .update({
      average_cycle_length: Number(cycleLength),
      average_period_length: Number(periodLength),
    })
    .eq('id', userData.id)

  if (!insertError && !updateError) {
    Alert.alert('Success', 'Cycle data saved!')
    navigation.navigate('SurveyPrompt')
  } else {
    Alert.alert('Error', 'Something went wrong saving your data')
  }
}
  const renderSummary = () => {
    if (!currentPeriod) {
      return (
        <Text style={styles.emptyText}>
          No period data found. Add a start date below to begin tracking.
        </Text>
      )
    }

    const start = new Date(currentPeriod.start_date)
    const end = new Date(currentPeriod.end_date || new Date())
    const totalDays = differenceInDays(end, start) + 1
    const today = new Date()
    const daysElapsed = Math.min(differenceInDays(today, start) + 1, totalDays)
    const percentComplete = Math.min((daysElapsed / totalDays) * 100, 100)

    return (
      <View style={styles.card}>
        <Text style={styles.title}>
          You're on Day {daysElapsed} of {totalDays}
        </Text>
        <Text style={styles.subtitle}>
          {format(start, 'MMM d')} – {format(end, 'MMM d')}
        </Text>

        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${percentComplete}%` }]} />
        </View>
        <Text style={styles.percentText}>{Math.floor(percentComplete)}% complete</Text>
      </View>
    )
  }

  return (
  <View style={styles.container}>
    <Text style={styles.header}>Tell us about you</Text>

    {/* Last period date */}
    <View style={styles.inputGroup}>
      <Text style={styles.label}>When was your last period?</Text>
      <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
        <Text style={styles.dateText}>
          {startDate ? startDate.toDateString() : 'Enter date'}
        </Text>
      </TouchableOpacity>
      {Platform.OS !== 'web' && showDatePicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(e, selectedDate) => {
            setShowDatePicker(false)
            if (selectedDate) setStartDate(selectedDate)
          }}
        />
      )}
      {Platform.OS === 'web' && showDatePicker && (
        <input
          type="date"
          onChange={(e) => {
            setStartDate(new Date(e.target.value))
            setShowDatePicker(false)
          }}
          style={styles.webInput}
          autoFocus
        />
      )}
    </View>

    {/* Cycle Length */}
    <View style={styles.inputGroup}>
      <Text style={styles.label}>How long is your typical cycle?</Text>
      <Text style={styles.help}>
        <Text style={styles.helpBold}>What is this?</Text> The number of days between the first day of one period to the first day of the next.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Ex. 28 Days"
        keyboardType="number-pad"
        returnKeyType="next"
        onSubmitEditing={() => periodLengthRef.current?.focus()}
        blurOnSubmit={false}
        value={cycleLength}
        onChangeText={setCycleLength}
      />
    </View>

    {/* Period Length */}
    <View style={styles.inputGroup}>
      <Text style={styles.label}>How long is your typical period?</Text>
      <Text style={styles.help}>
        <Text style={styles.helpBold}>What is this?</Text> The number of days you experience menstrual bleeding within your typical cycle.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Ex. 7 Days"
        keyboardType="number-pad"
        returnKeyType="done"
        ref={periodLengthRef} 
        value={periodLength}
        onChangeText={setPeriodLength}
      />
    </View>

    <TouchableOpacity style={styles.button} onPress={handleSave}>
      <Text style={styles.buttonText}>Continue →</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('SurveyPrompt')}>
      <Text style={styles.exploreText}>Explore Cycle Tracking →</Text>
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
    marginBottom: 28,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  help: {
    fontSize: 13,
    color: '#777',
    lineHeight: 18,
    marginBottom: 8,
  },
  helpBold: {
    color: '#333',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  input: {
    backgroundColor: '#FFF8F1',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 32,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E8E6E1',
  },
  dateText: {
    color: '#000',
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  webInput: {
    fontSize: 16,
    padding: 10,
    borderRadius: 12,
    borderColor: '#ccc',
    borderWidth: 1,
    marginTop: 10,
  },
})