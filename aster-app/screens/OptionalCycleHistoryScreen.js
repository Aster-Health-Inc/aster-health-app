// screens/OptionalCycleHistoryScreen.js
import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Modal, Platform, Alert
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { supabase } from '../lib/supabase'
import { useNavigation } from '@react-navigation/native'

export default function OptionalCycleHistoryScreen() {
  const navigation = useNavigation()

  // keep dates in state as Date objects; format to YYYY-MM-DD only when saving
  const [cycles, setCycles] = useState([
    { start: null, end: null },
    { start: null, end: null },
    { start: null, end: null },
    { start: null, end: null },
  ])

  // which cell is being edited
  const [activePicker, setActivePicker] = useState({ index: null, field: null }) // 'start' | 'end'
  // use one modal + spinner for BOTH platforms to keep iOS look
  const [pickerVisible, setPickerVisible] = useState(false)
  const [tempDate, setTempDate] = useState(new Date('2020-01-01'))

  const openPicker = (index, field) => {
    const current = cycles[index][field]
    // seed the spinner with current value or a sensible fallback
    setTempDate(current instanceof Date ? current : new Date('2020-01-01'))
    setActivePicker({ index, field })
    setPickerVisible(true)
  }
  // spinner updates temp only; commit on Done for both platforms
  const handleSpinnerChange = (_, selectedDate) => {
    if (selectedDate) setTempDate(selectedDate)
  }
  const confirmPicker = () => {
    const { index, field } = activePicker
    const updated = [...cycles]
    updated[index][field] = tempDate
    setCycles(updated)
    setPickerVisible(false)
    setActivePicker({ index: null, field: null })
  }
  const cancelPicker = () => {
    setPickerVisible(false)
    setActivePicker({ index: null, field: null })
  }

  const fmtDisplay = (d) => (d instanceof Date ? d.toDateString() : 'Select date')
  const toYMD = (d) => d.toISOString().split('T')[0]

  const handleContinue = async () => {
    const filled = cycles.filter(c => c.start instanceof Date && c.end instanceof Date)
    if (filled.length === 0) {
      navigation.navigate('ReminderSetup')
      return
    }

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw userError || new Error('Not signed in')

      const entries = filled.map(cycle => ({
        user_id: user.id,
        start_date: toYMD(cycle.start),
        end_date: toYMD(cycle.end),
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
            onPress={() => openPicker(index, 'start')}
            activeOpacity={0.85}
          >
            <Text style={styles.dateText}>{fmtDisplay(cycle.start)}</Text>
          </TouchableOpacity>

          <Text style={styles.toText}>to</Text>

          <TouchableOpacity
            style={styles.dateBox}
            onPress={() => openPicker(index, 'end')}
            activeOpacity={0.85}
          >
            <Text style={styles.dateText}>{fmtDisplay(cycle.end)}</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* One iOS-style modal for BOTH platforms */}
      {pickerVisible && (
        <Modal transparent animationType="fade" visible>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"            // force spinner to keep iOS feel
                maximumDate={new Date()}      // allow up to today (fixes Sept–Dec and future issues)
                minimumDate={new Date(1900, 0, 1)}
                onChange={handleSpinnerChange}
                themeVariant="light"
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={cancelPicker}>
                  <Text style={styles.modalBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.modalConfirm]} onPress={confirmPicker}>
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>Done</Text>
                </TouchableOpacity>
              </View>
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
  container: { flexGrow: 1, backgroundColor: '#FFFFFF', padding: 20, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 20 },

  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, width: '100%', justifyContent: 'center' },
  cycleLabel: { fontSize: 14, width: 90, textAlign: 'right', marginRight: 8 },

  dateBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 10,
    paddingHorizontal: 12,
    width: 130,
    alignItems: 'center'
  },
  dateText: { fontSize: 14, color: '#333' },
  toText: { fontSize: 14, marginHorizontal: 6 },

  continueButton: { backgroundColor: '#000', paddingVertical: 12, width: '90%', borderRadius: 25, alignItems: 'center', marginTop: 20 },
  continueText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  skipText: { marginTop: 15, fontSize: 14, color: '#555', textDecorationLine: 'underline' },

  // iOS-style modal (matches Basic)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { width: '85%', maxHeight: '70%', backgroundColor: '#fff', borderRadius: 14, padding: 14 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  modalCancel: { backgroundColor: '#eee', marginRight: 8 },
  modalConfirm: { backgroundColor: '#000' },
  modalBtnText: { color: '#000', fontWeight: '600' },
})
