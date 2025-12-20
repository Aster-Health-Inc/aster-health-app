# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Aster is a women's health tracking app built with React Native (Expo) and Supabase. The app focuses on period tracking, nutrition logging, health monitoring, and integrates with Apple HealthKit. The primary codebase is in the `aster-app/` directory.

**Tech Stack:**
- Frontend: React Native 0.81.4 with Expo 54
- Backend: Supabase (PostgreSQL + Auth + Edge Functions)
- Navigation: React Navigation (Stack Navigator)
- State: React Context (FeatureFlags + OnboardingContext) + Supabase real-time
- Platform: iOS-first (Apple HealthKit integration), Android-ready
- Testing: Jest with jest-expo preset (fully configured with npm scripts)
- Analytics: PostHog (product analytics + session replay)

## Development Setup

### Working Directory
All development commands should be run from `aster-app/`:
```bash
cd aster-app
```

### Common Commands

**Installation:**
```bash
npm install
```

**Development:**
```bash
# Standard development server
npx expo start

# Clear Metro cache
npx expo start --clear

# Development with tunnel (for remote testing)
npx expo start --tunnel

# iOS Simulator workflow (MacInCloud)
npm run start:ios        # Tab 1: Start Metro bundler
npm run ios-sim          # Tab 2: Boot simulator, install, and open app
```

**Linting & Formatting:**
```bash
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix ESLint issues
npm run format           # Format with Prettier
```

**Building:**
```bash
# Export for platforms
npm run build:ios
npm run build:android

# EAS builds
eas build --platform ios --profile development
eas build --platform ios --profile production
```

### iOS Native Dependencies
When pulling changes that modify native code (Pods, entitlements):
```bash
cd aster-app/ios
rm -rf Pods Podfile.lock
pod install --repo-update
cd ..
npm run ios-sim
```

### Environment Configuration

**EAS Project ID:** `c220f578-b1ce-41ff-971c-88e90f13c7e5`
**Bundle Identifier:** `com.aster.healthapp.dev` (development), `com.asterhealth.app` (production)

**Optional environment variables** (app works without them):
- `EXPO_PUBLIC_ENABLE_CHATBOT`: Feature flag (default: true, can override in Supabase)
- `EXPO_PUBLIC_ENABLE_APPLE_HEALTH`: Feature flag (default: false, can override in Supabase)
- `EXPO_PUBLIC_LOG_LEVEL`: Logging verbosity (default: debug in dev, warn in prod)
- `EXPO_PUBLIC_SUPABASE_EDGE_FUNCTION_URL`: Custom chatbot URL (has default)
- `EXPO_PUBLIC_FOOD_ANALYSIS_URL`: Custom food analysis URL (has default)

**No API keys needed in client** - all managed via Supabase Edge Function Secrets

## Code Architecture

### Authentication Flow

1. **Session Check** (App.js):
   - Check Supabase session → No session: Welcome → Has session: OnboardingRouter
   - OnboardingRouter checks profile completion state in `users` table
   - Routes to appropriate screen: BasicInfo → CycleDetails → Home

2. **Auth Methods**:
   - Email/password authentication via Supabase Auth
   - Anonymous users can upgrade to full accounts
   - Session persists in AsyncStorage with PKCE flow
   - Deep linking support for OAuth callbacks

### Core Data Models

**Supabase Tables:**
- `users`: User profiles with cycle preferences (average_cycle_length, average_period_length)
- `periods`: Period entries (start_date, end_date, flow_level, symptoms[], notes)
- `daily_logs`: Daily health tracking data
- `meals`: Nutrition logging
- `nutrition_goals`: User nutrition targets (RLS enabled)
- `public_users`: Public user profile data (RLS enabled)
- `app_ratings`: User app ratings and feedback (RLS enabled)
- `mood_categories`: Reference table for mood options (read-only for all users)
- `feature_flags`: Runtime feature toggle overrides
- `chatbot_audit_logs`: AI chatbot interaction history

**Security Note:** All tables have Row Level Security (RLS) enabled. Most recent security update (Dec 20, 2024) added RLS policies to nutrition_goals, public_users, app_ratings, and mood_categories tables.

