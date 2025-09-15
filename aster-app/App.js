// App.js
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';

// ✅ Use ONE supabase client import.
// If your client is in ./lib/supabaseClient, change the path below accordingly.
import { supabase } from './lib/supabase';

import crashlytics from '@react-native-firebase/crashlytics';

// Screens
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import BasicInfoScreen from './screens/BasicInfoScreen';
import SurveyPromptScreen from './screens/SurveyPromptScreen';
import FlowIntensityScreen from './screens/FlowIntensityScreen';
import ReminderSetupScreen from './screens/ReminderSetupScreen';
import CycleDetailsScreen from './screens/CycleDetailsScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import ConsentScreen from './screens/ConsentScreen';
import OptionalCycleHistoryScreen from './screens/OptionalCycleHistoryScreen';
import ReminderScreen from './screens/ReminderScreen';
import CarouselWalkthroughScreen from './screens/CarouselWalkthroughScreen';
import OnboardingRouterScreen from './screens/OnboardingRouterScreen';
import HealthAppAccessScreen from './screens/HealthAppAccessScreen';
import HomeScreen from './screens/HomeScreen';

// Food-related screens
import MealLogHomeScreen from './screens/MealLogHomeScreen';
import MealLogScreen from './screens/MealLogScreen';
import CameraScreen from './screens/CameraScreen';
import PhotoConfirmationScreen from './screens/PhotoConfirmationScreen';
import NutritionSummaryScreen from './screens/NutritionSummaryScreen';
import AddFoodScreen from './screens/AddFoodScreen';
import TimeAmountScreen from './screens/TimeAmountScreen';
import EditGoalsScreen from './screens/EditGoalsScreen';
import FoodLogScreen from './screens/FoodLogScreen';
import TestScreen from './screens/TestScreen';

const Stack = createStackNavigator();

/** ---------------- Crashlytics setup ---------------- **/
crashlytics().setCrashlyticsCollectionEnabled(true); // enable in dev too (turn off later if you want)
crashlytics().log('App start');

// Safe helper to tag the current user in Crashlytics (avoid PHI)
export const setCrashUser = (id) => {
  try {
    if (id) {
      crashlytics().setUserId(String(id));
      crashlytics().log(`Crashlytics user set: ${id}`);
    } else {
      // clearing user id is optional; Crashlytics SDK does not expose a clear,
      // so we just log that no user is available
      crashlytics().log('Crashlytics user not set (no id)');
    }
  } catch (e) {
    // never let logging crash the app
    console.warn('Crashlytics user set failed:', e);
  }
};
/** --------------------------------------------------- **/

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load current session on mount
  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      setSession(session);
      setLoading(false);

      // tag Crashlytics with the current user id if present
      const uid = session?.user?.id;
      if (uid) setCrashUser(uid);
    });

    // Subscribe to auth state changes to keep Crashlytics user in sync
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      const uid = newSession?.user?.id;
      if (uid) setCrashUser(uid);
    });

    return () => {
      isMounted = false;
      // clean up listener
      try {
        authListener.subscription.unsubscribe();
      } catch {}
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e91e63" />
      </View>
    );
  }

  console.log('App render - Session:', session, 'User:', session?.user);

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        onStateChange={(state) => {
          console.log('Navigation state changed:', state?.routes?.map(r => r.name));
        }}
      >
        {!session || !session.user ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Consent" component={ConsentScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />

            {/* Food testing routes available before auth if you want */}
            <Stack.Screen name="MealLogHome" component={MealLogHomeScreen} />
            <Stack.Screen name="MealLog" component={MealLogScreen} />
            <Stack.Screen name="Camera" component={CameraScreen} />
            <Stack.Screen name="PhotoConfirmation" component={PhotoConfirmationScreen} />
            <Stack.Screen name="NutritionSummary" component={NutritionSummaryScreen} />
            <Stack.Screen name="AddFoodScreen" component={AddFoodScreen} options={{ headerShown: false }} />
            <Stack.Screen name="TimeAmountScreen" component={TimeAmountScreen} options={{ headerShown: false }} />
            <Stack.Screen name="EditGoals" component={EditGoalsScreen} />
            <Stack.Screen name="FoodLog" component={FoodLogScreen} />
            <Stack.Screen name="Test" component={TestScreen} />
          </>
        ) : null}

        {session && session.user && (
          <>
            <Stack.Screen name="OnboardingRouter" component={OnboardingRouterScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="BasicInfo" component={BasicInfoScreen} />
            <Stack.Screen name="CycleDetails" component={CycleDetailsScreen} />
            <Stack.Screen name="SurveyPrompt" component={SurveyPromptScreen} />
            <Stack.Screen name="FlowIntensity" component={FlowIntensityScreen} />
            <Stack.Screen name="OptionalCycleHistory" component={OptionalCycleHistoryScreen} />
            <Stack.Screen name="ReminderSetup" component={ReminderSetupScreen} />
            <Stack.Screen name="Reminder" component={ReminderScreen} />
            <Stack.Screen name="HealthAppAccess" component={HealthAppAccessScreen} />
            <Stack.Screen name="CarouselWalkthrough" component={CarouselWalkthroughScreen} />

            {/* Food-related screens */}
            <Stack.Screen name="MealLogHome" component={MealLogHomeScreen} />
            <Stack.Screen name="MealLog" component={MealLogScreen} />
            <Stack.Screen name="Camera" component={CameraScreen} />
            <Stack.Screen name="PhotoConfirmation" component={PhotoConfirmationScreen} />
            <Stack.Screen name="NutritionSummary" component={NutritionSummaryScreen} />
            <Stack.Screen name="AddFoodScreen" component={AddFoodScreen} options={{ headerShown: false }} />
            <Stack.Screen name="TimeAmountScreen" component={TimeAmountScreen} options={{ headerShown: false }} />
            <Stack.Screen name="EditGoals" component={EditGoalsScreen} />
            <Stack.Screen name="FoodLog" component={FoodLogScreen} />
            <Stack.Screen name="Test" component={TestScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
