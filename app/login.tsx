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
  ImageBackground,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth, Branding } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/ui/Logo';
import { API_BASE_URL } from '@/constants/api';

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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, branding: contextBranding } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [branding, setBranding] = useState<Branding | null>(contextBranding);

  useEffect(() => {
    if (contextBranding) setBranding(contextBranding);
  }, [contextBranding]);

  useEffect(() => {
    fetchPublicBranding().then(b => { if (b) setBranding(b); });
  }, []);

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

  const loginBg    = branding?.login_bg_url;
  const companyName = branding?.company_legal_name || 'Al Yafour ERP';
  const logoUrl    = branding?.logo_url || undefined;
  const brandColor = branding?.primary_color || '#0B1F33';

  const body = (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
            style={[s.btn, { backgroundColor: brandColor }, loading && s.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.82}
          >
            {loading
              ? <ActivityIndicator color="#FFFFFF" size="small" />
              : <Text style={s.btnText}>Sign In</Text>
            }
          </TouchableOpacity>

          <View style={s.footerRow}>
            <Text style={s.footerLabel}>Don&apos;t have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={[s.footerLink, { color: loginBg ? '#93C5FD' : brandColor }]}>
                {' '}Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  if (loginBg) {
    return (
      <ImageBackground source={{ uri: loginBg }} style={{ flex: 1 }} resizeMode="cover">
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={s.overlay} />
        {body}
      </ImageBackground>
    );
  }

  return (
    <View style={[{ flex: 1 }, { backgroundColor: '#07111F' }]}>
      <StatusBar barStyle="light-content" backgroundColor="#07111F" />
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
