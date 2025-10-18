import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const WelcomeScreen = ({ navigation }) => (
  <SafeAreaView style={styles.container}>
    <View style={styles.hero}>
      <View style={styles.logoPlaceholder}>
        <Text style={styles.brandText}>Aster</Text>
      </View>
    </View>

    <View style={styles.footer}>
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.startButton}
        onPress={() => navigation.navigate('SignUp')}
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
  logoPlaceholder: {
    alignItems: 'center',
  },
  brandText: {
    fontSize: 40,
    fontWeight: '600',
    color: '#4B3199',
    letterSpacing: 1,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 48,
  },
  startButton: {
    backgroundColor: '#4B3199',
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