### Key Architectural Patterns

**1. Feature Flags** (`lib/FeatureFlag.js`):
- React Context provider wraps entire app
- Three-tier override: Build-time defaults → Cached → Supabase runtime
- Access via `useFeatureFlags()` hook
- Controls chatbot and Apple Health features

**1a. Onboarding Context** (`src/context/OnboardingContext.js`):
- React Context provider managing multi-step onboarding state
- Wraps entire app (outermost provider, above FeatureFlagsProvider)
- Used by 8 onboarding screens: BasicInfo, CycleDetails, FlowIntensity, OptionalCycleHistory, ReminderSetup, Reminder, AdditionalInfo, HealthAppAccess
- Key methods:
  - `updateProfile()` - User profile (name, birthdate, weight, height, units)
  - `updateCycle()` - Cycle preferences (lastPeriodDate, averageCycleLength, averagePeriodLength)
  - `setFlowIntensity()` - 6-day flow intensity ratings
  - `setPeriodHistory()` - Historical period data
  - `updateAdditionalInfo()` - Health conditions and fertility info
  - `updateReminder()` - Reminder preferences (time, days, check-in enabled)
  - `resetOnboarding()` - Clears all onboarding state
- Access via `useOnboarding()` hook

**2. Health Integration** (`lib/healthkit.js`, `lib/healthkitSync.js`):
- iOS-only via `react-native-health`
- Permission management for workouts, heart rate, steps, etc.
- Syncs data bidirectionally with Apple Health
- Gracefully degrades when unavailable (e.g., in Expo Go)

**3. Error Handling** (`utils/CrashLogger.js`):
- Global error handler captures JS runtime errors and unhandled rejections
- Log levels: debug < info < warn < error < silent
- Initialized in App.js via `initGlobalErrorHandler()` and `initLogging()`
- Use `log()`, `error()`, `warn()` from CrashLogger instead of console methods

**4. Navigation Structure**:
- Two navigation states: unauthenticated vs authenticated
- Unauthenticated: Welcome → Consent → Login/SignUp
- Authenticated: Home (main hub) with tabs and modal stacks
- BottomTaskbar component provides persistent navigation across main screens

**5. AI Chatbot** (`services/chatbotDataService.js`, `components/ChatBotModal.js`):
- Gemini AI integration via Edge Function proxy
- Context-aware: sends user health data, cycle info, recent meals
- Audit logging to Supabase
- Feature-flagged (chatbot flag)

**6. Nutrition Tracking**:
- Barcode scanning with camera integration
- OpenFoodFacts API integration (`services/openFoodFactsService.js`)
- Calorie/macro calculations (`utils/nutritionCalculator.js`)
- Health guardrails system (`utils/healthGuardrails.js`, `utils/guardrailsMonitor.js`)

### Directory Structure

```
aster-app/
├── screens/          # 40 screen components (authentication, onboarding, tracking)
├── src/              # Modular feature code
│   ├── context/      # React Context providers (OnboardingContext)
│   └── workouts/     # Workouts feature (in development)
├── components/       # 11 reusable UI components (BottomTaskbar, ChatBotModal, SymptomSelector, etc.)
├── lib/              # Core integrations (supabase.js, healthkit.js, FeatureFlag.js)
├── services/         # External API services (chatbot, OpenFoodFacts, Gemini)
├── utils/            # Helpers (CrashLogger, cycle calculations, nutrition, guardrails)
│   └── __tests__/    # Jest test files (healthGuardrails.test.js, nutritionCalculator.test.js, etc.)
├── assets/           # Images, fonts, icons
├── android/          # Native Android code
├── ios/              # Native iOS code (HealthKit entitlements)
└── App.js            # Root component with navigation and auth state
```

### Supabase Integration

**Client Setup** (`lib/supabase.js`):
- Crypto polyfills for SHA-256 and getRandomValues (React Native compatibility)
- AsyncStorage for session persistence
- Deep link handling for OAuth callbacks
- PKCE flow enabled for security

**Edge Functions** (`supabase/functions/`):
- `chatbot-proxy`: Proxies requests to Google Gemini API with server-side API key
- `food-analysis`: Analyzes food images using Gemini Vision API

