import { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/ui/Logo';

const NAVY = '#0B1629';
const NAVY_CARD = '#1A2740';
const NAVY_INPUT = '#0D1B2A';
const BORDER = '#2A3A52';
const TEXT_PRIMARY = '#F0F4F8';
const TEXT_MUTED = '#64748B';
const TEXT_SECONDARY = '#94A3B8';
const BTN_BG = '#F0F4F8';   // near-white button — premium feel
const BTN_TEXT = '#0B1629'; // dark text on light button
const LINK = '#93C5FD';     // light blue link — no orange
const ERROR_BG = 'rgba(239,68,68,0.10)';
const ERROR_BORDER = 'rgba(239,68,68,0.30)';
const ERROR_TEXT = '#FCA5A5';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await login(username.trim(), password);
      if (result.success) {
        router.replace('/(tabs)');
      } else {
        setError(result.error || 'Login failed. Please check your credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={s.root}
    >
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand header */}
        <View style={s.header}>
          <View style={s.logoRing}>
            <Logo size={72} />
          </View>
          <Text style={s.appName}>Al Yafour ERP</Text>
          <Text style={s.tagline}>Enterprise Resource Planning</Text>
        </View>

        {/* Sign-in card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Sign In</Text>
          <Text style={s.cardSubtitle}>Enter your credentials to continue</Text>

          {error ? (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

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
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            containerStyle={s.field}
          />

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.82}
          >
            {loading ? (
              <ActivityIndicator color={BTN_TEXT} size="small" />
            ) : (
              <Text style={s.btnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={s.footer}>
            <Text style={s.footerText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={s.footerLink}> Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  // Brand
  header: { alignItems: 'center', marginBottom: 36 },
  logoRing: {
    width: 100,
    height: 100,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  appName: {
    fontSize: 26,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: -0.4,
  },
  tagline: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginTop: 4,
    letterSpacing: 0.2,
  },

  // Card
  card: {
    backgroundColor: NAVY_CARD,
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: TEXT_MUTED,
    marginBottom: 24,
  },

  // Error
  errorBox: {
    backgroundColor: ERROR_BG,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: ERROR_BORDER,
  },
  errorText: {
    color: ERROR_TEXT,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Field override — Input uses light-mode token colors internally;
  // override border/bg via containerStyle is not possible — the Input
  // component self-resolves via useColorScheme. Since useColorScheme always
  // returns 'light' in this app, inputs here will use light tokens.
  // We compensate via backgroundColor & padding adjustments on the card.
  field: { marginBottom: 14 },

  // Button
  btn: {
    backgroundColor: BTN_BG,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  btnDisabled: {
    backgroundColor: '#2A3A52',
    shadowOpacity: 0,
    elevation: 0,
  },
  btnText: {
    color: BTN_TEXT,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: { color: TEXT_MUTED, fontSize: 14 },
  footerLink: { color: LINK, fontSize: 14, fontWeight: '600' },
});
