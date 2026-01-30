import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { LOGO_SVG } from '../assets/logoSvg';
import { SafeAreaView } from 'react-native-safe-area-context';

const WelcomeScreen = ({ navigation }) => (
  <SafeAreaView style={styles.container}>
    <View style={styles.hero}>
      <SvgXml xml={LOGO_SVG} width={220} height={87} />
    </View>

    <View style={styles.footer}>
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.startButton}
        onPress={() => navigation.navigate('PrivacyConsent')}
      >
        <Text style={styles.startText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  </SafeAreaView>
);

export default WelcomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E9E4FF',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 48,
  },
  startButton: {
    backgroundColor: '#4B117B',
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2F1C74',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  startText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
