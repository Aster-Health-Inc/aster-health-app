import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Keyboard,
  Platform,
  InputAccessoryView,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { usePostHog } from 'posthog-react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKGROUND = '#EEE7FF';
const SURFACE = '#FFFFFF';
const ACCESSORY_ID = 'account-details-accessory';

const BASE_PERSONAL_FIELDS = [
  { key: 'name', label: 'Name', value: 'Jane Doe' },
  { key: 'email', label: 'Email', value: 'jane.doe@email.com' },
  { key: 'phone', label: 'Phone Number', value: '+1 (813) 777-8888' },
  { key: 'password', label: 'Password', value: '**********' },
];

const BASE_HEALTH_FIELDS = [
  { key: 'age', label: 'Age', value: '—' },
  { key: 'height', label: 'Height', value: '—' },
  { key: 'weight', label: 'Weight', value: '—' },
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
  const posthog = usePostHog();
  const [personalFields, setPersonalFields] = useState(BASE_PERSONAL_FIELDS);
  const [healthFields, setHealthFields] = useState(BASE_HEALTH_FIELDS);
  const [form, setForm] = useState({
    age: '',
    heightFeet: '',
    heightInches: '',
    weight: '',
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [birthdate, setBirthdate] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState('');
  const ageRef = useRef(null);
  const heightFeetRef = useRef(null);
  const heightInchesRef = useRef(null);
  const weightRef = useRef(null);
  const nameRef = useRef(null);
  const phoneRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  const toAge = (dateString) => {
    if (!dateString) return null;
    const dob = new Date(dateString);
    if (Number.isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age -= 1;
    }
    return age;
  };

  const formatHeight = (totalInches) => {
    if (totalInches == null) return null;
    const inches = Number(totalInches);
    if (Number.isNaN(inches)) return null;
    const feet = Math.floor(inches / 12);
    const rem = inches % 12;
    return { feet, inches: rem };
  };

  useEffect(() => {
    let mounted = true;
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardVisible(true);
      setKeyboardHeight(e?.endCoordinates?.height || 0);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });
    supabase.auth.getUser().then(async ({ data: { user } }) => {
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

      let profileRow = null;

      try {
        const { data: userProfile, error } = await supabase
          .from('user_profiles')
          .select('name, birthdate, height, weight, unit_system')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!error && userProfile) {
          profileRow = userProfile;
        }
      } catch (err) {
        console.log('Fetch user profile failed', err);
      }

      const resolvedName =
        profileRow?.name ||
        meta.full_name ||
        meta.first_name ||
        meta.name ||
        user.email?.split('@')[0] ||
        '—';

      const weightValue = profileRow?.weight ?? meta.weight_lbs ?? meta.weight ?? meta.weight_kg;
      const isMetric = profileRow?.unit_system === 'metric' || (meta.unit_system === 'metric');
      const weight =
        weightValue && String(weightValue).trim()
          ? `${weightValue}${isMetric ? ' kg' : ' lbs'}`
          : '—';

      const heightObj = formatHeight(profileRow?.height ?? meta.height ?? meta.height_in);
      const height =
        heightObj && heightObj.feet >= 0
          ? `${heightObj.feet}' ${heightObj.inches}"`
          : '—';

      const ageValue = toAge(profileRow?.birthdate ?? meta.birthdate) ?? meta.age ?? meta.age_years;

      setPersonalFields([
        { key: 'name', label: 'Name', value: resolvedName },
        { key: 'email', label: 'Email', value: user.email || '—' },
        { key: 'phone', label: 'Phone Number', value: phone },
        { key: 'password', label: 'Password', value: '**********' },
      ]);

      setHealthFields([
        { key: 'age', label: 'Age', value: ageValue || '—' },
        { key: 'height', label: 'Height', value: height },
        { key: 'weight', label: 'Weight', value: weight },
      ]);

      const heightFeetVal = heightObj ? String(heightObj.feet) : '';
      const heightInchesVal = heightObj ? String(heightObj.inches) : '';
      setForm({
        age: ageValue ? String(ageValue) : '',
        heightFeet: heightFeetVal,
        heightInches: heightInchesVal,
        weight: weightValue ? String(weightValue) : '',
        name: resolvedName !== '—' ? resolvedName : '',
        phone: phone !== '—' ? String(phone) : '',
        email: user.email || '',
        password: '',
        confirmPassword: '',
      });
      setBirthdate(profileRow?.birthdate ?? null);
    });
    return () => {
      mounted = false;
      show.remove();
      hide.remove();
    };
  }, []);

  const focusNext = (field) => {
    const order = [
      'name',
      'phone',
      'email',
      'password',
      'confirmPassword',
      'age',
      'heightFeet',
      'heightInches',
      'weight',
    ];
    const idx = order.indexOf(field);
    if (idx === -1 || idx === order.length - 1) {
      Keyboard.dismiss();
      return;
    }
    const next = order[idx + 1];
    if (next === 'name') nameRef.current?.focus();
    if (next === 'phone') phoneRef.current?.focus();
    if (next === 'email') emailRef.current?.focus();
    if (next === 'password') passwordRef.current?.focus();
    if (next === 'confirmPassword') confirmPasswordRef.current?.focus();
    if (next === 'age') ageRef.current?.focus();
    if (next === 'heightFeet') heightFeetRef.current?.focus();
    if (next === 'heightInches') heightInchesRef.current?.focus();
    if (next === 'weight') weightRef.current?.focus();
  };

  const getErrorMessage = (err) => {
    const message = err?.message || err?.error_description || err?.details || '';
    if (!message) return 'Unable to delete account right now. Please try again.';
    return String(message);
  };

  const openDeleteConfirm = () => {
    if (deletingAccount) return;
    if (__DEV__) {
      console.log('[AccountDetails] Delete My Account pressed');
    }
    setDeleteAccountError('');
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    if (deletingAccount) return;
    setShowDeleteConfirm(false);
    setDeleteAccountError('');
  };

  const handleDeleteAccount = async () => {
    if (deletingAccount) return;
    setDeletingAccount(true);
    setDeleteAccountError('');
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Not signed in');

      const { error } = await supabase.rpc('delete_my_account');
      if (error) throw error;

      posthog?.capture('account_deleted');

      try {
        await supabase.auth.signOut();
      } catch (signOutErr) {
        console.warn('Sign out after account deletion failed', signOutErr);
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch (localSignOutErr) {
          console.warn('Local sign out fallback failed', localSignOutErr);
        }
      }

      setShowDeleteConfirm(false);
      setDeletingAccount(false);
      Alert.alert('Account deleted', 'Your account and data have been permanently deleted.');
    } catch (err) {
      const message = getErrorMessage(err);
      setDeleteAccountError(message);
      Alert.alert('Delete account failed', message);
      setDeletingAccount(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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
              {editing ? (
                <>
                  <View style={styles.inputRow}>
                    <Text style={styles.fieldLabel}>Name</Text>
                    <TextInput
                      ref={nameRef}
                      style={styles.input}
                      returnKeyType="next"
                      blurOnSubmit={false}
                      inputAccessoryViewID={Platform.OS === 'ios' ? ACCESSORY_ID : undefined}
                      value={form.name}
                      onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
                      onSubmitEditing={() => phoneRef.current?.focus()}
                      placeholder="Full name"
                      placeholderTextColor="#9A8FB3"
                      onFocus={() => setActiveField('name')}
                    />
                  </View>
                  <View style={styles.inputRow}>
                    <Text style={styles.fieldLabel}>Phone Number</Text>
                    <TextInput
                      ref={phoneRef}
                      style={styles.input}
                      keyboardType="phone-pad"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      inputAccessoryViewID={Platform.OS === 'ios' ? ACCESSORY_ID : undefined}
                      value={form.phone}
                      onChangeText={(value) => setForm((prev) => ({ ...prev, phone: value }))}
                      onSubmitEditing={() => emailRef.current?.focus()}
                      placeholder="Phone Number"
                      placeholderTextColor="#9A8FB3"
                      onFocus={() => setActiveField('phone')}
                    />
                  </View>
                  <View style={styles.inputRow}>
                    <Text style={styles.fieldLabel}>Email</Text>
                    <TextInput
                      ref={emailRef}
                      style={styles.input}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      inputAccessoryViewID={Platform.OS === 'ios' ? ACCESSORY_ID : undefined}
                      value={form.email}
                      onChangeText={(value) => setForm((prev) => ({ ...prev, email: value }))}
                      onSubmitEditing={() => passwordRef.current?.focus()}
                      placeholder="Email"
                      placeholderTextColor="#9A8FB3"
                      onFocus={() => setActiveField('email')}
                    />
                  </View>
                  <View style={styles.inputRow}>
                    <Text style={styles.fieldLabel}>Password</Text>
                    <TextInput
                      ref={passwordRef}
                      style={styles.input}
                      secureTextEntry
                      returnKeyType="next"
                      blurOnSubmit={false}
                      inputAccessoryViewID={Platform.OS === 'ios' ? ACCESSORY_ID : undefined}
                      value={form.password}
                      onChangeText={(value) => setForm((prev) => ({ ...prev, password: value }))}
                      onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                      placeholder="New password (leave blank to keep)"
                      placeholderTextColor="#9A8FB3"
                      onFocus={() => setActiveField('password')}
                    />
                  </View>
                  <View style={styles.inputRow}>
                    <Text style={styles.fieldLabel}>Retype Password</Text>
                    <TextInput
                      ref={confirmPasswordRef}
                      style={styles.input}
                      secureTextEntry
                      returnKeyType="done"
                      blurOnSubmit
                      inputAccessoryViewID={Platform.OS === 'ios' ? ACCESSORY_ID : undefined}
                      value={form.confirmPassword}
                      onChangeText={(value) => setForm((prev) => ({ ...prev, confirmPassword: value }))}
                      onSubmitEditing={() => Keyboard.dismiss()}
                      placeholder="Retype password"
                      placeholderTextColor="#9A8FB3"
                      onFocus={() => setActiveField('confirmPassword')}
                    />
                  </View>
                </>
              ) : (
                personalFields.map((item) => (
                  <FieldRow key={item.key} label={item.label} value={item.value} />
                ))
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Health Metrics</Text>
            <View style={styles.card}>
              {editing ? (
                <>
                  <View style={styles.inputRow}>
                    <Text style={styles.fieldLabel}>Age</Text>
                    <TextInput
                      style={styles.input}
                      ref={ageRef}
                      keyboardType="number-pad"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      inputAccessoryViewID={Platform.OS === 'ios' ? ACCESSORY_ID : undefined}
                      value={form.age}
                      onChangeText={(value) => setForm((prev) => ({ ...prev, age: value }))}
                      onSubmitEditing={() => heightFeetRef.current?.focus()}
                      placeholder="Age"
                      placeholderTextColor="#9A8FB3"
                      onFocus={() => setActiveField('age')}
                    />
                  </View>
                  <View style={styles.inputRow}>
                    <Text style={styles.fieldLabel}>Height</Text>
                    <View style={styles.heightRow}>
                    <TextInput
                      style={[styles.input, styles.heightInput]}
                      ref={heightFeetRef}
                      keyboardType="number-pad"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      inputAccessoryViewID={Platform.OS === 'ios' ? ACCESSORY_ID : undefined}
                      value={form.heightFeet}
                      onChangeText={(value) => setForm((prev) => ({ ...prev, heightFeet: value }))}
                      onSubmitEditing={() => heightInchesRef.current?.focus()}
                      placeholder="ft"
                      placeholderTextColor="#9A8FB3"
                      onFocus={() => setActiveField('heightFeet')}
                    />
                      <Text style={styles.heightSeparator}>ft</Text>
                    <TextInput
                      style={[styles.input, styles.heightInput]}
                      ref={heightInchesRef}
                      keyboardType="number-pad"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      inputAccessoryViewID={Platform.OS === 'ios' ? ACCESSORY_ID : undefined}
                      value={form.heightInches}
                      onChangeText={(value) => setForm((prev) => ({ ...prev, heightInches: value }))}
                      onSubmitEditing={() => weightRef.current?.focus()}
                      placeholder="in"
                      placeholderTextColor="#9A8FB3"
                      onFocus={() => setActiveField('heightInches')}
                    />
                      <Text style={styles.heightSeparator}>in</Text>
                    </View>
                  </View>
                  <View style={styles.inputRow}>
                    <Text style={styles.fieldLabel}>Weight</Text>
                    <TextInput
                      style={styles.input}
                      ref={weightRef}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                      blurOnSubmit
                      inputAccessoryViewID={Platform.OS === 'ios' ? ACCESSORY_ID : undefined}
                      value={form.weight}
                      onChangeText={(value) => setForm((prev) => ({ ...prev, weight: value }))}
                      onSubmitEditing={() => Keyboard.dismiss()}
                      placeholder="Weight (lbs)"
                      placeholderTextColor="#9A8FB3"
                      onFocus={() => setActiveField('weight')}
                    />
                  </View>
                </>
              ) : (
                healthFields.map((item) => (
                  <FieldRow key={item.key} label={item.label} value={item.value} />
                ))
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Actions</Text>
            {editing ? (
              <>
                <TouchableOpacity
                  style={[styles.saveButton, saving && { opacity: 0.6 }]}
                  activeOpacity={0.9}
                  onPress={async () => {
                    if (saving) return;
                    setSaving(true);
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) throw new Error('Not signed in');

                      const ageNum = form.age ? Number(form.age) : null;
                      const weightNum = form.weight ? Number(form.weight) : null;
                      const feetNum = form.heightFeet ? Number(form.heightFeet) : 0;
                      const inchNum = form.heightInches ? Number(form.heightInches) : 0;
                      const totalInches =
                        Number.isFinite(feetNum) && Number.isFinite(inchNum)
                          ? feetNum * 12 + inchNum
                          : null;

                      let nextBirthdate = birthdate ? new Date(birthdate) : new Date();
                      if (Number.isFinite(ageNum) && ageNum > 0 && ageNum < 120) {
                        const month = nextBirthdate.getMonth();
                        const day = nextBirthdate.getDate();
                        nextBirthdate = new Date();
                        nextBirthdate.setFullYear(nextBirthdate.getFullYear() - ageNum);
                        nextBirthdate.setMonth(month);
                        nextBirthdate.setDate(day);
                      }

                      const profilePayload = {
                        user_id: user.id,
                      };
                      if (Number.isFinite(weightNum)) {
                        profilePayload.weight = weightNum;
                      }
                      if (Number.isFinite(totalInches)) {
                        profilePayload.height = totalInches;
                      }
                      if (Number.isFinite(ageNum)) {
                        profilePayload.birthdate = nextBirthdate.toISOString().split('T')[0];
                      }

                      if (form.name.trim()) {
                        profilePayload.name = form.name.trim();
                      }

                      // Auth update for email/password + metadata
                      const authUpdates = {};
                      if (form.email && form.email !== user.email) {
                        authUpdates.email = form.email.trim();
                      }
                      if (form.password) {
                        if (form.password !== form.confirmPassword) {
                          throw new Error('Passwords do not match');
                        }
                        authUpdates.password = form.password;
                      }
                      authUpdates.data = {
                        ...user.user_metadata,
                        phone: form.phone || null,
                        full_name: form.name || null,
                      };

                      await Promise.all([
                        Object.keys(authUpdates).length ? supabase.auth.updateUser(authUpdates) : Promise.resolve(),
                        supabase.from('user_profiles').upsert(profilePayload, { onConflict: 'user_id' }),
                      ]);

                      const ageDisplay = Number.isFinite(ageNum) ? ageNum : healthFields[0].value;
                      const heightDisplay =
                        Number.isFinite(totalInches) && totalInches >= 0
                          ? `${Math.floor(totalInches / 12)}' ${totalInches % 12}"`
                          : healthFields[1].value;
                      const weightDisplay =
                        Number.isFinite(weightNum) && weightNum > 0 ? `${weightNum} lbs` : healthFields[2].value;

                      setHealthFields([
                        { key: 'age', label: 'Age', value: ageDisplay || '—' },
                        { key: 'height', label: 'Height', value: heightDisplay || '—' },
                        { key: 'weight', label: 'Weight', value: weightDisplay || '—' },
                      ]);

                      setPersonalFields([
                        { key: 'name', label: 'Name', value: form.name || '—' },
                        { key: 'email', label: 'Email', value: form.email || '—' },
                        { key: 'phone', label: 'Phone Number', value: form.phone || '—' },
                        { key: 'password', label: 'Password', value: '**********' },
                      ]);

                      setBirthdate(profilePayload.birthdate || birthdate);
                      const measurementTypes = [];
                      if (Number.isFinite(weightNum)) {
                        measurementTypes.push('weight');
                      }
                      if (Number.isFinite(totalInches)) {
                        measurementTypes.push('height');
                      }
                      posthog?.capture('measurement_logged', {
                        measurement_types: measurementTypes.length ? measurementTypes : undefined,
                        weight_lbs: Number.isFinite(weightNum) ? weightNum : undefined,
                        height_in: Number.isFinite(totalInches) ? totalInches : undefined,
                      });
                      setEditing(false);
                    } catch (err) {
                      console.log('Save profile failed', err);
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  activeOpacity={0.9}
                  onPress={() => {
                    setEditing(false);
                  }}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.editButton} activeOpacity={0.9} onPress={() => setEditing(true)}>
                  <Text style={styles.editText}>Edit Details</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dangerButton, deletingAccount && styles.dangerButtonDisabled]}
                  activeOpacity={0.9}
                  onPress={openDeleteConfirm}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Delete my account"
                  disabled={deletingAccount}
                  testID="delete-account-button"
                >
                  <Text style={styles.dangerText}>{deletingAccount ? 'Deleting...' : 'Delete My Account'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
        {Platform.OS === 'ios' && (
          <InputAccessoryView nativeID={ACCESSORY_ID}>
            <View style={styles.inputAccessory}>
              <TouchableOpacity onPress={() => Keyboard.dismiss()} style={styles.inputAccessoryButton}>
                <Text style={styles.inputAccessoryText}>Done</Text>
              </TouchableOpacity>
            </View>
          </InputAccessoryView>
        )}
        {Platform.OS !== 'ios' && keyboardVisible && (
          <View style={[styles.keyboardBar, { bottom: keyboardHeight || 0 }]}>
            <TouchableOpacity
              style={styles.keyboardBarButton}
              onPress={() => focusNext(activeField)}
              disabled={!activeField}
            >
              <Text style={styles.keyboardBarText}>Next</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.keyboardBarButton, styles.keyboardBarPrimary]}
              onPress={() => Keyboard.dismiss()}
            >
              <Text style={[styles.keyboardBarText, styles.keyboardBarTextPrimary]}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

        <Modal
          animationType="fade"
          transparent
          visible={showDeleteConfirm}
          onRequestClose={closeDeleteConfirm}
        >
          <View style={styles.deleteModalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              onPress={closeDeleteConfirm}
              disabled={deletingAccount}
            />
            <View style={styles.deleteModalCard}>
              <Text style={styles.deleteModalTitle}>Delete account</Text>
              <Text style={styles.deleteModalBody}>
                This permanently deletes your account and data. This cannot be undone.
              </Text>
              {!!deleteAccountError && (
                <Text style={styles.deleteModalError}>{deleteAccountError}</Text>
              )}
              <View style={styles.deleteModalActions}>
                <TouchableOpacity
                  style={[styles.deleteModalButton, styles.deleteModalCancelButton]}
                  activeOpacity={0.88}
                  onPress={closeDeleteConfirm}
                  disabled={deletingAccount}
                >
                  <Text style={styles.deleteModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.deleteModalButton,
                    styles.deleteModalDeleteButton,
                    deletingAccount && styles.deleteModalDeleteButtonDisabled,
                  ]}
                  activeOpacity={0.88}
                  onPress={handleDeleteAccount}
                  disabled={deletingAccount}
                  testID="confirm-delete-account-button"
                >
                  {deletingAccount ? (
                    <View style={styles.deleteLoadingRow}>
                      <ActivityIndicator color="#FFFFFF" size="small" />
                      <Text style={styles.deleteModalDeleteText}>Deleting...</Text>
                    </View>
                  ) : (
                    <Text style={styles.deleteModalDeleteText}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  inputRow: {
    gap: 6,
  },
  input: {
    backgroundColor: '#F5F1FF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 13,
    color: '#2E2148',
  },
  heightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heightInput: {
    flex: 1,
    textAlign: 'center',
  },
  heightSeparator: {
    fontSize: 13,
    color: '#6B5C88',
  },
  dangerButton: {
    backgroundColor: '#EACDD1',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    width: '100%',
  },
  dangerButtonDisabled: {
    opacity: 0.7,
  },
  editButton: {
    backgroundColor: '#C7F2D4',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  editText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#20683D',
  },
  dangerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C94242',
  },
  saveButton: {
    backgroundColor: '#4B117B',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelButton: {
    backgroundColor: '#EDE6FF',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B117B',
  },
  inputAccessory: {
    backgroundColor: '#F4F1FB',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9D1EB',
    alignItems: 'flex-end',
  },
  inputAccessoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#4B117B',
  },
  inputAccessoryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  keyboardBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F4F1FB',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9D1EB',
  },
  keyboardBarButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#E5DBFF',
  },
  keyboardBarPrimary: {
    backgroundColor: '#4B117B',
  },
  keyboardBarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B117B',
  },
  keyboardBarTextPrimary: {
    color: '#FFFFFF',
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 14, 36, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  deleteModalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 12,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#241A3A',
  },
  deleteModalBody: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4D4465',
  },
  deleteModalError: {
    fontSize: 13,
    color: '#B42318',
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  deleteModalButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  deleteModalCancelButton: {
    backgroundColor: '#F2ECFF',
  },
  deleteModalDeleteButton: {
    backgroundColor: '#C94242',
  },
  deleteModalDeleteButtonDisabled: {
    opacity: 0.75,
  },
  deleteModalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B117B',
  },
  deleteModalDeleteText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deleteLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
