# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Aster is a women's health tracking application with a React Native (Expo) mobile frontend and Python backend services for ML predictions and AI chatbot functionality. The app focuses on period tracking, nutrition logging, cycle predictions, and personalized health guidance.

## Repository Structure

This is a monorepo containing:
- **`/aster-app/`** - React Native mobile app (Expo)
- **`/cycle-prediction/`** - ML model notebooks and data for cycle predictions
- **`/mood-prediction/`** - ML experiments for mood prediction
- **`chatbot.py`** - Streamlit-based chatbot with RAG (LangChain + OpenAI)

## Development Commands

### Frontend (React Native/Expo)

All frontend commands should be run from the `aster-app/` directory:

```bash
cd aster-app
npm install
```

**Quick Start (Expo Go on physical device):**
```bash
npx expo start
# Press 's' to switch to Expo Go mode, scan QR code
```

**iOS Simulator (macOS/MacInCloud only):**
```bash
# Terminal 1: Start Metro bundler
npm run start:ios

# Terminal 2: Boot simulator and install app
npm run ios-sim
```

**Other Commands:**
```bash
npm run tunnel          # Tunnel mode for network issues
npm run clear           # Clear Metro cache
npm run android         # Run on Android
npm run ios             # Run on iOS device/simulator
npm run lint            # ESLint check
npm run lint:fix        # ESLint auto-fix
npm run format          # Prettier formatting
```

**After Native Code Changes (iOS):**
```bash
cd ios
rm -rf Pods Podfile.lock
pod install --repo-update
cd ..
npm run ios-sim
```

### Backend (Python)

**Setup Python Environment (Conda):**
```bash
conda env create -f environment.yml
conda activate aster
```

**Run Chatbot Backend:**
```bash
python chatbot.py
# Streamlit app with RAG-powered health chatbot
# Requires OPENAI_API_KEY in .env
```

**ML Model Development:**
- Cycle predictions: `cycle-prediction/exp_notebook_cycle_tracker.ipynb`
- Mood predictions: `mood-prediction/exp_notebook_mood.py`

## Architecture

### Mobile App (React Native + Expo)

**Tech Stack:**
- React Native 0.81.4 with Expo SDK 54
- Navigation: React Navigation (Stack + Bottom Tabs)
- Backend: Supabase (Auth + PostgreSQL + Storage)
- State: Local component state + AsyncStorage + Supabase realtime
- AI/ML: Google Gemini (food recognition), OpenAI (chatbot)

**Authentication Flow:**
1. **No Session** → Welcome → Consent → Login/SignUp
2. **Has Session** → OnboardingRouter → Routes based on profile completion:
   - BasicInfo (if profile incomplete)
   - CycleDetails (if cycle data missing)
   - CarouselWalkthrough (if onboarding not complete)
   - Home (if fully onboarded)

Session managed in `aster-app/App.js:56-74` with `supabase.auth.getSession()` and `onAuthStateChange`.

**Core Features:**

1. **Period Tracking**
   - Cycle wheel visualization (`components/CycleWheel.js`)
   - Flow intensity logging (1-5 scale)
   - Symptom tracking with predefined categories
   - Daily logs for mood, energy, symptoms
   - ML-powered predictions via `utils/cyclePredictions.js`

2. **Food Logging**
   - Camera-based food recognition (Gemini AI)
   - Manual food entry with Open Food Facts API
   - Macro tracking (calories, protein, carbs, fat)
   - Water intake logging
   - Daily nutrition goals with progress visualization

3. **AI Chatbot**
   - Context-aware health assistant
   - Integration with user's period/health data
   - Backend: Python Flask/Streamlit with LangChain + OpenAI
   - Frontend: `components/ChatBotModal.js`
   - Services: `services/chatbotAPIService.js`, `services/chatbotDataService.js`

4. **Apple Health Integration (iOS only)**
   - HealthKit permissions via `lib/healthkit.js`
   - Requires dev build (not available in Expo Go)

**Key Directories:**
- `/screens/` - Full-screen components (30+ screens)
- `/components/` - Reusable UI components (CycleWheel, ChatBotModal, etc.)
- `/lib/` - Core libraries (Supabase client, HealthKit, feature flags)
- `/services/` - API clients (chatbot, Gemini, Open Food Facts)
- `/utils/` - Business logic (cycle calculations, meal logging, crash logging)
- `/assets/` - Images, icons, fonts

### Backend Services

**Supabase (Primary Backend):**
- URL: `https://iinbwdrzmmcwajbmuynh.supabase.co`
- Configured in `aster-app/lib/supabase.js`
- Uses AsyncStorage for session persistence
- PKCE flow for auth
- RLS (Row Level Security) on all tables

**Database Schema** (`aster-app/schema.sql`):
- **User & Profile:** `user_profiles` (extends auth.users)
- **Period Tracking:** `periods`, `flow_intensity_logs`, `daily_logs`, `cycle_predictions`
- **Food Logging:** `meal_logs`, `meals`, `meal_items`, `water_logs`
- **Other:** `reminder_settings`, `symptom_categories`, `feature_flags`

All tables use RLS - users can only access their own data via `auth.uid()` policies.

**Python Chatbot Backend** (`chatbot.py`):
- Streamlit app with LangChain + OpenAI (gpt-4o-mini)
- RAG system using FAISS vector store + HuggingFace embeddings
- Loads PDF/text documents for health context
- Integrates with Supabase for user data
- Environment: Python 3.9 with conda environment

