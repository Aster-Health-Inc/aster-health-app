# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Aster is a women's health tracking React Native app built with Expo, focusing on period tracking, nutrition logging, and health monitoring. The app uses Supabase for authentication and data persistence, with ML-powered cycle predictions and an AI chatbot for health guidance.

**Project Structure:**
- Root directory: `/Users/nikhil/Desktop/aster-health-app/`
- React Native app: `aster-app/` subdirectory
- Supabase backend: `supabase/` (migrations and Edge Functions)

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

Session management is handled in `App.js:61-78` with `supabase.auth.getSession()` and `onAuthStateChange` listener.

### Navigation Structure

Stack Navigator with conditional rendering based on session state (App.js:102-164):

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
- Photo-based food recognition via camera (using Gemini AI)
- Manual food entry with barcode scanning support (Open Food Facts API)
- Macro tracking (calories, protein, carbs, fat)
- Water intake logging
- Daily nutrition goals with progress visualization
- Meal categorization (Breakfast, Lunch, Dinner, Snack)

**3. AI Chatbot**
- Context-aware health assistant powered by Google Gemini
- Integration with user's period/health data
- Backend: Supabase Edge Function (`supabase/functions/chatbot-proxy/index.ts`)
- Frontend: `components/ChatBotModal.js`
- Services: `services/chatbotAPIService_EdgeFunction.js`, `services/chatbotDataService.js`
- Security: PII tokenization, data sanitization, HIPAA-compliant audit logging
- API keys secured server-side in Edge Function

**4. Apple Health Integration (iOS only)**
- HealthKit permissions setup (`lib/healthkit.js`)
- Requires dev build (not available in Expo Go)
- Entitlements configured in `ios/asterapp/asterapp.entitlements`

### Database Schema (Supabase)

Database schema is managed via Supabase migrations in `supabase/migrations/`. Key tables:

**User & Profile:**
- `user_profiles` - Extended user info (name, birthdate, onboarding_completed)

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

**Chatbot & Compliance:**
- `chatbot_audit_logs` - HIPAA-compliant audit trail for chatbot interactions

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
- `services/chatbotAPIService_EdgeFunction.js` - API client for chatbot Edge Function
- `services/chatbotDataService.js` - User data fetching for chatbot context
- `utils/healthGuardrails.js` - Input validation and safety checks

### Key Utilities

- `utils/cycleCalculations.js` - Period/ovulation date calculations
- `utils/cyclePredictions.js` - ML prediction logic
- `utils/meallogger.js` - Food logging helpers
- `utils/nutritionCalculator.js` - Macro calculations
- `utils/CrashLogger.js` - Error tracking and logging

## Important Conventions

### File Organization

**IMPORTANT:** All React Native app code is in the `aster-app/` subdirectory.

Within `aster-app/`:
- `screens/` - Full-screen components (~30 screen files)
- `components/` - Reusable UI components
- `lib/` - Core libraries (Supabase client, HealthKit, feature flags)
- `services/` - API clients and external integrations
- `utils/` - Helper functions and business logic
- `assets/` - Images, icons, fonts
- `ios/` - iOS native code and configuration
- `android/` - Android native code and configuration

In the root directory:
- `supabase/` - Backend infrastructure
  - `supabase/functions/` - Edge Functions (Deno/TypeScript)
  - `supabase/migrations/` - Database migrations (SQL)

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

### Technology Stack
- **React:** 19.1.0 (latest)
- **React Native:** 0.81.4
- **Expo SDK:** 54.0.13
- **Node.js:** Recommended version 18 (especially for MacInCloud)
- **Supabase:** 2.51.0

### iOS
- Minimum deployment target: iOS 15.1 (see `ios/Podfile`)
- New Architecture enabled: `"newArchEnabled": true` in app.json
- HealthKit requires native build (use dev client, not Expo Go)
- After changing entitlements/pods: Re-run pod install
- Development requires macOS or MacInCloud

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

### Supabase Edge Functions
Edge Functions (Deno-based serverless) are in `supabase/functions/`:

