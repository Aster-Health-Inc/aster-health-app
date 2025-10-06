# Aster Women's Health App

A comprehensive women's health tracking app built with React Native (Expo) and Supabase, featuring period tracking, nutrition logging, AI-powered cycle predictions, and an intelligent health chatbot.

## 🌟 Features

- **Period Tracking** - Log periods, flow intensity, symptoms, mood, and energy levels
- **Cycle Predictions** - ML-powered predictions for next period and ovulation
- **Food Logging** - Track nutrition with photo-based AI recognition or manual entry
- **Health Chatbot** - AI assistant with personalized health guidance
- **Water Tracking** - Daily water intake monitoring
- **Apple Health Integration** - Sync with HealthKit (iOS only, requires dev build)
- **Daily Insights** - Personalized health insights and cycle phase tracking

## 🛠 Tech Stack

- **Frontend**: React Native with Expo 54 (JavaScript)
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Navigation**: React Navigation Stack Navigator
- **AI/ML**: LangChain + OpenAI (chatbot), Gemini (food recognition)
- **Platform**: iOS & Android

## 🚀 Quick Start

### Prerequisites

- Node.js v16+ and npm
- Expo CLI: `npm install -g @expo/cli`
- Expo Go app on your device

### Installation

```bash
git clone <repo-url>
cd aster-app
npm install
npx expo start
```

### Running on Physical Device (Expo Go)

1. Run `npx expo start`
2. Press `s` to switch to Expo Go mode
3. Scan QR code with Expo Go app
4. Ensure device and computer are on same WiFi

**Note:** HealthKit features require a dev build and won't work in Expo Go.

### Running on iOS Simulator (macOS/MacInCloud)

**Tab 1 - Metro Bundler:**
```bash
npm run start:ios
```

**Tab 2 - Simulator:**
```bash
npm run ios-sim
```

### MacInCloud Workflow

```bash
# Use Node 18
nvm use 18

# Pull and install
git pull origin main
npm install

# Run simulator
npm run start:ios  # Tab 1
npm run ios-sim    # Tab 2
```

### After Native Code Changes

```bash
cd ios
rm -rf Pods Podfile.lock
pod install --repo-update
cd ..
npm run ios-sim
```

## 📁 Project Structure

```
aster-app/
├── App.js                      # Main app entry, navigation, auth
├── app.json                    # Expo configuration
├── schema.sql                  # Database schema reference
├── CLAUDE.md                   # AI assistant development guide
│
├── screens/                    # All app screens
│   ├── LoginScreen.js
│   ├── SignUpScreen.js
│   ├── HomeScreen.js          # Main dashboard
│   ├── MealLogHomeScreen.js   # Food tracking dashboard
│   ├── BasicInfoScreen.js     # Onboarding
│   └── ...
│
├── components/                 # Reusable UI components
│   ├── ChatBotModal.js
│   ├── CycleWheel.js
│   ├── DailyInsights.js
│   ├── MacroCard.js
│   └── ...
│
├── services/                   # External API integrations
│   ├── chatbotAPIService.js
│   ├── geminiService.js
│   └── openFoodFactsService.js
│
├── utils/                      # Helper functions
│   ├── cycleCalculations.js
│   ├── cyclePredictions.js
│   ├── nutritionCalculator.js
│   └── CrashLogger.js
│
├── lib/                        # Core libraries
│   ├── supabase.js            # Supabase client
│   ├── FeatureFlag.js         # Feature toggles
│   └── healthkit.js           # Apple Health integration
│
└── assets/                     # Images, icons, fonts
```

## 🔐 Authentication Flow

```
App Start
    ↓
Check Session
    ↓
┌─────────────────┐    ┌─────────────────────┐
│   No Session    │    │   Has Session       │
│                 │    │                     │
│ Welcome Screen  │    │ OnboardingRouter    │
│                 │    │                     │
│ Login/SignUp    │    │ ↓                   │
└─────────────────┘    │ Check Profile       │
                       │ ↓                   │
                       │ Route to:           │
                       │ • BasicInfo         │
                       │ • CycleDetails      │
                       │ • CarouselWalkthrough│
                       │ • Home              │
                       └─────────────────────┘
```

