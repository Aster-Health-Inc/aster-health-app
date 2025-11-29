import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { supabase } from '../lib/supabase';
import { ensureUserRecord } from '../utils/authUser';
import { error as logError, info as logInfo } from '../utils/CrashLogger';
import { LOGO_SVG } from '../assets/logoSvg';

let LinearGradientComponent;
try {
  ({ LinearGradient: LinearGradientComponent } = require('expo-linear-gradient'));
} catch (err) {
  console.warn('expo-linear-gradient module unavailable, using solid background fallback.', err?.message || err);
  LinearGradientComponent = ({ style, children, colors }) => (
    <View style={[{ backgroundColor: colors?.[0] || '#E9E4FF' }, style]}>{children}</View>
  );
}
const GradientShell = LinearGradientComponent;

const FALLBACK_REDIRECT_URI = 'aster://auth/callback';

const COLORS = {
  iris: '#5432D3',
  irisDark: '#3B1F99',
  lilac: '#F0E9FF',
  smoke: '#F6F3FF',
  border: '#E2DAFF',
  text: '#201344',
  sub: '#6B5C8F',
  inputBg: '#F8F6FF',
  inputBorder: '#D6CEF5',
  error: '#B42318',
  white: '#FFFFFF',
  overlay: '#F4F0FF',
  googleBorder: '#E6E2F7',
  disabled: '#CFC6F1',
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const assets = {
  google: require('../assets/googlef.png'),
  apple: require('../assets/apple-icon.png'),
};

const oauthProviders = [
  {
    key: 'google',
    asset: assets.google,
    labels: {
      signUp: 'Sign up with Google',
      signIn: 'Log in with Google',
    },
  },
  {
    key: 'apple',
    asset: assets.apple,
    labels: {
      signUp: 'Sign up with Apple',
      signIn: 'Log in with Apple',
    },
  },
];

const getRedirectUri = () => {
  try {
    if (Platform.OS === 'web') {
      const uri = Linking.createURL('auth/callback');
      return uri || FALLBACK_REDIRECT_URI;
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

const Stage = {
  METHODS: 'methods',
  EMAIL: 'email',
  PASSWORD: 'password',
};

const Mode = {
  SIGN_UP: 'signUp',
  SIGN_IN: 'signIn',
};

const modeCopy = {
  [Mode.SIGN_UP]: {
    tabLabel: 'Sign Up',
    headline: 'Register an account',
    subtitle: 'Already have an Aster account?',
    subtitleAction: 'Log in',
    emailCTA: 'Sign up with email',
    submitLabel: 'Create account',
  },
  [Mode.SIGN_IN]: {
    tabLabel: 'Sign In',
    headline: 'Welcome back',
    subtitle: 'New here?',
    subtitleAction: 'Create account',
    emailCTA: 'Log in with email',
    submitLabel: 'Continue',
  },
};

WebBrowser.maybeCompleteAuthSession();

const AuthScreenBase = ({ initialMode = Mode.SIGN_UP }) => {
  const navigation = useNavigation();
  const [mode, setMode] = useState(initialMode === Mode.SIGN_IN ? Mode.SIGN_IN : Mode.SIGN_UP);
  const [stage, setStage] = useState(Stage.METHODS);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);

  const copy = modeCopy[mode];
  const redirectUri = useMemo(() => getRedirectUri(), []);

  useEffect(() => {
    setMode(initialMode === Mode.SIGN_IN ? Mode.SIGN_IN : Mode.SIGN_UP);
  }, [initialMode]);

  useEffect(() => {
    setStage(Stage.METHODS);
    setEmail('');
    setPassword('');
    setEmailTouched(false);
    setPasswordTouched(false);
  }, [mode]);

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

  const emailValid = useMemo(() => emailRegex.test(email.trim().toLowerCase()), [email]);
  const passwordValid = password.trim().length >= 8;

  const showEmailError = stage !== Stage.METHODS && emailTouched && !emailValid;
  const showPasswordError = stage === Stage.PASSWORD && passwordTouched && !passwordValid;

  const toggleMode = (nextMode) => {
    if (mode === nextMode) return;
    setMode(nextMode);
  };

  const handleOAuthSignIn = async (provider) => {
    setOauthLoading(provider);
    logInfo('[OAuth] Starting', provider, 'redirect:', redirectUri);
    try {
      if (Platform.OS === 'web') {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: redirectUri },
        });
        if (error) throw error;
        logInfo('[OAuth] Web signInWithOAuth response', provider, 'url present:', Boolean(data?.url));
        if (data?.url) {
          await Linking.openURL(data.url);
        }
        return;
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      logInfo('[OAuth] Native signInWithOAuth response', provider, 'url present:', Boolean(data?.url));
      if (!data?.url) {
        throw new Error('Unable to open the authentication page.');
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
      logInfo('[OAuth] WebBrowser result', provider, 'type:', result?.type);

      if (result.type === 'cancel' || result.type === 'dismiss') {
        throw new Error('Authentication cancelled');
      }

      if (result.type === 'locked') {
        throw new Error('Authentication failed to start. Please unlock your device and try again.');
      }

      if (result.type === 'success' && result.url) {
        const parsed = Linking.parse(result.url);
        const queryParams = parsed?.queryParams ?? {};
        const authCode = queryParams.code ?? queryParams.auth_code ?? null;

        if (!authCode || typeof authCode !== 'string') {
          throw new Error('Authentication response missing authorization code.');
        }

        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession({
          provider,
          code: authCode,
          redirectTo: redirectUri,
        });
        if (exchangeError) throw exchangeError;
        logInfo('[OAuth] Session exchange complete', provider);
        return;
      }

      throw new Error('Authentication did not complete. Please try again.');
    } catch (err) {
      const message = err?.message ?? 'Something went wrong while trying to authenticate.';
      logError('[OAuth] Authentication error', provider, err);
      if (message !== 'Authentication cancelled') {
        Alert.alert('Authentication error', message);
      }
    } finally {
      setOauthLoading(null);
    }
  };

  const handleAnonymous = async () => {
    setOauthLoading('anonymous');
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      if (data?.user) {
        await ensureUserRecord(data.user);
        navigation.reset({
          index: 0,
          routes: [{ name: 'OnboardingRouter' }],
        });
      }
    } catch (err) {
      logError('[Auth] Anonymous login failed', err);
      Alert.alert('Anonymous login failed', err?.message ?? 'Please try again.');
    } finally {
      setOauthLoading(null);
    }
  };

  const advanceFromEmail = () => {
    if (!emailValid) {
      setEmailTouched(true);
      return;
    }
    setStage(Stage.PASSWORD);
  };

  const handleSubmitEmail = async () => {
    if (!emailValid) {
      setEmailTouched(true);
      return;
    }
    if (!passwordValid) {
      setPasswordTouched(true);
      return;
    }

    setSubmitting(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (mode === Mode.SIGN_UP) {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
        });
        if (error) throw error;

        let resolvedUser = data?.user ?? data?.session?.user ?? null;

        if (!data?.session) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });

          if (signInError) {
            Alert.alert(
              'Confirm your email',
              'Check your inbox to finish creating your account.',
            );
            return;
          }

          resolvedUser = signInData?.user ?? resolvedUser;
        }

        if (!resolvedUser) {
          const { data: userData } = await supabase.auth.getUser();
          resolvedUser = userData?.user ?? null;
        }

        if (resolvedUser) {
          await ensureUserRecord(resolvedUser);
          navigation.reset({
            index: 0,
            routes: [{ name: 'OnboardingRouter' }],
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error) throw error;

        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          await ensureUserRecord(userData.user);
        }

        navigation.reset({
          index: 0,
          routes: [{ name: 'OnboardingRouter' }],
        });
      }
    } catch (err) {
      logError('[Auth] Email authentication error', mode, err);
      Alert.alert('Authentication error', err?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderMethods = () => (
    <View style={styles.methodStack}>
      {oauthProviders.map(({ key, asset, labels }) => {
        const providerLabel = (labels && labels[mode]) || 'Continue';
        const isGoogle = key === 'google';
        return (
          <TouchableOpacity
            key={key}
            style={[
              styles.methodButton,
              styles.providerButton,
              isGoogle ? styles.googleButton : styles.appleButton,
            ]}
            activeOpacity={0.85}
            onPress={() => handleOAuthSignIn(key)}
            disabled={Boolean(oauthLoading)}
          >
            {oauthLoading === key ? (
              <ActivityIndicator color={isGoogle ? '#3C4043' : '#000000'} />
            ) : (
              <>
                <Image
                  source={asset}
                  style={[styles.providerIcon, isGoogle ? styles.googleIcon : styles.appleIcon]}
                  resizeMode="contain"
                />
                <Text style={[styles.methodLabel, isGoogle ? styles.googleLabel : styles.appleLabel]}>
                  {providerLabel}
                </Text>
                <View style={styles.iconPlaceholder} />
              </>
            )}
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={[styles.methodButton, styles.emailButton]}
        activeOpacity={0.85}
        onPress={() => setStage(Stage.EMAIL)}
        disabled={Boolean(oauthLoading)}
      >
        <View style={styles.emailIconBadge}>
          <MaterialCommunityIcons name="email-outline" size={20} color={COLORS.irisDark} />
        </View>
        <Text style={[styles.methodLabel, styles.emailLabel]}>{copy.emailCTA}</Text>
        <View style={styles.emailPlaceholder} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.anonymousButton, oauthLoading === 'anonymous' && styles.anonymousButtonDisabled]}
        activeOpacity={0.9}
        onPress={handleAnonymous}
        disabled={Boolean(oauthLoading)}
      >
        {oauthLoading === 'anonymous' ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <View style={styles.anonymousContent}>
            <MaterialCommunityIcons name="incognito" size={20} color={COLORS.white} />
            <Text style={styles.anonymousLabel}>Login as Anonymous</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderEmailStep = () => (
    <View style={styles.formWrap}>
      <Text style={styles.formTitle}>{copy.emailCTA}</Text>
      <Text style={styles.formSubTitle}>We&apos;ll use your email to keep your data in sync.</Text>

      <View style={[styles.inputWrapper, showEmailError && styles.inputWrapperError]}>
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
      {showEmailError ? (
        <Text style={styles.errorLabel}>Enter a valid email address</Text>
      ) : null}

      <TouchableOpacity
        style={[styles.primaryButton, !emailValid && styles.primaryButtonDisabled]}
        activeOpacity={0.85}
        disabled={!emailValid || isSubmitting}
        onPress={advanceFromEmail}
      >
        {isSubmitting ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.primaryButtonLabel}>Continue</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setStage(Stage.METHODS)}
      >
        <Text style={styles.backButtonLabel}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPasswordStep = () => (
    <View style={styles.formWrap}>
      <Text style={styles.formTitle}>{copy.emailCTA}</Text>
      <Text style={styles.formSubTitle}>
        Password must be at least 8 characters including atleast one uppercase, lowercase and a symbol.
      </Text>

      <View style={[styles.inputWrapper, showEmailError && styles.inputWrapperError]}>
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
      {showEmailError ? (
        <Text style={styles.errorLabel}>Enter a valid email</Text>
      ) : null}

      <View style={[styles.inputWrapper, showPasswordError && styles.inputWrapperError]}>
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
      {showPasswordError ? (
        <Text style={styles.errorLabel}>Password must be at least 6 characters</Text>
      ) : null}

      <TouchableOpacity
        style={[
          styles.primaryButton,
          (!emailValid || !passwordValid || isSubmitting) && styles.primaryButtonDisabled,
        ]}
        activeOpacity={0.85}
        disabled={!emailValid || !passwordValid || isSubmitting}
        onPress={handleSubmitEmail}
      >
        {isSubmitting ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.primaryButtonLabel}>{copy.submitLabel}</Text>
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
        return renderEmailStep();
      case Stage.PASSWORD:
        return renderPasswordStep();
      default:
        return renderMethods();
    }
  };

  const handleSubtitlePress = () => {
    const nextMode = mode === Mode.SIGN_UP ? Mode.SIGN_IN : Mode.SIGN_UP;
    toggleMode(nextMode);
  };

  return (
    <GradientShell
      colors={['#E9E4FF', '#F4EFFF']}
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
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <SvgXml xml={LOGO_SVG} width={200} height={79} />
          </View>

          <View style={styles.card}>
            <View style={styles.handle} />
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tabButton, mode === Mode.SIGN_UP && styles.tabButtonActive]}
                onPress={() => toggleMode(Mode.SIGN_UP)}
                activeOpacity={0.85}
              >
                <Text style={[styles.tabLabel, mode === Mode.SIGN_UP && styles.tabLabelActive]}>
                  {modeCopy[Mode.SIGN_UP].tabLabel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, mode === Mode.SIGN_IN && styles.tabButtonActive]}
                onPress={() => toggleMode(Mode.SIGN_IN)}
                activeOpacity={0.85}
              >
                <Text style={[styles.tabLabel, mode === Mode.SIGN_IN && styles.tabLabelActive]}>
                  {modeCopy[Mode.SIGN_IN].tabLabel}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.headingWrap}>
              <Text style={styles.headline}>{copy.headline}</Text>
              <TouchableOpacity onPress={handleSubtitlePress} activeOpacity={0.75}>
                <Text style={styles.subtitle}>
                  {copy.subtitle}{' '}
                  <Text style={styles.subtitleAction}>{copy.subtitleAction}</Text>
                </Text>
              </TouchableOpacity>
            </View>

            {renderStage()}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientShell>
  );
};

