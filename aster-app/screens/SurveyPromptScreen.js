// screens/SurveyPromptScreen.js
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { supabase } from '../lib/supabase'


export default function SurveyPromptScreen() {
  const navigation = useNavigation()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>For better predictions…</Text>
      <Text style={styles.subtitle}>
        Would you like to take a quick 5-minute survey to give us more info about your overall health?
      </Text>

      <TouchableOpacity 
        style={styles.primaryButton} 
        onPress={() => navigation.navigate('FlowIntensity')}
      >
        <Text style={styles.primaryButtonText}>Let’s do it →</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={() => navigation.navigate('ReminderSetup')}
      >
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={async () => {
        await supabase.auth.signOut()
        navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] })
        }}>
          <Text style={{ color: 'red', marginTop: 20 }}>Log Out and Reset</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdf6f3',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    marginBottom: 20,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  skipText: {
    fontSize: 15,
    color: '#777',
    textDecorationLine: 'underline',
  },
})
