# Aster App - Complete Setup Instructions

This guide will walk you through setting up and running the Aster women's health tracking app from scratch.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

### Required Software
1. **Node.js (v16 or higher)**
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version`

2. **npm (comes with Node.js)**
   - Verify installation: `npm --version`

3. **Expo CLI**
   ```bash
   npm install -g @expo/cli
   ```
   - Verify installation: `expo --version`

4. **Expo Go App**
   - iOS: Download from App Store
   - Android: Download from Google Play Store

### Optional (for simulator testing)
- **Xcode** (for iOS simulator) - macOS only
- **Android Studio** (for Android emulator)

## 🚀 Step-by-Step Setup

### Step 1: Project Setup

1. **Navigate to your project directory**
   ```bash
   cd /path/to/aster-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
   
   This will install all required packages including:
   - React Navigation
   - Supabase client
   - React Native Gesture Handler
   - AsyncStorage
   - And other dependencies

### Step 2: Verify Supabase Configuration

The app comes pre-configured with Supabase. Verify the configuration in `lib/supabase.js`:

```javascript
// These are already configured for you
const supabaseUrl = 'https://iinbwdrzmmcwajbmuynh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

**Database Schema**: The following tables are already created in Supabase:
- `users` - User profiles and settings
- `periods` - Period tracking entries  
- `daily_logs` - Ready for future daily health tracking

### Step 3: Start the Development Server

1. **Start Expo development server**
   ```bash
   npx expo start
   ```

2. **You should see output like this:**
   ```
   › Metro waiting on exp://192.168.1.100:8081
   › Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
   ```

### Step 4: Run on Your Device

#### Option A: Physical Device (Recommended)

1. **Open Expo Go app** on your phone
2. **Scan the QR code** displayed in your terminal
3. **Wait for the app to load** (first load may take a minute)

#### Option B: iOS Simulator (macOS only)

1. **Install iOS Simulator** (comes with Xcode)
2. **Press 'i' in the terminal** where Expo is running
3. **Select simulator** from the list

#### Option C: Android Emulator

1. **Setup Android emulator** in Android Studio
2. **Start emulator**
3. **Press 'a' in the terminal** where Expo is running

## 🧪 Testing Your Setup

### 1. Test Authentication

**Sign Up Test:**
1. Open the app
2. Tap "Don't have an account? Sign Up"
3. Enter test email: `test@example.com`
4. Enter password: `password123`
5. Confirm password: `password123`
6. Tap "Create Account"
7. Should show success message

**Login Test:**
1. Use the same credentials to login
2. Should navigate to home screen
3. Should display welcome message with email

### 2. Test Period Tracking

**Add Period Entry:**
1. From home screen, tap "+ Add Period"
2. Enter start date: `2024-01-15`
3. Enter end date: `2024-01-20` (optional)
4. Select flow level (tap any number 1-5)
5. Enter symptoms: `cramps, headache`
6. Enter notes: `Test period entry`
7. Tap "Save Period Entry"
8. Should navigate back to home screen
9. Should see new entry in the list

**View Period History:**
1. Check that your entry appears on home screen
2. Pull down to refresh the list
3. Verify all entered data is displayed correctly

### 3. Test Navigation

- Navigate between all screens
- Test back buttons
- Test sign out functionality

## 🔧 Common Setup Issues & Solutions

### Issue: "Metro bundler failed to start"

**Solution:**
```bash
npx expo start --clear
```

### Issue: "Cannot connect to development server"

**Solutions:**
1. Ensure phone and computer are on same WiFi network
2. Try tunnel mode:
   ```bash
   npx expo start --tunnel
   ```
3. Check firewall settings

### Issue: "Expo Go won't load the app"

**Solutions:**
1. Force close Expo Go app and reopen
2. Clear Expo cache:
   ```bash
   npx expo start --clear
   ```
3. Restart development server

### Issue: "Supabase authentication errors"

**Check:**
1. Internet connection is stable
2. Supabase service is online
3. Credentials in `lib/supabase.js` are correct

### Issue: npm install errors

**Solution:**
```bash
npm install --legacy-peer-deps
```

### Issue: "Dependency version conflicts"

**Solution:**
```bash
npx expo doctor
npx expo install --fix
```

## 📱 Building for Production

### iOS Production Build

1. **Install EAS CLI:**
   ```bash
   npm install -g @expo/eas-cli
   ```

2. **Login to Expo:**
   ```bash
   eas login
   ```

3. **Build for iOS:**
   ```bash
   eas build --platform ios
   ```

### Android Production Build

```bash
eas build --platform android
```

## 🛠 Development Workflow

### Making Changes

1. **Edit files** - Changes will hot reload automatically
2. **Add new screens** - Add to `screens/` folder and update `App.js`
3. **Install new packages** - Use `npx expo install <package>`
4. **Test thoroughly** before deploying

### Debugging

1. **Open developer menu** - Shake device or press Cmd+D (iOS) / Cmd+M (Android)
2. **Enable debugging** - "Debug with Chrome" option
3. **View logs** - Terminal where Expo is running shows all logs

## 📊 Performance Tips

1. **Clear cache regularly** during development
2. **Use production builds** for performance testing
3. **Monitor bundle size** with `npx expo export --dump-sourcemap`
4. **Optimize images** in `assets/` folder

## 🔐 Security Considerations

### For Production Deployment:

1. **Environment Variables:**
   ```javascript
   // Use environment variables instead of hardcoded values
   const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
   ```

2. **Row Level Security:**
   - Already enabled in Supabase for user data isolation

3. **API Keys:**
   - Current anon key is safe for client-side use
   - Never expose service role keys

## 📈 Next Steps

Once you have the basic app running:

1. **Customize the UI** - Modify colors, fonts, layouts in screen files
2. **Add new features** - Use existing patterns for new functionality
3. **Setup analytics** - Add Expo Analytics or custom tracking
4. **Prepare for app stores** - Configure app.json for production

## 🤔 Need Help?

1. **Check logs** in the terminal running Expo
2. **Review error messages** carefully
3. **Consult documentation:**
   - [Expo Documentation](https://docs.expo.dev/)
   - [Supabase Documentation](https://supabase.com/docs)
   - [React Navigation](https://reactnavigation.org/)

## ✅ Setup Verification Checklist

- [ ] Node.js and npm installed
- [ ] Expo CLI installed globally
- [ ] Expo Go app installed on device
- [ ] Project dependencies installed (`npm install`)
- [ ] Development server starts (`npx expo start`)
- [ ] App loads on device
- [ ] Sign up functionality works
- [ ] Login functionality works
- [ ] Period entry can be added
- [ ] Data persists and displays correctly
- [ ] Navigation between screens works
- [ ] Sign out functionality works

**Congratulations! Your Aster app is now ready for development and testing.** 🎉