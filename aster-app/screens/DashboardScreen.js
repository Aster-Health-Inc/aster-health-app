import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';

const DashboardScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    getUser();
  }, []);

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        }
      ]
    );
  };

  const handleFeaturePress = (feature) => {
    switch (feature) {
      case 'cycle':
        navigation.navigate('CycleTracking');
        break;
      case 'calendar':
        Alert.alert('Coming Soon', 'Calendar & Mood tracking feature is coming soon!');
        break;
      case 'calorie':
        Alert.alert('Coming Soon', 'Calorie counter feature is coming soon!');
        break;
      case 'soon':
        Alert.alert('Coming Soon', 'More exciting features are on the way!');
        break;
      default:
        break;
    }
  };

  const features = [
    {
      id: 'cycle',
      title: 'Cycle Tracking',
      subtitle: 'Track your menstrual cycle',
      emoji: '🌸',
      color: '#e91e63',
      available: true,
    },
    {
      id: 'calendar',
      title: 'Calendar & Insights',
      subtitle: 'Plan with your cycle',
      emoji: '📅',
      color: '#9c27b0',
      available: false,
    },
    {
      id: 'calorie',
      title: 'Calorie Counter',
      subtitle: 'Track your nutrition',
      emoji: '🍎',
      color: '#ff9800',
      available: false,
    },
    {
      id: 'soon',
      title: 'Coming Soon',
      subtitle: 'More features ahead',
      emoji: '✨',
      color: '#4caf50',
      available: false,
    }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.appTitle}>Aster</Text>
          <Text style={styles.subtitle}>Choose Your Journey</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.welcomeText}>
          Welcome back, {user?.email?.split('@')[0]}! 👋
        </Text>

        <View style={styles.featuresGrid}>
          {features.map((feature) => (
            <TouchableOpacity
              key={feature.id}
              style={[
                styles.featureCard,
                { borderLeftColor: feature.color },
                !feature.available && styles.featureCardDisabled
              ]}
              onPress={() => handleFeaturePress(feature.id)}
              disabled={!feature.available}
            >
              <View style={styles.featureHeader}>
                <Text style={styles.featureEmoji}>{feature.emoji}</Text>
                {!feature.available && (
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText}>Soon</Text>
                  </View>
                )}
              </View>
              
              <Text style={[
                styles.featureTitle,
                !feature.available && styles.featureTitleDisabled
              ]}>
                {feature.title}
              </Text>
              
              <Text style={[
                styles.featureSubtitle,
                !feature.available && styles.featureSubtitleDisabled
              ]}>
                {feature.subtitle}
              </Text>

              {feature.available && (
                <View style={[styles.activeIndicator, { backgroundColor: feature.color }]} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.bottomSection}>
          <Text style={styles.bottomTitle}>Your Health Journey</Text>
          <Text style={styles.bottomText}>
            Aster is designed to support every aspect of your wellness. 
            Start with cycle tracking and explore more features as they become available.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  titleContainer: {
    flex: 1,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#e91e63',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  signOutButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e91e63',
  },
  signOutText: {
    color: '#e91e63',
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 30,
    textAlign: 'center',
  },
  featuresGrid: {
    gap: 16,
  },
  featureCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  featureCardDisabled: {
    opacity: 0.6,
  },
  featureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  featureEmoji: {
    fontSize: 32,
  },
  comingSoonBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  comingSoonText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  featureTitleDisabled: {
    color: '#999',
  },
  featureSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  featureSubtitleDisabled: {
    color: '#aaa',
  },
  activeIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bottomSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginTop: 30,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bottomTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e91e63',
    marginBottom: 12,
  },
  bottomText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
});

export default DashboardScreen;