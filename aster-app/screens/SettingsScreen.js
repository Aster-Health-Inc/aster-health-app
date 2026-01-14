import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../lib/supabase';

const BACKGROUND = '#EEE7FF';
const SURFACE = '#FFFFFF';

const SETTINGS_ITEMS = [
  { key: 'account', label: 'Account Details', navigateTo: 'AccountDetails' },
  { key: 'privacy', label: 'Privacy & Information Safety', navigateTo: 'PrivacySafety' },
  { key: 'healthData', label: 'Health Data Usage', navigateTo: 'HealthDataUsage' },
  { key: 'notifications', label: 'Notifications', navigateTo: 'Notifications' },
  { key: 'help', label: 'Help & Feedback', navigateTo: 'HelpFeedback' },
  { key: 'import', label: 'Import Data from Third Party', navigateTo: 'DataImport' },
  { key: 'logout', label: 'Log Out', action: 'logout' },
];

const SettingsScreen = () => {
  const navigation = useNavigation();
  const [userProfile, setUserProfile] = useState({
    name: 'Jane Doe',
    plan: 'Premium Member',
    avatar_url: null,
  });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!mounted || !user) return;
      const metadata = user.user_metadata ?? {};
      const name =
        metadata.full_name ||
        metadata.first_name ||
        metadata.name ||
        user.email?.split('@')[0] ||
        'Jane Doe';
      setUserProfile({
        name,
        plan: metadata.plan_name || 'Premium Member',
        avatar_url: metadata.avatar_url || null,
      });
    });
    return () => {
      mounted = false;
    };
  }, []);

  const initials = useMemo(() => {
    const parts = String(userProfile.name)
      .split(' ')
      .filter(Boolean)
      .slice(0, 2);
    if (!parts.length) return 'JD';
    return parts.map((part) => part.charAt(0).toUpperCase()).join('');
  }, [userProfile.name]);

  const handleItemPress = (item) => {
    if (item.action === 'logout') {
      setShowLogoutConfirm(true);
      return;
    }
    if (item.navigateTo) {
      navigation.navigate(item.navigateTo);
    }
  };

  const confirmLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Logout failed', err);
      setLoggingOut(false);
      return;
    }
    setShowLogoutConfirm(false);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Welcome' }],
    });
  };

  const closeLogoutModal = () => {
    if (!loggingOut) {
      setShowLogoutConfirm(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
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
          <Text style={styles.title}>Account Settings</Text>

          <LinearGradient
            colors={['#BFAEFF', '#F2D3C7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileCard}
          >
            <View style={styles.avatarWrap}>
              {userProfile.avatar_url ? (
                <Image source={{ uri: userProfile.avatar_url }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{userProfile.name}</Text>
              <Text style={styles.profilePlan}>{userProfile.plan}</Text>
            </View>
          </LinearGradient>

          <View style={styles.listCard}>
            {SETTINGS_ITEMS.map((item, index) => (
              <TouchableOpacity
                key={item.key}
                style={[styles.listItem, index === SETTINGS_ITEMS.length - 1 && styles.listItemLast]}
                activeOpacity={0.85}
                onPress={() => handleItemPress(item)}
              >
                <Text
                  style={[
                    styles.listItemText,
                    item.action === 'logout' && styles.logoutText,
                  ]}
                >
                  {item.label}
                </Text>
                <Ionicons
                  name={item.action === 'logout' ? 'log-out-outline' : 'chevron-forward'}
                  size={20}
                  color={item.action === 'logout' ? '#D84A4A' : '#A49DC0'}
                />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={showLogoutConfirm}
        onRequestClose={closeLogoutModal}
      >
        <View style={styles.logoutModalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={closeLogoutModal}
            disabled={loggingOut}
          />
          <View style={styles.logoutModalCard}>
            <Text style={styles.logoutModalText}>Are you sure you want to log out?</Text>
            <TouchableOpacity
              style={[
                styles.logoutModalButton,
                loggingOut && styles.logoutModalButtonDisabled,
              ]}
              activeOpacity={0.88}
              onPress={confirmLogout}
              disabled={loggingOut}
            >
              <Text style={styles.logoutModalButtonText}>
                {loggingOut ? 'Logging Out...' : 'Log Out'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default SettingsScreen;

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
    paddingHorizontal: 24,
    paddingBottom: 60,
    paddingTop: 16,
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
    fontSize: 24,
    fontWeight: '700',
    color: '#3F2560',
  },
  profileCard: {
    borderRadius: 32,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 20,
  },
  avatarWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B8A6E8',
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFE8FF',
  },
  avatarInitials: {
    fontSize: 36,
    fontWeight: '700',
    color: '#4B117B',
  },
  profileInfo: {
    alignItems: 'center',
    gap: 6,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: SURFACE,
  },
  profilePlan: {
    fontSize: 14,
    fontWeight: '600',
    color: SURFACE,
    opacity: 0.85,
  },
  listCard: {
    backgroundColor: '#E2D6FF',
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 0,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(63,37,96,0.2)',
    backgroundColor: SURFACE,
  },
  listItemLast: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  listItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3F2560',
  },
  logoutText: {
    color: '#D84A4A',
  },
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoutModalCard: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: SURFACE,
    paddingVertical: 30,
    paddingHorizontal: 24,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
    alignItems: 'center',
  },
  logoutModalText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F103B',
    textAlign: 'center',
    marginBottom: 22,
  },
  logoutModalButton: {
    backgroundColor: '#4B117B',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 30,
    minWidth: 180,
    alignItems: 'center',
  },
  logoutModalButtonDisabled: {
    opacity: 0.7,
  },
  logoutModalButtonText: {
    color: SURFACE,
    fontSize: 16,
    fontWeight: '700',
  },
});
