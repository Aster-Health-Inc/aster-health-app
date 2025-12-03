import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { supabase } from '../lib/supabase';
import { requestHealthPermissions } from '../lib/healthkit';

const BACKGROUND = '#EEE7FF';
const SURFACE = '#FFFFFF';

const SETTINGS_ITEMS = [
  { key: 'account', label: 'Account Details', navigateTo: 'AccountDetails' },
  { key: 'privacy', label: 'Privacy & Information Safety', navigateTo: 'PrivacySafety' },
  { key: 'notifications', label: 'Notifications', navigateTo: 'Notifications' },
  { key: 'help', label: 'Help & Feedback', navigateTo: 'HelpFeedback' },
  { key: 'import', label: 'Import Data from Third Party', navigateTo: 'DataImport' },
  { key: 'logout', label: 'Log Out', action: 'logout' },
];

const HEALTH_PERMISSIONS = [
  { identifier: 'HKQuantityTypeIdentifierStepCount', read: true },
  { identifier: 'HKQuantityTypeIdentifierActiveEnergyBurned', read: true },
  { identifier: 'HKQuantityTypeIdentifierDistanceWalkingRunning', read: true },
  { identifier: 'HKWorkoutTypeIdentifier', read: true },
];

const SettingsScreen = () => {
  const navigation = useNavigation();
  const [userProfile, setUserProfile] = useState({
    name: 'Jane Doe',
    plan: 'Premium Member',
    avatar_url: null,
  });
  const [syncingHealth, setSyncingHealth] = useState(false);
  const [healthStatus, setHealthStatus] = useState(null);

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

  const handleHealthConnect = async () => {
    if (syncingHealth) return;
    setSyncingHealth(true);
    try {
      const res = await requestHealthPermissions(HEALTH_PERMISSIONS);
      setHealthStatus(res.ok ? 'Connected to Apple Health' : res.reason || 'Unable to connect');
    } catch (err) {
      setHealthStatus(err?.message || 'Unable to connect to Apple Health');
    } finally {
      setSyncingHealth(false);
    }
  };

  const handleItemPress = async (item) => {
    if (item.action === 'logout') {
      await supabase.auth.signOut();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' }],
      });
      return;
    }
    if (item.navigateTo) {
      navigation.navigate(item.navigateTo);
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

          <View style={styles.healthCard}>
            <View style={styles.healthCardRow}>
              <View style={styles.healthIcon}>
                <Ionicons name="heart" size={18} color="#E45471" />
              </View>
              <View style={styles.healthInfo}>
                <Text style={styles.healthTitle}>Connect to Apple Health</Text>
                {healthStatus ? (
                  <Text style={styles.healthStatus} numberOfLines={1}>
                    {healthStatus}
                  </Text>
                ) : (
                  <Text style={styles.healthStatusMuted}>Sync your workouts and activity data</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.healthAction}
                onPress={handleHealthConnect}
                activeOpacity={0.85}
              >
                {syncingHealth ? (
                  <Ionicons name="sync-outline" size={20} color="#3F2560" />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color="#3F2560" />
                )}
              </TouchableOpacity>
            </View>
          </View>

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
  healthCard: {
    backgroundColor: SURFACE,
    borderRadius: 26,
    paddingVertical: 18,
    paddingHorizontal: 20,
    shadowColor: '#B8A6E8',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  healthCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  healthIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FDE5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthInfo: {
    flex: 1,
  },
  healthTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3F2560',
  },
  healthStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B117B',
    marginTop: 2,
  },
  healthStatusMuted: {
    fontSize: 12,
    color: '#9D96B9',
    marginTop: 2,
  },
  healthAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F1FF',
    alignItems: 'center',
    justifyContent: 'center',
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
});
