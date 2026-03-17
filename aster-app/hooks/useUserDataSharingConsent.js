import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import PrivacyAIConsentModal from '../components/PrivacyAIConsentModal';
import {
  getUserDataSharingConsentStatus,
  setUserDataSharingConsentStatus,
  USER_DATA_SHARING_CONSENT_STATUS,
} from '../utils/userDataSharingConsent';

const UserDataSharingConsentContext = createContext(null);

export const UserDataSharingConsentProvider = ({ children }) => {
  const [consentStatus, setConsentStatus] = useState(null);
  const [consentLoaded, setConsentLoaded] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const pendingResolverRef = useRef(null);
  const pendingPromiseRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const loadConsent = async () => {
      const saved = await getUserDataSharingConsentStatus();
      if (!mounted) return;
      setConsentStatus(saved);
      setConsentLoaded(true);
    };
    void loadConsent();

    return () => {
      mounted = false;
      if (pendingResolverRef.current) {
        pendingResolverRef.current(false);
        pendingResolverRef.current = null;
        pendingPromiseRef.current = null;
      }
    };
  }, []);

  const resolvePending = useCallback((value) => {
    if (pendingResolverRef.current) {
      pendingResolverRef.current(value);
      pendingResolverRef.current = null;
      pendingPromiseRef.current = null;
    }
  }, []);

  const setConsentGranted = useCallback(
    async (granted) => {
      const nextStatus = granted
        ? USER_DATA_SHARING_CONSENT_STATUS.GRANTED
        : USER_DATA_SHARING_CONSENT_STATUS.DENIED;
      setConsentStatus(nextStatus);
      await setUserDataSharingConsentStatus(nextStatus);
      setModalVisible(false);
      resolvePending(granted);
      return granted;
    },
    [resolvePending],
  );

  const requestConsent = useCallback(async () => {
    if (consentStatus === USER_DATA_SHARING_CONSENT_STATUS.GRANTED) {
      return true;
    }
    if (consentStatus === USER_DATA_SHARING_CONSENT_STATUS.DENIED) {
      return false;
    }
    if (pendingPromiseRef.current) {
      return pendingPromiseRef.current;
    }
    setModalVisible(true);
    const pendingPromise = new Promise((resolve) => {
      pendingResolverRef.current = resolve;
    });
    pendingPromiseRef.current = pendingPromise;
    return pendingPromise;
  }, [consentStatus]);

  const contextValue = useMemo(
    () => ({
      consentGranted: consentStatus === USER_DATA_SHARING_CONSENT_STATUS.GRANTED,
      consentStatus,
      consentLoaded,
      requestConsent,
      setConsentGranted,
    }),
    [consentLoaded, consentStatus, requestConsent, setConsentGranted],
  );

  return (
    <UserDataSharingConsentContext.Provider value={contextValue}>
      {children}
      <PrivacyAIConsentModal
        visible={modalVisible}
        onAllow={() => {
          void setConsentGranted(true);
        }}
        onNotNow={() => {
          void setConsentGranted(false);
        }}
      />
    </UserDataSharingConsentContext.Provider>
  );
};

const useUserDataSharingConsentContext = () => {
  const context = useContext(UserDataSharingConsentContext);
  if (!context) {
    throw new Error('useUserDataSharingConsent must be used within UserDataSharingConsentProvider');
  }
  return context;
};

export const useUserDataSharingConsent = () => {
  const { consentGranted, requestConsent } = useUserDataSharingConsentContext();
  return { consentGranted, requestConsent };
};

export const useUserDataSharingConsentManager = () => useUserDataSharingConsentContext();
