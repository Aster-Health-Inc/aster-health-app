import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/supabase';

const BACKGROUND = '#EEE7FF';
const SURFACE = '#FFFFFF';

const BASE_PERSONAL_FIELDS = [
  { key: 'name', label: 'Name', value: 'Jane Doe' },
  { key: 'email', label: 'Email', value: 'jane.doe@email.com' },
  { key: 'phone', label: 'Phone Number', value: '+1 (813) 777-8888' },
  { key: 'password', label: 'Password', value: '**********' },
];

const BASE_HEALTH_FIELDS = [
  { key: 'age', label: 'Age', value: '41' },
  { key: 'weight', label: 'Weight', value: '145 lbs' },
  { key: 'heightPrimary', label: 'Height', value: "5' 1\"" },
  { key: 'calories', label: 'Daily Calories', value: '1300 cal' },
  { key: 'heightSecondary', label: 'Height', value: "5' 1\"" },
];

const FieldRow = ({ label, value }) => (
  <View style={styles.fieldRow}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.fieldValuePill}>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  </View>
);

const AccountDetailsScreen = () => {
  const navigation = useNavigation();
  const [personalFields, setPersonalFields] = useState(BASE_PERSONAL_FIELDS);
  const [healthFields, setHealthFields] = useState(BASE_HEALTH_FIELDS);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!mounted || !user) return;
      const meta = user.user_metadata || {};

      const name =
        meta.full_name ||
        meta.first_name ||
        meta.name ||
        user.email?.split('@')[0] ||
        '—';
      const phone =
        meta.phone ||
        meta.phone_number ||
        meta.contact ||
        '—';
      const age = meta.age || meta.age_years || '—';

      const weightValue = meta.weight_lbs || meta.weight || meta.weight_kg;
      const weight =
        weightValue && String(weightValue).trim()
          ? `${weightValue}${meta.weight_kg ? ' kg' : meta.weight_lbs ? ' lbs' : ''}`
          : '—';

      const heightDisplay = () => {
        const raw = meta.height || meta.height_in || meta.height_cm;
        if (raw === undefined || raw === null) return null;
        if (typeof raw === 'string') return raw;
        const num = Number(raw);
        if (Number.isNaN(num)) return null;
        // Assume inches if plausible, else cm convert to ft/in
        const inches = meta.height_cm ? Math.round(num / 2.54) : Math.round(num);
        const feet = Math.floor(inches / 12);
        const rem = inches % 12;
        return `${feet}' ${rem}"`;
      };
      const height = heightDisplay() || "5' 1\"";

      const calories =
        meta.daily_calories ||
        meta.calories_goal ||
        meta.calorie_goal ||
        '—';

      setPersonalFields([
        { key: 'name', label: 'Name', value: name },
        { key: 'email', label: 'Email', value: user.email || '—' },
        { key: 'phone', label: 'Phone Number', value: phone },
        { key: 'password', label: 'Password', value: '**********' },
      ]);

      setHealthFields([
        { key: 'age', label: 'Age', value: age },
        { key: 'weight', label: 'Weight', value: weight },
        { key: 'heightPrimary', label: 'Height', value: height },
        { key: 'calories', label: 'Daily Calories', value: calories },
        { key: 'heightSecondary', label: 'Height', value: height },
      ]);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.closeButton}
              activeOpacity={0.85}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="close" size={22} color="#3F2560" />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Account Details</Text>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Personal Details</Text>
            <View style={styles.card}>
              {personalFields.map((item) => (
                <FieldRow key={item.key} label={item.label} value={item.value} />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Health Metrics</Text>
            <View style={styles.card}>
              {healthFields.map((item) => (
                <FieldRow key={item.key} label={item.label} value={item.value} />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Actions</Text>
            <TouchableOpacity style={styles.dangerButton} activeOpacity={0.9}>
              <Text style={styles.dangerText}>Delete My Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default AccountDetailsScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 50,
    gap: 18,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B8A6E8',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#3F2560',
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B3A6C',
  },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 18,
    padding: 12,
    gap: 10,
    shadowColor: '#B8A6E8',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    fontSize: 13,
    color: '#2E2148',
    flex: 1,
  },
  fieldValuePill: {
    backgroundColor: '#EFEFEF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 120,
    alignItems: 'center',
  },
  fieldValue: {
    fontSize: 13,
    color: '#2E2148',
    fontWeight: '700',
  },
  dangerButton: {
    backgroundColor: '#EACDD1',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  dangerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C94242',
  },
});
