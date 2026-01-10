import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { CardStyleInterpolators, createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from './lib/supabase';
import { FeatureFlagsProvider } from "./lib/FeatureFlag";
import { OnboardingProvider } from './src/context/OnboardingContext';
import ConnectivityOverlay from './components/ConnectivityOverlay';

// Screens
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import BasicInfoScreen from './screens/BasicInfoScreen';
import FlowIntensityScreen from './screens/FlowIntensityScreen';
import ReminderSetupScreen from './screens/ReminderSetupScreen';
import CycleDetailsScreen from './screens/CycleDetailsScreen';
import CycleHomeScreen from './screens/CycleHomeScreen';
import SettingsScreen from './screens/SettingsScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import ConsentScreen from './screens/ConsentScreen';
import OptionalCycleHistoryScreen from './screens/OptionalCycleHistoryScreen';
import AdditionalInfoScreen from './screens/AdditionalInfoScreen';
import ReminderScreen from './screens/ReminderScreen';
import OnboardingRouterScreen from './screens/OnboardingRouterScreen';
import HomeScreen from './screens/HomeScreen';
import AnonymousUpgradeScreen from './screens/AnonymousUpgradeScreen';
import AuthScreenBase from './screens/AuthScreenBase';
import SymptomLogScreen from './screens/SymptomLogScreen';
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
import HelpFeedbackScreen from './screens/HelpFeedbackScreen';
import FeedbackScreen from './screens/FeedbackScreen';
import ReportBugScreen from './screens/ReportBugScreen';
import SupportScreen from './screens/SupportScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import AccountDetailsScreen from './screens/AccountDetailsScreen';
import PastAnalyticsScreen from './screens/PastAnalyticsScreen';
import PastAnalyticsDetailScreen from './screens/PastAnalyticsDetailScreen';
import PastCycleCalendarScreen from './screens/PastCycleCalendarScreen';

// ✅ import your logger utilities
import { initGlobalErrorHandler, initLogging, log, error } from './utils/CrashLogger';
// ✅ import PostHog client + provider
import { PostHogProvider, PostHog } from 'posthog-react-native';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const Stack = createStackNavigator();

export default function App() {
  // 1) Hooks at the top
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const isInvalidRefreshToken = (err) =>
    String(err?.message || err || '').toLowerCase().includes('invalid refresh token');

  // 2) Initialize global error handlers once
  useEffect(() => {
    initLogging();
    initGlobalErrorHandler();
  }, []);

  // 3) Supabase auth effects
  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!isMounted) return;
      if (error) {
        error('[Auth] getSession error:', error);
        if (isInvalidRefreshToken(error)) {
          try {
            await supabase.auth.signOut();
          } catch {}
        }
      }
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

  // PostHog client created once; screen capture handled manually to avoid navigation hook errors
  const posthogClient = useMemo(
    () =>
      new PostHog('phc_bb786hqaz5EACriYfwC1qUDn1NOWNW24IqNAnJzUA8o', {
        host: 'https://us.i.posthog.com',
        enableSessionReplay: false,  // Disabled: Causes 413 errors with camera/photo screens
        autocapture: false,  // Disabled: Autocapture sends large payloads with photo data
      }),
    []
  );

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
    <SafeAreaProvider>
      <NavigationContainer
        onStateChange={(state) => {
          const routeNames = state?.routes?.map((r) => r.name) || [];
          console.log('Navigation state changed:', routeNames);
          // Manually track screens to avoid PostHog navigation hook warnings
          const currentRoute = state?.routes?.[state.index ?? routeNames.length - 1];
          if (currentRoute?.name) {
            // Don't send params to avoid large payloads (e.g., photo data)
            posthogClient?.screen(currentRoute.name);
          }
        }}
      >
        <PostHogProvider
          client={posthogClient}
          autocapture={false}
        >
          <OnboardingProvider>
            <FeatureFlagsProvider>
              <StatusBar style="auto" />
              <Stack.Navigator
                screenOptions={({ route }) => {
                  const tabDirection = route?.params?.tabTransition?.direction;
                  const isRtl = tabDirection === 'rtl';
                  return {
                    headerShown: false,
                    gestureDirection: isRtl ? 'horizontal-inverted' : 'horizontal',
                    // Use stable built-in interpolator; flip gesture direction for RTL moves
                    cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
                  };
                }}
              >
                {!session || !session.user ? (
                  <>
                    <Stack.Screen name="Welcome" component={WelcomeScreen} />
                    <Stack.Screen name="Consent" component={ConsentScreen} />
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="SignUp" component={SignUpScreen} />
                    <Stack.Screen name="OnboardingRouter" component={OnboardingRouterScreen} />

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
                  </>
                ) : (
                  <>
                    <Stack.Screen name="OnboardingRouter" component={OnboardingRouterScreen} />
                    <Stack.Screen name="SignUp" component={SignUpScreen} />
                    <Stack.Screen name="Home" component={HomeScreen} />
                    <Stack.Screen name="CycleHome" component={CycleHomeScreen} />
                    <Stack.Screen name="Settings" component={SettingsScreen} />
                    <Stack.Screen name="HelpFeedback" component={HelpFeedbackScreen} />
                    <Stack.Screen name="Feedback" component={FeedbackScreen} />
                    <Stack.Screen name="ReportBug" component={ReportBugScreen} />
                    <Stack.Screen name="Support" component={SupportScreen} />
                    <Stack.Screen name="Notifications" component={NotificationsScreen} />
                    <Stack.Screen name="AccountDetails" component={AccountDetailsScreen} />
                    <Stack.Screen name="AnonymousUpgrade" component={AnonymousUpgradeScreen} />
                    <Stack.Screen name="BasicInfo" component={BasicInfoScreen} />
                    <Stack.Screen name="CycleDetails" component={CycleDetailsScreen} />
                    <Stack.Screen name="FlowIntensity" component={FlowIntensityScreen} />
                    <Stack.Screen name="OptionalCycleHistory" component={OptionalCycleHistoryScreen} />
                    <Stack.Screen name="AdditionalInfo" component={AdditionalInfoScreen} />
                    <Stack.Screen name="ReminderSetup" component={ReminderSetupScreen} />
                    <Stack.Screen name="Reminder" component={ReminderScreen} />
                    <Stack.Screen
                      name="SymptomLog"
                      component={SymptomLogScreen}
                      options={{
                        presentation: 'transparentModal',
                        cardStyle: { backgroundColor: 'transparent' },
                        animationEnabled: true,
                        gestureDirection: 'vertical',
                        cardStyleInterpolator: CardStyleInterpolators.forModalPresentationIOS,
                      }}
                    />
                    <Stack.Screen name="PastAnalytics" component={PastAnalyticsScreen} />
                    <Stack.Screen name="PastAnalyticsDetail" component={PastAnalyticsDetailScreen} />
                    <Stack.Screen name="PastCycleCalendar" component={PastCycleCalendarScreen} />

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
                  </>
                )}
              </Stack.Navigator>
              <ConnectivityOverlay />
            </FeatureFlagsProvider>
          </OnboardingProvider>
        </PostHogProvider>
      </NavigationContainer>
    </SafeAreaProvider>
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
