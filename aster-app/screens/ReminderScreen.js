import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { supabase } from '../lib/supabase'
import { useNavigation } from '@react-navigation/native'

export default function ReminderScreen() {
  const navigation = useNavigation()
  const [hour, setHour] = useState('08')
  const [minute, setMinute] = useState('00')
  const [ampm, setAmPm] = useState('AM')

  const hours = [...Array(12).keys()].map(i => String(i + 1).padStart(2, '0'))
  const minutes = ['00', '15', '30', '45']
  const convertTo24Hour = (hr, min, ampm) => {
    let h = parseInt(hr, 10)
    if (ampm === 'PM' && h !== 12) h += 12
    if (ampm === 'AM' && h === 12) h = 0
    return `${String(h).padStart(2, '0')}:${min}`
  }

  const handleContinue = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw userError

      const formattedTime = convertTo24Hour(hour, minute, ampm)

      const { error: upsertError } = await supabase.from('reminder_settings').upsert([
        {
          user_id: user.id,
          reminder_time: formattedTime,
          checkin_enabled: true,
          reminder_days: [1, 3, 5] // You can replace this with actual selection logic later
        }
      ], { onConflict: ['user_id'] })

      if (upsertError) {
        console.log('❌ Reminder setting error:', upsertError)
        Alert.alert('Error', 'Could not save reminder settings.')
      } else {
        console.log('✅ Reminder saved')
        navigation.navigate('CarouselWalkthrough')
      }
    } catch (err) {
      console.log('❌ Unexpected error:', err)
      Alert.alert('Unexpected issue occurred.')
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>When should we remind you?</Text>
      <Text style={styles.subtitle}>Pick a time to receive daily health reminders.</Text>

      <View style={styles.pickerContainer}>
        {hours.map(h => (
          <TouchableOpacity key={h} onPress={() => setHour(h)} style={[styles.option, hour === h && styles.selected]}>
            <Text style={styles.optionText}>{h}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.pickerContainer}>
        {minutes.map(m => (
          <TouchableOpacity key={m} onPress={() => setMinute(m)} style={[styles.option, minute === m && styles.selected]}>
            <Text style={styles.optionText}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.pickerContainer}>
        {['AM', 'PM'].map(period => (
          <TouchableOpacity key={period} onPress={() => setAmPm(period)} style={[styles.option, ampm === period && styles.selected]}>
            <Text style={styles.optionText}>{period}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
        <Text style={styles.continueText}>Continue →</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5E6D3', padding: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '600', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 30 },
  pickerContainer: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    margin: 5,
    borderRadius: 25,
    backgroundColor: '#f0d9c3',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  selected: {
    backgroundColor: '#000',
  },
  optionText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500'
  },
  continueButton: {
    backgroundColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginTop: 30
  },
  continueText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
})