export default AuthScreenBase;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 44,
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    paddingTop: 48,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 36,
    shadowColor: '#24115C',
    shadowOpacity: 0.15,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: COLORS.border,
    marginBottom: 20,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.lilac,
    borderRadius: 22,
    padding: 6,
    gap: 6,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#AFA6FF',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.sub,
  },
  tabLabelActive: {
    color: COLORS.irisDark,
  },
  headingWrap: {
    marginTop: 26,
    marginBottom: 22,
  },
  headline: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.sub,
  },
  subtitleAction: {
    color: COLORS.iris,
    fontWeight: '600',
  },
  methodStack: {
    gap: 14,
    marginTop: 6,
    width: '100%',
    alignItems: 'stretch',
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    backgroundColor: COLORS.white,
  },
  providerButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E1D9FF',
  },
  googleButton: {
    borderColor: '#DADCE0',
  },
  appleButton: {
    borderColor: '#E5E5EA',
  },
  providerIcon: {
    width: 24,
    height: 24,
  },
  googleIcon: {
    width: 24,
    height: 24,
  },
  appleIcon: {
    width: 22,
    height: 24,
  },
  methodLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  googleLabel: {
    color: '#3C4043',
    fontWeight: '500',
  },
  appleLabel: {
    color: '#000000',
    fontWeight: '600',
  },
  emailButton: {
    backgroundColor: '#FCFAFF',
    borderWidth: 1,
    borderColor: '#E6DEFF',
  },
  emailIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3EEFF',
    borderWidth: 1,
    borderColor: '#DDD1FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailLabel: {
    color: COLORS.text,
  },
  iconPlaceholder: {
    width: 24,
  },
  emailPlaceholder: {
    width: 36,
  },
  anonymousButton: {
    backgroundColor: '#4B117B',
    paddingVertical: 18,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2F1B74',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  anonymousButtonDisabled: {
    backgroundColor: COLORS.disabled,
  },
  anonymousContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  anonymousLabel: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#4B117B',
    paddingVertical: 16,
    borderRadius: 24,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2F1B74',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  primaryButtonDisabled: {
    backgroundColor: COLORS.disabled,
  },
  primaryButtonLabel: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
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
  formWrap: {
    gap: 18,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  formSubTitle: {
    fontSize: 14,
    color: COLORS.sub,
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
});




