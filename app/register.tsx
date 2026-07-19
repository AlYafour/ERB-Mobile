import { useMemo, useState } from 'react';
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
import { AppButton } from '@/components/ui/AppButton';
import { Logo } from '@/components/ui/Logo';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Palette = typeof Colors.light | typeof Colors.dark;

export default function RegisterScreen() {
  const cs = useColorScheme() ?? 'light';
  const C = Colors[cs];
  const s = useMemo(() => makeStyles(C), [C]);

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
  const [registered, setRegistered] = useState(false);
  const { register, branding } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const brandColor = branding?.primary_color || C.primary;

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
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
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
        setRegistered(true);
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }]}>
        <StatusBar barStyle={cs === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={C.background} />
        <View style={s.logoRing}>
          <Logo size={60} logoUrl={branding?.logo_url || undefined} />
        </View>
        <Text style={[s.appName, { marginTop: 20, marginBottom: 8 }]}>Registration Submitted</Text>
        <View style={[s.card, { width: '100%', alignItems: 'center' }]}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>✅</Text>
          <Text style={[s.cardTitle, { textAlign: 'center', marginBottom: 8 }]}>Account Pending Approval</Text>
          <Text style={[s.cardSubtitle, { textAlign: 'center', lineHeight: 20 }]}>
            Your account has been created successfully and is awaiting administrator approval. You will be notified once your account is activated.
          </Text>
          <TouchableOpacity onPress={() => router.replace('/login')} style={{ marginTop: 24 }}>
            <Text style={{ color: brandColor, fontSize: 15, fontWeight: '600' }}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={s.root}
    >
      <StatusBar barStyle={cs === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={C.background} />
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
            <Logo size={60} logoUrl={branding?.logo_url || undefined} />
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
            placeholder="Min. 8 characters"
            secureTextEntry
            secureToggle
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
            secureToggle
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleRegister}
          />

          <AppButton
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
              <Text style={[s.footerLink, { color: brandColor }]}> Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (C: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
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
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  appName: {
    fontSize: 22,
    fontWeight: '700',
    color: C.textPrimary,
    letterSpacing: -0.4,
  },
  tagline: {
    fontSize: 13,
    color: C.textSecondary,
    marginTop: 4,
  },

  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: C.textMuted,
    marginBottom: 22,
  },

  errorBox: {
    backgroundColor: C.dangerBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: `${C.danger}47`,
  },
  errorText: {
    color: C.errorText,
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
  footerText: { color: C.textMuted, fontSize: 14 },
  footerLink: { fontSize: 14, fontWeight: '600' },
});
