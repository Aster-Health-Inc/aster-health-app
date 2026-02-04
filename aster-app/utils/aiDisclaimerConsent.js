import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export const AI_DISCLAIMER_CONSENT_VERSION = 'v1.0-2026-02-04';
export const AI_DISCLAIMER_CONSENT_TEXT =
  "I understand Aster's AI suggestions are for general wellness only and are not medical advice, diagnosis, or treatment.";

const PENDING_AI_DISCLAIMER_KEY = 'pending_ai_disclaimer_consent_v1';

const buildConsentPayload = () => ({
  consent_version: AI_DISCLAIMER_CONSENT_VERSION,
  consent_text: AI_DISCLAIMER_CONSENT_TEXT,
  consented_at: new Date().toISOString(),
});

const upsertConsent = async (userId, payload) => {
  return supabase
    .from('ai_disclaimer_consents')
    .upsert(
      {
        user_id: userId,
        ...payload,
      },
      {
        onConflict: 'user_id,consent_version',
        ignoreDuplicates: true,
      },
    );
};

export const recordAiDisclaimerConsent = async () => {
  const payload = buildConsentPayload();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      const { error } = await upsertConsent(user.id, payload);
      if (!error) return true;
      await AsyncStorage.setItem(PENDING_AI_DISCLAIMER_KEY, JSON.stringify(payload));
      console.log('AI disclaimer consent insert failed, queued locally:', error);
      return false;
    }
  } catch (err) {
    console.log('AI disclaimer consent lookup failed:', err);
  }

  try {
    await AsyncStorage.setItem(PENDING_AI_DISCLAIMER_KEY, JSON.stringify(payload));
  } catch (err) {
    console.log('AI disclaimer consent storage failed:', err);
  }
  return false;
};

export const flushAiDisclaimerConsent = async () => {
  let payload;
  try {
    const raw = await AsyncStorage.getItem(PENDING_AI_DISCLAIMER_KEY);
    if (!raw) return;
    payload = JSON.parse(raw);
  } catch (err) {
    console.log('AI disclaimer consent read failed:', err);
    await AsyncStorage.removeItem(PENDING_AI_DISCLAIMER_KEY);
    return;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;
    const { error } = await upsertConsent(user.id, payload);
    if (!error) {
      await AsyncStorage.removeItem(PENDING_AI_DISCLAIMER_KEY);
    } else {
      console.log('AI disclaimer consent flush failed:', error);
    }
  } catch (err) {
    console.log('AI disclaimer consent flush error:', err);
  }
};
