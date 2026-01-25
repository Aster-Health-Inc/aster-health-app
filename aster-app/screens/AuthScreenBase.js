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
  Modal,
} from 'react-native';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePostHog } from 'posthog-react-native';
import { SvgXml } from 'react-native-svg';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { ensureUserRecord } from '../utils/authUser';
import { error as logError, info as logInfo } from '../utils/CrashLogger';
import { LOGO_SVG } from '../assets/logoSvg';

let LinearGradientComponent;
try {
  ({ LinearGradient: LinearGradientComponent } = require('expo-linear-gradient'));
} catch (err) {
  console.warn(
    'expo-linear-gradient module unavailable, using solid background fallback.',
    err?.message || err
  );
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
      const uri = makeRedirectUri({ path: 'auth/callback' });
      return uri || FALLBACK_REDIRECT_URI;
    }

    const isExpoGo =
      Constants.appOwnership === 'expo' ||
      Constants.executionEnvironment === 'storeClient';
    if (isExpoGo) {
      // makeRedirectUri in Expo Go returns exp://... which is not in Supabase's allow list.
      // Use the Expo auth proxy URL explicitly (must be in Supabase Redirect URLs).
      const proxy = getProxyProjectName();
      if (proxy) {
        return `https://auth.expo.io/${proxy}`;
      }
      return makeRedirectUri({ path: 'auth/callback' }) || FALLBACK_REDIRECT_URI;
    }

    // Bare/standalone: use custom scheme
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

