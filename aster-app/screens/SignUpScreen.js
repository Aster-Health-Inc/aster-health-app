import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native'
import { supabase } from '../lib/supabase'

const SignUpScreen = ({ navigation }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const isFormFilled = email.trim() && password.trim() && confirmPassword.trim()

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const handleSignUp = async () => {
    if (!isFormFilled) return
    if (!validateEmail(email)) return Alert.alert('Error', 'Enter a valid email')
    if (password.length < 6) return Alert.alert('Error', 'Password must be at least 6 characters')
    if (password !== confirmPassword) return Alert.alert('Error', 'Passwords do not match')

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
      })

      if (error) Alert.alert('Sign Up Error', error.message)
      else Alert.alert('Account Created!', 'You can now log in.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ])
    } catch (err) {
      Alert.alert('Error', err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Sign Up</Text>
          <Text style={styles.subtitle}>Start tracking your health today</Text>

          {/* Inputs */}
          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#aaa"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#aaa"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor="#aaa"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          {/* Terms */}
          <Text style={styles.terms}>
            By signing up you agree to our <Text style={styles.link}>Terms and Conditions</Text> and <Text style={styles.link}>Privacy Policy</Text>
          </Text>

          {/* Continue Button */}
          <TouchableOpacity
            style={[styles.button, !isFormFilled && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={!isFormFilled || loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continue →</Text>}
          </TouchableOpacity>

          {/* ✅ Explore Cycle Tracking Button */}
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => navigation.navigate('BasicInfo')}
          >
            <Text style={styles.exploreText}>Explore Cycle Tracking →</Text>
          </TouchableOpacity>

          {/* Login Link */}
          <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>Already have an account? Log in →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5E6D3' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20 },
  content: { paddingVertical: 40 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#000', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#555', marginBottom: 30, textAlign: 'center' },
  input: { backgroundColor: '#F2DFCF', padding: 15, borderRadius: 30, marginBottom: 15, fontSize: 16, color: '#000' },
  terms: { fontSize: 12, color: '#444', marginVertical: 10, textAlign: 'center' },
  link: { color: '#000', fontWeight: '600' },
  button: { backgroundColor: '#000', paddingVertical: 15, borderRadius: 30, alignItems: 'center', marginTop: 10 },
  buttonDisabled: { backgroundColor: '#999' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkButton: { marginTop: 15, alignItems: 'center' },
  linkText: { fontSize: 14, color: '#000' },

  /* ✅ Explore Button Styles */
  exploreButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 15,
  },
  exploreText: { color: '#000', fontSize: 16, fontWeight: '600' }
})

export default SignUpScreen