## 💾 Database Schema

**Key Tables:**
- `user_profiles` - Name, birthdate, settings
- `periods` - Period entries with flow, symptoms, mood
- `daily_logs` - Daily health tracking
- `cycle_predictions` - ML-generated predictions
- `meal_logs` - Daily nutrition summaries
- `meals` - Breakfast, lunch, dinner, snacks
- `meal_items` - Individual food items
- `water_logs` - Water intake
- `reminder_settings` - Notification preferences

**Security:** Row-Level Security (RLS) enabled - users can only access their own data.

See `schema.sql` for complete schema.

## 🎯 Available Commands

```bash
# Development
npm start              # Start Expo dev server
npm run start:ios      # Start for iOS simulator (Metro)
npm run ios-sim        # Boot simulator and install app
npm run clear          # Start with cache cleared
npm run tunnel         # Tunnel mode (for network issues)

# Platform-specific
npm run android        # Run on Android
npm run ios            # Run on iOS

# Builds
npm run build:ios      # Export iOS build
npm run build:android  # Export Android build
```

## 🧪 Key Features Implementation

### Period Tracking
- Flow intensity logging (1-5 scale)
- Symptom tracking (cramps, bloating, mood swings, etc.)
- Mood and energy tracking
- Cycle wheel visualization
- ML-based next period prediction

### Food Logging
- Camera-based food recognition (Gemini AI)
- Manual food entry
- Macro tracking (calories, protein, carbs, fat)
- Water intake logging
- Daily nutrition goals

### AI Chatbot
- Context-aware responses based on user health data
- Period tracking insights
- Nutrition guidance
- Integration with OpenAI GPT-4

### Apple Health (iOS only)
- HealthKit data sync
- Requires dev build (not available in Expo Go)
- Configured in `ios/asterapp/asterapp.entitlements`

## 🔧 Configuration

### Feature Flags

Control features via environment variables or Supabase `feature_flags` table:

```bash
EXPO_PUBLIC_ENABLE_CHATBOT=true       # Chatbot modal (default: true)
EXPO_PUBLIC_ENABLE_APPLE_HEALTH=false # HealthKit (default: false)
```

### Supabase

Credentials configured in `lib/supabase.js`:
- Auto-refresh tokens enabled
- PKCE auth flow
- AsyncStorage for session persistence

## 🐛 Troubleshooting

**Metro bundler issues:**
```bash
npx expo start --clear
```

**iOS pod issues:**
```bash
cd ios
rm -rf Pods Podfile.lock
pod install --repo-update
cd ..
```

**Expo Go not loading:**
- Ensure same WiFi network
- Try: `npm run tunnel`

**Session not persisting:**
- Check AsyncStorage permissions
- Verify Supabase config in `lib/supabase.js`

## 📱 Platform Support

- **iOS**: Minimum iOS 15.1, New Architecture enabled
- **Android**: Edge-to-edge enabled, camera permissions required
- **Web**: Limited support (food screens partially functional)

## 🤖 AI/ML Components

- **Cycle Predictions**: Random Forest model trained on user data
- **Food Recognition**: Google Gemini API for photo analysis
- **Chatbot**: LangChain + OpenAI GPT-4o-mini
- **Nutrition Calc**: Macro calculations and daily goal tracking

## 📄 Additional Documentation

- `CLAUDE.md` - Comprehensive development guide for AI assistants
- `schema.sql` - Complete database schema with RLS policies

## 🔒 Security

- Email/password authentication via Supabase Auth
- Row-Level Security on all database tables
- User data isolation (users can only access their own data)
- Secure session management with auto-refresh

## 📈 Future Roadmap

- [ ] Enhanced ML cycle predictions
- [ ] Social features (anonymous community support)
- [ ] Healthcare provider integration
- [ ] Data export (CSV/PDF)
- [ ] Push notifications for period reminders
- [ ] Medication tracking
- [ ] Symptom severity tracking

---

**Built with ❤️ for women's health tracking and empowerment.**
