import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';

const WelcomeScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      {/* Logo */}
      <Image 
        source={require('../assets/aster-logo.png')} 
        style={styles.logo} 
        resizeMode="contain"
      />
      <Text style={styles.appName}></Text>

      {/* ✅ "Let's Get Started" Button */}
      <TouchableOpacity
        style={styles.startButton}
        onPress={() => navigation.navigate('Consent')}
      >
        <Text style={styles.startText}>Let's Get Started →</Text>
      </TouchableOpacity>

      {/* Optional profile button (if you still want it) */}
      {/* 
      <TouchableOpacity 
        style={styles.profileButton} 
        onPress={() => navigation.navigate('Consent')}
      >
        <Image 
          source={{ uri: 'https://placekitten.com/80/80' }} 
          style={styles.profileImage} 
        />
      </TouchableOpacity> 
      */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  logo: { width: 120, height: 120, marginBottom: 20 },
  appName: { fontSize: 32, fontFamily: 'cursive', color: '#000', marginBottom: 50 },

  // ✅ New Button Styles
  startButton: { 
    backgroundColor: '#000', 
    paddingVertical: 12, 
    paddingHorizontal: 30, 
    borderRadius: 25,
    position: 'absolute',
    bottom: 50
  },
  startText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Existing profile button (optional)
  profileButton: { position: 'absolute', bottom: 120, right: 40, borderRadius: 50, overflow: 'hidden' },
  profileImage: { width: 60, height: 60, borderRadius: 30 }
});

export default WelcomeScreen;
