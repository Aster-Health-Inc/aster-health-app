import React, { useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { supabase } from '../lib/supabase'

const ROUTING_TIMEOUT_MS = 20000

const withTimeout = (promise, timeoutMs, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs / 1000}s`)), timeoutMs)
    ),
  ])

export default function OnboardingRouterScreen() {
  const navigation = useNavigation()

  useEffect(() => {
    let cancelled = false

    const routeUser = async () => {
      const start = Date.now()

      try {
        const { data: { user }, error: userError } = await withTimeout(
          supabase.auth.getUser(),
          ROUTING_TIMEOUT_MS,
          'Profile lookup'
        )
        if (cancelled) return

        const userId = user?.id
        const isAnonymous = Boolean(user?.is_anonymous)

        if (userError || !userId) {
          return navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] })
        }

        const [{ data: profile }, { data: periods }] = await withTimeout(
          Promise.all([
            supabase.from('user_profiles').select('*').eq('user_id', userId).single(),
            supabase.from('periods').select('id').eq('user_id', userId),
          ]),
          ROUTING_TIMEOUT_MS,
          'Onboarding data fetch'
        )
        if (cancelled) return

        const timeTaken = Date.now() - start
        console.log(`⏱️ OnboardingRouter resolved in ${timeTaken}ms`)

        if (!profile) {
          return navigation.reset({ index: 0, routes: [{ name: 'BasicInfo' }] })
        }

        if (!periods || periods.length === 0) {
          return navigation.reset({ index: 0, routes: [{ name: 'CycleDetails' }] })
        }

        if (profile.onboarding_completed) {
          const destination = isAnonymous ? 'AnonymousUpgrade' : 'Home'
          return navigation.reset({ index: 0, routes: [{ name: destination }] })
        }

        return navigation.reset({ index: 0, routes: [{ name: 'ReminderSetup' }] })
      } catch (err) {
        console.log('❌ Routing error:', err)
        if (!cancelled) {
          Alert.alert(
            'Connection problem',
            'Could not reach the server. Check your internet connection and try signing in again.'
          )
          navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] })
        }
      }
    }

    routeUser()

    return () => {
      cancelled = true
    }
  }, [navigation])

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#e91e63" />
    </View>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
})
