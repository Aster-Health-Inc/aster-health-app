import React, { useState, useEffect } from 'react'
import { ActivityIndicator, View, StyleSheet } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { StatusBar } from 'expo-status-bar'
import { supabase } from './lib/supabase'

import LoginScreen from './screens/LoginScreen'
import SignUpScreen from './screens/SignUpScreen'
import DashboardScreen from './screens/DashboardScreen'
import HomeScreen from './screens/HomeScreen'
import AddPeriodScreen from './screens/AddPeriodScreen'
import HormoneEducationScreen from './screens/HormoneEducationScreen'

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
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {session && session.user ? (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="CycleTracking" component={HomeScreen} />
            <Stack.Screen name="AddPeriod" component={AddPeriodScreen} />
            <Stack.Screen name="HormoneEducation" component={HormoneEducationScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
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
