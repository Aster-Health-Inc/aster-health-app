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
  Platform
} from 'react-native'
import { supabase } from '../lib/supabase'

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const isFormFilled = email.trim() && password.trim()

  const handleLogin = async () => {
    if (!isFormFilled) return
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      })
      if (error) Alert.alert('Login Error', error.message)
    } catch (err) {
      Alert.alert('Error', err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.subtitle}>Welcome back, continue your journey</Text>

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

        {/* Sign In Button */}
        <TouchableOpacity
          style={[styles.button, !isFormFilled && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={!isFormFilled || loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continue →</Text>}
        </TouchableOpacity>

        {/* Sign Up Link */}
        <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.linkText}>Don’t have an account? Sign Up</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5E6D3', justifyContent: 'center' },
  content: { padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#000', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#555', marginBottom: 30, textAlign: 'center' },
  input: { backgroundColor: '#F2DFCF', padding: 15, borderRadius: 30, marginBottom: 15, fontSize: 16, color: '#000' },
  button: { backgroundColor: '#000', paddingVertical: 15, borderRadius: 30, alignItems: 'center', marginTop: 10 },
  buttonDisabled: { backgroundColor: '#999' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkButton: { marginTop: 15, alignItems: 'center' },
  linkText: { fontSize: 14, color: '#000' }
})

export default LoginScreen