**chatbot-proxy:**
- Proxies chatbot requests to Google Gemini API
- Uses `gemini-2.0-flash-exp` model
- Implements PII tokenization and data sanitization
- Requires `GOOGLE_GEMINI_API_KEY` secret in Supabase
- Audit logging to `chatbot_audit_logs` table

**Managing Supabase:**
```bash
# Link to project
supabase link --project-ref iinbwdrzmmcwajbmuynh

# Deploy Edge Function
supabase functions deploy chatbot-proxy

# Set secrets
supabase secrets set GOOGLE_GEMINI_API_KEY=your_key_here

# Run migrations
supabase db push

# Test locally
supabase functions serve chatbot-proxy
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

The app uses a hybrid feature flag system (`lib/FeatureFlag.js`):

**Environment Variables (build-time defaults):**
- `EXPO_PUBLIC_ENABLE_CHATBOT` - Chatbot modal (default: true)
- `EXPO_PUBLIC_ENABLE_APPLE_HEALTH` - HealthKit integration (default: false)

**Runtime Overrides:**
- Flags can be overridden via `feature_flags` table in Supabase
- Cached in AsyncStorage for offline access
- Runtime flags take precedence over env vars

**Usage:**
```javascript
import { useFeatureFlags } from './lib/FeatureFlag'

const { flags, loading } = useFeatureFlags()
if (flags.chatbot) {
  // Show chatbot feature
}
```

Implementation details in `lib/FeatureFlag.js:1-60`.

## Development Tips

1. **Making Changes**: Always test in Expo Go first for quick iteration
2. **Native Changes**: Requires dev build - use MacInCloud workflow
3. **Database Changes**: Create new migration files in `supabase/migrations/` and apply via Supabase dashboard or CLI
4. **Navigation Changes**: Update conditional stacks in `App.js:102-164`
5. **New Screens**: Add to `/screens`, import in App.js, add to Stack.Navigator
6. **Styling**: Use StyleSheet, colors match existing palette (primary: #e91e63)

## Onboarding Flow

User progression through onboarding (handled by `OnboardingRouterScreen.js:10-52`):

1. **BasicInfo** → Name, birthdate (if no user_profile exists)
2. **CycleDetails** → Average cycle/period length (if no periods exist)
3. **ReminderSetup** → Notification preferences (if onboarding_completed is false)
4. **Home** → Main app (if onboarding_completed is true)

The router checks:
- User authentication status
- Existence of `user_profiles` record
- Existence of `periods` records
- `onboarding_completed` flag in user_profiles

Anonymous users are redirected to `AnonymousUpgrade` screen instead of Home.

## Deployment

### TestFlight Beta Distribution
- **Guide**: See `DEPLOYMENT_GUIDE.md` for complete TestFlight deployment instructions
- EAS Build configured with production profile
- Current EAS Project ID: `c220f578-b1ce-41ff-971c-88e90f13c7e5`
- Production bundle identifier: Update in `app.config.js` before deployment
- Requires Apple Developer Program membership (Aster organization account)

### GitHub Organization & CI/CD
- **Guide**: See `GITHUB_ORG_SETUP.md` for GitHub organization setup
- Recommended: Transfer repo to `AsterHealthInc` organization
- CI/CD: GitHub Actions can automate TestFlight deployments
- See workflow examples in deployment guides

## Important Development Notes

### Code Quality
- Linting: `npm run lint` (ESLint + Prettier configured)
- Formatting: `npm run format`
- Configuration in `aster-app/package.json:19-21`

### Security Considerations
- **Never commit** `.env` files or API keys
- API keys for external services (Gemini, OpenAI) should be stored in Supabase secrets
- All database queries use RLS policies - no manual user_id filtering needed
- Chatbot implements multi-layer security:
  - Client-side input validation (`healthGuardrails.js`)
  - Server-side PII tokenization (Edge Function)
  - Data sanitization before sending to LLM
  - Audit logging for compliance

### Working with Supabase
- Local development: Supabase CLI not required for app development
- Schema changes: Create new migration files in `supabase/migrations/`
- Apply migrations via Supabase dashboard or `supabase db push`
- Edge Functions require Supabase CLI for deployment
