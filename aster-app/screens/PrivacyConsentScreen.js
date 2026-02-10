import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { LOGO_SVG } from '../assets/logoSvg';
import Disclaimer from '../components/Disclaimer';
import {
  AI_DISCLAIMER_CONSENT_TEXT,
  recordAiDisclaimerConsent,
} from '../utils/aiDisclaimerConsent';

const PRIVACY_POLICY_URL = 'https://aster.fit/privacypolicy/';

const PrivacyConsentScreen = ({ navigation, route }) => {
  const fromSettings = Boolean(route?.params?.fromSettings);
  const [consentChecked, setConsentChecked] = useState(fromSettings);
  const [aiDisclaimerChecked, setAiDisclaimerChecked] = useState(fromSettings);

  useEffect(() => {
    if (fromSettings) {
      setConsentChecked(true);
      setAiDisclaimerChecked(true);
    }
  }, [fromSettings]);

  const handleContinue = async () => {
    if (fromSettings) {
      navigation.goBack();
    } else {
      await recordAiDisclaimerConsent();
      navigation.navigate('SignUp');
    }
  };

  const openPrivacyPolicy = async () => {
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch (err) {
      console.log('Privacy policy link failed', err);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {fromSettings ? (
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.closeButton}
              activeOpacity={0.85}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="close" size={22} color="#3F2560" />
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.logoWrap}>
          <SvgXml xml={LOGO_SVG} width={180} height={72} />
        </View>

        <Text style={styles.title}>Your body. Your data.</Text>
        <Text style={styles.subtitle}>
          We collect health and wellness inputs to personalize your Aster insights. You can delete your
          data at any time.
        </Text>

        <View style={styles.noticeCard}>
          <Ionicons name="information-circle" size={20} color="#4B117B" />
          <Text style={styles.noticeText}>
            Aster provides cycle and wellness estimates based on your logged data and general research references.
          </Text>
        </View>
        <Disclaimer compact style={styles.disclaimerBlock} />

        <Pressable
          style={styles.checkboxRow}
          onPress={() => !fromSettings && setConsentChecked((prev) => !prev)}
          disabled={fromSettings}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consentChecked, disabled: fromSettings }}
        >
          <View style={[styles.checkbox, consentChecked && styles.checkboxChecked]}>
            {consentChecked ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
          </View>
          <Text style={styles.checkboxText}>
            I agree to the processing of my personal health data to provide Aster app features. See more in{' '}
            <Text style={styles.linkText} onPress={openPrivacyPolicy}>
              Privacy Policy
            </Text>
            .
          </Text>
        </Pressable>

        <Pressable
          style={styles.checkboxRow}
          onPress={() => !fromSettings && setAiDisclaimerChecked((prev) => !prev)}
          disabled={fromSettings}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: aiDisclaimerChecked, disabled: fromSettings }}
        >
          <View style={[styles.checkbox, aiDisclaimerChecked && styles.checkboxChecked]}>
            {aiDisclaimerChecked ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
          </View>
          <Text style={styles.checkboxText}>
            {AI_DISCLAIMER_CONSENT_TEXT}
          </Text>
        </Pressable>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            !(consentChecked && aiDisclaimerChecked) && styles.primaryButtonDisabled,
          ]}
          activeOpacity={0.9}
          disabled={!(consentChecked && aiDisclaimerChecked)}
          onPress={handleContinue}
        >
          <Text style={styles.primaryButtonText}>{fromSettings ? 'Done' : 'Continue'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PrivacyConsentScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F1FF',
  },
  headerRow: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6DDFC',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: '#2E1B57',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: '#5F4C87',
    marginBottom: 20,
  },
  noticeCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E6DDFC',
    marginBottom: 18,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#4A3B66',
  },
  disclaimerBlock: {
    marginBottom: 18,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E6DDFC',
    marginBottom: 24,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#B7A6DE',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#4B117B',
    borderColor: '#4B117B',
  },
  checkboxText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#3D2C63',
  },
  linkText: {
    color: '#4B117B',
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#4B117B',
    borderRadius: 26,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
