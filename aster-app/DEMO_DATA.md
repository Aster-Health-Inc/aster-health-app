# Demo Data for Testing Aster App

Use this sample data to test the app functionality.

## 🧪 Test User Accounts

### Test User 1
- **Email**: `demo@aster.app`
- **Password**: `password123`

### Test User 2  
- **Email**: `test@example.com`
- **Password**: `testpass456`

*Note: You can create these accounts using the sign-up flow in the app.*

## 📅 Sample Period Entries

Once logged in, use these sample entries to populate your period history:

### Entry 1 - Recent Period
- **Start Date**: `2024-01-15`
- **End Date**: `2024-01-20`
- **Flow Level**: 3 (Medium)
- **Symptoms**: `cramps, headache, bloating`
- **Notes**: `Moderate symptoms, took ibuprofen for cramps. Energy was low on days 2-3.`

### Entry 2 - Previous Month
- **Start Date**: `2023-12-18`
- **End Date**: `2023-12-22`
- **Flow Level**: 4 (Medium-Heavy)
- **Symptoms**: `severe cramps, back pain, fatigue`
- **Notes**: `Heavy flow days 2-3. Used heating pad for back pain relief.`

### Entry 3 - Light Period
- **Start Date**: `2023-11-20`
- **End Date**: `2023-11-23`
- **Flow Level**: 2 (Light-Medium)
- **Symptoms**: `mild cramps, mood swings`
- **Notes**: `Shorter and lighter than usual. Mood was more sensitive.`

### Entry 4 - Irregular Period
- **Start Date**: `2023-10-25`
- **End Date**: `2023-10-30`
- **Flow Level**: 5 (Heavy)
- **Symptoms**: `severe cramps, nausea, headache, breast tenderness`
- **Notes**: `Came later than expected. Very heavy first two days. Nausea was challenging.`

### Entry 5 - Normal Period
- **Start Date**: `2023-09-28`
- **End Date**: `2023-10-02`
- **Flow Level**: 3 (Medium)
- **Symptoms**: `cramps, acne, cravings`
- **Notes**: `Right on schedule. Had strong chocolate cravings. Skin broke out.`

## 🧪 Testing Scenarios

### Authentication Testing
1. **Valid Sign Up**: Use any email not already in system
2. **Invalid Email**: Try `invalid-email` (should show error)
3. **Short Password**: Try `123` (should show error)
4. **Password Mismatch**: Different confirm password (should show error)
5. **Valid Login**: Use created account credentials
6. **Invalid Login**: Wrong password (should show error)

### Period Entry Testing
1. **Complete Entry**: Fill all fields with sample data above
2. **Required Only**: Only start date (should save successfully)
3. **Invalid Date**: Try `2024-13-45` (should show error)
4. **End Before Start**: End date before start date (should show error)
5. **Future Date**: Try dates in far future (should work)

### Data Persistence Testing
1. **Add Entry**: Create new period entry
2. **Force Close App**: Close and reopen app
3. **Check Data**: Entry should still be visible
4. **Pull to Refresh**: Test refresh functionality
5. **Sign Out/In**: Data should persist across sessions

### Navigation Testing
1. **Screen Transitions**: Test all navigation paths
2. **Back Buttons**: Test all back navigation
3. **Auth State**: Sign out should return to login
4. **Deep Links**: Test with different starting screens

## 📱 UI Testing Checklist

### Login Screen
- [ ] Email input accepts valid email format
- [ ] Password input hides characters
- [ ] Error messages display for invalid inputs
- [ ] Loading indicator shows during login
- [ ] Sign up link navigates correctly

### Sign Up Screen
- [ ] All validation rules work
- [ ] Password confirmation works
- [ ] Success message shows
- [ ] Navigation to login works

### Home Screen
- [ ] Welcome message shows user email
- [ ] Period entries display correctly
- [ ] Add button navigates to form
- [ ] Pull to refresh works
- [ ] Sign out confirmation works
- [ ] Empty state shows when no data

### Add Period Screen
- [ ] Date inputs format correctly
- [ ] Flow level selector works
- [ ] All validation rules work
- [ ] Save button shows loading state
- [ ] Cancel button works
- [ ] Success navigation works

## 🔄 Edge Cases to Test

### Date Handling
- **Leap Year**: `2024-02-29` (should work)
- **Invalid February**: `2023-02-29` (should error)
- **Month Boundaries**: `2024-01-31` to `2024-02-01`

### Text Input Handling
- **Empty Symptoms**: Leave blank (should work)
- **Long Symptoms**: Very long comma-separated list
- **Special Characters**: Test emojis and special chars in notes
- **Max Length**: Very long notes text

### Network Scenarios
- **Poor Connection**: Test with slow internet
- **No Connection**: Test offline behavior
- **Connection Loss**: Start action online, lose connection mid-way

## 📊 Performance Testing

### Load Testing
- **Many Entries**: Add 20+ period entries
- **Large Notes**: Add entries with very long notes
- **Quick Actions**: Rapidly navigate between screens
- **Memory Usage**: Monitor app memory during extended use

### Startup Testing
- **Cold Start**: Time from app icon tap to usable
- **Warm Start**: Time when switching back to app
- **Auth Check**: Time to determine login state

## 🐛 Known Issues to Verify Fixed

- [ ] Date inputs accept proper format
- [ ] Authentication errors show user-friendly messages
- [ ] Navigation state persists correctly
- [ ] Data syncs immediately after entry
- [ ] Loading states prevent double-submissions
- [ ] Form validation prevents invalid data

## 💡 Feature Validation

### Core Functionality
- [ ] User can create account
- [ ] User can login/logout
- [ ] User can add period entries
- [ ] User can view period history
- [ ] Data persists across sessions

### User Experience
- [ ] App feels responsive
- [ ] Error messages are helpful
- [ ] Success feedback is clear
- [ ] Navigation is intuitive
- [ ] Design is visually appealing

### Data Integrity
- [ ] No data loss on app restart
- [ ] User data is properly isolated
- [ ] Invalid data is rejected
- [ ] Dates are handled correctly
- [ ] Text inputs are properly sanitized

---

**Use this demo data to thoroughly test all aspects of the Aster app before deployment!** 🧪