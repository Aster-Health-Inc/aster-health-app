import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

const ConsentScreen = ({ navigation }) => {
  const [pressed, setPressed] = useState(null);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Let's get started</Text>

      {/* ✅ Apple Sign Up Button (Always Visible Logo + Border Box + Hover Black) */}
      <TouchableOpacity
        style={[
          styles.appleButton,
          pressed === 'apple' && styles.blackBackground
        ]}
        onPress={() => navigation.navigate('Login')}
        onPressIn={() => setPressed('apple')}
        onPressOut={() => setPressed(null)}
        activeOpacity={0.9}
      >
        <Image source={require('../assets/apple-icon.png')} style={styles.appleIcon} resizeMode="contain" />
        <Text style={[styles.appleText, pressed === 'apple' && styles.whiteText]}>
            Continue with Apple

        </Text>
      </TouchableOpacity>

      {/* ✅ Google Sign Up Button (Full PNG with same border radius) */}
      <TouchableOpacity
        style={[
          styles.googleBox,
          pressed === 'google' && styles.blackBackground
        ]}
        onPress={() => navigation.navigate('Login')}
        onPressIn={() => setPressed('google')}
        onPressOut={() => setPressed(null)}
        activeOpacity={0.9}
      >
        <Image source={require('../assets/googlef.png')} style={styles.googleFullImage} resizeMode="contain" />
      </TouchableOpacity>

      {/* ✅ Email Sign Up Button (Box + Hover Black) */}
      <TouchableOpacity
        style={[
          styles.appleButton,
          pressed === 'email' && styles.blackBackground
        ]}
        onPress={() => navigation.navigate('SignUp')}
        onPressIn={() => setPressed('email')}
        onPressOut={() => setPressed(null)}
        activeOpacity={0.9}
      >
        <Text style={[styles.appleText, pressed === 'email' && styles.whiteText]}>
          Sign up with your Email
        </Text>
      </TouchableOpacity>

      {/* ✅ Footer */}
      <Text style={styles.footer}>
        Already have an account?{' '}
        <Text style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
          Log in here →
        </Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: '600', marginBottom: 30, color: '#000' },

  // ✅ Apple Button (Border + Icon + Text)
  appleButton: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 30,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  appleIcon: { width: 28, height: 28, marginRight: 12 },   // ✅ Bigger Logo
  appleText: { fontSize: 16, color: '#000', fontWeight: '500' },
  whiteText: { color: '#fff' },

  // ✅ Google Box matches border shape
  googleBox: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 30,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  googleFullImage: { width: '90%', height: 40, borderRadius: 20 },

  // ✅ Hover Black Background
  blackBackground: { backgroundColor: '#000', borderColor: '#000' },

  footer: { marginTop: 20, fontSize: 14, color: '#555' },
  loginLink: { color: '#000', fontWeight: '600' }
});

export default ConsentScreen;
