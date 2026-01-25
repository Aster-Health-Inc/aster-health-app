import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { ensureUserRecord } from '../utils/authUser';

let LinearGradientComponent;
try {
  ({ LinearGradient: LinearGradientComponent } = require('expo-linear-gradient'));
} catch (err) {
  console.warn('expo-linear-gradient module unavailable, using solid background fallback.', err?.message || err);
  LinearGradientComponent = ({ style, children, colors }) => (
    <View style={[{ backgroundColor: colors?.[0] || '#EEE8FF' }, style]}>{children}</View>
  );
}
const GradientShell = LinearGradientComponent;

const FALLBACK_REDIRECT_URI = 'aster://auth/callback';

const COLORS = {
  iris: '#6D58FF',
  irisDark: '#4C38D7',
  lilac: '#F2EEFF',
  smoke: '#F7F7F7',
  border: '#E3E4EC',
  text: '#140F26',
  sub: '#67637A',
  inputBg: '#F6F5FF',
  inputBorder: '#CBC6E8',
  error: '#B42318',
  white: '#FFFFFF',
  disabled: '#C9C6DF',
};

const Stage = {
  METHODS: 'methods',
  EMAIL: 'email',
  PASSWORD: 'password',
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const assets = {
  google: require('../assets/googlef.png'),
  apple: require('../assets/apple-icon.png'),
};

const oauthProviders = [
  { key: 'google', label: 'Continue with Google', asset: assets.google },
  { key: 'apple', label: 'Continue with Apple', asset: assets.apple },
];

const getRedirectUri = () => {
  try {
    if (Platform.OS === 'web') {
      const uri = makeRedirectUri({ path: 'auth/callback' });
      return uri || FALLBACK_REDIRECT_URI;
    }

    const isExpoGo =
      Constants.appOwnership === 'expo' ||
      Constants.executionEnvironment === 'storeClient';
    if (isExpoGo) {
      const owner = Constants.expoConfig?.owner;
      const slug = Constants.expoConfig?.slug;
      if (owner && slug) {
        return `https://auth.expo.io/@${owner}/${slug}`;
      }
      return makeRedirectUri({ path: 'auth/callback' }) || FALLBACK_REDIRECT_URI;
    }

    const authSessionUri = makeRedirectUri({
      scheme: 'aster',
      path: 'auth/callback',
      preferLocalhost: true,
    });

    return authSessionUri || FALLBACK_REDIRECT_URI;
  } catch {
    return FALLBACK_REDIRECT_URI;
  }
};

const AnonymousUpgradeScreen = ({ navigation }) => {
  const [checkingUser, setCheckingUser] = useState(true);
  const [stage, setStage] = useState(Stage.METHODS);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [loadingKey, setLoadingKey] = useState(null);

  const redirectUri = useMemo(() => getRedirectUri(), []);
  const emailValid = useMemo(() => emailRegex.test(email.trim().toLowerCase()), [email]);
  const passwordValid = password.trim().length >= 6;

  useEffect(() => {
    const verifyUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
          return;
        }
        if (!user.is_anonymous) {
          navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
          return;
        }
      } catch (err) {
        console.log('AnonymousUpgradeScreen check failed', err);
      } finally {
        setCheckingUser(false);
      }
    };

    verifyUser();
  }, [navigation]);

  useEffect(() => {
    if (stage === Stage.METHODS) {
      setEmail('');
      setPassword('');
      setEmailTouched(false);
      setPasswordTouched(false);
    } else if (stage === Stage.EMAIL) {
      setPassword('');
      setPasswordTouched(false);
    }
  }, [stage]);

  const handleLinkOAuth = async (provider) => {
    setLoadingKey(provider);
    try {
      const { data, error } = await supabase.auth.linkIdentity({ provider, options: { redirectTo: redirectUri } });
      if (error) throw error;
      if (data?.url) { try { await Linking.openURL(data.url); } catch {} }
      const { data: userData } = await supabase.auth.getUser();
      await ensureUserRecord(userData?.user);
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (err) {
      const message = err?.message ?? 'We could not link this account right now.';
      if (message !== 'Link cancelled') {
        Alert.alert('Linking error', message);
      }
    } finally {
      setLoadingKey(null);
    }
  };

  const advanceFromEmail = () => {
    if (!emailValid) {
      setEmailTouched(true);
      return;
    }
    setStage(Stage.PASSWORD);
  };

  const handleUpgradeWithEmail = async () => {
    if (!emailValid) {
      setEmailTouched(true);
      return;
    }
    if (!passwordValid) {
      setPasswordTouched(true);
      return;
    }

    setLoadingKey('email');
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.updateUser({
        email: normalizedEmail,
        password,
      });
      if (error) throw error;

      if (!data?.user) {
        const { data: userData } = await supabase.auth.getUser();
        await ensureUserRecord(userData?.user);
      } else {
        await ensureUserRecord(data.user);
      }

      Alert.alert('Account created', 'Your progress is now saved with your new account.', [
        {
          text: 'Continue',
          onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Home' }] }),
        },
      ]);
    } catch (err) {
      Alert.alert('Upgrade error', err?.message ?? 'Please try again.');
    } finally {
      setLoadingKey(null);
    }
  };

  const renderMethods = () => (
    <View style={styles.methodStack}>
      <Text style={styles.copy}>
        You&apos;re exploring Aster as a guest. Create an account now so we can keep your cycle,
        reminders, and health data safe even if you switch devices.
      </Text>

      {oauthProviders.map(({ key, label, asset }) => (
        <TouchableOpacity
          key={key}
          style={[styles.methodButton, styles.methodButtonBorder]}
          activeOpacity={0.85}
          onPress={() => handleLinkOAuth(key)}
          disabled={Boolean(loadingKey)}
        >
          {loadingKey === key ? (
            <ActivityIndicator color={COLORS.iris} />
          ) : (
            <>
              <View style={styles.methodIconWrap}>
                <Image source={asset} style={styles.methodIcon} resizeMode="contain" />
              </View>
              <Text style={styles.methodLabel}>{label}</Text>
            </>
          )}
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[styles.methodButton, styles.methodButtonBorder]}
        activeOpacity={0.85}
        onPress={() => setStage(Stage.EMAIL)}
        disabled={Boolean(loadingKey)}
      >
        <View style={styles.methodIconWrap}>
          <Text style={styles.emailIcon}>@</Text>
        </View>
        <Text style={styles.methodLabel}>Use email instead</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmailStage = () => (
    <View style={styles.formWrap}>
      <Text style={styles.formTitle}>Save progress with email</Text>
      <Text style={styles.formSubTitle}>We&apos;ll upgrade this guest account.</Text>

      <View style={[styles.inputWrapper, emailTouched && !emailValid && styles.inputWrapperError]}>
        <TextInput
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (!emailTouched) setEmailTouched(true);
          }}
          placeholder="Email"
          placeholderTextColor={COLORS.sub}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
      </View>
      {emailTouched && !emailValid ? (
        <Text style={styles.errorLabel}>Enter a valid email</Text>
      ) : null}

      <TouchableOpacity
        style={[styles.primaryButton, !emailValid && styles.primaryButtonDisabled]}
        activeOpacity={0.85}
        disabled={!emailValid || Boolean(loadingKey)}
        onPress={advanceFromEmail}
      >
        {loadingKey === 'email' ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.primaryButtonLabel}>Continue</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={() => setStage(Stage.METHODS)}>
        <Text style={styles.backButtonLabel}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPasswordStage = () => (
    <View style={styles.formWrap}>
      <Text style={styles.formTitle}>Create a password</Text>
      <Text style={styles.formSubTitle}>This keeps all of your history under your new login.</Text>

      <View style={[styles.inputWrapper, emailTouched && !emailValid && styles.inputWrapperError]}>
        <TextInput
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (!emailTouched) setEmailTouched(true);
          }}
          placeholder="Email"
          placeholderTextColor={COLORS.sub}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
      </View>
      {emailTouched && !emailValid ? (
        <Text style={styles.errorLabel}>Enter a valid email</Text>
      ) : null}

      <View style={[styles.inputWrapper, passwordTouched && !passwordValid && styles.inputWrapperError]}>
        <TextInput
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (!passwordTouched) setPasswordTouched(true);
          }}
          placeholder="Password"
          placeholderTextColor={COLORS.sub}
          secureTextEntry
          style={styles.input}
        />
      </View>
      {passwordTouched && !passwordValid ? (
        <Text style={styles.errorLabel}>Password must be at least 6 characters</Text>
      ) : null}

      <TouchableOpacity
        style={[
          styles.primaryButton,
          (!emailValid || !passwordValid || Boolean(loadingKey)) && styles.primaryButtonDisabled,
        ]}
        activeOpacity={0.85}
        disabled={!emailValid || !passwordValid || Boolean(loadingKey)}
        onPress={handleUpgradeWithEmail}
      >
        {loadingKey === 'email' ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.primaryButtonLabel}>Save my progress</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={() => setStage(Stage.EMAIL)}>
        <Text style={styles.backButtonLabel}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStage = () => {
    switch (stage) {
      case Stage.EMAIL:
        return renderEmailStage();
      case Stage.PASSWORD:
        return renderPasswordStage();
      default:
        return renderMethods();
    }
  };

  if (checkingUser) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={COLORS.iris} />
      </View>
    );
  }

  return (
    <GradientShell
      colors={['#EEE8FF', '#F6F3FF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.screen}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <Text style={styles.brand}>Aster</Text>
            <Text style={styles.heroSubtitle}>Save your progress</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.handle} />

            <Text style={styles.headline}>Create an account to keep everything synced</Text>

            {renderStage()}
          </View>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}
          >
            <Text style={styles.skipLabel}>Maybe later</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientShell>
  );
};

