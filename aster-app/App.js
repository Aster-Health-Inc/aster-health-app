import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { supabase } from './lib/supabase';
import { FeatureFlagsProvider } from "./lib/FeatureFlag";

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
import WorkoutScreen from './screens/WorkoutScreen';

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
import DeleteMealsScreen from './screens/DeleteMealsScreen';

// Storage test component

// âœ… import your logger utilities
import { initGlobalErrorHandler, initLogging, log, error } from './utils/CrashLogger';

const Stack = createStackNavigator();

export default function App() {
  // 1) Hooks at the top
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // 2) Initialize global error handlers once
  useEffect(() => {
    initLogging();
    initGlobalErrorHandler();
  }, []);

  // 3) Supabase auth effects
  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      setSession(session);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      isMounted = false;
      try { authListener.subscription.unsubscribe(); } catch {}
    };
  }, []);

  // 4) Example logs (run once on mount)
  useEffect(() => {
    log('App mounted');
    // remove or comment out noisy test logs once done
    // error('This is a test error log');
  }, []);

  // 5) Early return AFTER all hooks
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e91e63" />
      </View>
    );
  }

  console.log('App render - Session:', session, 'User:', session?.user);

  return (
    <FeatureFlagsProvider>
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

            {/* Food testing routes */}
            <Stack.Screen name="MealLogHome" component={MealLogHomeScreen} />
            <Stack.Screen name="MealLog" component={MealLogScreen} />
            <Stack.Screen name="Camera" component={CameraScreen} />
            <Stack.Screen name="PhotoConfirmation" component={PhotoConfirmationScreen} />
            <Stack.Screen name="NutritionSummary" component={NutritionSummaryScreen} />
            <Stack.Screen name="AddFoodScreen" component={AddFoodScreen} options={{ headerShown: false }} />
            <Stack.Screen name="TimeAmountScreen" component={TimeAmountScreen} options={{ headerShown: false }} />
            <Stack.Screen name="EditGoals" component={EditGoalsScreen} />
            <Stack.Screen name="FoodLog" component={FoodLogScreen} />
          {/*  <Stack.Screen name="Test" component={TestScreen} />
            <Stack.Screen name="StorageTest" component={StorageTest} /> */}
          </>
        ) : (
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
            <Stack.Screen name="Workout" component={WorkoutScreen} />


            {/* Food-related */}
            <Stack.Screen name="MealLogHome" component={MealLogHomeScreen} />
            <Stack.Screen name="MealLog" component={MealLogScreen} />
            <Stack.Screen name="Camera" component={CameraScreen} />
            <Stack.Screen name="PhotoConfirmation" component={PhotoConfirmationScreen} />
            <Stack.Screen name="NutritionSummary" component={NutritionSummaryScreen} />
            <Stack.Screen name="AddFoodScreen" component={AddFoodScreen} options={{ headerShown: false }} />
            <Stack.Screen name="TimeAmountScreen" component={TimeAmountScreen} options={{ headerShown: false }} />
            <Stack.Screen name="EditGoals" component={EditGoalsScreen} />
            <Stack.Screen name="FoodLog" component={FoodLogScreen} />
            <Stack.Screen name="DeleteMeals" component={DeleteMealsScreen} />
           {/* <Stack.Screen name="Test" component={TestScreen} />
            <Stack.Screen name="StorageTest" component={StorageTest} /> */}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
    </FeatureFlagsProvider>
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


