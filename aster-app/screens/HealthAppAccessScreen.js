// screens/HealthAccessScreen.js
import React, { useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image, Switch, Platform, Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { requestHealthPermissions } from '../lib/healthkit';
import { log, warn, error } from '../utils/CrashLogger';

const C = {
  bg: '#FFFFFF',
  groupBg: '#F2F2F7',
  grayPill: '#E9E9EB',
  text: '#111111',
  sub: '#6C6C70',
  blue: '#007AFF',
  switchGreen: '#34C759',
  black: '#000000',
  border: '#D1D1D6',
};

export default function HealthAccessScreen() {
  const navigation = useNavigation();

  const items = useMemo(() => ([
    { key: 'data1', label: 'Data', identifier: 'HKWorkoutTypeIdentifier', read: true, write: false },
    { key: 'data2', label: 'Data', identifier: 'HKQuantityTypeIdentifierActiveEnergyBurned', read: true, write: false },
    { key: 'data3', label: 'Data', identifier: 'HKQuantityTypeIdentifierDistanceWalkingRunning', read: true, write: false },
    { key: 'data4', label: 'Data', identifier: 'HKQuantityTypeIdentifierHeartRate', read: true, write: false },
  ]), []);

  const [enabled, setEnabled] = useState(() =>
    items.reduce((acc, it) => ({ ...acc, [it.key]: true }), {})
  );
  const allOn = Object.values(enabled).every(Boolean);
  const [banner, setBanner] = useState(null);

  const toggleAll = (val) => {
    const u = {};
    for (const it of items) u[it.key] = val;
    setEnabled(u);
  };
  const toggleOne = (key, val) => setEnabled((e) => ({ ...e, [key]: val }));

  const onContinue = async () => {
    try {
      log('HealthAccess continue', { selected: Object.keys(enabled).filter(k => enabled[k]) });
      const selected = items.filter(it => enabled[it.key]);

      if (Platform.OS === 'ios' && selected.length) {
        const res = await requestHealthPermissions(selected);
        if (!res || !res.ok) {
          setBanner((res && res.reason) || 'Health permissions not granted. You can enable them later in Settings.');
          warn('HealthAccess permission not granted', { reason: res && res.reason });
        }
      } else if (Platform.OS !== 'ios') {
        setBanner('Apple Health is only available on iOS. We’ll skip this step on your device.');
      }

      navigation.navigate('CarouselWalkthrough');
    } catch (e) {
      error('HealthAccess error', { err: String(e) });
      Alert.alert('Heads up', 'Could not request Health permissions right now.');
      navigation.navigate('CarouselWalkthrough');
    }
  };

  return (
    <View style={s.screen}>
      <Text style={s.header}>Health Access</Text>

      <View style={s.iconWrap}>
        <View style={s.iconSquare}>
          <Image source={require('../assets/apple-health.png')} style={s.heart} resizeMode="contain" />
        </View>
      </View>

      <View style={s.copyBlock}>
        <Text style={s.title}>Health</Text>
        <Text style={s.body}>&quot;Aster&quot; would like to access and update your health data.</Text>
      </View>

      <View style={s.turnOnAllRow}>
        <TouchableOpacity
          style={[s.turnOnAllPill, allOn ? s.turnOnAllOn : null]}
          activeOpacity={0.8}
          onPress={() => toggleAll(!allOn)}
        >
          <Text style={s.turnOnAllText}>Turn on All</Text>
        </TouchableOpacity>

        <Switch value={allOn} onValueChange={toggleAll} trackColor={{ true: C.switchGreen }} />
      </View>

      <View style={s.group}>
        {items.map((it, idx) => (
          <View key={it.key} style={[s.row, idx === 0 && s.rowFirst, idx === items.length - 1 && s.rowLast]}>
            <View style={s.rowLeft}>
              <View style={s.blueBox}>
                <Ionicons name="square-outline" size={12} color={C.blue} />
              </View>
              <Text style={s.rowLabel}>{it.label}</Text>
            </View>
            <Switch
              value={enabled[it.key]}
              onValueChange={(v) => toggleOne(it.key, v)}
              trackColor={{ true: C.switchGreen }}
            />
          </View>
        ))}
      </View>

      <TouchableOpacity style={s.primary} onPress={onContinue} activeOpacity={0.9}>
        <Text style={s.primaryText}>Continue</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.secondary} onPress={() => navigation.navigate('CarouselWalkthrough')} activeOpacity={0.9}>
        <Text style={s.secondaryText}>Skip for now</Text>
      </TouchableOpacity>

      {banner ? <Text style={s.banner}>{banner}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 20, paddingTop: 18 },
  header: { fontSize: 13, textAlign: 'center', color: C.sub, marginBottom: 8 },

  iconWrap: { alignItems: 'center', marginTop: 4 },
  iconSquare: {
    width: 64, height: 64, borderRadius: 14, backgroundColor: '#F7F7FA',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  heart: { width: 36, height: 36 },

  copyBlock: { marginTop: 14 },
  title: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 6 },
  body: { fontSize: 14, color: C.sub },

  turnOnAllRow: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  turnOnAllPill: { backgroundColor: C.grayPill, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  turnOnAllOn: { backgroundColor: '#E4F7EA' },
  turnOnAllText: { color: C.text, fontWeight: '700' },

  group: { marginTop: 12, backgroundColor: C.grayPill, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  row: {
    backgroundColor: '#F8F8FA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#ECECEE',
  },
  rowFirst: {},
  rowLast: {},
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  blueBox: {
    width: 22, height: 22, borderRadius: 6,
    backgroundColor: '#E6F0FF', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#D0E2FF',
  },
  rowLabel: { color: C.blue, fontSize: 14, fontWeight: '600' },

  primary: { backgroundColor: C.black, borderRadius: 28, alignItems: 'center', paddingVertical: 14, marginTop: 16 },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  secondary: { borderColor: C.black, borderWidth: 1.5, borderRadius: 28, alignItems: 'center', paddingVertical: 12, marginTop: 10, backgroundColor: '#fff' },
  secondaryText: { color: C.black, fontWeight: '700', fontSize: 16 },

  banner: { textAlign: 'center', marginTop: 10, color: '#9A3412', fontSize: 12 },
});