export default AnonymousUpgradeScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brand: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.irisDark,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 16,
    color: COLORS.sub,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
    shadowColor: '#0B0033',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#E0D9FF',
    marginBottom: 18,
  },
  headline: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  methodStack: {
    gap: 14,
  },
  copy: {
    fontSize: 14,
    color: COLORS.sub,
    textAlign: 'center',
  },
  methodButton: {
    flexDirection: 'row',
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  methodButtonBorder: {
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  methodLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  methodIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.smoke,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  methodIcon: {
    width: 18,
    height: 18,
  },
  emailIcon: {
    fontSize: 16,
    color: COLORS.iris,
    fontWeight: '700',
  },
  formWrap: {
    gap: 18,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  formSubTitle: {
    fontSize: 14,
    color: COLORS.sub,
    textAlign: 'center',
  },
  inputWrapper: {
    borderRadius: 16,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  inputWrapperError: {
    borderColor: COLORS.error,
  },
  input: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    paddingVertical: 14,
  },
  errorLabel: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: -10,
  },
  primaryButton: {
    backgroundColor: COLORS.iris,
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: COLORS.disabled,
  },
  primaryButtonLabel: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    marginTop: 16,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  backButtonLabel: {
    fontSize: 14,
    color: COLORS.iris,
    fontWeight: '600',
  },
  skipButton: {
    alignSelf: 'center',
    marginTop: 18,
  },
  skipLabel: {
    fontSize: 14,
    color: COLORS.sub,
    textDecorationLine: 'underline',
  },
});



