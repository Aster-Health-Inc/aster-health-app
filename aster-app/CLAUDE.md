# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Aster is a women's health tracking React Native app built with Expo, focusing on period tracking, nutrition logging, and health monitoring. The app uses Supabase for authentication and data persistence, with ML-powered cycle predictions and an AI chatbot for health guidance.

## Development Environment

### Quick Start Commands

**Initial Setup:**
```bash
cd aster-app
npm install
```

**Development (Physical Device via Expo Go):**
```bash
npx expo start
# Press 's' to switch to Expo Go mode, then scan QR code
```

**Development (iOS Simulator - macOS/MacInCloud only):**
```bash
# Tab 1: Start Metro bundler
npm run start:ios

# Tab 2: Boot simulator and install app
npm run ios-sim
```

**After Native Code Changes (iOS):**
```bash
cd ios
rm -rf Pods Podfile.lock
pod install --repo-update
cd ..
npm run ios-sim
```

**Clear Cache:**
```bash
npm run clear
# or
npx expo start --clear
```

**Other Useful Commands:**
```bash
npm run tunnel          # Tunnel mode for network issues
npm run android         # Run on Android
npm run ios             # Run on iOS
```

### MacInCloud Workflow

When developing on MacInCloud for iOS builds:
1. Use Node 18: `nvm use 18`
2. Pull latest: `git pull origin main && npm install`
3. Run in simulator: `npm run start:ios` (Tab 1) + `npm run ios-sim` (Tab 2)

## Architecture

### Authentication Flow

The app uses Supabase Auth with a session-based navigation structure:

1. **No Session** → Welcome → Consent → Login/SignUp
2. **Has Session** → OnboardingRouter → Routes based on profile completion:
   - BasicInfo (if profile incomplete)
   - CycleDetails (if cycle data missing)
   - CarouselWalkthrough (if onboarding not complete)
   - Home (if fully onboarded)

Session management is handled in `App.js:56-74` with `supabase.auth.getSession()` and `onAuthStateChange` listener.

### Navigation Structure

Stack Navigator with conditional rendering based on session state (App.js:104-154):

**Unauthenticated Stack:**
- Welcome, Consent, Login, SignUp
- Food screens (for demo/testing without auth)

**Authenticated Stack:**
- OnboardingRouter (routes to appropriate onboarding step)
- Home (main dashboard with period tracking, cycle wheel, daily insights)
- All onboarding screens (BasicInfo, CycleDetails, etc.)
- All food tracking screens
- Workout tracking

### Core Features

**1. Period Tracking**
- Cycle wheel visualization (`components/CycleWheel.js`)
- Flow intensity logging (1-5 scale)
- Symptom tracking with predefined categories
- Daily logs for mood, energy, symptoms
- ML-powered cycle predictions (`utils/cyclePredictions.js`, `utils/cycleCalculations.js`)

**2. Food Logging**
- Photo-based food recognition (camera flow)
- Manual food entry
- Macro tracking (calories, protein, carbs, fat)
- Water intake logging
- Daily nutrition goals with progress visualization
- See `FOOD_LOGGING_README.md` for detailed flow

**3. AI Chatbot**
- Context-aware health assistant
- Integration with user's period/health data
- Backend: Python Flask API (`enhanced_chatbot_api.py`)
- Frontend: `components/ChatBotModal.js`
- Services: `services/chatbotAPIService.js`, `services/chatbotDataService.js`

**4. Apple Health Integration (iOS only)**
- HealthKit permissions setup (`lib/healthkit.js`)
- Requires dev build (not available in Expo Go)
- Entitlements configured in `ios/asterapp/asterapp.entitlements`

### Database Schema (Supabase)

Key tables in `schema.sql`:

**User & Profile:**
- `user_profiles` - Extended user info (name, birthdate)

**Period Tracking:**
- `periods` - Main period entries (start_date, end_date, flow_level, symptoms)
- `flow_intensity_logs` - Daily flow intensity tracking
- `daily_logs` - Comprehensive daily health logs
- `cycle_predictions` - ML-generated predictions

**Food Logging:**
- `meal_logs` - Daily meal summaries (total macros per day)
- `meals` - Individual meals (Breakfast, Lunch, Dinner, Snack)
- `meal_items` - Food items within meals
- `water_logs` - Water intake tracking

**Other:**
- `reminder_settings` - User notification preferences
- `symptom_categories` - Available symptom types (public read-only)
- `feature_flags` - Runtime feature toggles

All tables use Row Level Security (RLS) - users can only access their own data via `auth.uid()` policies.

### State Management

- **Authentication:** Supabase auth state in App.js
- **Feature Flags:** Context provider in `lib/FeatureFlag.js` (supports runtime toggles from Supabase)
- **Local State:** Component-level useState for forms/UI
- **Persistence:** AsyncStorage for caching, Supabase for data sync
- **Error Logging:** Global error handler in `utils/CrashLogger.js`

### Services Layer

**Food Services:**
- `services/openFoodFactsService.js` - Open Food Facts API integration
- `services/geminiService.js` - AI food recognition

