import { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';

const NAVY = '#0B1629';
const NAVY_CARD = '#1A2740';
const BORDER = '#2A3A52';
const TEXT_PRIMARY = '#F0F4F8';
const TEXT_MUTED = '#64748B';
const TEXT_SECONDARY = '#94A3B8';
const LINK = '#93C5FD';
const ERROR_BG = 'rgba(239,68,68,0.10)';
const ERROR_BORDER = 'rgba(239,68,68,0.30)';
const ERROR_TEXT = '#FCA5A5';

export default function RegisterScreen() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    username: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const update = (key: keyof typeof formData) => (text: string) =>
    setFormData((prev) => ({ ...prev, [key]: text }));

  const handleRegister = async () => {
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all required fields');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const result = await register({
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        username: formData.username || formData.email,
      });
      if (result.success) {
        router.replace('/(tabs)');
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
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
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand header */}
        <View style={s.header}>
          <View style={s.logoRing}>
            <Logo size={60} />
          </View>
          <Text style={s.appName}>Al Yafour ERP</Text>
          <Text style={s.tagline}>Create your account</Text>
        </View>

        {/* Form card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Sign Up</Text>
          <Text style={s.cardSubtitle}>Fill in your details to get started</Text>

          {error ? (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={s.row}>
            <View style={s.halfField}>
              <Input
                label="First Name"
                value={formData.firstName}
                onChangeText={update('firstName')}
                placeholder="First"
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
            <View style={s.halfField}>
              <Input
                label="Last Name"
                value={formData.lastName}
                onChangeText={update('lastName')}
                placeholder="Last"
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
          </View>

          <Input
            label="Email *"
            value={formData.email}
            onChangeText={update('email')}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="next"
          />

          <Input
            label="Username"
            value={formData.username}
            onChangeText={update('username')}
            placeholder="Optional — defaults to email"
            autoCapitalize="none"
            returnKeyType="next"
          />

          <Input
            label="Password *"
            value={formData.password}
            onChangeText={update('password')}
            placeholder="Min. 6 characters"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            returnKeyType="next"
          />

          <Input
            label="Confirm Password *"
            value={formData.confirmPassword}
            onChangeText={update('confirmPassword')}
            placeholder="Repeat your password"
            secureTextEntry
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleRegister}
          />

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            fullWidth
            size="lg"
            style={s.btn}
          />

          <View style={s.footer}>
            <Text style={s.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={s.footerLink}> Sign In</Text>
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

  header: { alignItems: 'center', marginBottom: 28 },
  logoRing: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: -0.4,
  },
  tagline: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginTop: 4,
  },

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
    marginBottom: 22,
  },

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

  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },

  btn: { marginTop: 6 },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: { color: TEXT_MUTED, fontSize: 14 },
  footerLink: { color: LINK, fontSize: 14, fontWeight: '600' },
});
