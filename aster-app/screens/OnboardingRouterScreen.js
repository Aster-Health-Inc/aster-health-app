import React, { useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { supabase } from '../lib/supabase'

export default function OnboardingRouterScreen() {
  const navigation = useNavigation()

  useEffect(() => {
    const routeUser = async () => {
      const start = Date.now()

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      const userId = user?.id
      const isAnonymous = Boolean(user?.is_anonymous)

      if (userError || !userId) {
        return navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] })
      }

      try {
        const [{ data: profile }, { data: periods }] = await Promise.all([
          supabase.from('user_profiles').select('*').eq('user_id', userId).single(),
          supabase.from('periods').select('id').eq('user_id', userId)
        ])

        const timeTaken = Date.now() - start
        console.log(`⏱️ OnboardingRouter resolved in ${timeTaken}ms`)

        if (!profile) {
          return navigation.reset({ index: 0, routes: [{ name: 'BasicInfo' }] })
        }

        if (!periods || periods.length === 0) {
          return navigation.reset({ index: 0, routes: [{ name: 'CycleDetails' }] })
        }

        // Check if onboarding is already completed
        if (profile.onboarding_completed) {
          const destination = isAnonymous ? 'AnonymousUpgrade' : 'Home'
          return navigation.reset({ index: 0, routes: [{ name: destination }] })
        }

        return navigation.reset({ index: 0, routes: [{ name: 'ReminderSetup' }] })

      } catch (err) {
        console.log('❌ Routing error:', err)
        return navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] })
      }
    }

    routeUser()
  }, [])

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
