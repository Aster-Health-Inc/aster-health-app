// screens/ReminderScreen.js
import React, { useMemo, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { supabase } from '../lib/supabase'
import { useNavigation } from '@react-navigation/native'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function ReminderScreen() {
  const navigation = useNavigation()

  // Time state
  const [hour, setHour] = useState('08')
  const [minute, setMinute] = useState('00')
  const [ampm, setAmPm] = useState('AM')

  // Day-of-week selection (example default: Mon, Wed, Fri)
  const [selectedDays, setSelectedDays] = useState([1, 3, 5])

  const hours = useMemo(
    () => [...Array(12).keys()].map(i => String(i + 1).padStart(2, '0')),
    []
  )
  const minutes = useMemo(() => ['00', '15', '30', '45'], [])

  const toggleDay = (idx) => {
    setSelectedDays(prev =>
      prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx].sort()
    )
  }

  const to24h = (hr, min, ap) => {
    let h = parseInt(hr, 10)
    if (ap === 'PM' && h !== 12) h += 12
    if (ap === 'AM' && h === 12) h = 0
    return `${String(h).padStart(2, '0')}:${min}:00`
  }

  const handleContinue = async () => {
    if (selectedDays.length === 0) {
      Alert.alert('Please select at least one day.')
      return
    }
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw userError || new Error('Not signed in')

      const t = to24h(hour, minute, ampm)

      // IMPORTANT:
      // 1) onConflict must be a string, not an array
      // 2) user_id must have a UNIQUE index (migration above)
      const { error: upsertError } = await supabase
        .from('reminder_settings')
        .upsert([{
          user_id: user.id,
          reminder_time: t,          // TIME column accepts HH:MM:SS
          reminder_days: selectedDays, // int[] 0=Sun..6=Sat
          checkin_enabled: true
          // timezone: 'America/Chicago' // uncomment if you added the column and want to save it
        }], { onConflict: 'user_id' })

      if (upsertError) {
        console.log('❌ Reminder upsert error:', upsertError)
        Alert.alert('Error', upsertError.message || 'Could not save reminder settings.')
        return
      }

      console.log('✅ Reminder saved')
      navigation.navigate('CarouselWalkthrough')
    } catch (err) {
      console.log('❌ Unexpected error:', err)
      Alert.alert('Unexpected issue occurred.')
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>When should we remind you?</Text>
      <Text style={styles.subtitle}>Pick a time and days for your checkins.</Text>

      {/* Big time display */}
      <View style={styles.timeDisplay}>
        <Text style={styles.timePart}>{hour}</Text>
        <Text style={styles.colon}>:</Text>
        <Text style={styles.timePart}>{minute}</Text>
        <Text style={styles.ampm}>{ampm}</Text>
      </View>

      {/* Hour chips */}
      <Text style={styles.groupLabel}>Hour</Text>
      <View style={styles.pickerRow}>
        {hours.map(h => (
          <TouchableOpacity
            key={h}
            onPress={() => setHour(h)}
            style={[styles.chip, hour === h && styles.chipSelected]}
          >
            <Text style={[styles.chipText, hour === h && styles.chipTextSelected]}>{h}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Minute chips */}
      <Text style={styles.groupLabel}>Minute</Text>
      <View style={styles.pickerRow}>
        {minutes.map(m => (
          <TouchableOpacity
            key={m}
            onPress={() => setMinute(m)}
            style={[styles.chip, minute === m && styles.chipSelected]}
          >
            <Text style={[styles.chipText, minute === m && styles.chipTextSelected]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* AM / PM */}
      <Text style={styles.groupLabel}>AM / PM</Text>
      <View style={styles.pickerRow}>
        {['AM', 'PM'].map(p => (
          <TouchableOpacity
            key={p}
            onPress={() => setAmPm(p)}
            style={[styles.chip, ampm === p && styles.chipSelected]}
          >
            <Text style={[styles.chipText, ampm === p && styles.chipTextSelected]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Days of week */}
      <Text style={styles.groupLabel}>Days</Text>
      <View style={styles.daysRow}>
        {DAYS.map((d, i) => (
          <TouchableOpacity
            key={d}
            onPress={() => toggleDay(i)}
            style={[styles.dayPill, selectedDays.includes(i) && styles.dayPillSelected]}
          >
            <Text style={[styles.dayText, selectedDays.includes(i) && styles.dayTextSelected]}>{d}</Text>
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
  container: { flex: 1, backgroundColor: '#FAF4EF', paddingHorizontal: 20, paddingTop: 40, alignItems: 'center' },

  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 6, color: '#000' },
  subtitle: { fontSize: 14, color: '#5B5B5B', textAlign: 'center', marginBottom: 24 },

  timeDisplay: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 18 },
  timePart: { fontSize: 48, fontWeight: '800', color: '#000' },
  colon: { fontSize: 42, fontWeight: '800', marginHorizontal: 6, color: '#000' },
  ampm: { fontSize: 18, fontWeight: '700', marginLeft: 10, marginBottom: 8, color: '#000' },

  groupLabel: { alignSelf: 'flex-start', marginTop: 10, marginBottom: 8, fontWeight: '700', color: '#333' },

  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 10 },
  chip: {
    paddingVertical: 10, paddingHorizontal: 14, margin: 6,
    borderRadius: 20, backgroundColor: '#FFF8F1', borderWidth: 1, borderColor: '#E8E6E1'
  },
  chipSelected: { backgroundColor: '#000', borderColor: '#000' },
  chipText: { color: '#000', fontWeight: '600' },
  chipTextSelected: { color: '#fff' },

  daysRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginVertical: 8 },
  dayPill: {
    paddingVertical: 8, paddingHorizontal: 12, margin: 6,
    borderRadius: 18, backgroundColor: '#FFF8F1', borderWidth: 1, borderColor: '#E8E6E1'
  },
  dayPillSelected: { backgroundColor: '#000', borderColor: '#000' },
  dayText: { color: '#000', fontWeight: '600' },
  dayTextSelected: { color: '#fff' },

  continueButton: {
    backgroundColor: '#000', paddingVertical: 14, paddingHorizontal: 40,
    borderRadius: 30, marginTop: 16
  },
  continueText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
