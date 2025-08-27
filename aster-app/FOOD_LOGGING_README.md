# Food Logging Flow Documentation

## Overview
This document describes the food logging functionality implemented in the Aster Health App, which allows users to track their nutrition through AI-powered photo analysis and manual entry.

## Screen Flow

### 1. MealLogHomeScreen (Main Food Dashboard)
- **Purpose**: Main dashboard showing daily calorie intake, macros, and water consumption
- **Features**:
  - Circular calorie progress ring
  - Macro progress bars (Protein, Carbs, Fat)
  - Water tracking with circular display
  - Meal summary (Breakfast, Lunch, Dinner, Snacks)
  - Date selector
  - Edit log functionality

### 2. MealLogScreen (Meal Type Selection)
- **Purpose**: Modal for selecting meal type before logging food
- **Features**:
  - Breakfast, Lunch, Snack, Dinner options
  - Modal overlay design
  - Navigation to AddFoodScreen

### 3. CameraScreen (Photo Capture)
- **Purpose**: Camera interface for food photo capture
- **Features**:
  - Camera/Manual mode toggle
  - Shutter button with meal type selection
  - Mode indicators (1, 2, 5)
  - Navigation to PhotoConfirmation

### 4. PhotoConfirmationScreen (Photo Review)
- **Purpose**: Confirm captured photo before analysis
- **Features**:
  - Photo display with retake option
  - Photo quality assessment
  - Analyze button to proceed

### 5. NutritionSummaryScreen (AI Analysis Results)
- **Purpose**: Display AI-analyzed nutrition information
- **Features**:
  - Food image with calorie overlay
  - Dish information and description
  - Macronutrient breakdown
  - Ingredients list
  - Micronutrient information
  - Add to Food Log button

### 6. AddFoodScreen (Manual Food Entry)
- **Purpose**: Manual food entry form
- **Features**:
  - Food name input
  - Weight input
  - Calories input
  - Macro inputs (Protein, Carbs, Fats)
  - Add to Food Log button

### 7. TimeAmountScreen (Time and Amount)
- **Purpose**: Set time and amount for food entry
- **Features**:
  - Time picker
  - Food name display (read-only)
  - Amount input
  - Save functionality

### 8. EditGoalsScreen (Nutrition Goals)
- **Purpose**: Edit daily nutrition goals
- **Features**:
  - Daily calorie goal
  - Water intake goal
  - Macro goals (Protein, Carbs, Fats)
  - Micronutrient goals
  - Reset to suggested goals

### 9. FoodLogScreen (Food History)
- **Purpose**: View logged food items
- **Features**:
  - Organized by meal type
  - Food images and details
  - Edit and delete options
  - Calorie totals per meal

## Navigation Flow

```
HomeScreen → MealLogHomeScreen → MealLogScreen → AddFoodScreen
     ↓
CameraScreen → PhotoConfirmationScreen → NutritionSummaryScreen → AddFoodScreen
     ↓
TimeAmountScreen → EditGoalsScreen/FoodLogScreen
```

## Key Features

### AI Food Recognition
- Photo capture and analysis
- Automatic nutrition detection
- Ingredient breakdown
- Calorie estimation

### Manual Food Entry
- Custom food input
- Macro tracking
- Serving size management
- Time logging

### Goal Management
- Daily calorie targets
- Macro goals
- Water intake goals
- Progress tracking

### Data Persistence
- Local storage for demo purposes
- Supabase integration ready
- Meal history tracking
- Goal persistence

## Technical Implementation

### Dependencies
- `@react-native-community/datetimepicker` - Date/time selection
- `expo-image-picker` - Camera functionality
- `react-native-svg` - Progress rings and charts
- `@expo/vector-icons` - Icon system

### State Management
- Local state for form inputs
- Navigation state management
- Mock data for demonstration

### Styling
- Consistent design system
- Responsive layouts
- Modern UI components
- Accessibility considerations

## Future Enhancements

### Planned Features
- Real AI integration for food recognition
- Barcode scanning
- Food database integration
- Social sharing
- Meal planning
- Recipe suggestions

### Technical Improvements
- Offline support
- Data synchronization
- Performance optimization
- Enhanced error handling
- Unit testing

## Usage Instructions

1. **Start Food Logging**: Navigate to Food tab from Home screen
2. **Choose Method**: Select Camera or Manual entry
3. **Capture/Enter Food**: Take photo or input details manually
4. **Review Information**: Confirm nutrition details
5. **Add to Log**: Save food item to daily log
6. **Track Progress**: Monitor daily goals and intake
7. **Edit Goals**: Adjust nutrition targets as needed

## Demo Data

The app includes mock data for demonstration purposes:
- Sample food items
- Pre-filled nutrition values
- Mock AI analysis results
- Example meal logs

This allows users to experience the full flow without requiring actual AI integration or backend services.