**Chatbot Services:**
- `services/chatbotAPIService.js` - API client for chatbot backend
- `services/chatbotDataService.js` - User data fetching for chatbot context

### Key Utilities

- `utils/cycleCalculations.js` - Period/ovulation date calculations
- `utils/cyclePredictions.js` - ML prediction logic
- `utils/meallogger.js` - Food logging helpers
- `utils/nutritionCalculator.js` - Macro calculations
- `utils/CrashLogger.js` - Error tracking and logging

## Important Conventions

### File Organization
- `/screens` - Full-screen components
- `/components` - Reusable UI components
- `/lib` - Core libraries (Supabase client, HealthKit, feature flags)
- `/services` - API clients and external integrations
- `/utils` - Helper functions and business logic
- `/assets` - Images, icons, fonts

### Code Patterns

**Supabase Queries:**
Always use RLS-aware queries. User filtering is automatic via policies:
```javascript
const { data, error } = await supabase
  .from('periods')
  .select('*')
  .order('start_date', { ascending: false })
// No need for .eq('user_id', userId) - RLS handles this
```

**Feature Flags:**
```javascript
import { useFeatureFlags } from './lib/FeatureFlag'

const { flags, loading } = useFeatureFlags()
if (flags.chatbot) {
  // Show chatbot feature
}
```

**Error Handling:**
```javascript
import { log, error } from './utils/CrashLogger'

log('User action performed')
error('Something went wrong', errorObject)
```

## Testing

No automated tests currently. Manual testing checklist:

**Authentication Flow:**
- Sign up with email/password
- Email verification (bypassed in dev with PKCE flow)
- Login/logout
- Session persistence

**Period Tracking:**
- Add new period entry
- View cycle predictions
- Log flow intensity
- Track symptoms

**Food Logging:**
- Camera capture → AI analysis (mock data)
- Manual food entry
- Goal tracking
- Water logging

**iOS Simulator Testing:**
Use `npm run ios-sim` workflow on macOS/MacInCloud for full native features.

## Platform-Specific Notes

### iOS
- Minimum deployment target: iOS 15.1 (see `ios/Podfile`)
- New Architecture enabled: `"newArchEnabled": true` in app.json
- HealthKit requires native build (use dev client, not Expo Go)
- After changing entitlements/pods: Re-run pod install

### Android
- Edge-to-edge enabled
- Camera permissions required
- Package: `com.y` (placeholder - update for production)

### Web
Limited support. Food screens partially functional. Use `npm run web` to test.

## Backend Integration

### Supabase
- URL: `https://iinbwdrzmmcwajbmuynh.supabase.co`
- Client configured in `lib/supabase.js` with AsyncStorage
- Auto-refresh tokens enabled
- PKCE flow for auth

### Python Chatbot API
- Flask app in `enhanced_chatbot_api.py`
- Dependencies in `requirements.txt`
- Uses LangChain + OpenAI (gpt-4o-mini)
- Requires `.env` with `OPENAI_API_KEY`
- Loads trained ML model from Supabase Storage

**Running Chatbot Backend:**
```bash
pip install -r requirements.txt
python enhanced_chatbot_api.py
```

## Common Issues

**Metro bundler issues:**
```bash
npx expo start --clear
```

**iOS pod issues:**
```bash
cd ios && rm -rf Pods Podfile.lock && pod install --repo-update && cd ..
```

**Expo Go not loading:**
- Ensure same WiFi network
- Try tunnel mode: `npm run tunnel`

**Session not persisting:**
- Check AsyncStorage permissions
- Verify Supabase auth config in `lib/supabase.js`

## Feature Flags

Control features via `feature_flags` table in Supabase or env vars:

- `EXPO_PUBLIC_ENABLE_CHATBOT` - Chatbot modal (default: true)
- `EXPO_PUBLIC_ENABLE_APPLE_HEALTH` - HealthKit integration (default: false)

Runtime flags override build-time flags. See `lib/FeatureFlag.js:36-52` for implementation.

## Development Tips

1. **Making Changes**: Always test in Expo Go first for quick iteration
2. **Native Changes**: Requires dev build - use MacInCloud workflow
3. **Database Changes**: Update `schema.sql` and apply via Supabase dashboard
4. **Navigation Changes**: Update conditional stacks in `App.js:104-154`
5. **New Screens**: Add to `/screens`, import in App.js, add to Stack.Navigator
6. **Styling**: Use StyleSheet, colors match existing palette (primary: #e91e63)

## Onboarding Flow

User progression through onboarding (handled by `OnboardingRouterScreen.js`):

1. **BasicInfo** → Name, birthdate, consent
2. **CycleDetails** → Average cycle/period length
3. **FlowIntensity** → Historical flow patterns (optional)
4. **OptionalCycleHistory** → Past cycle dates (optional)
5. **ReminderSetup** → Notification preferences (optional)
6. **HealthAppAccess** → Apple Health permissions (iOS only, optional)
7. **CarouselWalkthrough** → Feature overview
8. **Home** → Main app

Each step checks for existing data and skips if already completed.