const getProxyProjectName = () => {
  const owner = Constants.expoConfig?.owner;
  const slug = Constants.expoConfig?.slug;
  if (owner && slug) {
    return `@${owner}/${slug}`;
  }
  if (slug) {
    return slug;
  }
  return undefined;
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
  const posthog = usePostHog();
  const [mode, setMode] = useState(
    initialMode === Mode.SIGN_IN ? Mode.SIGN_IN : Mode.SIGN_UP
  );
  const [stage, setStage] = useState(Stage.METHODS);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);
  const [anonModalVisible, setAnonModalVisible] = useState(false);
  const [anonUsername, setAnonUsername] = useState('');
  const [anonPassword, setAnonPassword] = useState('');
  const [recoveryModalVisible, setRecoveryModalVisible] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState('email');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryOtp, setRecoveryOtp] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

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

  const emailValid = useMemo(
    () => emailRegex.test(email.trim().toLowerCase()),
    [email]
  );
  const passwordValid = password.trim().length >= 8;

  const showEmailError = stage !== Stage.METHODS && emailTouched && !emailValid;
  const showPasswordError = stage === Stage.PASSWORD && passwordTouched && !passwordValid;
  const recoveryEmailValid = useMemo(
    () => emailRegex.test(recoveryEmail.trim().toLowerCase()),
    [recoveryEmail]
  );
  const recoveryPasswordValid = recoveryPassword.trim().length >= 8;

  const toggleMode = (nextMode) => {
    if (mode === nextMode) return;
    setMode(nextMode);
  };

  const handleOAuthSignIn = async (provider) => {
    setOauthLoading(provider);
    const providerRedirectUri = redirectUri;
    logInfo('[OAuth] Starting', provider, 'redirect:', providerRedirectUri);

    try {
      // Web: let Supabase handle the PKCE callback in the URL
      if (Platform.OS === 'web') {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: providerRedirectUri,
            queryParams: provider === 'apple' ? {} : { prompt: 'select_account' },
          },
        });

        if (error) throw error;

        logInfo(
          '[OAuth] Web signInWithOAuth response',
          provider,
          'url present:',
          Boolean(data?.url)
        );

        if (!data?.url) {
          throw new Error(
            provider === 'apple'
              ? 'Apple Sign In is not configured. In Supabase: Authentication > Providers, enable Apple and add your Services ID and secret.'
              : 'Unable to open the authentication page.'
          );
        }
        await Linking.openURL(data.url);
        return;
      }

      // Native: we handle the browser session manually
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: providerRedirectUri,
          skipBrowserRedirect: true,
          queryParams: provider === 'apple' ? {} : { prompt: 'select_account' },
        },
      });

      if (error) throw error;

      logInfo(
        '[OAuth] Native signInWithOAuth response',
        provider,
        'url present:',
        Boolean(data?.url)
      );

      if (!data?.url) {
        throw new Error(
          provider === 'apple'
            ? 'Apple Sign In is not configured. In Supabase: Authentication > Providers, enable Apple and add your Services ID and secret.'
            : 'Unable to open the authentication page.'
        );
      }

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        providerRedirectUri,
        { preferEphemeralSession: false }
      );

      logInfo(
        '[OAuth] WebBrowser result',
        provider,
        'type:',
        result?.type,
        'url:',
        result?.url
      );

      if (result.type === 'cancel' || result.type === 'dismiss') {
        throw new Error('Authentication cancelled');
      }

      if (result.type === 'locked') {
        throw new Error(
          'Authentication failed to start. Please unlock your device and try again.'
        );
      }

      if (result.type === 'success' && result.url) {
        const parsed = Linking.parse(result.url);
        const queryParams = parsed?.queryParams ?? {};
        const rawCode = queryParams.code ?? queryParams.auth_code ?? null;
        const authCode =
          rawCode != null
            ? String(Array.isArray(rawCode) ? rawCode[0] : rawCode)
            : null;

        logInfo('[OAuth] Parsed auth callback', provider, {
          hasCode: Boolean(authCode),
          queryParams,
        });

        if (!authCode || typeof authCode !== 'string') {
          throw new Error(
            'Authentication response missing authorization code.'
          );
        }

        // IMPORTANT: pass only the string, not an object
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(authCode);
        if (exchangeError) throw exchangeError;

        logInfo('[OAuth] Session exchange complete', provider);

        const { data: userResult, error: userError } =
          await supabase.auth.getUser();
        if (userError) throw userError;

        const user = userResult?.user;
        if (!user) {
          throw new Error(
            'Unable to fetch authenticated user after OAuth.'
          );
        }

        await ensureUserRecord(user);
        logInfo(
          '[OAuth] Completed user session',
          provider,
          'userId:',
          user.id
        );

        navigation.reset({
          index: 0,
          routes: [{ name: 'OnboardingRouter' }],
        });
        posthog?.capture('sign_in', { method: provider });

        return;
      }

      throw new Error('Authentication did not complete. Please try again.');
    } catch (err) {
      const message =
        err?.message ?? 'Something went wrong while trying to authenticate.';
      logError('[OAuth] Authentication error', provider, err);

      if (message !== 'Authentication cancelled') {
        Alert.alert('Authentication error', message);
      }
    } finally {
      setOauthLoading(null);
    }
  };

  const handleAnonymousSubmit = async () => {
    if (!anonUsername.trim() || anonUsername.trim().length < 3) {
      Alert.alert('Username required', 'Please enter a username (min 3 characters).');
      return;
    }
    if (!anonPassword || anonPassword.length < 8) {
      Alert.alert('Password required', 'Please enter a password (min 8 characters).');
      return;
    }
    setOauthLoading('anonymous');
    try {
      logInfo('[Anon] Starting anonymous sign-in', { username: anonUsername.trim() });
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      const user = data?.user;
      if (user) {
        const username = anonUsername.trim();
        const passwordNote = `anon-pass-set-${Date.now()}`;
        logInfo('[Anon] Signed in anonymous user', { userId: user.id, username });

        try {
          await supabase.auth.updateUser({
            data: { username, is_anonymous: true, anon_password_note: passwordNote },
          });
          logInfo('[Anon] Updated user metadata with username/password note');
        } catch (metaErr) {
          logError('[Anon] Failed to update anonymous metadata', metaErr);
        }

        await ensureUserRecord({
          ...user,
          user_metadata: { ...(user.user_metadata || {}), username },
        });
        navigation.reset({
          index: 0,
          routes: [{ name: 'OnboardingRouter' }],
        });
        posthog?.capture('sign_in', { method: 'anonymous' });
      } else {
        throw new Error('Anonymous session missing user');
      }
    } catch (err) {
      logError('[Auth] Anonymous login failed', err);
      Alert.alert('Anonymous login failed', err?.message ?? 'Please try again.');
    } finally {
      setOauthLoading(null);
      setAnonModalVisible(false);
      setAnonUsername('');
      setAnonPassword('');
    }
  };

  const resetRecoveryState = () => {
    setRecoveryStep('email');
    setRecoveryEmail('');
    setRecoveryOtp('');
    setRecoveryPassword('');
    setRecoveryConfirmPassword('');
    setRecoveryLoading(false);
  };

  const handleSendRecoveryOtp = async () => {
    if (!recoveryEmailValid) {
      Alert.alert('Valid email required', 'Enter the email tied to your account.');
      return;
    }
    setRecoveryLoading(true);
    try {
      const normalizedEmail = recoveryEmail.trim().toLowerCase();
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: redirectUri,
      });
      if (error) throw error;

      setRecoveryStep('verify');
      posthog?.capture('password_recovery_requested');
      Alert.alert(
        'Code sent',
        'Check your inbox for a one-time code to reset your password.'
      );
    } catch (err) {
      logError('[Auth] Password recovery send failed', err);
      Alert.alert(
        'Unable to send code',
        err?.message ?? 'Please try again in a moment.'
      );
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleVerifyRecovery = async () => {
    if (!recoveryOtp.trim()) {
      Alert.alert('Enter the code', 'Please enter the one-time code from your email.');
      return;
    }
    if (!recoveryPasswordValid) {
      Alert.alert(
        'Invalid password',
        'Password must be at least 8 characters with uppercase, lowercase, number and symbol.'
      );
      return;
    }
    if (recoveryPassword !== recoveryConfirmPassword) {
      Alert.alert('Passwords do not match', 'Please retype your new password.');
      return;
    }

    setRecoveryLoading(true);
    try {
      const normalizedEmail = recoveryEmail.trim().toLowerCase();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: recoveryOtp.trim(),
        type: 'recovery',
      });
      if (verifyError) throw verifyError;

      const { error: updateError } = await supabase.auth.updateUser({
        password: recoveryPassword,
      });
      if (updateError) throw updateError;

      posthog?.capture('password_recovery_completed');
      Alert.alert('Password updated', 'You can now sign in with your new password.');
      setRecoveryModalVisible(false);
      resetRecoveryState();
    } catch (err) {
      logError('[Auth] Password recovery verify failed', err);
      Alert.alert('Recovery failed', err?.message ?? 'Please try again.');
    } finally {
      setRecoveryLoading(false);
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
      Alert.alert(
        'Invalid password',
        'Password must be at least 8 characters with uppercase, lowercase, number and symbol.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      logInfo(
        `[Auth] ${
          mode === Mode.SIGN_UP ? 'Sign up' : 'Sign in'
        } start`,
        { email: normalizedEmail }
      );

      if (mode === Mode.SIGN_UP) {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
        });
        if (error) throw error;
        logInfo('[Auth] Email sign-up response', {
          userId: data?.user?.id,
          hasSession: Boolean(data?.session),
        });

        let resolvedUser = data?.user ?? data?.session?.user ?? null;

        if (!data?.session) {
          const {
            data: signInData,
            error: signInError,
          } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });

          if (signInError) {
            logError('[Auth] Post-signup sign-in failed', signInError);
            Alert.alert(
              'Confirm your email',
              'Check your inbox to finish creating your account.'
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
          logInfo('[Auth] Email sign-up completed', {
            userId: resolvedUser.id,
          });
          await ensureUserRecord(resolvedUser);
          navigation.reset({
            index: 0,
            routes: [{ name: 'OnboardingRouter' }],
          });
          posthog?.capture('sign_up', { method: 'email' });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error) throw error;

        const { data: userData } = await supabase.auth.getUser();
        logInfo('[Auth] Email sign-in completed', {
          userId: userData?.user?.id,
        });
        if (userData?.user) {
          await ensureUserRecord(userData.user);
        }

        navigation.reset({
          index: 0,
          routes: [{ name: 'OnboardingRouter' }],
        });
        posthog?.capture('sign_in', { method: 'email' });
      }
    } catch (err) {
      const message = err?.message ?? 'Please try again.';
      logError('[Auth] Email authentication error', mode, err);
      if (mode === Mode.SIGN_IN && /invalid login credentials/i.test(message)) {
        Alert.alert('Invalid password', 'The password you entered is incorrect.');
        return;
      }
      Alert.alert('Authentication error', message);
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
                  style={[
                    styles.providerIcon,
                    isGoogle ? styles.googleIcon : styles.appleIcon,
                  ]}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    styles.methodLabel,
                    isGoogle ? styles.googleLabel : styles.appleLabel,
                  ]}
                >
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
          <MaterialCommunityIcons
            name="email-outline"
            size={20}
            color={COLORS.irisDark}
          />
        </View>
        <Text style={[styles.methodLabel, styles.emailLabel]}>
          {copy.emailCTA}
        </Text>
        <View style={styles.emailPlaceholder} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.anonymousButton,
          oauthLoading === 'anonymous' && styles.anonymousButtonDisabled,
        ]}
        activeOpacity={0.9}
        onPress={() => setAnonModalVisible(true)}
        disabled={Boolean(oauthLoading)}
      >
        {oauthLoading === 'anonymous' ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <View style={styles.anonymousContent}>
            <MaterialCommunityIcons
              name="incognito"
              size={20}
              color={COLORS.white}
            />
            <Text style={styles.anonymousLabel}>
              Sign up/ Login Anonymously
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderEmailStep = () => (
    <View style={styles.formWrap}>
      <Text style={styles.formTitle}>{copy.emailCTA}</Text>
      <Text style={styles.formSubTitle}>
        We&apos;ll use your email to keep your data in sync.
      </Text>

      <View
        style={[
          styles.inputWrapper,
          showEmailError && styles.inputWrapperError,
        ]}
      >
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
        style={[
          styles.primaryButton,
          !emailValid && styles.primaryButtonDisabled,
        ]}
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
        Password must be at least 8 characters including atleast one uppercase,
        lowercase and a symbol.
      </Text>

      <View
        style={[
          styles.inputWrapper,
          showEmailError && styles.inputWrapperError,
        ]}
      >
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

      <View
        style={[
          styles.inputWrapper,
          showPasswordError && styles.inputWrapperError,
        ]}
      >
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
        <Text style={styles.errorLabel}>
          Password must be at least 8 characters including uppercase,
          lowercase, number and symbol.
        </Text>
      ) : null}

      {mode === Mode.SIGN_IN ? (
        <TouchableOpacity
          style={styles.forgotButton}
          onPress={() => setRecoveryModalVisible(true)}
        >
          <Text style={styles.forgotButtonText}>Forgot password?</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        style={[
          styles.primaryButton,
          (!emailValid || !passwordValid || isSubmitting) &&
            styles.primaryButtonDisabled,
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

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setStage(Stage.EMAIL)}
      >
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
                style={[
                  styles.tabButton,
                  mode === Mode.SIGN_UP && styles.tabButtonActive,
                ]}
                onPress={() => toggleMode(Mode.SIGN_UP)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    mode === Mode.SIGN_UP && styles.tabLabelActive,
                  ]}
                >
                  {modeCopy[Mode.SIGN_UP].tabLabel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  mode === Mode.SIGN_IN && styles.tabButtonActive,
                ]}
                onPress={() => toggleMode(Mode.SIGN_IN)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    mode === Mode.SIGN_IN && styles.tabLabelActive,
                  ]}
                >
                  {modeCopy[Mode.SIGN_IN].tabLabel}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.headingWrap}>
              <Text style={styles.headline}>{copy.headline}</Text>
              <TouchableOpacity
                onPress={handleSubtitlePress}
                activeOpacity={0.75}
              >
                <Text style={styles.subtitle}>
                  {copy.subtitle}{' '}
                  <Text style={styles.subtitleAction}>
                    {copy.subtitleAction}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>

            {renderStage()}
          </View>
        </ScrollView>
        <Modal
          visible={anonModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAnonModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Anonymous Login</Text>
              <Text style={styles.modalSubtitle}>
                Pick a username and password to continue.
              </Text>

              <View style={styles.inputWrapper}>
                <TextInput
                  value={anonUsername}
                  onChangeText={setAnonUsername}
                  placeholder="Username"
                  placeholderTextColor={COLORS.sub}
                  autoCapitalize="none"
                  style={styles.input}
                />
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  value={anonPassword}
                  onChangeText={setAnonPassword}
                  placeholder="Password (min 8 chars)"
                  placeholderTextColor={COLORS.sub}
                  autoCapitalize="none"
                  secureTextEntry
                  style={styles.input}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalGhostButton}
                  onPress={() => setAnonModalVisible(false)}
                >
                  <Text style={styles.modalGhostText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalPrimaryButton,
                    oauthLoading === 'anonymous' && { opacity: 0.7 },
                  ]}
                  onPress={handleAnonymousSubmit}
                  disabled={oauthLoading === 'anonymous'}
                >
                  {oauthLoading === 'anonymous' ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.modalPrimaryText}>Continue</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        <Modal
          visible={recoveryModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setRecoveryModalVisible(false);
            resetRecoveryState();
          }}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Password recovery</Text>
              <Text style={styles.modalSubtitle}>
                {recoveryStep === 'email'
                  ? 'Send a one-time code to your email.'
                  : 'Enter the code and choose a new password.'}
              </Text>

              {recoveryStep === 'email' ? (
                <View style={styles.inputWrapper}>
                  <TextInput
                    value={recoveryEmail}
                    onChangeText={setRecoveryEmail}
                    placeholder="Email"
                    placeholderTextColor={COLORS.sub}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={styles.input}
                  />
                </View>
              ) : (
                <>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      value={recoveryOtp}
                      onChangeText={setRecoveryOtp}
                      placeholder="One-time code"
                      placeholderTextColor={COLORS.sub}
                      autoCapitalize="none"
                      keyboardType="number-pad"
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      value={recoveryPassword}
                      onChangeText={setRecoveryPassword}
                      placeholder="New password"
                      placeholderTextColor={COLORS.sub}
                      autoCapitalize="none"
                      secureTextEntry
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      value={recoveryConfirmPassword}
                      onChangeText={setRecoveryConfirmPassword}
                      placeholder="Confirm new password"
                      placeholderTextColor={COLORS.sub}
                      autoCapitalize="none"
                      secureTextEntry
                      style={styles.input}
                    />
                  </View>
                </>
              )}

              <View style={styles.modalActions}>
                {recoveryStep === 'verify' ? (
                  <TouchableOpacity
                    style={styles.modalGhostButton}
                    onPress={() => setRecoveryStep('email')}
                  >
                    <Text style={styles.modalGhostText}>Back</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.modalGhostButton}
                    onPress={() => {
                      setRecoveryModalVisible(false);
                      resetRecoveryState();
                    }}
                  >
                    <Text style={styles.modalGhostText}>Cancel</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.modalPrimaryButton,
                    recoveryLoading && { opacity: 0.7 },
                  ]}
                  onPress={
                    recoveryStep === 'email'
                      ? handleSendRecoveryOtp
                      : handleVerifyRecovery
                  }
                  disabled={recoveryLoading}
                >
                  {recoveryLoading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.modalPrimaryText}>
                      {recoveryStep === 'email' ? 'Send code' : 'Reset password'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {recoveryStep === 'verify' ? (
                <TouchableOpacity
                  style={styles.modalHelperButton}
                  onPress={handleSendRecoveryOtp}
                  disabled={recoveryLoading}
                >
                  <Text style={styles.modalHelperText}>Resend code</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </Modal>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.sub,
    marginBottom: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalGhostButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.lilac,
  },
  modalGhostText: {
    color: COLORS.irisDark,
    fontWeight: '600',
  },
  modalPrimaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.irisDark,
  },
  modalPrimaryText: {
    color: COLORS.white,
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
  forgotButton: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
  },
  forgotButtonText: {
    color: COLORS.iris,
    fontWeight: '600',
    fontSize: 13,
  },
  modalHelperButton: {
    alignSelf: 'center',
    paddingVertical: 6,
  },
  modalHelperText: {
    color: COLORS.iris,
    fontWeight: '600',
    fontSize: 13,
  },
});
