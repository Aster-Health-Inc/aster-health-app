import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';

const ReminderScreen = ({ navigation }) => {
  const [hour, setHour] = useState('12');
  const [minute, setMinute] = useState('00');
  const [ampm, setAmPm] = useState('AM');
  const [activePicker, setActivePicker] = useState(null); // "hour" or "minute"

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')); // 12-hour format
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const handleSelect = (value) => {
    if (activePicker === 'hour') setHour(value);
    else setMinute(value);
    setActivePicker(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reminders</Text>
      <Text style={styles.subtitle}>What time works best for your daily check-in?</Text>

      {/* ✅ Time Selection */}
      <View style={styles.timeRow}>
        {/* Hour Box */}
        <TouchableOpacity style={styles.box} onPress={() => setActivePicker('hour')}>
          <Text style={styles.boxText}>{hour}</Text>
          <Text style={styles.label}>Hour</Text>
        </TouchableOpacity>

        <Text style={styles.colon}>:</Text>

        {/* Minute Box */}
        <TouchableOpacity style={styles.box} onPress={() => setActivePicker('minute')}>
          <Text style={styles.boxText}>{minute}</Text>
          <Text style={styles.label}>Minute</Text>
        </TouchableOpacity>

        {/* ✅ AM/PM Toggle */}
        <View style={styles.ampmWrapper}>
          {['AM', 'PM'].map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.ampmButton, ampm === p && styles.ampmActive]}
              onPress={() => setAmPm(p)}
            >
              <Text style={[styles.ampmText, ampm === p && styles.ampmTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ✅ Continue Button */}
      <TouchableOpacity style={styles.continueButton} onPress={() => navigation.navigate('CarouselWalkthrough')}>
        <Text style={styles.continueText}>Continue →</Text>
      </TouchableOpacity>

      {/* ✅ Modal Popup for Hour/Minute Selection */}
      <Modal visible={!!activePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Select {activePicker}</Text>
            <FlatList
              data={activePicker === 'hour' ? hours : minutes}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.option} onPress={() => handleSelect(item)}>
                  <Text style={styles.optionText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeButton} onPress={() => setActivePicker(null)}>
              <Text style={styles.closeText}>Close ✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5E6D3', justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#555', marginBottom: 40, textAlign: 'center' },

  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 40 },

  box: {
    width: 80,
    height: 60,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5
  },
  boxText: { fontSize: 24, fontWeight: '600', color: '#000' },
  label: { fontSize: 12, color: '#555', marginTop: 3 },

  colon: { fontSize: 28, fontWeight: '600', marginHorizontal: 5 },

  /* ✅ AM/PM Toggle */
  ampmWrapper: { flexDirection: 'row', marginLeft: 10 },
  ampmButton: {
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginLeft: 5,
    borderRadius: 6,
    backgroundColor: '#fff'
  },
  ampmActive: { backgroundColor: '#000' },
  ampmText: { fontSize: 16, fontWeight: '600', color: '#000' },
  ampmTextActive: { color: '#fff' },

  continueButton: { backgroundColor: '#000', paddingVertical: 14, width: '90%', borderRadius: 30, alignItems: 'center' },
  continueText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // ✅ Modal Styling
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { width: '80%', maxHeight: '60%', backgroundColor: '#fff', borderRadius: 10, padding: 15 },
  modalTitle: { fontSize: 20, fontWeight: '600', marginBottom: 10, textAlign: 'center' },
  option: { padding: 10, borderBottomWidth: 1, borderColor: '#eee' },
  optionText: { fontSize: 18, textAlign: 'center' },
  closeButton: { backgroundColor: '#000', padding: 10, borderRadius: 6, marginTop: 10 },
  closeText: { color: '#fff', fontSize: 16, textAlign: 'center' }
});

export default ReminderScreen;
