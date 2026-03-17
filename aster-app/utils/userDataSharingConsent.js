import AsyncStorage from '@react-native-async-storage/async-storage';

export const USER_DATA_SHARING_CONSENT_KEY = 'aster_user_data_sharing_consent_v1';

export const USER_DATA_SHARING_CONSENT_STATUS = Object.freeze({
  GRANTED: 'granted',
  DENIED: 'denied',
});

export async function getUserDataSharingConsentStatus() {
  try {
    const value = await AsyncStorage.getItem(USER_DATA_SHARING_CONSENT_KEY);
    if (value === USER_DATA_SHARING_CONSENT_STATUS.GRANTED) {
      return USER_DATA_SHARING_CONSENT_STATUS.GRANTED;
    }
    if (value === USER_DATA_SHARING_CONSENT_STATUS.DENIED) {
      return USER_DATA_SHARING_CONSENT_STATUS.DENIED;
    }
    return null;
  } catch (err) {
    console.log('Failed to read user data sharing consent:', err);
    return null;
  }
}

export async function setUserDataSharingConsentStatus(status) {
  try {
    if (
      status !== USER_DATA_SHARING_CONSENT_STATUS.GRANTED &&
      status !== USER_DATA_SHARING_CONSENT_STATUS.DENIED
    ) {
      await AsyncStorage.removeItem(USER_DATA_SHARING_CONSENT_KEY);
      return;
    }
    await AsyncStorage.setItem(USER_DATA_SHARING_CONSENT_KEY, status);
  } catch (err) {
    console.log('Failed to save user data sharing consent:', err);
  }
}

export async function isUserDataSharingConsentGranted() {
  const status = await getUserDataSharingConsentStatus();
  return status === USER_DATA_SHARING_CONSENT_STATUS.GRANTED;
}
