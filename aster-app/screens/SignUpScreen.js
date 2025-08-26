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
  ScrollView,
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

      if (error) {
        Alert.alert('Sign Up Error', error.message)
      } else {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) throw userError

        // Insert into public.users
        const { error: insertError } = await supabase.from('users').insert([
          { id: user.id, email: user.email }
        ])

        if (insertError) {
          console.log('❌ Failed to insert into public.users:', insertError)
        }

        Alert.alert('Account Created!', 'Welcome to Aster!', [
          {
            text: 'Continue',
            onPress: () =>
              navigation.reset({
                index: 0,
                routes: [{ name: 'OnboardingRouter' }],
              }),
          },
        ])
      }
    } catch (err) {
      console.log('❌ Unexpected error during signup:', err)
      Alert.alert('Unexpected Error', 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.innerContainer}>
        <Text style={styles.title}>Create your account</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          keyboardType="email-address"
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          secureTextEntry
          placeholderTextColor="#888"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <TouchableOpacity
          style={[styles.button, !isFormFilled && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={!isFormFilled || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginLink}>Already have an account? Log In</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5E6D3' },
  innerContainer: { padding: 20, justifyContent: 'center', flexGrow: 1 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 30, textAlign: 'center' },
  input: {
    backgroundColor: '#F2DFCF',
    padding: 15,
    borderRadius: 30,
    marginBottom: 20,
    fontSize: 16,
    color: '#000',
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginLink: {
    textAlign: 'center',
    marginTop: 20,
    color: '#333',
    textDecorationLine: 'underline',
  },
})

export default SignUpScreen
