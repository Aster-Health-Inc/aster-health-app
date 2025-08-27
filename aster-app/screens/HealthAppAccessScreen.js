// screens/HealthAccessScreen.js
import React, { useMemo, useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Image, Switch, Platform, Alert
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { requestHealthPermissions } from '../lib/healthkit'

export default function HealthAccessScreen() {
  const navigation = useNavigation()

  // you can rename or add items here; these are just examples
  const items = useMemo(() => ([
    // identifier: HealthKit type we will request
    { key: 'cycle', label: 'Cycle Tracking', identifier: 'HKCategoryTypeIdentifierMenstrualFlow', read: true, write: true },
    { key: 'calcium', label: 'Calcium', identifier: 'HKQuantityTypeIdentifierDietaryCalcium', read: true, write: true },
  ]), [])

  const [enabled, setEnabled] = useState(() =>
    items.reduce((acc, it) => ({ ...acc, [it.key]: true }), {})
  )
  const allOn = Object.values(enabled).every(Boolean)

  const toggleAll = (val) => {
    const updated = {}
    for (const it of items) updated[it.key] = val
    setEnabled(updated)
  }
  const toggleOne = (key, val) => setEnabled((e) => ({ ...e, [key]: val }))

  const onContinue = async () => {
    try {
      const selected = items.filter(it => enabled[it.key])
      if (Platform.OS === 'ios' && selected.length) {
        const result = await requestHealthPermissions(selected)
        // result.ok false means we are likely on Expo Go or user denied
        if (!result.ok && result.reason) {
          console.log('Health permission note:', result.reason)
        }
      }
      navigation.navigate('CarouselWalkthrough')
    } catch (e) {
      console.log('❌ Health permission error:', e)
      Alert.alert('Could not request Health permissions right now.')
      navigation.navigate('CarouselWalkthrough')
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Health Access</Text>

    <View style={styles.card}>
        <Image
            source={require('../assets/apple-health.png')}
            style={styles.heart}
            resizeMode="contain"
        />
            <Text style={styles.sectionTitle}>Health</Text>

        <Text style={styles.body}>
          “Aster” would like to access and update your health data.
        </Text>

        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.pill, allOn ? styles.pillOn : styles.pillOff]}
            activeOpacity={0.9}
            onPress={() => toggleAll(!allOn)}
          >
            <Text style={[styles.pillText, allOn ? styles.pillTextOn : styles.pillTextOff]}>
              Turn on All
            </Text>
          </TouchableOpacity>
          <Switch
            value={allOn}
            onValueChange={toggleAll}
            trackColor={{ true: '#34C759' }}
          />
        </View>

        {items.map(it => (
          <View style={styles.rowItem} key={it.key}>
            <Text style={styles.itemText}>{it.label}</Text>
            <Switch
              value={enabled[it.key]}
              onValueChange={(v) => toggleOne(it.key, v)}
              trackColor={{ true: '#34C759' }}
            />
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.cta} onPress={onContinue}>
        <Text style={styles.ctaText}>Continue</Text>
      </TouchableOpacity>

      {Platform.OS !== 'ios' && (
        <Text style={styles.note}>
          Note: Apple Health is iOS only. We will skip this on your device.
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', padding: 24, paddingTop: 40 },
  header: { fontSize: 18, textAlign: 'center', color: '#000', marginBottom: 12, fontWeight: '600' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
    elevation: 2
  },
  heart: { width: 56, height: 56, borderRadius: 12, alignSelf: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', color: '#000' },
  body: { marginTop: 8, fontSize: 14, color: '#444', textAlign: 'center' },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  pill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  pillOn: { backgroundColor: '#E8FFF0', borderColor: '#D6F7E1' },
  pillOff: { backgroundColor: '#F7F7F7', borderColor: '#E6E6E6' },
  pillText: { fontSize: 14, fontWeight: '600' },
  pillTextOn: { color: '#0A7A30' },
  pillTextOff: { color: '#333' },

  rowItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#eee'
  },
  itemText: { fontSize: 15, color: '#000' },

  cta: { backgroundColor: '#000', borderRadius: 28, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  note: { textAlign: 'center', marginTop: 8, color: '#666', fontSize: 12 }
})
