import React, { useState, useEffect } from 'react'
import { ActivityIndicator, View, StyleSheet } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { StatusBar } from 'expo-status-bar'
import { supabase } from './lib/supabase'

import LoginScreen from './screens/LoginScreen'
import SignUpScreen from './screens/SignUpScreen'
import BasicInfoScreen from './screens/BasicInfoScreen'
import SurveyPromptScreen from './screens/SurveyPromptScreen'
import FlowIntensityScreen from './screens/FlowIntensityScreen'
import ReminderSetupScreen from './screens/ReminderSetupScreen'
import CycleDetailsScreen from './screens/CycleDetailsScreen'
import WelcomeScreen from './screens/WelcomeScreen'
import ConsentScreen from './screens/ConsentScreen'
import OptionalCycleHistoryScreen from './screens/OptionalCycleHistoryScreen'
import ReminderScreen from './screens/ReminderScreen'
import CarouselWalkthroughScreen from './screens/CarouselWalkthroughScreen'
import OnboardingRouterScreen from './screens/OnboardingRouterScreen'

const Stack = createStackNavigator()

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e91e63" />
      </View>
    )
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session || !session.user ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Consent" component={ConsentScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        ) : null}

        {session && session.user && (
          <>
            <Stack.Screen name="OnboardingRouter" component={OnboardingRouterScreen} />
            <Stack.Screen name="BasicInfo" component={BasicInfoScreen} />
            <Stack.Screen name="CycleDetails" component={CycleDetailsScreen} />
            <Stack.Screen name="SurveyPrompt" component={SurveyPromptScreen} />
            <Stack.Screen name="FlowIntensity" component={FlowIntensityScreen} />
            <Stack.Screen name="OptionalCycleHistory" component={OptionalCycleHistoryScreen} />
            <Stack.Screen name="ReminderSetup" component={ReminderSetupScreen} />
            <Stack.Screen name="Reminder" component={ReminderScreen} />
            <Stack.Screen name="CarouselWalkthrough" component={CarouselWalkthroughScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
})
