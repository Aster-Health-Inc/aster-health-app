# Aster Women's Health App

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

A comprehensive women's health tracking app built with React Native (Expo) and Supabase, focusing on period tracking and health monitoring.

## 🌟 Features

- **User Authentication**: Secure email/password authentication with Supabase Auth
- **Period Tracking**: Log period start/end dates, flow levels, symptoms, and notes
- **Health History**: View and manage your complete period history
- **Real-time Sync**: Data automatically syncs across devices
- **Clean UI**: Intuitive, women's health-focused interface

## 🛠 Tech Stack

- **Frontend**: React Native with Expo (JavaScript)
- **Backend**: Supabase (PostgreSQL + Auth)
- **Navigation**: React Navigation Stack Navigator
- **Platform**: iOS first, Android support ready

## 📱 Screenshots & Demo

The app includes:
- Authentication screens (Login/Sign Up)
- Home screen with period history
- Add period entry form with flow level selector
- Responsive design optimized for mobile

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Expo Go app on your iOS/Android device
- Supabase account (database already configured)

### Installation

1. **Clone and setup the project:**
   ```bash
   git clone <your-repo-url>
   cd aster-app
   npm install
   ```

2. **Verify Supabase configuration:**
   The app is pre-configured with Supabase credentials in `lib/supabase.js`. The database schema is already set up with the following tables:
   - `users` - User profiles and settings
   - `periods` - Period tracking entries
   - `daily_logs` - Daily health logs (ready for future features)

3. **Start the development server:**
   ```bash
   npx expo start
   ```

4. **Run on your device:**
   - Install Expo Go from the App Store/Google Play
   - Scan the QR code displayed in your terminal
   - The app will load on your device

### Alternative Running Methods

**For iOS Simulator:**
```bash
npx expo start --ios
```

**For Android Emulator:**
```bash
npx expo start --android
```

**For Web (requires additional setup):**
```bash
npx expo install react-dom react-native-web @expo/metro-runtime
npx expo start --web
```

## 📁 Project Structure

```
aster-app/
├── App.js                 # Main app with navigation and auth state
├── lib/
│   └── supabase.js        # Supabase client configuration
├── screens/
│   ├── LoginScreen.js     # User authentication
│   ├── SignUpScreen.js    # User registration
│   ├── HomeScreen.js      # Main dashboard with period history
│   └── AddPeriodScreen.js # Period entry form
├── components/            # Reusable components (ready for expansion)
├── assets/               # Images, icons, etc.
└── package.json          # Dependencies and scripts
```

## 🔐 Authentication Flow

1. **New Users**: Sign up with email/password → Email verification → Auto-login
2. **Existing Users**: Login with credentials → Redirect to home
3. **Session Management**: Automatic session persistence and refresh
4. **Sign Out**: Secure logout with session cleanup

## 💾 Data Management

### Database Schema (Supabase)

**Users Table:**
```sql
users (
  id uuid primary key,
  email text unique not null,
  created_at timestamptz default now(),
  average_cycle_length integer default 28,
  average_period_length integer default 5
)
```

**Periods Table:**
```sql
periods (
  id uuid primary key,
  user_id uuid references users(id),
  start_date date not null,
  end_date date,
  flow_level integer,      -- 1-5 scale
  symptoms text[],         -- Array of symptom strings
  notes text,
  created_at timestamptz default now()
)
```

### Data Features
- **Real-time Updates**: Changes sync immediately across devices
- **Offline Support**: Basic offline functionality with automatic sync
- **Data Validation**: Client-side validation for dates and required fields
- **Error Handling**: Comprehensive error handling with user feedback

## 🎨 UI/UX Features

- **Clean Design**: Minimalist interface focused on ease of use
- **Flow Level Selector**: Visual 1-5 scale with color coding
- **Date Input**: Formatted date input with validation
- **Loading States**: Activity indicators for all async operations
- **Error Feedback**: Clear error messages and validation
- **Responsive**: Adapts to different screen sizes

## 🧪 Testing the App

### Manual Testing Checklist

**Authentication:**
- [ ] Sign up with new email
- [ ] Sign up with invalid email (should show error)
- [ ] Sign up with short password (should show error)
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (should show error)
- [ ] Sign out functionality

**Period Tracking:**
- [ ] Add new period entry with all fields
- [ ] Add period with only required fields
- [ ] Add period with invalid dates (should show error)
- [ ] View period history on home screen
- [ ] Pull to refresh period list

**Navigation:**
- [ ] Navigate between all screens
- [ ] Back button functionality
- [ ] Authentication state changes

### Test Data Examples

**Valid Period Entry:**
- Start Date: 2024-01-15
- End Date: 2024-01-20
- Flow Level: 3 (Medium)
- Symptoms: cramps, headache, bloating
- Notes: Moderate symptoms, took ibuprofen

## 📱 Deployment

### iOS Deployment

1. **Development Build:**
   ```bash
   npx expo run:ios
   ```

2. **Production Build:**
   ```bash
   eas build --platform ios
   ```

### Android Deployment

1. **Development Build:**
   ```bash
   npx expo run:android
   ```

2. **Production Build:**
   ```bash
   eas build --platform android
   ```

### Publishing Updates

```bash
npx expo publish
```

## 🔧 Configuration

### Environment Variables
The app uses hardcoded Supabase credentials for demo purposes. For production, consider using environment variables:

```javascript
// In lib/supabase.js
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
```

### Expo Configuration
Key settings in `app.json`:
- App name: "Aster"
- Bundle identifier: Ready for app store
- iOS/Android platform support
- Icon and splash screen ready

## 🛠 Development

### Adding New Features

1. **New Screens**: Add to `screens/` folder and update navigation in `App.js`
2. **Database Changes**: Update Supabase schema and corresponding API calls
3. **UI Components**: Add reusable components to `components/` folder

### Common Development Tasks

**Add new dependency:**
```bash
npx expo install <package-name>
```

**Clear cache:**
```bash
npx expo start --clear
```

**Type checking (if using TypeScript):**
```bash
npx expo install --fix
```

## 🐛 Troubleshooting

### Common Issues

**Metro bundler issues:**
```bash
npx expo start --clear
```

**Dependency conflicts:**
```bash
npm install --legacy-peer-deps
```

**Expo Go not loading:**
- Ensure device and computer are on the same network
- Try using tunnel mode: `npx expo start --tunnel`

**Supabase connection issues:**
- Verify internet connection
- Check Supabase credentials in `lib/supabase.js`
- Confirm database tables exist

### Error Messages

- **"Network Error"**: Check internet connection and Supabase status
- **"Session expired"**: User needs to login again
- **"Invalid date format"**: Ensure dates are in YYYY-MM-DD format

## 📈 Future Enhancements

The app is architected to easily support additional features:

- **Cycle Predictions**: ML-based cycle forecasting
- **Daily Logging**: Mood, symptoms, and general health tracking
- **Analytics**: Cycle insights and health trends
- **Notifications**: Period reminders and health tips
- **Data Export**: CSV/PDF export functionality
- **Healthcare Integration**: Share data with healthcare providers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 💬 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the troubleshooting section above
- Review Expo and Supabase documentation

---

**Built with ❤️ for women's health tracking and empowerment.**