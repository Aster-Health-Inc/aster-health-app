import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Polyfill for structuredClone in web browsers
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (obj) => JSON.parse(JSON.stringify(obj))
}

const supabaseUrl = 'https://iinbwdrzmmcwajbmuynh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpbmJ3ZHJ6bW1jd2FqYm11eW5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0ODEwNjgsImV4cCI6MjA2NzA1NzA2OH0.31o5g-ES31ary6-JIe_QeRDctrP03NZ07V9icf2VWNU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // For development - bypass email confirmation
    flowType: 'pkce',
  },
})