**Migrations** (`supabase/migrations/`):
- Schema changes tracked in SQL files
- Run via Supabase CLI

**Local Development:**
```bash
# Start local Supabase instance
supabase start

# Stop local Supabase
supabase stop

# Link to remote project
supabase link --project-ref <your-project-ref>

# Pull remote schema changes
supabase db pull

# Generate TypeScript types from schema
supabase gen types typescript --local > types/supabase.ts
```

## Development Guidelines

### Code Style
- ESLint config: `@react-native-community` + React + Prettier
- Prettier: Single quotes, trailing commas, 100 char line width, 2-space tabs
- Prop types disabled (JavaScript project)
- Console statements: Only `console.warn` and `console.error` allowed; use CrashLogger for info/debug

### State Management
- Prefer React Context for global state (see FeatureFlag and OnboardingContext patterns)
- Provider nesting order: OnboardingProvider → FeatureFlagsProvider → NavigationContainer
- Use Supabase real-time subscriptions for data sync
- Local state with useState/useEffect for component-specific data

### HealthKit Integration
- HealthKit features ONLY work in development/production builds (not Expo Go)
- Always check `healthKitAvailable` before calling HealthKit methods
- Handle permission denials gracefully
- iOS entitlements configured in `app.config.js`

### Navigation
- All screens must be registered in App.js Stack.Navigator
- Screens available in both auth states should be registered in both branches
- Use `useNavigation()` hook for programmatic navigation
- Navigation state logged to console for debugging

### Logging
- Initialize logging in App.js: `initLogging()` and `initGlobalErrorHandler()`
- Import from CrashLogger: `import { log, error, warn, debug } from './utils/CrashLogger'`
- Set runtime level via `__ASTER_LOG_LEVEL__` global or env var
- Production should use 'warn' or 'error' level

### Testing Environments

**Local Development (Expo Go):**
- Use `npx expo start` and scan QR code
- HealthKit NOT available
- Good for UI/UX iteration

**iOS Simulator (MacInCloud):**
- Use `npm run start:ios` + `npm run ios-sim`
- Node 18 required (use nvm)
- HealthKit available in development build
- Path: `~/Projects/aster-health-app/aster-app`

**Physical Device:**
- Use `npx expo start --tunnel` for remote networks
- Install development build via EAS
- Full HealthKit integration

## CI/CD

**EAS Profiles** (`eas.json`):
- `development`: Dev client with internal distribution
- `adhoc`: iOS ad-hoc distribution for internal testing
- `preview`: Internal testing builds
- `production`: App Store distribution

**Build Commands:**
```bash
eas build --platform ios --profile development
eas build --platform ios --profile adhoc
eas build --platform ios --profile production
```

**Important:** Do NOT use `--auto-submit` flag as it requires Apple credentials not available in CI environment.

**Manual TestFlight Submission:**
After building with the production profile, submit manually to TestFlight using Xcode or the App Store Connect web interface.

## Common Troubleshooting

**Metro bundler issues:**
```bash
npx expo start --clear
```

**Dependency conflicts:**
```bash
npm install --legacy-peer-deps
```

**HealthKit not working:**
- Ensure running on device/simulator (not Expo Go)
- Check entitlements in `app.config.js`
- Rebuild native app after pod changes

**Supabase connection:**
- Verify credentials in `lib/supabase.js`
- Check network connectivity
- Confirm tables exist in Supabase dashboard

**Session/Auth issues:**
- Clear AsyncStorage: Delete and reinstall app
- Check Supabase Auth settings (email confirmation, etc.)
- Verify deep link configuration

## Security & API Key Management

### Where API Keys Are Stored

**Supabase Edge Function Secrets (Secure ✅):**
- Gemini API key: `GOOGLE_GEMINI_API_KEY`
- Managed in: Supabase Dashboard → Edge Functions → Secrets
- Used by:
  - `supabase/functions/chatbot-proxy/index.ts` (AI chatbot)
  - `supabase/functions/food-analysis/index.ts` (food image analysis)