**ML Models:**
- Cycle prediction model trained in `cycle-prediction/` notebook
- Uses historical period data to predict next cycle dates
- Stored in Supabase Storage, loaded by chatbot for context

## Important Conventions

### Supabase Queries

Always use RLS-aware queries. User filtering is automatic via policies:

```javascript
const { data, error } = await supabase
  .from('periods')
  .select('*')
  .order('start_date', { ascending: false })
// No need for .eq('user_id', userId) - RLS handles this
```

### Feature Flags

Runtime feature toggles via `aster-app/lib/FeatureFlag.js`:

```javascript
import { useFeatureFlags } from './lib/FeatureFlag'

const { flags, loading } = useFeatureFlags()
if (flags.chatbot) {
  // Show chatbot feature
}
```

Environment variables:
- `EXPO_PUBLIC_ENABLE_CHATBOT` - Chatbot modal (default: true)
- `EXPO_PUBLIC_ENABLE_APPLE_HEALTH` - HealthKit integration (default: false)

### Error Handling

Global error logging in `aster-app/utils/CrashLogger.js`:

```javascript
import { log, error } from './utils/CrashLogger'

log('User action performed')
error('Something went wrong', errorObject)
```

### File Organization

React Native app follows standard patterns:
- One component per file
- PascalCase for component files
- camelCase for utility files
- Keep screens flat in `/screens/`, group complex features in subdirectories only if necessary

## Platform-Specific Notes

### iOS
- Minimum deployment target: iOS 15.1
- New Architecture: Disabled (`"newArchEnabled": false` in app.json)
- HealthKit requires native build via `expo-dev-client`
- Bundle identifier: `com.aster.healthapp`
- Apple Sign In enabled

### Android
- Edge-to-edge enabled
- Camera permissions required
- Package: `com.y` (placeholder - update for production)

### Web
- Limited support
- Food screens partially functional
- Use `npm run web` to test

## Testing

No automated tests currently. Manual testing checklist:

**Authentication:**
- Sign up/login with email
- Email verification (bypassed in dev with PKCE)
- Session persistence across app restarts

**Period Tracking:**
- Add period entry with flow level and symptoms
- View cycle predictions on home screen
- Log daily flow intensity

**Food Logging:**
- Camera capture → AI analysis
- Manual food entry
- View nutrition summary
- Update daily goals

**iOS Simulator:**
- Use `npm run ios-sim` workflow on macOS/MacInCloud

## Common Issues

**Metro bundler cache issues:**
```bash
cd aster-app
npx expo start --clear
```

**iOS pod dependency issues:**
```bash
cd aster-app/ios
rm -rf Pods Podfile.lock
pod install --repo-update
cd ../..
```

**Expo Go not loading:**
- Ensure same WiFi network
- Try tunnel mode: `cd aster-app && npm run tunnel`

**Python environment issues:**
```bash
conda env remove -n aster
conda env create -f environment.yml
conda activate aster
```

**Session not persisting:**
- Check AsyncStorage permissions
- Verify Supabase config in `aster-app/lib/supabase.js`

## MacInCloud Workflow (iOS Development)

When developing on MacInCloud for iOS simulator testing:

1. Pull latest code:
   ```bash
   cd ~/Projects/aster-health-app/aster-app
   git pull origin main
   ```

2. Use Node 18:
   ```bash
   nvm use 18
   node -v  # should show v18.x
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Run in simulator (two terminals):
   ```bash
   # Terminal 1: Metro
   npm run start:ios

   # Terminal 2: Simulator
   npm run ios-sim
   ```

## Development Tips

1. **Making Changes:** Test in Expo Go first for quick iteration before building dev client
2. **Native Changes:** Requires dev build - use MacInCloud workflow or local macOS
3. **Database Changes:** Update `aster-app/schema.sql` and apply via Supabase dashboard
4. **Navigation Changes:** Update conditional stacks in `aster-app/App.js:104-154`
5. **New Screens:** Add to `/screens/`, import in App.js, register in Stack.Navigator
6. **Styling:** Use StyleSheet with consistent color palette (primary: #e91e63)
7. **Chatbot Context:** User data fetching logic is in `aster-app/services/chatbotDataService.js`
8. **ML Models:** Train in Jupyter notebooks, export as pickle, upload to Supabase Storage

## Environment Variables

**Mobile App (.env in aster-app/):**
- Supabase credentials (URL, anon key) - currently hardcoded in `lib/supabase.js`
- Feature flags (EXPO_PUBLIC_* prefix)

**Python Backend (.env in root):**
- `OPENAI_API_KEY` - Required for chatbot
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anon key

## Deployment

**Mobile App:**
- Development: Use `npx expo start` with Expo Go
- Production iOS: `eas build --platform ios` (requires EAS account)
- Production Android: `eas build --platform android`
- OTA Updates: `eas update` for JavaScript-only changes

**Python Backend:**
- Currently runs locally with Streamlit
- For production: Deploy as Flask API or containerized Streamlit app
- Ensure OPENAI_API_KEY is available in production environment

## External Services

- **Supabase:** PostgreSQL database, auth, storage
- **OpenAI:** GPT-4o-mini for chatbot (via LangChain)
- **Google Gemini:** Food recognition from photos
- **Open Food Facts API:** Nutrition data lookup
- **Apple HealthKit:** Health data integration (iOS only)
- **Expo:** App development, builds, OTA updates
