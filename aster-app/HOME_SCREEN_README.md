# HomeScreen Component

## Overview
The HomeScreen is a comprehensive cycle tracking dashboard that displays the user's current cycle information, calendar view, and provides navigation to other app features.

## Features

### 1. Cycle Day Summary Card
- Shows current cycle day number
- Displays current cycle phase (Menstrual, Follicular, Ovulation, Luteal)
- Progress bar showing cycle completion percentage
- Countdown to next period

### 2. Calendar View
- Monthly calendar with cycle phase indicators
- Color-coded days for different cycle phases:
  - Black circles: Period days
  - Purple circles: Fertile window
  - Dashed outline: Current day
- Month navigation with left/right arrows
- Legend explaining the color coding

### 3. Today's Section
- Horizontal scrollable list of today's tracking items
- Placeholder for mood, symptoms, and notes

### 4. Bottom Navigation
- Home (active)
- Food
- Lumi (add new items)
- Mood

## Integration

### Navigation
The HomeScreen is automatically added to your navigation stack and will be displayed after users complete onboarding.

### Data Sources
- **Cycle Data**: Integrates with your existing `cycleCalculations.js` utilities
- **User Profile**: Fetches data from Supabase `user_profiles` table
- **Period Data**: Uses `periods` table for historical tracking

### Required Database Fields
Make sure your `user_profiles` table has:
- `last_period_date`: Date of last period
- `cycle_length`: Average cycle length in days
- `onboarding_completed`: Boolean flag for onboarding status

## Usage

### Navigation
```javascript
// Navigate to HomeScreen
navigation.navigate('Home');

// Reset navigation to Home (after onboarding)
navigation.reset({ 
  index: 0, 
  routes: [{ name: 'Home' }] 
});
```

### Data Loading
The screen automatically loads cycle data when mounted and provides pull-to-refresh functionality.

### Error Handling
- Shows loading states while fetching data
- Displays helpful message if no cycle data is available
- Provides button to complete profile setup if needed

## Styling
The component uses a clean, modern design with:
- Light gray background (`#F8F9FA`)
- White cards with subtle shadows
- Purple accent color (`#8B5CF6`)
- Consistent border radius (16px)
- Proper spacing and typography

## Future Enhancements
- Real-time cycle predictions
- Integration with health apps
- Customizable calendar views
- Advanced cycle analytics
- Symptom and mood tracking integration
