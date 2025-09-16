// screens/ReminderSetupScreen.js
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import * as Notifications from 'expo-notifications'
import { useNavigation } from '@react-navigation/native'
import { log, warn, error } from '../utils/CrashLogger';

log('User pressed button', { id: 42 });
warn('Slow API response');
error('Login failed');
export default function ReminderSetupScreen() {
  const navigation = useNavigation()

  const requestNotificationPermission = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'You can enable notifications later in settings.')
      } else {
        Alert.alert('Notifications enabled!', 'We\'ll send you helpful reminders.')
      }

      navigation.reset({
        index: 0,
        routes: [{ name: 'Reminder' }],
      })
    } catch (error) {
      console.log('Notification permission error:', error)
      Alert.alert('Error', 'Could not request notification permissions.')
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications</Text>
      <Text style={styles.description}>
        Press <Text style={styles.allowBold}>“Allow”</Text> to let us send you reminders.
        {'\n\n'}
        Want us to gently nudge you when it's time to log how you feel, track symptoms, or get cycle-based hormone insights?
      </Text>

      <TouchableOpacity style={styles.button} onPress={requestNotificationPermission}>
        <Text style={styles.buttonText}>Allow notifications</Text>
      </TouchableOpacity>

      {/* 🚀 Testing Shortcut Button */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#555', marginTop: 20 }]}
        onPress={() => navigation.navigate('Reminder')}
      >
        <Text style={styles.buttonText}>Skip & Go to Reminder Screen</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#555',
    marginBottom: 40,
    lineHeight: 24,
  },
  allowBold: {
    fontWeight: '700',
    color: '#000',
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
})
