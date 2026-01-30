import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { LOGO_SVG } from '../assets/logoSvg';

const PRIVACY_POLICY_URL = 'https://aster.fit/privacypolicy/';

const PrivacyConsentScreen = ({ navigation }) => {
  const [consentChecked, setConsentChecked] = useState(false);

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
            Aster Fit provides general wellness insights and nutrition tracking. It does not provide
            medical advice, diagnosis, or treatment.
          </Text>
        </View>

        <Pressable
          style={styles.checkboxRow}
          onPress={() => setConsentChecked((prev) => !prev)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consentChecked }}
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

        <TouchableOpacity
          style={[styles.primaryButton, !consentChecked && styles.primaryButtonDisabled]}
          activeOpacity={0.9}
          disabled={!consentChecked}
          onPress={() => navigation.navigate('SignUp')}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
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
