import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native'
import { supabase } from '../lib/supabase'

const CycleDetailsScreen = ({ navigation }) => {
  const [cycleLength, setCycleLength] = useState('')
  const [periodLength, setPeriodLength] = useState('')
  const isFormFilled = cycleLength && periodLength

  const handleContinue = async () => {
    if (!isFormFilled) {
      Alert.alert('Missing Fields', 'Please fill in both fields.')
      return
    }

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData?.user?.id) {
      Alert.alert('Error', 'Unable to get user information.')
      return
    }

    const userId = userData.user.id

    try {
      // Insert a placeholder period row (optional)
      const { error: insertError } = await supabase.from('periods').insert([
        {
          user_id: userId,
          start_date: new Date().toISOString().split('T')[0], // today's date
        }
      ])

      if (insertError) {
        console.log('❌ Period insert error:', insertError)
        Alert.alert('Error', 'Could not save period.')
        return
      }

      // Update user's cycle stats
      const { error: updateError } = await supabase
        .from('users')
        .update({
          average_cycle_length: parseInt(cycleLength),
          average_period_length: parseInt(periodLength),
        })
        .eq('id', userId)

      if (updateError) {
        console.log('❌ User update error:', updateError)
        Alert.alert('Error', 'Could not update cycle details.')
        return
      }

      navigation.navigate('SurveyPrompt')
    } catch (err) {
      console.log('❌ Unexpected error:', err)
      Alert.alert('Unexpected error occurred.')
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : null} style={styles.container}>
      <Text style={styles.title}>Tell us about your cycle</Text>
      <TextInput
        style={styles.input}
        placeholder="Average cycle length (days)"
        placeholderTextColor="#888"
        keyboardType="numeric"
        value={cycleLength}
        onChangeText={setCycleLength}
      />
      <TextInput
        style={styles.input}
        placeholder="Average period length (days)"
        placeholderTextColor="#888"
        keyboardType="numeric"
        value={periodLength}
        onChangeText={setPeriodLength}
      />
      <TouchableOpacity
        style={[styles.button, !isFormFilled && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={!isFormFilled}
      >
        <Text style={styles.buttonText}>Continue →</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5E6D3', padding: 20, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '600', textAlign: 'center', marginBottom: 30 },
  input: {
    backgroundColor: '#F2DFCF',
    padding: 15,
    borderRadius: 30,
    marginBottom: 20,
    fontSize: 16,
    color: '#000'
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center'
  },
  buttonDisabled: {
    backgroundColor: '#999'
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
})
export default CycleDetailsScreen