**Update Edge Function Secrets:**
```bash
# Via Supabase CLI
supabase secrets set GOOGLE_GEMINI_API_KEY=your_key_here
supabase secrets list

# Or via Supabase Dashboard
# Navigate to: Edge Functions → Manage secrets
```

**Deploy Edge Functions:**
```bash
# Deploy chatbot proxy
supabase functions deploy chatbot-proxy

# Deploy food analysis
supabase functions deploy food-analysis

# Deploy all functions
supabase functions deploy
```

**No Client-Side API Keys Required:**
- All Gemini API calls are proxied through secure Edge Functions
- API keys never exposed in client bundle
- User authentication required for all AI features

**Safe to Hardcode:**
- `supabaseAnonKey` in `lib/supabase.js` - This is the public anon key, designed to be exposed and protected by Row Level Security (RLS)

### Security Best Practices

1. **Never commit API keys to Git** - Use environment variables or Edge Function secrets
2. **Use Edge Functions for sensitive API calls** - Keeps keys server-side (see `chatbot-proxy`)
3. **Client API keys are exposed** - Any key in the client bundle can be extracted
4. **Supabase RLS protects data** - The anon key is safe because database access is controlled by Row Level Security policies

## Analytics & Monitoring

**PostHog Integration:**
- Product analytics and session replay via `posthog-react-native`
- PostHog Project Key: `phc_bb786hqaz5EACriYfwC1qUDn1NOWNW24IqNAnJzUA8o` (safe to expose)
- Host: `https://us.i.posthog.com`
- Session replay enabled for debugging user flows

**Implementation:**
- PostHogProvider wraps the entire app (in App.js)
- Manual screen tracking via NavigationContainer's `onStateChange`
- Autocapture disabled for screens (manual tracking preferred for accuracy)

**Usage in Components:**
```javascript
import { usePostHog } from 'posthog-react-native';

function MyComponent() {
  const posthog = usePostHog();

  // Track custom events
  posthog?.capture('button_clicked', { button_name: 'Submit' });

  // Track screen views (already handled globally in App.js)
  posthog?.screen('ScreenName', { param: 'value' });
}
```

**Privacy Considerations:**
- Session replay captures user interactions for debugging
- PostHog key is intentionally public (requires project dashboard access for data)
- Consider implementing user consent for analytics in production

## Testing

**Infrastructure:**
- Jest configured with `jest-expo` preset
- Test files in `utils/__tests__/` and `screens/__tests__/`
- Mock setup in `jest.setup.js` (Supabase, AsyncStorage, gesture handlers, safe-area-context)

**Test Files:**
- `utils/__tests__/healthGuardrails.test.js` - AI safety guardrails validation
- `utils/__tests__/nutritionCalculator.test.js` - Nutrition calculations
- `utils/__tests__/meallogger.test.js` - Meal logging utilities
- `screens/__tests__/WelcomeScreen.test.js` - Welcome screen rendering
- `screens/__tests__/CycleHomeScreen.test.js` - Cycle home UI
- `screens/__tests__/SymptomLogScreen.test.js` - Symptom logging

**Running Tests:**
```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm test:watch

# Run a specific test file
npm test -- healthGuardrails.test.js
```

**Test Mocking:**
- Supabase client automatically mocked in `jest.setup.js`
- AsyncStorage mocked for session persistence tests
- React Native components (gesture-handler, safe-area-context) mocked

## Key Files to Understand

1. **App.js**: Root navigation, auth state, error handler initialization, context provider nesting, PostHog analytics setup
2. **src/context/OnboardingContext.js**: Multi-step onboarding state management
3. **lib/supabase.js**: Database client, crypto polyfills, deep linking
4. **lib/FeatureFlag.js**: Feature toggle system pattern
5. **screens/OnboardingRouterScreen.js**: Profile completion routing logic
6. **utils/CrashLogger.js**: Logging and error capture system
7. **utils/healthGuardrails.js**: AI safety validation system with comprehensive tests
8. **components/BottomTaskbar.js**: Main navigation component
9. **lib/healthkit.js**: Apple Health integration abstraction
10. **supabase/functions/chatbot-proxy/index.ts**: Secure API proxy with data sanitization
