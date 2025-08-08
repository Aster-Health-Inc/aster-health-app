import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, Platform, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';

export default function OptionalCycleHistoryScreen() {
  const navigation = useNavigation()

  const [cycles, setCycles] = useState([
    { start: null, end: null },
    { start: null, end: null },
    { start: null, end: null },
    { start: null, end: null }
  ])

  const [showPicker, setShowPicker] = useState({ index: null, field: null })

  const handleNativeChange = (event, selectedDate) => {
    if (event.type === 'dismissed' || !selectedDate) {
      setShowPicker({ index: null, field: null })
      return
    }
    const date = selectedDate.toISOString().split('T')[0]
    const updated = [...cycles]
    updated[showPicker.index][showPicker.field] = date
    setCycles(updated)
    setShowPicker({ index: null, field: null })
  }

  const handleWebDate = (date) => {
    const updated = [...cycles]
    updated[showPicker.index][showPicker.field] = date
    setCycles(updated)
    setShowPicker({ index: null, field: null })
  }

const handleContinue = async () => {
  const filled = cycles.filter(c => c.start && c.end)
  if (filled.length === 0) {
    navigation.navigate('ReminderSetup')
    return
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError

    const entries = filled.map(cycle => ({
      user_id: user.id,
      start_date: cycle.start,
      end_date: cycle.end,
      flow_level: null,
      symptoms: [],
      notes: ''
    }))

    const { error: insertError } = await supabase.from('periods').insert(entries)

    if (insertError) {
      console.log('❌ Insert error:', insertError)
      Alert.alert('Failed to save history')
    } else {
      navigation.navigate('ReminderSetup')
    }
  } catch (err) {
    console.log('❌ Unexpected error:', err)
    Alert.alert('Something went wrong. Try again.')
  }
}


  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>For better predictions...</Text>
      <Text style={styles.subtitle}>
        Include the days you experienced menstrual bleeding in your last four cycles
      </Text>

      {cycles.map((cycle, index) => (
        <View key={index} style={styles.row}>
          <Text style={styles.cycleLabel}>Period {index + 1}:</Text>

          <TouchableOpacity
            style={styles.dateBox}
            onPress={() => setShowPicker({ index, field: 'start' })}
          >
            <Text style={styles.dateText}>{cycle.start || 'Start Date'}</Text>
          </TouchableOpacity>

          <Text style={styles.toText}>to</Text>

          <TouchableOpacity
            style={styles.dateBox}
            onPress={() => setShowPicker({ index, field: 'end' })}
          >
            <Text style={styles.dateText}>{cycle.end || 'End Date'}</Text>
          </TouchableOpacity>
        </View>
      ))}

      {Platform.OS !== 'web' && showPicker.index !== null && (
      <DateTimePicker
        value={new Date()}
        mode="date"
        display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
        onChange={handleNativeChange}
        minimumDate={new Date(1900, 0, 1)}
        maximumDate={new Date(2100, 11, 31)}
      />

      )}

      {Platform.OS === 'web' && showPicker.index !== null && (
        <Modal transparent={true} animationType="fade" visible>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <input
                type="date"
                onChange={(e) => handleWebDate(e.target.value)}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  border: '1px solid #ccc',
                  fontSize: 16
                }}
                autoFocus
              />
              <TouchableOpacity style={styles.closeButton} onPress={() => setShowPicker({ index: null, field: null })}>
                <Text style={styles.closeText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
        <Text style={styles.continueText}>Continue →</Text>
      </TouchableOpacity>

      <Text style={styles.skipText} onPress={() => navigation.navigate('ReminderSetup')}>
        I'm not sure
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#F5E6D3', padding: 20, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, width: '100%', justifyContent: 'center' },
  cycleLabel: { fontSize: 14, width: 70 },
  dateBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 10,
    paddingHorizontal: 12,
    width: 110,
    alignItems: 'center'
  },
  dateText: { fontSize: 14, color: '#333' },
  toText: { fontSize: 14, marginHorizontal: 4 },
  continueButton: { backgroundColor: '#000', paddingVertical: 12, width: '90%', borderRadius: 25, alignItems: 'center', marginTop: 20 },
  continueText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  skipText: { marginTop: 15, fontSize: 14, color: '#555', textDecorationLine: 'underline' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 10, alignItems: 'center' },
  closeButton: { marginTop: 10, padding: 8 },
  closeText: { color: '#000', fontWeight: '600' }
})
