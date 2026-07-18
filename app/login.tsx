import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth, Branding, LoginResult } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/ui/Logo';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL } from '@/constants/api';
import { authenticateBiometric, getBiometricCapabilities } from '@/lib/app-lock';
import {
  isBiometricLoginEnabled,
  enableBiometricLogin,
  getStoredLoginCredentials,
} from '@/lib/biometric-login';

const BRANDING_KEY = '@branding';

async function fetchPublicBranding(): Promise<Branding | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/public/branding/`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && (data.logo_url || data.company_legal_name)) {
      await AsyncStorage.setItem(BRANDING_KEY, JSON.stringify(data));
      return data as Branding;
    }
  } catch {}
  return null;
}

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, branding: contextBranding } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [branding, setBranding] = useState<Branding | null>(contextBranding);

  // Face ID / biometric sign-in — a saved credential unlocked by biometrics,
  // NOT a passwordless server-side ceremony (see lib/biometric-login.ts).
  const [bioLabel, setBioLabel] = useState('Face ID');
  const [bioReady, setBioReady] = useState(false);   // hardware+enrolled AND enabled by the user
  const [bioBusy, setBioBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [caps, enabled] = await Promise.all([
        getBiometricCapabilities(),
        isBiometricLoginEnabled(),
      ]);
      setBioLabel(caps.label);
      setBioReady(caps.hasHardware && caps.enrolled && enabled);
    })();
  }, []);

  useEffect(() => {
    if (contextBranding) setBranding(contextBranding);
  }, [contextBranding]);

  useEffect(() => {
    // Only apply fetched branding when it actually CHANGED — unconditionally
    // setting identical data re-rendered the whole screen on every mount
    // (part of the "login page keeps reloading" report).
    fetchPublicBranding().then(b => {
      if (b) {
        setBranding(prev =>
          prev && JSON.stringify(prev) === JSON.stringify(b) ? prev : b
        );
      }
    });
  }, []);

  /** Shared by manual submit and Face ID — same result shape either way. */
  const handleLoginResult = async (result: LoginResult, triedUsername: string, triedPassword: string) => {
    if (result.success) {
      // Navigation happens in AuthGate (it reacts to `user` being set) —
      // navigating from here too caused a double-replace flash.
      offerBiometricLoginSetup(triedUsername, triedPassword);
    } else if (result.requires2FA && result.tempToken) {
      router.push({
        pathname: '/two-factor',
        params: {
          tempToken: result.tempToken,
          ...(result.expiresIn != null ? { expiresIn: String(result.expiresIn) } : {}),
        },
      } as any);
    } else {
      setError(result.error || 'Login failed. Please check your credentials.');
    }
  };

  /** After a successful password login, offer to save it behind Face ID. */
  const offerBiometricLoginSetup = async (loggedInUsername: string, usedPassword: string) => {
    try {
      const [caps, alreadyEnabled] = await Promise.all([
        getBiometricCapabilities(),
        isBiometricLoginEnabled(),
      ]);
      if (!caps.hasHardware || !caps.enrolled || alreadyEnabled) return;

      Alert.alert(
        `Enable ${caps.label} Sign-In?`,
        `Next time, sign in instantly with ${caps.label} instead of typing your password.`,
        [
          { text: 'Not Now', style: 'cancel' },
          {
            text: 'Enable',
            onPress: async () => {
              const bioResult = await authenticateBiometric(`Enable ${caps.label} Sign-In`);
              if (bioResult === 'success') {
                await enableBiometricLogin(loggedInUsername, usedPassword);
              }
            },
          },
        ],
      );
    } catch {
      // Never block login on this convenience prompt
    }
  };

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const trimmedUsername = username.trim();
      const result = await login(trimmedUsername, password);
      await handleLoginResult(result, trimmedUsername, password);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (bioBusy || loading) return;
    setError('');
    setBioBusy(true);
    try {
      const bioResult = await authenticateBiometric(`Sign in with ${bioLabel}`);
      if (bioResult !== 'success') {
        if (bioResult === 'unavailable') {
          setError(`${bioLabel} is not available right now. Please sign in with your password.`);
        }
        return; // cancelled/failed → silently let the user use the form
      }
      const creds = await getStoredLoginCredentials();
      if (!creds) {
        setError('Saved sign-in was not found. Please sign in with your password.');
        return;
      }
      setLoading(true);
      const result = await login(creds.username, creds.password);
      await handleLoginResult(result, creds.username, creds.password);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setBioBusy(false);
      setLoading(false);
    }
  };

  const loginBg    = branding?.login_bg_url;
  const companyName = branding?.company_legal_name || 'Al Yafour ERP';
  const logoUrl    = branding?.logo_url || undefined;
  const brandColor = branding?.primary_color || '#C9943A';

  const body = (
    <KeyboardAvoidingView
      // Android: rely on the window's adjustResize — 'height' re-laid-out and
      // re-centered the whole screen on every keyboard open/close (looked
      // like the page "reloading" while typing).
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Brand header ── */}
        <View style={s.header}>
          <View style={s.logoWrap}>
            <Logo size={64} logoUrl={logoUrl} />
          </View>
          <Text style={s.companyName} numberOfLines={3}>{companyName}</Text>
          <Text style={s.tagline}>Enterprise Resource Planning</Text>
        </View>

        {/* ── Card ── */}
        <View style={[s.card, loginBg ? s.cardGlass : s.cardSolid]}>
          <Text style={s.cardTitle}>Sign In</Text>
          <Text style={s.cardSub}>Enter your credentials to continue</Text>

          {!!error && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {bioReady && (
            <>
              <TouchableOpacity
                style={[s.bioBtn, { borderColor: brandColor }, bioBusy && s.btnDisabled]}
                onPress={handleBiometricLogin}
                disabled={bioBusy || loading}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel={`Sign in with ${bioLabel}`}
                accessibilityState={{ disabled: bioBusy || loading, busy: bioBusy }}
              >
                {bioBusy ? (
                  <ActivityIndicator color={brandColor} size="small" />
                ) : (
                  <>
                    <IconSymbol name="faceid" size={20} color={brandColor} />
                    <Text style={[s.bioBtnText, { color: brandColor }]}>Sign in with {bioLabel}</Text>
                  </>
                )}
              </TouchableOpacity>
              <View style={s.dividerRow}>
                <View style={s.dividerLine} />
                <Text style={s.dividerText}>or sign in with password</Text>
                <View style={s.dividerLine} />
              </View>
            </>
          )}

          <Input
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="Enter your username"
            autoCapitalize="none"
            autoComplete="username"
            returnKeyType="next"
            containerStyle={s.field}
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="password"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            containerStyle={s.field}
            rightIcon={
              <TouchableOpacity
                onPress={() => setShowPassword(v => !v)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <IconSymbol name={showPassword ? 'eye.slash.fill' : 'eye.fill'} size={19} color="#64748B" />
              </TouchableOpacity>
            }
          />

          <TouchableOpacity
            onPress={() => router.push('/forgot-password' as any)}
            style={s.forgotLink}
            accessibilityRole="link"
            accessibilityLabel="Forgot password"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[s.forgotText, { color: loginBg ? '#E0B86D' : brandColor }]}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.btn, { backgroundColor: brandColor }, loading && s.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            accessibilityState={{ disabled: loading, busy: loading }}
          >
            {loading
              ? <ActivityIndicator color="#FFFFFF" size="small" />
              : <Text style={s.btnText}>Sign In</Text>
            }
          </TouchableOpacity>

          <View style={s.footerRow}>
            <Text style={s.footerLabel}>Don&apos;t have an account?</Text>
            <TouchableOpacity
              onPress={() => router.push('/register')}
              accessibilityRole="link"
              accessibilityLabel="Sign up for a new account"
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            >
              <Text style={[s.footerLink, { color: loginBg ? '#E0B86D' : brandColor }]}>
                {' '}Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // ONE stable tree for both branded and plain modes. The screen used to
  // swap its whole root (plain View ⇄ ImageBackground) the moment the
  // branding fetch resolved — a full remount that read as a page "reload"
  // on every visit. Now the background image is just a layer that fades in.
  return (
    <View style={[{ flex: 1 }, { backgroundColor: '#07111F' }]}>
      <StatusBar barStyle="light-content" backgroundColor="#07111F" />
      {loginBg ? (
        <>
          <Image
            source={{ uri: loginBg }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={400}
          />
          {/* Gradient scrim: lighter at the top (image visible), darker
              behind the form — reads premium and keeps text contrast. */}
          <LinearGradient
            colors={['rgba(7,17,31,0.55)', 'rgba(7,17,31,0.80)', 'rgba(7,17,31,0.94)']}
            style={StyleSheet.absoluteFill}
          />
        </>
      ) : null}
      {body}
    </View>
  );
}

const s = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7,17,31,0.76)',
  },

  // Brand header
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoWrap: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.2,
    maxWidth: 280,
    lineHeight: 26,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },

  // Card — solid (no bg image)
  cardSolid: {
    backgroundColor: '#0D1B2A',
    borderColor: '#1E3349',
    borderWidth: 1,
  },
  // Card — glass (has bg image)
  cardGlass: {
    backgroundColor: 'rgba(13,27,42,0.82)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
  },
  card: {
    borderRadius: 22,
    padding: 28,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 22,
  },

  // Error
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.28)',
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },

  field: { marginBottom: 14 },

  // Face ID sign-in
  bioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 14,
    minHeight: 48,
    marginBottom: 18,
  },
  bioBtnText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#1E3349' },
  dividerText: { fontSize: 11.5, color: '#475569', letterSpacing: 0.2 },

  // Forgot password
  forgotLink: { alignSelf: 'flex-end', marginTop: -6, marginBottom: 16, minHeight: 32, justifyContent: 'center' },
  forgotText: { fontSize: 13, fontWeight: '600' },

  // Button
  btn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  btnDisabled: { opacity: 0.55 },
  btnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Footer
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerLabel: { color: '#64748B', fontSize: 14 },
  footerLink: { fontSize: 14, fontWeight: '600' },
});
